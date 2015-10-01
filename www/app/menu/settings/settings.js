/* global angular */

'use strict';

angular.module('menu.settings', ['ionic', 'utils']).config(function($stateProvider, configProvider, restResourceProvider) {
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
        interval_min: 10, //s
        interval_max: 600, //s
        interval: 20, //s
        polyline: true,
        markers: true,
        center: true,
        http_host: 'http://localhost:8000',
        client_id: '0CbDbFO4Vv1sS23DvTKkC8u7Rdllkkeh4uafCMZn',
        auth_path: '/o/authorize/',
        profile_uri: '/accounts/me/',
        revoke_token_path: '/o/revoke_token/',
        logout_path: '/accounts/logout/'
    });
    restResourceProvider.setBaseUrl(configProvider.get('settings').http_host);
    restResourceProvider.setApiPath('api/v1/');
});

angular.module('menu.settings').controller('settingsController', function($scope, config) {
    $scope.settings = config.get('settings');
});
