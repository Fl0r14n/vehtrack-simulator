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
    self.settings = config.get('settings');

    self.guid = function () {
        return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    };

    $ionicLoading.show({
        content: 'Getting current location...',
        showBackdrop: false
    });

    uiGmapGoogleMapApi.then(function(maps) {
        self.getInitialPoint();
    });

    self.getInitialPoint = function() {
        $cordovaGeolocation.getCurrentPosition({timeout: 10000, enableHighAccuracy: true}).then(function(position) {
            self.map.center = {
                latitude: position.coords.latitude,
                longitude: position.coords.longitude
            }
            self.map.zoom = 18;
            $timeout(function() {
                self.setCurrentPosition(position, true);
                self.startWatch();
            }, 1000);
            $ionicLoading.hide();
        }, function(error) {
            //TODO find something here: invalidate everything and retry?
            $ionicLoading.hide();
            $log.debug('could not get location');
        });
    };

    self.startWatch = function() {
        self.watch = $cordovaGeolocation.watchPosition({
            frequency: self.settings.interval * 1000,
            timeout: 3000,
            enableHighAccuracy: false //may cause errors if true
        }).then(
            null,
            function(err) {
                $log.debug(err.message);
            },
            function(position) {
                $log.debug(position.coords.latitude+','+position.coords.longitude);
                self.setCurrentPosition(position);
            }
        );
    };

    self.setCurrentPosition = function(position, initial) {
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



    self.points = [];

    self.isRecording = false;
    self.startRecord = function() {
        if(self.isRecording) {
            //on pause
            //TODO add pause marker
            self.isRecording = false;
            return;
        }
        //TODO add start marker
        //TODO add polylines
        self.isRecording = true;
    };

    self.stopRecord = function() {
        //TODO add stop marker
        self.isRecording = false;
        self.points = [];
        self.polylines = [];
    };

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

    self.markers = [];
    self.polylines = [];



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
//                    speed: markersArray[i].speed,
//                    heading: markersArray[i].heading,
//                    altitude: markersArray[i].altitude,
//                    accuracy: markersArray[i].accuracy,
//                    timestamp: markersArray[i].timestamp
                },
                title: markersArray[i].title,
                icon: markersArray[i].icon,
                events: markersArray[i].events,
                options: markersArray[i].options
            });
        }
        self.markers = self.markers.concat(_markers);
    };

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


});