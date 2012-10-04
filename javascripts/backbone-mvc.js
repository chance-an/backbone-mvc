//Copyright 2012 Changsi An

//This file is part of Backbone-MVC.
//
//Backbone-MVC is free software: you can redistribute it and/or modify
//it under the terms of the GNU Lesser General Public License as published by
//the Free Software Foundation, either version 3 of the License, or
//(at your option) any later version.
//
//Backbone-MVC is distributed in the hope that it will be useful,
//but WITHOUT ANY WARRANTY; without even the implied warranty of
//MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
//GNU Lesser General Public License for more details.
//
//You should have received a copy of the GNU Lesser General Public License
//along with Backbone-MVC.  If not, see <http://www.gnu.org/licenses/>.
//------------------------------------------------------------------------------
//Quick Start
//
//This software requires Backbone.js and Underscore.js to work correctly.
//
//Usage:
//To create a controller, use :

//BackboneMVC.Controller.extend({
//    name:'controller1', //mandatory field
//
//    //defined once, will be invoked before each action method
//    beforeFilter:function () {
//    },
//
//    //defined once, will be invoked after each action method
//    afterRender:function () {
//    },
//
//    //used with secure methods, expect true/false or Deferred Object.
//    checkSession:function () {
//    },
//
//    //action method
//    action1:function () {
//        this._privateMethod("Hello");
//    },
//
//    //secure method, checkSession method will be invoked first
//    user_action2:function () {
//    },
//
//    //a private method starts with _
//    _privateMethod:function (message) {
//        alert(message);
//    }
//})


