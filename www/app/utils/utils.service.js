/* global angular */

'use strict';

angular.module('utils').provider('config', function() {
   var self = this;
   self.config = {};
   self.set = function(key, value) {
       self.config[key] = value;
   };
   self.get = function(key) {
       return self.config[key];
   };
   return {
       set: self.set,
       get: self.get,
       $get: function() {
           return {
               set: self.set,
               get: self.get
           };
       }
   };
});

angular.module('utils').provider('restResource', function () {
    var self = this;
    self.api_path = '';
    self.base_url = '';

    self.endpoint = function (resource) {
        return self.base_url + self.api_path + resource + '/';
    };
    
    return {
        setApiPath: function (path) {
            self.api_path = path;
        },
        setBaseUrl: function (url_path) {
            self.base_url = url_path;
        },
        $get: function ($resource) {
            return {
                endpoint: self.endpoint,
                $rest: function (resource) {
                    return $resource(self.endpoint(resource) + ':id/', {id: '@id'});
                },
                $resource: $resource
            };
        }
    };
});

angular.module('utils').factory('messagingService', function ($rootScope) {
    return {
        DEFAULT_DOMAIN: '',
        pub: function (domain, path, args) {
            $rootScope.$emit(domain + ':' + path, args);
        },
        sub: function (scope, domain, path, listener) {
            //scope is the current scope, listener = function(event, data)
            var unbind = $rootScope.$on(domain + ':' + path, listener);
            scope.$on('$destroy', unbind);
        }
    };
});


