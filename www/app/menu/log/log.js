'use strict';

angular.module('menu.log', ['ionic', 'utils']).config(function($stateProvider, $provide, logsProvider) {
    $stateProvider.state('menu.log', {
      url: '/log',
      views: {
        'menuContent': {
          templateUrl: 'app/menu/log/log.html',
          controller: 'logController as ctrl'
        }
      }
    });

    $provide.decorator('$log', function($delegate) {
        var origDebug = $delegate.debug;

        $delegate.debug = function() {
            var args = [].slice.call(arguments);
            logsProvider.addMessage({
                timestamp: Date.now(),
                message: args[0],
                type: args[1]
            });
            origDebug.apply(null, args);
        }
        return $delegate;
    });
});

angular.module('menu.log').provider('logs', function() {
    var self = this;
    self.size = 100;
    self.maxSize = 10000;
    self.messages = [];

    self.setSize = function(size) {
        if(size > 1 && size < self.maxSize) {
            self.size = size;
        }
    }

    self.addMessage = function(message) {
        if(self.messages.length>=self.size) {
            self.messages.pop();
        }
        self.messages.unshift(message);
    }

    self.getMessages = function() {
        return self.messages;
    }

    self.clearMessages = function() {
        self.messages = [];
    }

    return {
        setSize: self.setSize,
        addMessage: self.addMessage,
        $get: function() {
            return {
                getMessages: self.getMessages,
                clearMessages: self.clearMessages
            }
        }
    }
});

angular.module('menu.log').controller('logController', function($scope, logs) {
    var self = this;
    self.getLogs = function() {
        return logs.getMessages();
    }
    self.clear = function() {
        logs.clearMessages();
    }
});

