const express = require('express');
const router = express.Router();
const config = require('../config');
const crypto = require('crypto');
/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'Ignite VPN' });
});

router.get('/meet-ignite', function(req, res, next) {
  res.render('meet-ignite', { title: 'Ignite VPN' });
});

router.get('/features', function(req, res, next) {
  res.render('features', { title: 'Ignite VPN' });
});

router.get('/apps', function(req, res, next) {
  res.render('apps', { title: 'Ignite VPN' });
});

router.get('/pricing', function(req, res, next) {
  res.render('pricing', { title: 'Ignite VPN' });
});

router.get('/support', function(req, res, next) {
  res.render('support', { title: 'Ignite VPN' });
});

router.get('/press', function(req, res, next) {
  res.render('press', { title: 'Ignite VPN' });
});

router.get('/blog', function(req, res, next) {
  res.render('blog', { title: 'Ignite VPN' });
});

router.get('/cart', function(req, res, next) {
  res.render('cart', { title: 'Ignite VPN', 'price': config.price });
});

router.get('/payment/:uobj', function(req, res, next) {
    try {
        let decipher = crypto.createDecipher(config.crypto.algorithm, config.crypto.password);
        let decrypted = decipher.update(req.params.uobj, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        var uobj = JSON.parse(decrypted);
        res.render('payment', { title: 'Ignite VPN','pk':config.stripe.pk,'uobj':uobj,'enc':req.params.uobj });
    } catch(e) {
        console.log(e);
        res.status(404).send();
    }
});

router.get('/receipt', function(req, res, next) {
    res.render('receipt', { title: config.site.title });
});

module.exports = router;
