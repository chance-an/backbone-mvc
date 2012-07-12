(function(){
    var router;
    function initialize(){
        setupSyntaxHighlighter();
        setupCodeAreaAction();

        router = new Backskin.Router(); //please use the new automatic router
        Backbone.history.start(); //please still call Backbone's facility here
    }

    function setupSyntaxHighlighter(){
        SyntaxHighlighter.defaults['gutter'] = false;
        SyntaxHighlighter.defaults['toolbar'] = false;
        SyntaxHighlighter.autoloader(
            'js jscript javascript	javascripts/SyntaxHighlighter/shBrushJScript.js',
            'php					javascripts/SyntaxHighlighter/shBrushPhp.js',
            'text plain				javascripts/SyntaxHighlighter/shBrushPlain.js',
            'xml xhtml xslt html	javascripts/SyntaxHighlighter/shBrushXml.js'
        );

        SyntaxHighlighter.all();
    }

    function setupCodeAreaAction(){

        function test(){
            if( $('[class^="brush"]').length !== 0){
                setTimeout(test, 100);
            }else{
                op();
            }
        }
        setTimeout(test, 100);

        function op(){
            $('.syntaxhighlighter').each(function(i, e){
                var $element = $(e);
                $element.css('position', 'absolute');
                var wrapper = $element.parent();
                wrapper.css('position', 'relative');
                wrapper.height($element.height());
                wrapper.width($element.width());

                $.each(['marginLeft','marginRight','marginTop','marginBottom'], function(i, e){
                    wrapper.css(e, $element.css(e));
                    $element.css(e, 0);
                });

                var currentWidth = $element.width();
                var width = calculateWidth($element);

                $element.on('mouseover', (function($element, currentWidth, maxWidth){
                    return function(){
                        var padding = 15;
                        $element.css('padding', 15);
                        var width = maxWidth + (padding * 2);
                        width = Math.min($(window).width(), width);
                        if(currentWidth < width){
                            $element.width(width);
                            $element.css('left', (currentWidth - width) / 2 );
                        }else{
                            $element.css('left', -padding-1 );
                        }
                        $element.css('top', -padding-1 );
                    }
                }($element, currentWidth, width)));

                $element.on('mouseout', (function($element, currentWidth, maxWidth){
                    return function(){
                        $element.css('padding', 0);
                        $element.width(currentWidth);
                        $element.css('left', 0 );
                        $element.css('top', 0 );

                    }
                }($element, currentWidth, width)));
            });
        }

        function calculateWidth($element){
            return Math.max.apply(Math, $.map($element.find('td div.container div.line'), function( e ){
                return Array.prototype.reduce.call($(e).find('code').map(function(i, e){
                    return $(e).outerWidth();
                }), function(a, b){return a + b;}, 0 );
            })) ;
        }
    }


    $(document).ready(initialize);

    var Controller1 = Backskin.Controller.extend({
        name: 'ctrl1', /* the only mandatory field */

        /**
         * This is a common action method, it is invoked
         * automatically if url matches
         */
        hello: function(){
            alert('Hello world!');
        },

        helloInChinese: function(){
            //you can invoke any method in this controller (including the private methods for sure)
            this._privateMethod();
        },

        /**
         * This function will remain untouched, the router cannot see
         * this method
         */
        _privateMethod: function(){
            alert('你好世界!');
        }
    });


    Backskin.Controller.extend({
        name: 'my_controller', /* the only mandatory field */

        'my-method': function(how, when){
            var phrase = how + ' ' + (when || 'unknown');
            this._output(phrase);
        },

        _output: function(string){
            $('#area1').append($('<div>' + string + '</div>'));
        }
    });

    var AsynchronousController = Backskin.Controller.extend({
        name: 'asynchronous', /* the only mandatory field */

        'method': function(){
            var deferred = new $.Deferred();

            var colors = ['red', 'orange', 'yellow', 'green', 'cyan', 'blue', 'purple'];
            var index = 0;

            var instance = this;
            (function op(){
                if(index < colors.length){
                    instance._changeColor(colors[index++]);
                    setTimeout(op, 567);
                }else{
                    deferred.resolve();
                }
            })();
            return deferred;
        },

        _changeColor: function(color){
            $('#area2').css('background-color', color);
        }
    });

    window['procedure1'] = function(){
        var r = router.navigate('asynchronous/method', {trigger:true, replace: false});
        r.done(function(){
            $('#area2').html('Nice I change to white!');
            (new AsynchronousController())._changeColor('white');
        });
    };

})();

