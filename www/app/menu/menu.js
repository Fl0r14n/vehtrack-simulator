'use strict';

angular.module('menu', ['ionic', 'menu.gps', 'menu.log', 'menu.map', 'menu.settings']).config(function($stateProvider) {
    $stateProvider.state('menu', {
        url: '/menu',
        abstract: true,
        templateUrl: 'app/menu/menu.html',
        controller: 'menuController'
    });
});

angular.module('menu').controller('menuController', function($scope, $ionicModal, $timeout) {
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