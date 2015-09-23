'use strict';

angular.module('menu', ['ionic', 'menu.log', 'menu.map', 'menu.settings', 'oauth']).config(function($stateProvider, $locationProvider) {
    $stateProvider.state('menu', {
        url: '/menu',
        abstract: true,
        templateUrl: 'app/menu/menu.html',
        controller: 'menuController as menu'
    });
    $stateProvider.state('oauth', {
        url: '/access_token=:accessToken',
        template: '',
        controller: function($location, AccessToken) {
            var hash = $location.path().substr(1);
            AccessToken.setTokenFromString(hash);
            $location.path('/');
            $location.replace();
        }
    });
});

angular.module('menu').controller('menuController', function($scope, $ionicModal, $timeout, config, $http, messagingService, $location, $log) {

    var self = this;
    self.settings = config.get('settings');
    self.redirect_uri = $location.protocol()+"://"+$location.host()+":"+$location.port();

    function setToken(token) {
        if(!token) {
            delete $http.defaults.headers.common.Authorization;
            delete self.access_token;
        } else {
            self.access_token = token.access_token;
            $http.defaults.headers.common.Authorization = 'Bearer ' + self.access_token;
        }
    }

    $scope.$on('oauth:authorized', function(event, token) {
        $log.debug('Logged in');
        setToken(token);
    });

    $scope.$on('oauth:loggedOut', function(event, token) {
        $log.debug('Logged out');
        $http.get(self.settings.http_host + self.settings.logout_path);
        setToken(null);
        messagingService.pub(messagingService.DEFAULT_DOMAIN,'logout', event);
    });

    $scope.$on('oauth:expired', function(event) {
        $log.debug('Login expired');
        setToken(null);
    });

    $scope.$on('oauth:profile', function(event, profile) {
        $log.debug('User profile');
        messagingService.pub(messagingService.DEFAULT_DOMAIN,'login', profile);
    });
});