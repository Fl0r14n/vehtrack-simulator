'use strict';

angular.module('menu.map', ['ionic', 'utils', 'nemLogging', 'uiGmapgoogle-maps', 'ngCordova']).config(function($stateProvider, uiGmapGoogleMapApiProvider) {
    $stateProvider.state('menu.map', {
      url: '/map',
      views: {
        'menuContent': {
          templateUrl: 'app/menu/map/map.html',
          controller: 'mapController as ctrl'
        }
      }
    });
    uiGmapGoogleMapApiProvider.configure({
        key: 'AIzaSyAtdQ7J2vsDwdw3xnIPapseiggP2wHsVb4',
        //v: 'exp',
        v: '3.17',
        libraries: 'weather,geometry,visualization,places',
        sensor: 'false',
        language: 'en'
    });
});

angular.module('menu.map').controller('mapController', function($scope, $cordovaGeolocation, $ionicLoading, $timeout, $log, config, uiGmapGoogleMapApi) {
    var self = this;
    self.gmap_icons_url = 'http://maps.google.com/mapfiles/kml/paddle/';
    self.settings = config.get('settings');

    document.addEventListener('deviceready', function () {
        cordova.plugins.backgroundMode.setDefaults({ text:'vehtrack-simulator collecting locations'});
        // Enable background mode while track is playing
        cordova.plugins.backgroundMode.enable();
    });

    uiGmapGoogleMapApi.then(function(maps) {
        self.getInitialPoint();
    });

    self.getInitialPoint = function() {
        //clear current position if any
        self.currentPosition = undefined;
        //remove location poll if any
        if(angular.isDefined(self.watch)) {
            self.watch.clearWatch();
        }

        //show spinner
        $ionicLoading.show({
            showBackdrop: false
        });

        //try to get position
        $cordovaGeolocation.getCurrentPosition({timeout: 10000, enableHighAccuracy: true}).then(function(position) {
            self.map.center = {
                latitude: position.coords.latitude,
                longitude: position.coords.longitude
            }
            self.map.zoom = 18;
            $timeout(function() {
                $ionicLoading.hide();
                self.setCurrentPosition(position, true);
                self.startWatch();
            }, 1000);
        }, function(error) {
            $ionicLoading.hide();
            $ionicLoading.show({ template: 'Could not get location', noBackdrop: true, duration: 2000 });
            $log.debug('could not get location');
        });
    };

    self.startWatch = function() {
        self.watch = $cordovaGeolocation.watchPosition({
            frequency: self.settings.interval * 1000,
            timeout: 3000,
            enableHighAccuracy: false //may cause errors if true
        });
        self.watch.then(
            null,
            function(err) {
                $log.debug(err.message);
            },
            function(position) {
                self.setCurrentPosition(position);
                if(self.isRecording) {
                    self.drawPolyline(position);
                }
            }
        );
    };

    self.setCurrentPosition = function(position, initial) {
        $log.debug(position.coords.latitude+', '+position.coords.longitude);
        self.currentPosition = {
            id: self.guid(),
            coords: {
                latitude: position.coords.latitude,
                longitude: position.coords.longitude,
                speed: position.coords.speed,
                heading: position.coords.heading,
                altitude: position.coords.altitude,
                accuracy: position.coords.accuracy,
                timestamp: position.timestamp
            },
        }
        if(initial) {
            self.currentPosition.options = {
                animation: google.maps.Animation.DROP
            }
        }
        if(self.settings.keepOnCenter) {
            self.map.center = {
                latitude: position.coords.latitude,
                longitude: position.coords.longitude
            }
        }
    }

    self.drawPolyline = function(position) {
        if(self.settings.polyline) {
            self.points.push({
                latitude: position.coords.latitude,
                longitude: position.coords.longitude
            });
            if(self.points.length > 1) {
                var points = self.points.slice(self.points.length-2, self.points.length);
                $log.debug(points);
                self.addPolyline(points);
            }
        }
    }
    self.points = [];

    self.markPoint = function(icon) {
        if(self.settings.startStopMarkers) {
            self.addMarkers([{
                latitude: self.currentPosition.coords.latitude,
                longitude: self.currentPosition.coords.longitude,
                title: (self.currentPosition.coords.speed * 3,6)+'km/h '+self.currentPosition.coords.speed+'°',
                icon: self.gmap_icons_url+icon
            }]);
        }
    }

    self.isRecording = false;
    self.startRecord = function() {
        if(self.isRecording) {
            //on pause
            self.isRecording = false;
            self.markPoint('pause.png');
            return;
        }
        //TODO add polylines
        self.isRecording = true;
        self.markPoint('go.png');
    };

    self.stopRecord = function() {
        if(self.isRecording) {
            self.isRecording = false;
            self.markPoint('stop.png');
        }
    };

    self.uploadResult = function() {
        //TODO upload
        self.points = [];
        self.polylines = [];
        self.markers = [];
    }


    self.map = {
        center: {
            latitude: 34.04924594193164,
            longitude: -118.24104309082031
        },
        pan: true,
        zoom: 13,
        options: {
            streetViewControl: true,
            //panControl: false,
            maxZoom: 20,
            minZoom: 3,
            rotateControl: true,
            scaleControl: true
        }
    };
    //to show the weather this is a bug
    self.weather = false;

    self.guid = function () {
        return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    };

    self.addMarkers = function (markersArray) {
        var _markers = [];
        for (var i = 0; i < markersArray.length; i++) {
            _markers.push({
                id: self.guid(),
                show: false,
                onClick: function (self) {
                    self.show = !self.show;
                },
                coords: {
                    latitude: markersArray[i].latitude,
                    longitude: markersArray[i].longitude,
                },
                title: markersArray[i].title,
                icon: markersArray[i].icon,
                events: markersArray[i].events,
                options: markersArray[i].options
            });
        }
        self.markers = self.markers.concat(_markers);
    };
    self.markers = [];

    self.addPolyline = function (coordsArray) {
        self.polylines.push({
            id: self.guid(),
            path: coordsArray,
            stroke: {
                color: '#6060FB',
                weight: 3
            },
            editable: false,
            draggable: false,
            geodesic: true,
            visible: true
        });
    };
    self.polylines = [];
});