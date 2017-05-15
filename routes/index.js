const express = require('express');
const router = express.Router();
const config = require('../config');
const crypto = require('crypto');
const zlib = require('zlib');

/* GET home page. */
router.get('/', function(req, res, next) {
  if (req.session.key) {
      res.render('index', { title: 'Ignite VPN', email:req.session.key });
  } else {
      res.render('index', { title: 'Ignite VPN' });
  }
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
    if (req.body.email && req.body.password) {
        email = req.body.email;
        pwd = req.body.password;
        verifyLogin(req, email, pwd).then(function(result) {
            if (Object.keys(result).length === 1) {
                req.session.key = email;
                req.session.user = JSON.stringify(result[0]);
                res.redirect('/members/clientarea');
            } else {
                res.render('login', {title: config.site.title});
            }
        }).catch(function(err) {
            console.log(err);
        });
    } else {
        res.render('login', {title: config.site.title});
    }
});

router.get('/members/clientarea', function(req, res, next) {
    if (!req.session.key) {
        res.render('login', {title: config.site.title});
    } else {
        try {
            user = JSON.parse(req.session.user);
            res.render('clientarea', { title: config.site.title, user:user, email: user.email });
        } catch(e) {
            console.log(e);
            res.status(500).send();
        }
    }
});

function verifyLogin(req, email, pwd) {
    let db = req.db;
    let collection = db.get('users');
    return new Promise(function(resolve, reject) {
        collection.find({email: email, password:pwd}, function(err, result) {
            if (err) {
                console.log(err);
                return reject(err);
            }
            console.log(result);
            return resolve(result);
        });
    })
    /*
    let query = 'select * from ignite.users where email='+email+' and password='+pwd+' and active="1"';
    return new Promise(function(resolve, reject) {
        console.log(query);
        connection.query(query, function(err, result, fields) {
            if (err) {
                console.log(err);
                return reject(err);
            }
            console.log('here');
            return resolve(result);
        });
    });
    */
}

module.exports = router;
