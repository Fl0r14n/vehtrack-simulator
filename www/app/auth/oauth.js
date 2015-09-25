/* global angular */

angular.module('ionicOauth', ['ionic', 'ngCordova', 'ngStorage']).config(function($stateProvider, $httpProvider) {
    //only in browser testing
    $stateProvider.state('oauth', {
        url: '/access_token=:accessToken',
        template: '',
        controller: function($location, OauthToken) {
            var hash = $location.path().substr(1);
            OauthToken.setTokenFromString(hash);
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
    var service = {
        token: null
    };

    oAuth2HashTokens = [//per http://tools.ietf.org/html/rfc6749#section-4.2.2
        'access_token', 'token_type', 'expires_in', 'scope', 'state',
        'error', 'error_description'
    ];

    service.get = function() {
        return this.token;
    };

    service.set = function() {
        this.setTokenFromString($location.hash());
        //If hash is present in URL always use it, cuz its coming from oAuth2 provider redirect
        if (null === service.token) {
            setTokenFromSession();
        }
        return this.token;
    };

    service.destroy = function() {
        OauthStorage.delete('token');
        this.token = null;
        return this.token;
    };



    /**
     * Get the access token from a string and save it
     * @param hash
     */
    service.setTokenFromString = function(hash) {
        var params = getTokenFromString(hash);

        if (params) {
            removeFragment();
            setToken(params);
            setExpiresAt();
            // We have to save it again to make sure expires_at is set
            //  and the expiry event is set up properly
            setToken(this.token);
            $rootScope.$broadcast('oauth:login', service.token);
        }
    };

    /* * * * * * * * * *
     * PRIVATE METHODS *
     * * * * * * * * * */

    /**
     * Set the access token from the sessionStorage.
     */
    var setTokenFromSession = function() {
        var params = OauthStorage.get('token');
        if (params) {
            setToken(params);
        }
    };

    /**
     * Set the access token.
     *
     * @param params
     * @returns {*|{}}
     */
    var setToken = function(params) {
        service.token = service.token || {};      // init the token
        angular.extend(service.token, params);      // set the access token params
        setTokenInSession();                // save the token into the session
        setExpiresAtEvent();                // event to fire when the token expires

        return service.token;
    };

    /**
     * Parse the fragment URI and return an object
     * @param hash
     * @returns {{}}
     */
    var getTokenFromString = function(hash) {
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

    /**
     * Save the access token into the session
     */
    var setTokenInSession = function() {
        OauthStorage.set('token', service.token);
    };

    /**
     * Set the access token expiration date (useful for refresh logics)
     */
    var setExpiresAt = function() {
        if (!service.token) {
            return;
        }
        if (typeof (service.token.expires_in) !== 'undefined' && service.token.expires_in !== null) {
            var expires_at = new Date();
            expires_at.setSeconds(expires_at.getSeconds() + parseInt(service.token.expires_in) - 60); // 60 seconds less to secure browser and response latency
            service.token.expires_at = expires_at;
        }
        else {
            service.token.expires_at = null;
        }
    };


    /**
     * Set the timeout at which the expired event is fired
     */
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

    /**
     * Remove the oAuth2 pieces from the hash fragment
     */
    var removeFragment = function() {
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

angular.module('ionicOauth').directive('ionOauth', function($log, $compile, $cordovaOauthUtility, $http, $templateCache, $rootScope, OauthToken, OauthStorage) {
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

            var init = function() {
                initAttrs();
                OauthStorage.use($scope.storage);
                compile();
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

            $scope.login = function() {
                if (window.cordova) {
                    var cordovaMetadata = cordova.require("cordova/plugin_list").metadata;
                    if ($cordovaOauthUtility.isInAppBrowserInstalled(cordovaMetadata) === true) {
                        $scope.redirectUri = 'http://localhost/callback';
                        var browserRef = window.open(authUrl());
                        browserRef.addEventListener('loadstart', function(event) {
                            if ((event.url).indexOf($scope.redirectUri) === 0) {
                                browserRef.removeEventListener("exit", function(event) {
                                });
                                browserRef.close();
                                $log.debug(event.url);
                                //var callbackResponse = (event.url).split("#")[1];
                                //TODO get profile $http.get($scope.profileUri)
                            }
                        });
                    }
                } else {
                    window.location.replace(authUrl());
                }
            };

            $scope.logout = function() {
                OauthToken.destroy($scope);
                $rootScope.$broadcast('oauth:loggedOut');
                $scope.show = 'logged-out';
            };

            $scope.$on('oauth:expired', function() {
                OauthToken.destroy($scope);
                $scope.show = 'logged-out';
            });
            
            $scope.$on('$routeChangeSuccess', function () {
                console.log('HERE');
                init();
            });

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

