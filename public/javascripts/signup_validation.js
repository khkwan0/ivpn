  $('#new_signup').validate({
    rules: {
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
    },
    messages: {
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
    },
    submitHandler: function() {
      $.post('/api/register',
        {
          uname: $('#signup_username').val(),
          email: $('#signup_email').val(),
          pwd: $('#signup_password').val(),
        },
        function(data) {
          if (data.status === 0) {
            $('#error_ctr').text(data.msg);
            $('#error_ctr').show();
          } else {
            $('#payment_area').show();
            $('#signup_submit').hide();
            $('input').prop('disabled', true);
            $('#sub_button').prop('disabled', false);
          }
        },
        'json'
      );
      return false;
    }
  })
