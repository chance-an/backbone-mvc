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
            childMethods: {

            },

            beforeFilter: function(){
                _d(this.name + '::beforeFiler');
                return (new $.Deferred()).resolve();
            },

            afterRender: function(){
                _d(this.name + '::afterRender');
                return (new $.Deferred()).resolve();
            },

            checkSessionValid: function(){
                if(typeof this['childMethods']['checkSessionValid'] === 'function'){
                    var result = this['childMethods']['checkSessionValid'].apply(this, arguments);
                    if(isDeferred(result)){
                        return result.pipe(function(){ return true; },
                        function(){ return false; });
                    }
                    var deferred = new $.Deferred();
                    if(result){
                        deferred.resolve(true);
                    }else{
                        deferred.reject(false);
                    }
                    return deferred;
                }else{
                    return (new $.Deferred()).resolve(true);
                }
            },

            'default': function(){
                //this function will list all the actions of the controller
                //intend to be overridden in most of the cases
            },

            extend: function(properties){
                var name = properties['name'];
                if(typeof name === 'undefined'){
                    throw '\'name\' property is mandatory ';
                }

                //special handling of method override in inheritance
                var tmpAbstractControllerProperties = _.extend({}, Backskin.Controller);
                _.each(systemActions, function(v){
                    if(v in properties){
                        tmpAbstractControllerProperties.childMethods[v] = properties[v];
                    }
                });
                var actionMethods = {};
                _.each(properties, function(value, propertyName){
                    if (typeof value !== 'function' || propertyName[0] === '_'
                        || _.indexOf(systemActions, propertyName) >= 0){
                        return false;
                    }

                    actionMethods[propertyName] = wrapActionExecution(value);
                });
                _.extend(tmpAbstractControllerProperties, actionMethods);
                //get around of singleton inheritance issue by using mixin
                var _controllerClass = ControllerSingleton.extend(_.extend(properties, tmpAbstractControllerProperties));
                //Register Controller
                ControllersPool[name] = _controllerClass;

                return _controllerClass;
            }
        },

        Router: Backbone.Router.extend({
            routes: {
                "*components" : 'dispatch'
            },

            dispatch: function(actionPath){
                _d('Dispatch');
                _d(arguments);

                var components = actionPath.split('/');
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

                if( typeof controller[action] !== 'function'){
                    return this['404'](); //no such action, reject
                }

                var _arguments =  components.length > 2 ? _.rest(components, 2) : [];

                return invokeAction(controllerName, action, _arguments);
            },

            '404': function(){
                //do nothing, expect overriding
            }
        })
    });

    //internal variables
    var ControllersPool = {};
    var systemActions = ['beforeFilter', 'afterRender', 'checkSessionValid'];

    //internal functions
    function _d(a){
        console.log(a);
    }

    function isDeferred(suspiciousObject){
        //duck-typing
        return _.isObject(suspiciousObject) && suspiciousObject['promise'] && typeof suspiciousObject['promise'] == 'function'
    }

    function assertDeferredByResult(deferred, result){
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

    function wrapActionExecution(method){
        return function(){
            var deferred = $.Deferred();
            //do beforeFilter
            var result = this.beforeFilter();
            if(isDeferred(result)){
                deferred = result;
            }else{
                assertDeferredByResult(deferred, result);
            }

            //invoke the action
            deferred = deferred.pipe(_.bind(function(){
                var result = method.apply(this, arguments);

                if(isDeferred(result)){
                    return result;
                }else{
                    return assertDeferredByResult(new $.Deferred(), result);
                }
            }, this));


            //do afterRender
            deferred = deferred.pipe(_.bind(function(){
                var result = this.afterRender();
                if(isDeferred(result)){
                    return result;
                }else{
                    return assertDeferredByResult(new $.Deferred(), result);
                }
            }, this));

            return deferred;
        }
    }

    function invokeAction(controllerName, action, _arguments){
        var controller =  new ControllersPool[controllerName];

        return controller[action].call(controller, _arguments);
    }

    window.debug = function(){
        return {
            'ControllersPool' : ControllersPool
        }
    }
})();