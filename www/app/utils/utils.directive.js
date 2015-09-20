/* global angular */

'use strict';

angular.module('utils').directive('a', function () {
    return {
        restrict: 'E',
        link: function (scope, elem, attrs) {
            if (attrs.ngClick || attrs.href === '' || attrs.href === '#') {
                elem.on('click', function (e) {
                    e.preventDefault();
                });
            }
        }
    };
});

angular.module('utils').directive('ngEnter', function () {
    return function (scope, element, attrs) {
        element.bind("keydown keypress", function (event) {
            if (event.which === 13) {
                scope.$apply(function () {
                    scope.$eval(attrs.ngEnter);
                });

                event.preventDefault();
            }
        });
    };
});

angular.module('utils').directive('ngFocus', function ($timeout) {
    return function (scope, element, attrs) {
        $timeout(function () {
            element[0].focus();
        }, 30);
    };
});

angular.module('utils').directive('uiTabList', function () {
    return {
        require: '^compileItem',
        restrict: 'EA',
        replace: false,
        transclude: true,
        scope: {
            stacked: '@',
            justified: '@',
            closable: '@'
        },
        controllerAs: 'tabsCtrl',
        controller: function ($scope, messagingService) {
            var self = this;
            self.stacked = $scope.stacked;
            self.justified = $scope.justified;
            self.closable = $scope.closable;
            self.activeTab = null;
            self.tabs = [];

            self.getTabs = function () {
                return self.tabs;
            };

            self.isStacked = function () {
                return self.stacked;
            };

            self.isJustified = function () {
                return self.justified;
            };

            self.isClosable = function () {
                return self.closable;
            };

            self.addTab = function (tab) {
                for (var i = 0; i < self.tabs.length; i++) {
                    if (self.tabs[i].id === tab.id) {
                        self.setActiveTab(self.tabs[i]);
                        return;
                    }
                }
                self.tabs.push(tab);
            };

            self.setActiveTab = function (tab) {
                if (!angular.isUndefined(tab) && !tab.disabled) {
                    self.activeTab = tab.id;
                }
            };

            self.isActiveTab = function (tab) {
                return self.activeTab === tab.id && !tab.disabled;
            };

            self.closeTab = function (tab) {
                var index = self.tabs.indexOf(tab);
                self.tabs.splice(index, 1);
            };

            //events ------------------------------

            messagingService.sub($scope, $scope.$parent.domain, 'TAB_ADD', function (event, data) {
                self.addTab(data);
            });

            messagingService.sub($scope, $scope.$parent.domain, 'TAB_SELECT', function (event, data) {
                self.setActiveTab(data);
            });

        },
        template: [
            '<div class="ui-tabs"',
            '   <div class="tabbable">',
            '       <ng-transclude></ng-transclude>',
            '       <div ng-class="{\'col-xs-3\': tabsCtrl.isStacked()}">',
            '           <ul class="nav nav-tabs" ng-class="{\'nav-stacked nav-pills\': tabsCtrl.isStacked(), \'nav-justified\': tabsCtrl.isJustified()}">',
            '               <li ng-repeat="tab in tabsCtrl.getTabs()" ng-class="{\'active\': tabsCtrl.isActiveTab(tab), \'disabled\': tab.disabled}" ng-click="tabsCtrl.setActiveTab(tab)">',
            '                   <a><i ng-if="tab.icon" class="{{ tab.icon }}"></i>{{ tab.name }}<button ng-if="tabsCtrl.isClosable()" class="close" ng-click="tabsCtrl.closeTab(tab)">&times;</button></a>',
            '               </li>',
            '           </ul>',
            '       </div>',
            '       <div ng-class="{\'col-xs-9\': tabsCtrl.isStacked()}">',
            '           <div class="tab-content"',
            '               <div class="tab-pane fade" ng-repeat="tab in tabsCtrl.getTabs()" ng-class="{\'active in\': tabsCtrl.isActiveTab(tab)}" ng-show="tabsCtrl.isActiveTab(tab)" ng-init="tabId=tab.id">',
            '                   <ng-include src="tab.include" ng-if="tab.include"></ng-include>',
            '                   <compile-item html="tab.content"></compile-item>',
            '               </div>',
            '           </div>',
            '       </div>',
            '   </div>',
            '</div>'
        ].join('')
    };
});

angular.module('utils').directive('uiTab', function () {
    return {
        require: '^uiTabList',
        replace: false,
        restrict: 'EA',
        scope: {
            id: '@',
            name: '@',
            icon: '@',
            disabled: '@',
            include: '@',
            active: '@'
        },
        compile: function () {
            return {
                pre: function (scope, element, attributes, controller, transcludeFn) {
                    var tab = {
                        id: scope.id,
                        name: scope.name,
                        icon: scope.icon,
                        disabled: scope.disabled,
                        include: scope.include,
                        content: element.html()
                    };

                    controller.addTab(tab);
                    if (scope.active) {
                        controller.setActiveTab(tab);
                    }
                },
                post: function (scope, element, attributes, controller, transcludeFn) {
                    element.remove();
                }
            };
        }
    };
});

angular.module('utils').directive('compileItem', function ($compile) {
    return {
        restrict: 'E',
        scope: {
            html: '='
        },
        transclude: true,
        link: function (scope, element, attrs) {
            //jquery must be included
            element.html(scope.html).show();
            $compile(element.contents())(scope);
        }
    };
});

angular.module('utils').directive('uiAlert', function () {
    return {
        replace: true,
        restrict: 'E',
        scope: {
            type: '@', //danger success warning
            showClose: '@',
            show: '='
        },
        transclude: true,
        link: function (scope, element, attrs) {
            scope.closeAlert = function () {
                scope.show = false;
            };
        },
        template: [
            '<div class="ui-alert alert alert-{{type}}" ng-show="show">',
            '   <a class="close" ng-if="showClose" ng-click="closeAlert()">&times;</a>',
            '   <ng-transclude></ng-transclude>',
            '</div>'
        ].join('')
    };
});
