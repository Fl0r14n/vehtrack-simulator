'use strict';

angular.module('menu', ['ionic', 'menu.gps', 'menu.log', 'menu.map', 'menu.settings', 'oauth']).config(function($stateProvider) {
    $stateProvider.state('menu', {
        url: '/menu',
        abstract: true,
        templateUrl: 'app/menu/menu.html',
        controller: 'menuController as menu'
    });
});

angular.module('menu').controller('menuController', function($scope, $ionicModal, $timeout, config, $http, messagingService) {

    var self = this;
    self.site_url = config.get('http_host');
    self.redirect_uri = config.get('http_host');
    self.client_id = config.get('client_id');
    self.authorize_path = config.get('auth_path');
    self.profile_uri = config.get('profile_uri');
    self.revoke_token_path = config.get('revoke_token_path');
    self.logout_path = config.get('logout_path');

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
        setToken(token);
    });

    $scope.$on('oauth:loggedOut', function(event, token) {
        $http.get(self.logout_path);
        setToken(null);
        messagingService.pub(messagingService.DEFAULT_DOMAIN,'logout', event);
    });

    $scope.$on('oauth:expired', function(event) {
        setToken(null);
    });

    $scope.$on('oauth:profile', function(event, profile) {
        messagingService.pub(messagingService.DEFAULT_DOMAIN,'login', profile);
    });




    // Form data for the login modal
  $scope.loginData = {};

  // Create the login modal that we will use later
  $ionicModal.fromTemplateUrl('app/menu/login/login.html', {
    scope: $scope
  }).then(function(modal) {
    $scope.modal = modal;
  });

  // Triggered in the login modal to close it
  $scope.closeLogin = function() {
    $scope.modal.hide();
  };

  // Open the login modal
  $scope.login = function() {
    $scope.modal.show();
  };

  // Perform the login action when the user submits the login form
  $scope.doLogin = function() {
    console.log('Doing login', $scope.loginData);

    // Simulate a login delay. Remove this and replace with your login
    // code if using a login system
    $timeout(function() {
      $scope.closeLogin();
    }, 1000);
  };
});