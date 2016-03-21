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
        $http.defaults.headers.common.Authorization = self.authHeaders.Authorization;
    });

    $scope.$on('oauth:loggedOut', function(event, token) {
        $log.debug('Logged out');
        
        //TODO this does not work
        var logoutPath = self.settings.http_host + self.settings.logout_path;
        console.log(logoutPath);
        $http.get(logoutPath);
        self.authHeaders = undefined;
        delete $http.defaults.headers.common.Authorization;
        
        messagingService.pub(messagingService.DEFAULT_DOMAIN,'logout', event);
        config.set('profile', null);
    });

    $scope.$on('oauth:expired', function(event) {
        $log.debug('Login expired');
        
        self.authHeaders = undefined;
        delete $http.defaults.headers.common.Authorization;
    });

    $scope.$on('oauth:profile', function(event, profile) {
        $log.debug('User profile');
        config.set('profile', profile);
        messagingService.pub(messagingService.DEFAULT_DOMAIN,'login', profile);
    });   
});