/**
 * User: anch
 * Date: 9/9/12
 * Time: 8:36 PM
 */
/*global jasmine:true
    describe:true
    it:true
    afterEach:true
    runs:true
    waitsFor:true
    exppect:true
*/

(function(){
    'use strict';

    describe("Controller inheritance", function() {

        var parentMethodMock = jasmine.createSpy('parentMethodMock'),
            childMethodMock = jasmine.createSpy('childMethodMock');
        var deferred = new $.Deferred();

        var Parent = BackboneMVC.Controller.extend({
            name: 'parent',

            method: parentMethodMock,

            afterRender: function(){
                deferred.resolve();
            }
        });

        Parent.extend({
            name: 'child1',

            method: childMethodMock,

            afterRender: function(){
                deferred.resolve();
            }
        });

        Parent.extend({
            name: 'child2'

            //this controller doesn't implement anything, so its parent's methods will be passed over.
        });

        afterEach(function() {
            deferred = new $.Deferred();
        });

        it("should allow inheriting class to override base class's method", function() {
            runs(function(){
                window.location = "#child1/method";
            });

            waitsFor(function(){
                return deferred.state() === 'resolved';
            }, 'call finished', 100);

            runs(function(){
                expect(parentMethodMock).not.toHaveBeenCalled();
                expect(childMethodMock).toHaveBeenCalled();
            });

        });

        it("should pass actions from base class to inheriting class", function() {
            runs(function(){
                window.location = "#child2/method";
            });

            waitsFor(function(){
                return deferred.state() === 'resolved';
            }, 'call finished', 100);

            runs(function(){
                expect(parentMethodMock).toHaveBeenCalled();
            });
        });
    });

    describe("A Controller", function(){
        var publicMethod = jasmine.createSpy('publicMethod'),
            privateMethod = jasmine.createSpy('privateMethod');
        var deferred = new $.Deferred();

        var Controller1 = BackboneMVC.Controller.extend({
            name: 'controller1',

            publicMethod: publicMethod,

            _privateMethod: privateMethod,

            afterRender: function(){
                deferred.resolve();
            }
        });

        afterEach(function() {
            deferred = new $.Deferred();
        });

        it("should have its public actions be triggered through url", function() {
            runs(function(){
                window.location = "#controller1/publicMethod";
            });

            waitsFor(function(){
                return deferred.state() === 'resolved';
            }, 'call finished', 100);

            runs(function(){
                expect(publicMethod).toHaveBeenCalled();
            });
        });

        it("should have its actions be triggered with parameters as specified in the url", function() {
            runs(function(){
                window.location = "#controller1/publicMethod/1/2";
            });

            waitsFor(function(){
                return deferred.state() === 'resolved';
            }, 'call finished', 100);

            runs(function(){
                expect(publicMethod).toHaveBeenCalledWith("1", "2");
            });
        });

        it("should not have its private actions be triggered through url", function() {
            runs(function(){
                window.location = "#controller1/_privateMethod";
            });

            waits(50);

            runs(function(){
                expect(privateMethod).not.toHaveBeenCalled();
            });

        });
    });

    describe("A Secure Method", function(){
        var deferred = new $.Deferred();
        var testValue = 0;

        var Controller2 = BackboneMVC.Controller.extend({
            name: 'controller2',

            checkSession: function(){
            },

            user_secure: function(){
                testValue = 1;
            },

            afterRender: function(){
                deferred.resolve();
            }
        });

        beforeEach(function(){
            testValue = 0;

            runs(function(){
                window.location = "#";
            });

            waits(50);
        });

        afterEach(function() {
            deferred = new $.Deferred();
        });

        it("starts with \"user_\"", function(){
            var controller = new Controller2();

            expect(controller._secureActions.user_secure).toBeDefined();
            expect(controller._secureActions.secure).toBeDefined();
        });

        it("will be triggered only after \"checkSession\" method is triggered first", function(){
            spyOn(Controller2.prototype, 'checkSession');
            spyOn(Controller2.prototype, 'user_secure');

            runs(function(){
                window.location = "#controller2/user_secure";
            });

            waitsFor(function(){
                return deferred.state() === 'resolved';
            }, 'call finished', 100);

            runs(function(){
                expect(Controller2.prototype.checkSession).toHaveBeenCalled();
                expect(Controller2.prototype.user_secure).toHaveBeenCalled();
            });
        });

        it("will not be triggered if \"checkSession\" method returns false", function(){
            spyOn(Controller2.prototype, 'checkSession').andReturn(false);
            spyOn(Controller2.prototype, 'user_secure');

            runs(function(){
                window.location = "#controller2/user_secure";
            });

            waits(50);

            runs(function(){
                expect(Controller2.prototype.checkSession).toHaveBeenCalled();
                expect(Controller2.prototype.user_secure).not.toHaveBeenCalled();
            });

        });

        it("nor \"checkSession\" method returns a deferred object which will be rejected", function(){
            var deferred = $.Deferred();
            spyOn(Controller2.prototype, 'checkSession').andReturn(deferred);
            spyOn(Controller2.prototype, 'user_secure');

            runs(function(){
                window.location = "#controller2/user_secure";
            });

            waits(50);

            runs(function(){
                deferred.reject();
                expect(Controller2.prototype.checkSession).toHaveBeenCalled();
                expect(Controller2.prototype.user_secure).not.toHaveBeenCalled();
            });

        });

        it("should be able to be triggered with a short name", function(){
            spyOn(Controller2.prototype, 'user_secure').andCallThrough();

            runs(function(){
                window.location = "#controller2/secure";
            });

            waitsFor(function(){
                return deferred.state() === 'resolved';
            }, 'call finished', 100);

            runs(function(){
                expect(testValue).toEqual(1);
            });
        });
    });

    describe("A BackboneMVC model", function(){


        var Model = BackboneMVC.Model.extend({
            url: "mock"
        });

        var _originalJqueryAjax = $.ajax;
        it("should be able to trigger 'read' event of the model if 'fetch' method is successful", function(){

            var callback = jasmine.createSpy('callback');
            var deferred = new $.Deferred();
            //mock $.ajax
            var parameters = [deferred, "{\"property1\":\"value1\", \"property2\":\"value2\"}"];
            $.ajax = function(options){
                setTimeout(function(){
                    deferred.resolve(parameters);
                }, 50);

                if(typeof options.success !== 'undefined'){
                    deferred.done(function(){
                        options.success.apply(options.success, arguments);
                    });
                }

                return deferred;
            };

            runs(function(){
                var model = new Model();
                model.on('read', callback);
                model.fetch();
            });

            waitsFor(function(){
                return deferred.state() === 'resolved';
            }, 'call finished', 100);

            runs(function(){
                expect(callback).toHaveBeenCalled();
            });
        });

        it("should be able to trigger 'fail' event of the model if 'fetch' method fails", function(){

            var callback = jasmine.createSpy('callback');
            var deferred = new $.Deferred();
            //mock $.ajax
            var parameters = [deferred, "{\"property1\":\"value1\", \"property2\":\"value2\"}"];
            $.ajax = function(options){
                setTimeout(function(){
                    deferred.reject(parameters);
                }, 50);

                if(typeof options.error !== 'undefined'){
                    deferred.fail(function(){
                        options.error.apply(options.error, arguments);
                    });
                }
                return deferred;
            };

            runs(function(){
                var model = new Model();
                model.on('error', callback);
                model.fetch();
            });

            waitsFor(function(){
                return deferred.state() === 'rejected';
            }, 'call finished', 150);

            runs(function(){
                expect(callback).toHaveBeenCalled();
            });
        });

        it("should be able to trigger 'fail' event of the model if 'fetch' method retrieves a json packet that " +
            "contains a non-null field named \"error\"", function(){

            var callback = jasmine.createSpy('callback');
            var deferred = new $.Deferred();
            //mock $.ajax
            var parameters = [ $.parseJSON("{\"data\" : { \"property1\" : \"value1\", \"property2\" : \"value2\"}, " +
                "\"error\":\"error\"}"), 200, deferred];
            $.ajax = function(options){
                setTimeout(function(){
                    deferred.resolve(parameters);
                }, 50);

                if(typeof options.success !== 'undefined'){
                    deferred.done(function(){
                        options.success.apply(options.success, parameters);
                    });
                }
                return deferred;
            };

            runs(function(){
                var model = new Model();
                model.on('error', callback);
                model.fetch();
            });

            waits(150);

            runs(function(){
                expect(callback).toHaveBeenCalled();
            });
        });

        $.ajax = _originalJqueryAjax;
    });
})();

/**
 * jasmine boilerplate
 */
(function () {
    'use strict';

    var jasmineEnv = jasmine.getEnv();
    jasmineEnv.updateInterval = 250;


    var htmlReporter = new jasmine.HtmlReporter();
    jasmineEnv.addReporter(htmlReporter);


    jasmineEnv.specFilter = function (spec) {
        return htmlReporter.specFilter(spec);
    };

    $(document).ready(function(){
        window.location = "#"; //clear hash in the url, so no prior information will affect the first action triggering

        var router = new BackboneMVC.Router();
        Backbone.history.start();
        execJasmine();

    });

    function execJasmine() {
        jasmineEnv.execute();
    }
})();