//------------------------------------------------------------------------------
(function () {
    'use strict';
    var PRODUCT_NAME = 'BackboneMVC';

    //check prerequisites
    if (typeof Backbone === 'undefined' || typeof _ === 'undefined') {
        return;
    }

    /**
     * @namesapce BackboneMVC
     */
    var BackboneMVC = window[PRODUCT_NAME] = {};

    /**
     * This is the base prototype of the Controller classes.
     * The inheriting classes only expand the prototype so the trouble of handling
     * private constructor is saved.
     * It makes sense that each controller is a singleton. The cases that a
     * controller's state need to be shared across the application are more than the
     * cases that the states need to be kept independently. It also helps the user
     * logic shares the same controller state as the one the Router uses.
     * However, if independent states are vital, one can extend a controller with
     * empty members or define their method statelessly.
     * @type {Class}
     */
    var ControllerSingleton = (function () {
        function BaseController() {
            this._created = (new Date()).getTime(); //this can be useful for development
        }

        _.extend(BaseController.prototype, {
            _created:null
        });

        BaseController.extend = function (properties) {
            var instance;
            var klass = function Controller() {
                if (instance !== undefined) { //try to simulate Singleton
                    return instance;
                }
                BaseController.apply(this, arguments);

                //'initialize()' method works as explicit constructor, if it is defined,
                // then run it
                if (this.initialize !== undefined) {
                    this.initialize.apply(this, arguments);
                }

                instance = this;
                return instance;
            };

            klass.prototype = new BaseController();
            _.extend(klass.prototype, properties);

            klass.prototype.constructor = klass;
            klass.prototype.classId = _.uniqueId('controller_');

            return klass;
        };
        return BaseController;
    }());

    _.extend(BackboneMVC, {
        /**
         * A utility method used to create namespace object levels
         * @param {String} namespaceString levels in namespaces
         * @example "Mammalia.Cetacea.Delphinidae.Dolphin"
         */
        namespace:function (namespaceString) {
            var components = namespaceString.split('.');
            var node = window;
            for (var i = 0, l = components.length; i < l; i++) {
                if (node[components[i]] === undefined) {
                    node[components[i]] = {};
                }
                node = node[components[i]];
            }
        },

        /**
         * Backbone MVC Controller class
         * @type {Class} BackboneMVC.Controller
         */
        //some default implementations for the methods are listed here:
        Controller:{
            beforeFilter:function () {
                return (new $.Deferred()).resolve();
            },

            afterRender:function () {
                return (new $.Deferred()).resolve();
            },

            checkSession:function () {
                //if not defined, then always succeed
                return (new $.Deferred()).resolve(true);
            },

            'default':function () {
                //TODO: this function will list all the actions of the controller
                //intend to be overridden in most of the cases
                return true;
            }
        },

        /**
         * This is the automatic Router class, it is an implementation of Backbone.Router.
         * It must not be further customized, or the automatic routing feature cannot function.
         * @class BackboneMVC.Router
         */
        Router:(function(){
            var _inherentRouterProperties = {
                _history:[],

                routes:{
                    "*components":'dispatch' // route everything to 'dispatch' method
                },

                dispatch:function (actionPath) {
                    var components = actionPath.replace(/\/+$/g, '').split('/');
                    var controllerName;

                    //look for controllers
                    if (ControllersPool[components[0]]) {
                        controllerName = components[0];
                    } else if (typeof ControllersPool[camelCased(components[0])] !== 'undefined') {
                        controllerName = camelCased(components[0]);
                    } else if (typeof ControllersPool[underscored(components[0])] !== 'undefined') {
                        controllerName = underscored(components[0]);
                    }

                    //test if the controller exists, if not, return a deferred object and reject it.
                    if (typeof controllerName === 'undefined') {
                        return this['404'](); //no such controller, reject
                    }

                    var controller = new ControllersPool[controllerName]();
                    //if the action is omitted, it is 'default'.
                    var action = components.length > 1 ? components[1] : 'default';

                    if (typeof controller._actions[action] !== 'function') {
                        return this['404'](); //no such action, reject
                    }

                    //the URL components after the 2nd are passed to the action method
                    var _arguments = components.length > 2 ? _.rest(components, 2) : [];

                    addHistoryEntry(this, controllerName, action, _arguments);
                    return invokeAction(controllerName, action, _arguments);
                },

                '404':function () {
                    //do nothing, expect overriding
                },

                /**
                 * Return the last invoked action
                 * @return {object} the last action being invoked and it's parameters
                 */
                getLastAction:function () {
                    return _.last(this._history, 1)[0];
                },

                /**
                 * Make navigate() returns a deferred object
                 * @param fragment
                 * @param options may contain trigger and replace options.
                 * @return {*} Deferred
                 */
                navigate: function(fragment, options){
                    var _options = _.extend({}, options);
                    _options.trigger = false; //too hard to port Backbone's mechanism without much refactory,
                    // but such logical flaw can be exploited. The goal is to not modify Backbone.js at all

                    Backbone.Router.prototype.navigate.call(this, fragment, _options);
                    if(options.trigger){
                        return this.dispatch(fragment);
                    }else{
                        return (new $.Deferred()).resolve();
                    }
                }
            };

            function extend(properties){
                var _routes = _.extend(properties.routes || {}, _inherentRouterProperties.routes );
                return Backbone.Router.extend(_.extend(properties, _inherentRouterProperties, { routes: _routes }));
            }

            var RouterClass = Backbone.Router.extend(
                _.extend({ extend: extend }, _inherentRouterProperties)
            );
            RouterClass.extend = extend;
            return RouterClass;
        })(),

        /**
         * An extension of BackboneMVC.Model, add events of 'read' and 'error' to
         * a model, which will be triggered upon loading data from server.
         *
         * This class assumes the returned json packet contains both 'error' and 'data' fields
         * as root properties, which is commonly seen in modern web service APIs. If you business
         * logic cannot comply this standard. Then this model class might not fit.
         * @class BackboneMVC.Model
         * @example //TODO
         */
        Model:{
            extend:function (properties) {
                properties = _.extend({
                    __fetchSuccessCallback:null,
                    __fetchErrorCallback:null,

                    fetch:function (options) {
                        options = options || {};
                        //wrap the success callback, so we get a chance of triggering 'read' event
                        //by taking over the '__fetchSuccessCallback()' defined in 'parse()'
                        var success = options.success;
                        options.success = function (model, resp) {
                            if (success) {
                                success(model, resp);
                            }
                            if (model.__fetchSuccessCallback) {
                                var tmp = model.__fetchSuccessCallback;
                                model.__fetchSuccessCallback = null; //remove the temporary method after use
                                tmp.apply(model);
                            }
                        };
                        //wrap the error callback, so we get a chance of triggering 'error' event
                        var error = options.error;
                        options.error = function (model, resp) {
                            if (error){
                                error(model, resp);
                            }
                            model.trigger('error', error);
                        };
                        Backbone.Model.prototype.fetch.apply(this, [options].concat(_.rest(arguments)));
                    },

                    /**
                     * Intercept the data return from server and see if there is any error.
                     * Overriding is discouraged.
                     * @param {object} response the returned and parsed json object
                     * @return {*}
                     */
                    parse:function (response) {
                        this.__fetchSuccessCallback = null;
                        this.__fetchErrorCallback = null;

                        if (!response || response.error) {
                            //if response contains a non-null 'error' field, still trigger 'error' event
                            this.trigger('error', (response && response.error) || response);
                            return {};
                        }
                        this.__fetchSuccessCallback = function () {
                            this.trigger('read', response.data);
                        }.bind(this);
                        return response.data;
                    }
                }, properties);

                return Backbone.Model.extend(properties);
            }
        }
    });

    //_extendMethodGenerator is used to create a closure that can store class members(fields and members)
    //in the ancestry, so as to provide a basis for the children controller to further derive
    BackboneMVC.Controller.extend = _extendMethodGenerator(BackboneMVC.Controller, {});

    //internal variables
    var ControllersPool = {}; //hashmap, keeps a record of defined Controllers with their names as keys

    //if a Controller class defines these actions, then they will not be treated as action methods
    var systemActions = ['initialize', 'beforeFilter', 'afterRender', 'checkSession'];

    //internal functions
    /**
     *
     * @param {Class} klass the current klass object
     * @param {object} _inheritedMethodsDefinition store all inherited methods from the ancestors(in closure only)
     * @return {Function}
     * @private
     */
    function _extendMethodGenerator(klass, _inheritedMethodsDefinition) {
        //create closure
        return function (properties) {
            var name = properties.name;
            if (typeof name === 'undefined') {
                throw '\'name\' property is mandatory ';
            }

            // also inherits the methods from ancestry
            properties = _.extend({}, _inheritedMethodsDefinition, properties);

            //special handling of method override in inheritance
            var tmpControllerProperties = _.extend({}, BackboneMVC.Controller);

            var actionMethods = {}, secureActions = {};
            //try to pick out action methods
            _.each(properties, function (value, propertyName) {
                tmpControllerProperties[propertyName] = value; // transfer the property, which will be later
                //filter the non-action methods
                if (typeof value !== 'function' || propertyName[0] === '_' ||
                    _.indexOf(systemActions, propertyName) >= 0) {
                    return false;
                }

                actionMethods[propertyName] = value;
                if (propertyName.match(/^user_/i)) { //special handling to secure methods
                    secureActions[propertyName] = value;
                    // even though secure methods start with 'user_', it's useful if they can be invoked without
                    // that prefix
                    var shortName = propertyName.replace(/^user_/i, '');
                    if (typeof properties[shortName] !== 'function') {
                        // if the shortname function is not defined separately, also account it for a secure method
                        secureActions[shortName] = value;
                        actionMethods[shortName] = value;
                    }
                }
            });

            //_actions and _secureActions are only used to tag those two types of methods, the action methods
            //are still with the controller
            _.extend(tmpControllerProperties, actionMethods, {
                _actions:actionMethods,
                _secureActions:secureActions
            });
            //remove the extend method if there is one, so it doesn't stay in the property history
            if ('extend' in tmpControllerProperties) {
                delete tmpControllerProperties.extend;
            }
            //get around of singleton inheritance issue by using mixin
            var _controllerClass = ControllerSingleton.extend(tmpControllerProperties);
            //special handling for utility method of inheritance
            _.extend(_controllerClass, {
                extend:_extendMethodGenerator(_controllerClass, _.extend({}, _inheritedMethodsDefinition, properties))
            });

            //Register Controller
            ControllersPool[name] = _controllerClass;

            return _controllerClass;
        };
    }

    function _d(a) {
        console.log(a);
    }

    /**
     * use duck-typing to check if an object is a Deferred Object.
     * @param suspiciousObject
     * @return {boolean}
     */
    function isDeferred(suspiciousObject) {
        //duck-typing
        return _.isObject(suspiciousObject) && suspiciousObject.promise &&
            typeof suspiciousObject.promise === 'function';
    }

    /**
     * Convert a non-deferred object ot deferred object, and resolve or reject the deferred object based on the value
     * of the non-deferred object.
     * @param deferred
     * @param result
     * @return {object} a Deferred Object
     */
    function assertDeferredByResult(deferred, result) {
        if (typeof result === 'undefined') {
            result = true;
        }
        return deferred[result ? 'resolve' : 'reject'](result);
    }

    /**
     * convert to CamelCased form
     * @param string the non-camel-cased form
     * @return {string}
     */
    function camelCased(string) {
        if (typeof string !== 'string') {
            return null;
        }
        string = string.replace(/\s{2,}/g, ' ');

        return (_.map(string.split(' '), function (entry) {
            return entry.replace(/(^|_)[a-z]/gi,function (match) {
                return match.toUpperCase();
            }).replace(/_/g, '');
        })).join(' ');

    }

    /**
     * convert to underscored form
     * @param string the non-underscored form
     * @return {string}
     */
    function underscored(string) {
        if (typeof string !== 'string') {
            return null;
        }
        string = string.replace(/\s{2,}/g, ' ');

        return (_.map(string.split(' '), function (entry) {
            return entry.replace(/^[A-Z]/g, function (match) {
                return match.toLowerCase();
            })
                .replace(/([a-z])([A-Z])/g, function ($, $1, $2) {
                    return $1 + '_' + $2.toLowerCase();
                });
        })).join(' ');
    }

    /**
     * Invoke the action method under a controller, also takes care of event callbacks and session checking method
     * on the call chain.
     * @param controllerName the controller name
     * @param {string} action action method name
     * @param {Array} _arguments the parameters sent ot the action method
     * @return {*}
     */
    function invokeAction(controllerName, action, _arguments) {
        var controller = new ControllersPool[controllerName]();

        var hooksParameters = [action].concat(_arguments);
        var deferred = $.Deferred();
        //do beforeFilter
        var result = controller.beforeFilter.apply(controller, hooksParameters);
        if (isDeferred(result)) {
            deferred = result;
        } else {
            assertDeferredByResult(deferred, result);
        }

        //check if secure method
        if (typeof controller._secureActions[action] === 'function') {
            //do session checking
            deferred = deferred.pipe(function () {
                var result = controller.checkSession.apply(controller, _arguments);

                if (isDeferred(result)) {
                    return result;
                } else {
                    return assertDeferredByResult(new $.Deferred(), result);
                }
            });
        }

        //invoke the action
        deferred = deferred.pipe(function () {
            var result = controller[action].apply(controller, _arguments);

            if (isDeferred(result)) {
                return result;
            } else {
                return assertDeferredByResult(new $.Deferred(), result);
            }
        });

        //do afterRender
        deferred = deferred.pipe(function () {
            var result = controller.afterRender.apply(controller, hooksParameters);
            if (isDeferred(result)) {
                return result;
            } else {
                return assertDeferredByResult(new $.Deferred(), result);
            }
        });

        return deferred;
    }

    function addHistoryEntry(router, controller_name, action, _arguments) {
        if (router._history.length > 888) {
            router._history = _.last(router._history, 888);
        }
        router._history.push([controller_name, action, _arguments]);
    }
})();