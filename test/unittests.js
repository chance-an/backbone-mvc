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

    describe("A controller", function(){
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
            var signal = false;
            setTimeout(function(){
                signal = true;
            }, 80); //wait 80 ms
            waitsFor(function(){
                return signal;
            }, 'call finished', 100);

            runs(function(){
                expect(privateMethod).not.toHaveBeenCalled();
            });
        });
    });
})();

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


