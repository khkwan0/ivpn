$(document).ready(function() {
    function matchHeight() {
        var getWindowWidth = $(window).width();
        var getWindowHeight = $(window).height();
        $('.parent').each(function() {
            $(this).find('.child').matchHeight({
                byRow: true,
            });
        });
    }
    matchHeight();


    // resize
    $(window).resize(function() {});

});
