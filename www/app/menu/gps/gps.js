'use strict';

angular.module('menu.gps', ['ionic']).config(function($stateProvider) {
    $stateProvider.state('menu.gps', {
      url: '/gps',
      views: {
        'menuContent': {
          templateUrl: 'app/menu/gps/gps.html',
          controller: 'gpsController'
        }
      }
    });
});

angular.module('menu.gps').controller('gpsController', function($scope) {

});