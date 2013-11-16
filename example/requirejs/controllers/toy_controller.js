define(['BackboneMVC'], function(BackboneMVC){

    BackboneMVC.namespace('MyApp.Controllers');

    MyApp.Controllers.ToyController = BackboneMVC.Controller.extend({
        name: 'toy', /* the only mandatory field */

        setup: function(){
            var calabashBrothers = ['red', 'orange', 'yellow', 'green', 'cyan', 'blue', 'purple'];
            var $li = $('li').remove();
            var $ul = $('ul');
            _.each(calabashBrothers, function(color){
                $li.clone().find('a').attr('href', '#toy/changeColor/' + color)
                    .html(color).parent().appendTo($ul);
            });
        },

        changeColor: function(color){
            $('body').css('backgroundColor', color);
        }

    });
});
