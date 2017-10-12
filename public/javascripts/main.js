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


  //validation
  $('#new_signup').validate({
    rules: {
      firstname: "required",
      lastname: "required",
      username: {
        required: true,
        minlength: 2
      },
      password: {
        required: true,
        minlength: 5
      },
      confirm_password: {
        required: true,
        minlength: 5,
        equalTo: "#password"
      },
      email: {
        required: true,
        email: true
      },
      topic: {
        required: "#newsletter:checked",
        minlength: 2
      },
      agree: "required"
    },
    messages: {
      firstname: "Please enter your firstname",
      lastname: "Please enter your lastname",
      username: {
        required: "Please enter a username",
        minlength: "Your username must consist of at least 2 characters"
      },
      password: {
        required: "Please provide a password",
        minlength: "Your password must be at least 5 characters long"
      },
      confirm_password: {
        required: "Please provide a password",
        minlength: "Your password must be at least 5 characters long",
        equalTo: "Please enter the same password as above"
      },
      email: "Please enter a valid email address",
      agree: "Please accept our policy",
      topic: "Please select at least 2 topics"
    },
    submitHandler: function(form) {
      var card = {
        number: $('input#signup_cc_no').val(),
        exp_month: $('select#signup_expiry_month').val(),
        exp_year: $('select#signup_expiry_year').val(),
        cvc: $('input#signup_ccv').val()
      };
      Stripe.createToken(card, function(status, response) {
        if (status !== 200) {
        } else {
          $('#signup_token').val(response.id);
          var inp = $('input, textarea, select').not('input[type=submit]');
          $.ajax({
            type: 'POST',
            url: '/api/register',
            data: inp,
            success:  function(data) {
            }
          })
        }
      });
      return false;
    }
  })
})
