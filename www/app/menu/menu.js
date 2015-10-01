/* global angular */

'use strict';

angular.module('menu', ['ionic', 'menu.log', 'menu.map', 'menu.settings', 'ionicOauth']).config(function($stateProvider) {
    $stateProvider.state('menu', {
        url: '/menu',
        abstract: true,
        templateUrl: 'app/menu/menu.html',
        controller: 'menuController as menu'
    });
});

angular.module('menu').controller('menuController', function($scope, config, $http, messagingService, $location, $log, OauthToken) {

    var self = this;
    self.settings = config.get('settings');
    
    //for in browser testing
    self.redirect_uri = $location.protocol()+"://"+$location.host()+":"+$location.port();

    $scope.$on('oauth:authorized', function(event, token) {
        $log.debug('Logged in');
        self.authHeaders = OauthToken.headers();
    });

    $scope.$on('oauth:loggedOut', function(event, token) {
        $log.debug('Logged out');
        //TODO this does not work
        $http.get(self.settings.http_host + self.settings.logout_path, {
            headers: self.authHeaders
        });
        self.authHeaders = undefined;
        messagingService.pub(messagingService.DEFAULT_DOMAIN,'logout', event);
        config.set('profile', null);
    });

    $scope.$on('oauth:expired', function(event) {
        $log.debug('Login expired');
    });

    $scope.$on('oauth:profile', function(event, profile) {
        $log.debug('User profile');
        config.set('profile', profile);
        messagingService.pub(messagingService.DEFAULT_DOMAIN,'login', profile);
    });
});