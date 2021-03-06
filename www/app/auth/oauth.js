/* global angular */

angular.module('ionicOauth', ['ionic', 'ngStorage']).config(function($stateProvider, $httpProvider) {
    //only in browser testing
    $stateProvider.state('oauth', {
        url: '/access_token=:accessToken',
        template: '',
        controller: function($location, OauthToken) {
            var hash = $location.path().substr(1);
            OauthToken.set(hash);
            $location.path('/');
            $location.replace();
        }
    });
    $httpProvider.interceptors.push('OauthInterceptor');
});

angular.module('ionicOauth').factory('OauthStorage', function($sessionStorage, $localStorage) {
    var service = {
        storage: $sessionStorage
    };

    service.get = function(name) {
        return this.storage[name];
    };

    service.set = function(name, value) {
        this.storage[name] = value;
        return this.get(name);
    };

    service.delete = function(name) {
        var stored = this.get(name);
        delete this.storage[name];
        return stored;
    };

    service.use = function(storage) {
        if (storage === 'sessionStorage') {
            this.storage = $sessionStorage;
        } else if (storage === 'localStorage') {
            this.storage = $localStorage;
        }
    };

    return service;
});

angular.module('ionicOauth').factory('OauthToken', function($location, $rootScope, OauthStorage, $interval) {

    $rootScope.$on('oauth:expired', function() {
        service.destroy();
    });

    $rootScope.$on('oauth:loggedOut', function() {
        service.destroy();
    });

    var service = {
        token: null
    };

    oAuth2HashTokens = [
        'access_token', 'token_type', 'expires_in', 'scope', 'state',
        'error', 'error_description'
    ];

    service.init = function() {
        //If hash is present in URL always use it, cuz its coming from oAuth2 provider redirect
        this.set($location.hash());
        if (null === service.token) {
            var params = OauthStorage.get('token');
            if (params) {
                setToken(params);
            }
        }
        return this.token;
    };

    service.get = function() {
        return this.token;
    };

    service.destroy = function() {
        OauthStorage.delete('token');
        this.token = null;
        return this.token;
    };

    service.set = function(hash) {
        var params = parseOauthUri(hash);
        if (params) {
            delOauthUriVals();
            setToken(params);
            setExpiresAt();
            // We have to save it again to make sure expires_at is set
            //  and the expiry event is set up properly
            setToken(this.token);
            $rootScope.$broadcast('oauth:login', service.token);
        }
    };

    var parseOauthUri = function(hash) {
        var params = {},
            regex = /([^&=]+)=([^&]*)/g,
            m;
        while ((m = regex.exec(hash)) !== null) {
            params[decodeURIComponent(m[1])] = decodeURIComponent(m[2]);
        }
        if (params.access_token || params.error) {
            return params;
        }
    };

    var setToken = function(params) {
        service.token = service.token || {};      // init the token
        angular.extend(service.token, params);      // set the access token params
        setTokenInSession();                // save the token into the session
        setExpiresAtEvent();                // event to fire when the token expires

        return service.token;
    };

    var setTokenInSession = function() {
        OauthStorage.set('token', service.token);
    };

    var setExpiresAt = function() {
        if (!service.token) {
            return;
        }
        if (typeof (service.token.expires_in) !== 'undefined' && service.token.expires_in !== null) {
            var expires_at = new Date();
            expires_at.setSeconds(expires_at.getSeconds() + parseInt(service.token.expires_in) - 60); // 60 seconds less to secure browser and response latency
            service.token.expires_at = expires_at;
        } else {
            service.token.expires_at = null;
        }
    };

    var setExpiresAtEvent = function() {
        // Don't bother if there's no expires token
        if (typeof (service.token.expires_at) === 'undefined' || service.token.expires_at === null) {
            return;
        }
        var time = (new Date(service.token.expires_at)) - (new Date());
        if (time) {
            $interval(function() {
                $rootScope.$broadcast('oauth:expired', service.token);
            }, time, 1);
        }
    };

    var delOauthUriVals = function() {
        var curHash = $location.hash();
        angular.forEach(oAuth2HashTokens, function(hashKey) {
            var re = new RegExp('&' + hashKey + '(=[^&]*)?|^' + hashKey + '(=[^&]*)?&?');
            curHash = curHash.replace(re, '');
        });

        $location.hash(curHash);
    };

    service.headers = function() {
        return {Authorization: 'Bearer ' + this.token.access_token};
    };

    service.expired = function() {
        return this.token && this.token.expires_at && new Date(this.token.expires_at) < new Date();
    };

    return service;
});

angular.module('ionicOauth').factory('OauthInterceptor', function($rootScope, OauthToken) {
    return {
        request: function(config) {
            var token = OauthToken.get();
            if (token) {
                if (OauthToken.expired()) {
                    $rootScope.$broadcast('oauth:expired', token);
                } else {
                    angular.extend(config.headers, OauthToken.headers());
                }
            }
            return config;
        }
    };
});

