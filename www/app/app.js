/* global angular, cordova, StatusBar */

'use strict';

angular.module('main', ['ionic', 'utils', 'menu']).config(function($resourceProvider, restResourceProvider, $urlRouterProvider) {
    $resourceProvider.defaults.stripTrailingSlashes = false;
    restResourceProvider.setApiPath('api/v1/');
    $urlRouterProvider.otherwise('/menu/map');
});

angular.module('main').run(function($ionicPlatform) {
    $ionicPlatform.ready(function() {
        // Hide the accessory bar by default (remove this to show the accessory bar above the keyboard
        // for form inputs)
        if (window.cordova && window.cordova.plugins.Keyboard) {
          cordova.plugins.Keyboard.hideKeyboardAccessoryBar(true);
          cordova.plugins.Keyboard.disableScroll(true);

        }
        if (window.StatusBar) {
          // org.apache.cordova.statusbar required
          StatusBar.styleDefault();
        }
     });
});