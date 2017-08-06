  //options select
  $('#package_1').on('click', function() {
    $('#package_2').removeClass('selected');
    $('#package_3').removeClass('selected');
    $('#package_1').addClass('selected');
    $('#signup_package_id').val('monthly');
    $('#order-total-value').val(695);
    $('.order-total-value').text('$6.95');
    $('.IgniteVPN-plan').text('IgniteVPN 1-month plan');
    $('.plan-description').text('($6.95 per month, billed monthly)');
  });

  $('#package_2').on('click', function() {
    $('#package_1').removeClass('selected');
    $('#package_3').removeClass('selected');
    $('#package_2').addClass('selected');
    $('#package_1.alert-one-month').show();
    $('#signup_package_id').val('semi');
    $('.order-total-value').text('$35.95');
    $('#order-total-value').val(3595);
    $('.IgniteVPN-plan').text('IgniteVPN 6-month plan');
    $('.plan-description').text('($5.99 per month, billed every 6 months)');
  });

  $('#package_3').on('click', function() {
    $('#package_1').removeClass('selected');
    $('#package_2').removeClass('selected');
    $('#package_3').addClass('selected');
    $( ".alert-one-month" ).show();
    $('#signup_package_id').val('annual');
    $('.order-total-value').text('$39.95');
    $('#order-total-value').val(3995);
    $('.IgniteVPN-plan').text('IgniteVPN 12-month plan');
    $('.plan-description').text('($3.33 per month, billed every 12 months)');
  });