angular.module('ionicOauth').directive('ionOauth', function($compile, $http, $templateCache, $rootScope, OauthToken, OauthStorage) {
    return {
        restrict: 'AE',
        replace: true,
        scope: {
            clientId: '@', // (required) oauth client id
            site: '@', // (required) oauth server host
            authorizePath: '@', // (optional) authorize uri
            scope: '@', // (optional) oauth scope like read, write, public or whatever is supported by auth server
            state: '@', // (optional) An arbitrary unique string created by your app to guard against Cross-site Request Forgery
            redirectUri: '@', // (optional) for in browser testing
            profileUri: '@', // (optional) user profile uri (e.g http://example.com/me)            
            template: '@', // (optional) template to render other than default
            text: '@', // (optional) login text other than default            
            storage: '@' // (optional) Store token saved in 'sessionStorage' or 'localStorage', defaults to 'sessionStorage'
        },
        controller: function($scope, $element) {

            $scope.$watch('clientId', function() {
                init();
            });

            $scope.$on('$routeChangeSuccess', function() {
                init();
            });

            $scope.$on('oauth:login', function() {
                init();
            });

            $scope.$on('oauth:expired', function() {
                $scope.show = 'logged-out';
            });

            var init = function() {
                initAttrs();
                OauthStorage.use($scope.storage);
                compile();
                OauthToken.init($scope);
                initProfile();
                initView();
            };

            var initAttrs = function() {
                $scope.authorizePath = $scope.authorizePath || '/oauth/authorize';
                $scope.responseType = $scope.responseType || 'token';
                $scope.text = $scope.text || 'Sign In';
                $scope.state = $scope.state || '';
                $scope.scope = $scope.scope || '';
                $scope.redirectUri = $scope.redirectUri || 'http://localhost/callback';
                $scope.storage = $scope.storage || 'sessionStorage';
            };

            var initProfile = function() {
                var token = OauthToken.get();
                if (token && token.access_token && $scope.profileUri) {
                    $http.get($scope.profileUri).success(function(response) {
                        $scope.profile = response;
                        $rootScope.$broadcast('oauth:profile', $scope.profile);
                    });
                }
            };

            var initView = function() {
                var token = OauthToken.get();
                if (!token) {
                    return loggedOut(); // without access token it's logged out
                }
                if (token.access_token) {
                    return authorized(); // if there is the access token we are done
                }
                if (token.error) {
                    return denied(); // if the request has been denied we fire the denied event
                }
            };

            var loggedOut = function() {
                $rootScope.$broadcast('oauth:loggedOut');
                $scope.show = 'logged-out';
            };

            var denied = function() {
                $scope.show = 'denied';
                $rootScope.$broadcast('oauth:denied');
            };

            var authorized = function() {
                $rootScope.$broadcast('oauth:authorized', OauthToken.get());
                $scope.show = 'logged-in';
            };

            var compile = function() {
                if ($scope.template) {
                    $http.get($scope.template, {cache: $templateCache}).success(function(html) {
                        $element.html(html);
                        $compile($element.contents())($scope);
                    });
                } else {
                    $element.html = default_template;
                    $compile($element.contents())($scope);
                }
            };

            var authUrl = function() {
                var authPathHasQuery = ($scope.authorizePath.indexOf('?') === -1) ? false : true,
                    appendChar = (authPathHasQuery) ? '&' : '?';    //if authorizePath has ? already append OAuth2 params
                return [
                    $scope.site,
                    $scope.authorizePath,
                    appendChar,
                    'response_type=',
                    $scope.responseType,
                    '&client_id=',
                    $scope.clientId,
                    '&redirect_uri=',
                    $scope.redirectUri,
                    '&scope=',
                    $scope.scope,
                    '&state=',
                    $scope.state
                ].join('');
            };

            var isInAppBrowserInstalled = function() {
                var cordovaPluginList = cordova.require("cordova/plugin_list");
                var inAppBrowserNames = ["cordova-plugin-inappbrowser", "cordova-plugin-inappbrowser.inappbrowser", "org.apache.cordova.inappbrowser"];

                if (Object.keys(cordovaPluginList.metadata).length === 0) {
                    var formatedPluginList = cordovaPluginList.map(
                        function(plugin) {
                            return plugin.id || plugin.pluginId;
                        });

                    return inAppBrowserNames.some(function(name) {
                        return formatedPluginList.indexOf(name) !== -1 ? true : false;
                    });
                } else {
                    return inAppBrowserNames.some(function(name) {
                        return cordovaPluginList.metadata.hasOwnProperty(name);
                    });
                }
            };

            $scope.login = function() {
                if (window.cordova && isInAppBrowserInstalled() === true) {
                    $scope.redirectUri = 'http://localhost/callback';
                    var browserRef = window.open(authUrl(), '_blank', 'location=yes');
                    browserRef.addEventListener('loadstart', function(event) {
                        if ((event.url).indexOf($scope.redirectUri) === 0) {
                            browserRef.removeEventListener("exit", function(event) {
                            });
                            browserRef.close();
                            var callbackResponse = (event.url).split("#")[1];
                            OauthToken.set(callbackResponse);
                        }
                    });
                } else {
                    window.location.replace(authUrl());
                }
            };

            $scope.logout = function() {
                loggedOut();
            };

            var default_template = [
                '<a class="oauth">',
                '   <span href="#" class="logged-out" ng-show="show==\'logged-out\'" ng-click="login()" >{{text}}</span>',
                '   <span href="#" class="logged-in"  ng-show="show==\'logged-in\'"  ng-click="logout()">Logout {{profile.email}}</span>',
                '   <span href="#" class="denied"     ng-show="show==\'denied\'"     ng-click="login()">Access denied. Try again.</span>',
                '</a>'
            ].join('');
        }
    };
});

