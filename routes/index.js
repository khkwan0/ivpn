const express = require('express');
const router = express.Router();
const config = require('../config');
const crypto = require('crypto');
const zlib = require('zlib');
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

function decrypt(in_s) {
    let decipher = crypto.createDecipher(config.crypto.algorithm, config.crypto.password);
    let decrypted = decipher.update(in_s, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
}

router.get('/payment/:uobj', function(req, res, next) {
    try {
        let decrypted = decrypt(req.params.uobj);
        var uobj = JSON.parse(decrypted);
        res.render('payment', { title: 'Ignite VPN','pk':config.stripe.pk,'uobj':uobj,'enc':req.params.uobj });
    } catch(e) {
        console.log(e);
        res.status(404).send();
    }
});

router.get('/receipt/:cobj', function(req, res, next) {
    try {
        charge_data = decrypt(req.params.cobj);
        buf = Buffer.from(charge_data, 'base64');
        zlib.inflate(buf, function(err, buffer) {
            charge_obj = JSON.parse(buffer);
            console.log(charge_obj);
            res.render('receipt', { title: config.site.title, 'cobj':charge_obj });
        });
    } catch(e) {
        res.status(404).send(e.stack);
    }
});

router.post('/login', function(req, res, next) {
    if (req.body.username && req.body.password) {
        uname = req.body.username;
        pwd = req.body.password;
        if (verifyLogin(uname, pwd)) {
            res.redirect('/members/clientarea');
        } else {
            res.render('login', {title: config.site.title});
        }
    } else {
        res.render('login', {title: config.site.title});
    }
});

router.get('/members/clientarea', function(req, res, next) {
    if (!req.user) {
        res.render('login', {title: config.site.title});
    } else {
    }
});

module.exports = router;
