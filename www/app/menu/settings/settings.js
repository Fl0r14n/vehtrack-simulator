'use strict';

angular.module('menu.settings', ['ionic', 'utils']).config(function($stateProvider, configProvider) {
    $stateProvider.state('menu.settings', {
      url: '/settings',
      views: {
        'menuContent': {
          templateUrl: 'app/menu/settings/settings.html',
          controller: 'settingsController'
        }
      }
    });
    configProvider.set('settings', {
        tracking: false,
        serverUrl: 'http://vehtrack-application.rhcloud.com',
        intervalMin: 10, //s
        intervalMax: 600, //s
        interval: 20, //s
        polyline: true,
        startStopMarkers: true,
        keepOnCenter: true
    })
});

angular.module('menu.settings').controller('settingsController', function($scope, config) {
    $scope.settings = config.get('settings');
});
