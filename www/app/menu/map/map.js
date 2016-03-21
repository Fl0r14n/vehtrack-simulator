/* global angular, cordova, google */

'use strict';

angular.module('menu.map', ['ionic', 'utils', 'nemLogging', 'uiGmapgoogle-maps', 'ngCordova', 'menu.log']).config(function($stateProvider, uiGmapGoogleMapApiProvider) {
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

angular.module('menu.map').controller('mapController', function($cordovaGeolocation, $ionicLoading, $timeout, $log, config, uiGmapGoogleMapApi, trackService, logs) {
    var self = this;
    self.gmap_icons_url = 'img/markers/';
    self.settings = config.get('settings');

    document.addEventListener('deviceready', function() {
        cordova.plugins.backgroundMode.setDefaults({text: 'vehtrack-simulator collecting locations'});
        // Enable background mode
        cordova.plugins.backgroundMode.enable();
        //init location
        self.getInitialPoint();
    });

    uiGmapGoogleMapApi.then(function(maps) {
        self.getInitialPoint();
    });

    self.getInitialPoint = function() {
        //clear current position if any
        self.currentPosition = undefined;
        //remove location poll if any
        if (angular.isDefined(self.watch)) {
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
            };
            self.map.zoom = 18;
            $timeout(function() {
                $ionicLoading.hide();
                self.setCurrentPosition(position, true);
                self.startLocationListener();
            }, 1000);
        }, function() {
            $ionicLoading.hide();
            $ionicLoading.show({template: 'Could not get location', noBackdrop: true, duration: 2000});
            $log.debug('could not get location');
        });
    };

    self.startLocationListener = function() {        
        self.watch = $cordovaGeolocation.watchPosition({            
            timeout: 3000,
            enableHighAccuracy: true
        });
        self.watch.then(
            null,
            function(err) {
                $log.debug(err.message);
            },
            function(position) {
                self.setCurrentPosition(position);
                self.recordPosition(position);
                if (self.isRecording) {
                    self.drawPolyline();
                }
            }
        );
    };

    self.recordPosition = function(position) {
        if(!self._record_lock) {
            self._record_lock = true;
            
            self.points.push({
                latitude: position.coords.latitude,
                longitude: position.coords.longitude,
                speed: position.coords.speed,
                timestamp: position.timestamp
            });
            
            $timeout(function() {
                //kill some time
                self._record_lock = false;
            }, self.settings.interval*1000);
        }
    };
    self.points = [];
    self._record_lock = false;

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
            options: {
                icon: self.gmap_icons_url + 'blu-circle-lv.png'
            }
        };
        if (initial) {
            self.currentPosition.options = {
                animation: google.maps.Animation.DROP
            };
        }
        if (self.settings.center) {
            self.map.center = {
                latitude: position.coords.latitude,
                longitude: position.coords.longitude
            };
            self.map.zoom = self._getZoomBySpeed(position.coords.speed);
        }
    };

    self._getZoomBySpeed = function(speed) {
        if (speed !== null) {
            if (speed > 100) {
                return 14;
            } else if (speed > 50) {
                return 15;
            } else if (speed > 30) {
                return 16;
            } else if (speed > 7) {
                return 17;
            }
        }
        ;
        return 18;
    };

    self.drawPolyline = function() {
        if (self.settings.polyline) {
            if (self.points.length > 1) {
                var points = self.points.slice(self.points.length - 2, self.points.length);
                self.addPolyline(points, self._getPolylineColorBySpeed(points));
            }
        }
    };

    self._getPolylineColorBySpeed = function(points) {
        var speed = 0;
        for (var i = 0, len = points.length; i < len; ++i) {
            speed += points[i].speed;
        }
        speed /= points.length;
        if (speed > 130) {
            return '#ef473a';
        } else if (speed > 90) {
            return '#ffc900';
        } else if (speed > 50) {
            return '#33cd5f';
        } else if (speed > 10) {
            return '#11c1f3';
        } else {
            return '#387ef5';
        }
    };

    self.markPoint = function(icon) {
        if (self.settings.markers && angular.isDefined(self.setCurrentPosition)) {
            self.addMarkers([{
                    latitude: self.currentPosition.coords.latitude,
                    longitude: self.currentPosition.coords.longitude,
                    title: (self.currentPosition.coords.speed * 3, 6) + 'km/h ' + self.currentPosition.coords.speed + '°',
                    icon: self.gmap_icons_url + icon
                }]);
        }
    };

    //recording button
    self.startRecord = function() {
        if (self.isRecording) {
            //on pause
            self.isRecording = false;
            self.markPoint('pause-lv.png');
            return;
        }
        self.isRecording = true;
        self.markPoint('go-lv.png');
    };
    self.isRecording = false;

    //stop button
    self.stopRecord = function() {
        if (self.isRecording) {
            self.isRecording = false;
            self.markPoint('stop-lv.png');
        } else {
            self.cleanMap();
        }
    };

    //upload button
    self.uploadResult = function() {
        var journey = trackService.buildJourney(self.points);
        trackService.journey.save(journey, function(result) {
            var journey_id = result.id;
            var positions = trackService.buildPositions(self.points, journey_id);
            var messages = trackService.buildLogs(logs.getMessages(), journey_id);
            trackService.position.bulk(positions, function(result) {                
            }, function(error) {
                $ionicLoading.show({template: error.statusText, noBackdrop: true, duration: 2000});
                $log.debug('Upload positions: '+error.statusText);
            });
            trackService.log.bulk(messages, function(result) {                
            }, function(error) {
                $ionicLoading.show({template: error.statusText, noBackdrop: true, duration: 2000});
                $log.debug('Upload logs: '+error.statusText);
            });
            self.cleanMap();
        }, function(error) {
            $ionicLoading.show({template: error.statusText, noBackdrop: true, duration: 2000});
            $log.debug('Upload journey: '+error.statusText);
        });
    };
    
    self.cleanMap = function() {
        self.points = [];
        self.polylines = [];
        self.markers = [];
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

    self.guid = function() {
        return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    };

    self.addMarkers = function(markersArray) {
        var _markers = [];
        for (var i = 0; i < markersArray.length; i++) {
            _markers.push({
                id: self.guid(),
                show: false,
                onClick: function(self) {
                    self.show = !self.show;
                },
                coords: {
                    latitude: markersArray[i].latitude,
                    longitude: markersArray[i].longitude
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

    self.addPolyline = function(coordsArray, color) {
        self.polylines.push({
            id: self.guid(),
            path: coordsArray,
            stroke: {
                color: color || '#6060FB',
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

angular.module('menu.map').factory('trackService', function(restResource, config, $filter) {
    var service = {};
    service.journey = restResource.$rest('journey');
    service.position = restResource.$rest('position');
    service.log = restResource.$rest('log');

    service.buildJourney = function(points) {
        var start_point = points[0];
        var stop_point = points[points.length - 1];
        var max_speed = 0, avg_speed = 0;
        for (var i = 0, len = points.length; i < len; ++i) {
            var point = points[i];
            if (point.speed > max_speed) {
                max_speed = point.speed;
            }
            avg_speed += point.speed;
        }
        avg_speed /= points.length;
        return {
            start_latitude: start_point.latitude,
            start_longitude: start_point.longitude,
            start_timestamp: marshallTimestamp(start_point.timestamp),
            stop_latitude: stop_point.latitude,
            stop_longitude: stop_point.longitude,
            stop_timestamp: marshallTimestamp(stop_point.timestamp),
            average_speed: avg_speed,
            maximum_speed: max_speed,
            device: getDevice()
        };
    };

    service.buildPositions = function(points, journey_id) {
        var positions = [];
        for (var i = 0, len = points.length; i < len; ++i) {
            positions.push({
                latitude: points[i].latitude,
                longitude: points[i].longitude,
                timestamp: marshallTimestamp(points[i].timestamp),
                speed: points[i].speed,
                journey: {
                    pk: journey_id
                },
                device: getDevice()
            });
        }
        return {
            objects: positions
        };
    };

    service.buildLogs = function(messages, journey_id) {
        var logs = [];
        for (var i = 0, len = messages.length; i < len; ++i) {
            if (angular.isDefined(messages[i].type)) {
                logs.push({
                    timestamp: messages[i].timestamp,
                    level: messages[i].type,
                    message: messages[i].message,
                    journey: {
                        pk: journey_id
                    },
                    device: getDevice()
                });
            }
        }
        return {
            objects: logs
        };
    };

    var marshallTimestamp = function(timestamp) {
        return $filter('date')(timestamp, 'yyyy-MM-ddTHH:mm:ss', 'UTC');
    };

    var getDevice = function() {
        var profile = config.get('profile');
        if (angular.isDefined(profile) && profile !== null) {
            return {
                pk: profile.email
            };
        }
    };

    return service;
});