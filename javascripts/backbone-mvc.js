//This software requires Backbone.js and Underscore.js to work correctly.
//Author: Changsi An anchangsi@gmail.com

(function(){
    var PRODUCT_NAME = 'Backskin'; //Don't like the name? Help yourself.

    //check prerequisites
    if(typeof Backbone === 'undefined' || typeof _ === 'undefined'){
        return;
    }

    var Backskin = window[PRODUCT_NAME] = {};

    var ControllerSingleton = (function(){
        function BaseController(){
            this._created = (new Date()).getTime();
        }
        _.extend(BaseController.prototype, {
            _created: null
        });

        BaseController.extend = function(properties){
            var instance = undefined;
            var klass = function Controller(){
                if(instance !== undefined ){ //try to simulate Singleton
                    return instance;
                }
                BaseController.apply(this, arguments);
                if(this['initialize'] !== undefined){
                    this['initialize'].apply(this, arguments);
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
    })();

    _.extend(Backskin, {
        namespace: function(namespaceString){
            var components = namespaceString.split('.');
            var node = window;
            for(var i = 0, l = components.length; i < l; i++){
                if(node[components[i]] === undefined){
                    node[components[i]] = {};
                }
                node = node[components[i]];
            }
        },

        //Controllers
        Controller: {
            beforeFilter: function(){
                return (new $.Deferred()).resolve();
            },

            afterRender: function(){
                return (new $.Deferred()).resolve();
            },

            checkSession: function(){
                //if not defined, then always succeed
                return (new $.Deferred()).resolve(true);
            },

            'default': function(){
                //this function will list all the actions of the controller
                //intend to be overridden in most of the cases
                return true;
            }
        },

        Router: Backbone.Router.extend({
            _history: [],
            _reportDeferred : null,

            routes: {
                "*components" : 'dispatch'
            },

            dispatch: function(actionPath){
                var components = actionPath.replace(/\/+$/g, '').split('/');
                var controllerName = undefined;

                //look for controllers
                if(ControllersPool[components[0]]){
                    controllerName = components[0];
                }else if( typeof ControllersPool[camelCased(components[0])] !== 'undefined'){
                    controllerName = camelCased(components[0]);
                }else if ( typeof ControllersPool[underscored(components[0])] !== 'undefined' ){
                    controllerName = underscored(components[0]);
                }

                //test if controller exists, if not, return deferred and reject.
                if(typeof controllerName == 'undefined'){
                    return this['404'](); //no such controller, reject
                }

                var controller = new ControllersPool[controllerName];

                var action = components.length > 1 ? components[1] : 'default';

                if( typeof controller._actions[action] !== 'function'){
                    return this['404'](); //no such action, reject
                }

                var _arguments =  components.length > 2 ? _.rest(components, 2) : [];

                addHistoryEntry(this, controllerName, action, _arguments);

                return invokeAction(controllerName, action, _arguments);
            },

            '404': function(){
                //do nothing, expect overriding
            },

            getLastAction: function (){
                return _.last(this._history, 1)[0];
            },

            navigate: function(fragment, options){
                var _options = _.extend({}, options);
                _options.trigger = false;
                Backbone.Router.prototype.navigate.call(this, fragment, _options);
                if(options.trigger){
                    return this.dispatch(fragment);
                }else{
                    return (new $.Deferred()).resolve();
                }

            }
        }),

        Model: {
            extend: function(properties){
                properties = _.extend({
                    __fetchSuccessCallback: null,
                    __fetchErrorCallback: null,

                    fetch: function(options){
                        options = options || {};
                        var backbone_fetch = Backbone.Model.prototype.fetch;
                        var success = options.success;
                        options.success = function(model, resp){
                            if(success) success(model, resp);
                            if(model.__fetchSuccessCallback){
                                var tmp = model.__fetchSuccessCallback;
                                model.__fetchSuccessCallback = null;
                                tmp.apply(model);
                            }
                        };
                        var error = options.error;
                        options.error = function(model, resp){
                            if(error) error(model, resp);
                            if(model.__fetchErrorCallback){
                                var tmp = model.__fetchErrorCallback;
                                model.__fetchErrorCallback = null;
                                tmp.apply(model);
                            }
                        };
                        backbone_fetch.apply(this, [options].concat(_.rest(arguments)));
                    },

                    parse: function(response){
                        this.__fetchSuccessCallback = null;
                        this.__fetchErrorCallback = null;

                        if(!response || response.error){
                            this.__fetchErrorCallback = function(){
                                this.trigger('error', (response && response.error) || response);
                            }.bind(this);
                            return {};
                        }
                        this.__fetchSuccessCallback = function(){
                            this.trigger('read', response.data);
                        }.bind(this);
                        return response.data;
                    }
                }, properties);

                return Backbone.Model.extend(properties);
            }
        }
    });

    Backskin.Controller.extend = _extendMethodGenerator(Backskin.Controller, {});

    //internal variables
    var ControllersPool = {};
    var systemActions = ['initialize', 'beforeFilter', 'afterRender', 'checkSession'];

    //internal functions
    /**
     *
     * @param klass the current klass object
     * @param _inheritedMethodsDefinition store all inherited methods from the ancestors(in closure only)
     * @return {Function}
     * @private
     */
    function _extendMethodGenerator(klass, _inheritedMethodsDefinition){
        return function(properties){
            var name = properties['name'];
            if(typeof name === 'undefined'){
                throw '\'name\' property is mandatory ';
            }

            // also inherits the methods from ancestry
            properties = _.extend({}, _inheritedMethodsDefinition, properties);

            //special handling of method override in inheritance
            var tmpControllerProperties = _.extend({}, Backskin.Controller);

            var actionMethods = {}, secureActions = {};
            _.each(properties, function(value, propertyName){
                tmpControllerProperties[propertyName] = value; // transfer the property
                if (typeof value !== 'function' || propertyName[0] === '_'
                    || _.indexOf(systemActions, propertyName) >= 0){
                    return false;
                }

                actionMethods[propertyName] = value;
                if(propertyName.match(/^user_/i)){
                    secureActions[propertyName] = value;
                    var shortName = propertyName.replace(/^user_/i, '');
                    if(typeof properties[shortName] !== 'function'){
                        // if the shortname function is not defined separately, also account it for a secure method
                        secureActions[shortName] = value;
                        actionMethods[shortName] = value;
                    }
                }
            });

            _.extend(tmpControllerProperties, actionMethods, {
                _actions : actionMethods,
                _secureActions: secureActions
            });
            tmpControllerProperties = _.pick(tmpControllerProperties,
                _.difference(_.keys(tmpControllerProperties), ['extend']));

            //get around of singleton inheritance issue by using mixin
            var _controllerClass = ControllerSingleton.extend(tmpControllerProperties);
            //special inheritance utility method handling
            _.extend(_controllerClass, {
                extend : _extendMethodGenerator(_controllerClass, _.extend({}, _inheritedMethodsDefinition, properties))
            });

            //Register Controller
            ControllersPool[name] = _controllerClass;

            return _controllerClass;
        }
    }

    function _d(a){
        console.log(a);
    }

    function isDeferred(suspiciousObject){
        //duck-typing
        return _.isObject(suspiciousObject) && suspiciousObject['promise'] && typeof suspiciousObject['promise'] == 'function'
    }

    function assertDeferredByResult(deferred, result){
        if(typeof result == 'undefined'){
            result = true;
        }
        return deferred[result? 'resolve' : 'reject'](result);
    }

    function camelCased(string){
        if(typeof string !== 'string'){
            return null;
        }
        string = string.replace(/\s{2,}/g, ' ');

        return (_.map(string.split(' '), function(entry){
            return entry.replace(/(^|_)[a-z]/gi, function(match){return match.toUpperCase()}).replace(/_/g, '');
        })).join(' ');

    }

    function underscored(string){
        if(typeof string !== 'string'){
            return null;
        }
        string = string.replace(/\s{2,}/g, ' ');

        return (_.map(string.split(' '), function(entry){
            return entry.replace(/^[A-Z]/g, function(match){return match.toLowerCase()})
                .replace(/([a-z])([A-Z])/g, function($, $1, $2){return $1 + '_' + $2.toLowerCase();});
        })).join(' ');

    }

    function invokeAction(controllerName, action, _arguments){
        var controller =  new ControllersPool[controllerName];

        var hooksParameters = [action].concat(_arguments);
        var deferred = $.Deferred();
        //do beforeFilter
        var result = controller.beforeFilter.apply(controller, hooksParameters);
        if(isDeferred(result)){
            deferred = result;
        }else{
            assertDeferredByResult(deferred, result);
        }

        //check if secure method
        if(typeof controller._secureActions[action] === 'function'){
            //do session checking
            deferred = deferred.pipe(function(){
                var result = controller['checkSession'].apply(controller, _arguments);

                if(isDeferred(result)){
                    return result;
                }else{
                    return assertDeferredByResult(new $.Deferred(), result);
                }
            })
        }

        //invoke the action
        deferred = deferred.pipe(function(){
            var result = controller[action].apply(controller, _arguments);

            if(isDeferred(result)){
                return result;
            }else{
                return assertDeferredByResult(new $.Deferred(), result);
            }
        });

        //do afterRender
        deferred = deferred.pipe(function(){
            var result = controller.afterRender.apply(controller, hooksParameters);
            if(isDeferred(result)){
                return result;
            }else{
                return assertDeferredByResult(new $.Deferred(), result);
            }
        });

        return deferred;
    }

    function addHistoryEntry(router, controller_name, action, _arguments){
        if(router._history.length > 888){
            router._history = _.last(router._history, 888);
        }
        router._history.push([controller_name, action, _arguments]);
    }

    window.debug = function(){
        return {
            'ControllersPool' : ControllersPool
        }
    }
})();