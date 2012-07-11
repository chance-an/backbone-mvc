(function(){

    function initialize(){
        setupSyntaxHighlighter();
        console.log('thanks');

        var router = new Backskin.Router(); //please use the new automatic router
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
    })
})();

