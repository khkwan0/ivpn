const express = require('express');
const router = express.Router();
const config = require('../config');
const crypto = require('crypto');
const zlib = require('zlib');
const uuidv4 = require('uuid/v4');
const sendmail = require('sendmail')();

/* GET home page. */
router.get('/', function(req, res, next) {
    if (req.session.key) {
        res.render('index', { title: config.site.title, email:req.session.key });
    } else {
        res.render('index', { title: config.site.title });
    }
});

router.get('/meet-ignite', function(req, res, next) {
    if (req.session.key) {
        res.render('meet-ignite', { title: config.site.title , email:req.session.key });
    } else {
        res.render('meet-ignite', { title: config.site.title });
    }
});

router.get('/features', function(req, res, next) {
    if (req.session.key) {
        res.render('features', { title: config.site.title , email:req.session.key });
    } else {
        res.render('features', { title: config.site.title });
    }
});

router.get('/apps', function(req, res, next) {
    if (req.session.key) {
        res.render('apps', { title: config.site.title , email:req.session.key });
    } else {
        res.render('apps', { title: config.site.title });
    }
});

router.get('/pricing', function(req, res, next) {
    if (req.session.key) {
        res.render('pricing', { title: config.site.title , email:req.session.key });
    } else {
        res.render('pricing', { title: config.site.title });
    }
});

router.get('/support', function(req, res, next) {
    if (req.session.key) {
        res.render('support', { title: config.site.title , email:req.session.key });
    } else {
        res.render('support', { title: config.site.title });
    }
});

router.get('/press', function(req, res, next) {
    if (req.session.key) {
        res.render('press', { title: config.site.title , email:req.session.key });
    } else {
        res.render('press', { title: config.site.title });
    }
});

router.get('/blog', function(req, res, next) {
    if (req.session.key) {
        res.render('blog', { title: config.site.title , email:req.session.key });
    } else {
        res.render('blog', { title: config.site.title });
    }
});

router.get('/faq', (req, res, next) => {
 res.render('faq', {title: config.site.title});
});

router.get('/terms', (req, res, next) => {
 res.render('terms', {title: config.site.title});
});

router.get('/privacy', (req, res, next) => {
 res.render('privacy', {title: config.site.title});
});

router.get('/contact', (req, res, next) => {
 res.render('contact', {title: config.site.title});
});

router.get('/cart', function(req, res, next) {
    if (req.session.key) {
        res.render('cart', { title: config.site.title, 'price': config.price , email:req.session.key, 'pk': config.stripe.pk });
    } else {
        res.render('cart', { title: config.site.title, 'price': config.price, 'pk': config.stripe.pk });
    }
});

router.get('/password_reset/:key', (req, res, next) => {
    var key = req.params.key;
    if (key) {
        let db = req.db;
        let collection = db.get('recovery_keys');
        collection.find({uuid:key}, (err, result) => {
            if (err) {
                res.status(404).send();
            } else if (Object.keys(result).length === 1) {
                res.render('password_reset', { title: config.site.title, 'key':key });
            } else {
                res.status(404).send();
            }
        });
    } else {
        res.status(404).send();
    }
});

router.post('/do_reset', (req, res, next) => {
    let key = req.body.key;
    let db = req.db;
    let collection = db.get('recovery_keys');
    collection.find({uuid:key}, (err, result) => {
        return new Promise((resolve, reject) => {
            if (err) {
                reject(err);
            } else {
                resolve(result[0]);
            }
        });
    }).then((rec_obj) => {
        return new Promise((resolve, reject) => {
            let collection = db.get('users');
            let email = rec_obj[0].email;
            collection.update({email:email}, { $set: { 'password': req.body.pw1 } }, (err, result) => {
                if (err) {
                    reject(err);
                } else {
                    res.render('reset_result', { 'ok':1, title: config.site.title });
                    resolve(result);
                }
            });
        });
    }).then((result) => {
        console.log(result);
        return new Promise((resolve, reject) => {
            if (result.ok) {
                let collection = db.get('recovery_keys');
                collection.remove({uuid:key}, (err, result) => {
                    if (err) {
                        reject('Passwowrd changed, key is gone.');
                    } else {
                        resolve(result);
                    }
                });
            } else {
                reject(result);
            }
        });
    }).catch((err) => {
        console.log(err);
        res.render('reset_result', { 'error':err, title: config.site.title });
    });
});

router.get('/reset', (req, res, next) => {
    if (req.session.key) {
        res.render('reset', { title: config.site.title, email: req.session.key });
    } else {
        res.render('reset', { title: config.site.title });
    }
});

router.post('/reset_me/', (req, res, next) => {
    let email = req.body.email;
    let db = req.db;
    getUserByEmail(db, email).then((res_obj) => {
        return generateEphemeral(res_obj);
    }).then((recovery_obj) => {
        console.log('xxx'+recovery_obj);
        mail_obj = {
            from: config.email.from,
            to: recovery_obj.email,
            subject: 'Ignite VPN - Password recovery',
            html: '<div>Click on the following link to reset your password:</div><div><a href="https://ignitevpn.com/password_reset/'+recovery_obj.uuid+'">https://ignitevpn.com/password_reset/'+recovery_obj.uuid+'</a></div><div><h2>Note: The above link will expire in 5 minutes.</h2></div>'
        };
        return sendMail(mail_obj);
    }).then((email)=>{
        res.render('reset_final', { to: email, title: config.site.title });
    }).catch((e)=> {
        res.render('reset_final', { result: e, title: config.site.title });    
    });
});

function sendMail(mail_obj) {
    return new Promise((resolve, reject) => {
        sendmail(mail_obj, (err, result) => {
            if (err) {
                reject(err);
            }
            resolve(mail_obj.to);
        });
    });
}

function generateEphemeral(res_obj) {
    return new Promise((resolve, reject) => {
        try {
            let db = res_obj.db;
            var collection = db.get('recovery_keys');
            user = res_obj.user;
        } catch(e) {
            reject(e);
        }
        var recovery_obj = {
            createdAt: new Date(),
            uuid: uuidv4(),
            name: user.name,
            email: user.email
        };
        collection.insert(recovery_obj, (err, result)=>{
            if (err) {
                reject(err);
            }
        console.log('aaa'+recovery_obj);
            resolve(recovery_obj);
        });
    });
}

function getUserByEmail(db, email) {
    let collection = db.get('users');
    return new Promise((resolve, reject) => {
        collection.find({email:email}, (err, result) => {
            if (err) {
                reject(err);
            }
            resolve({'db':db, 'user':result[0]});
        });
    });
}

router.get('/logout', (req, res, next) => {
    req.session.destroy((err) => {
        if (err) {
            console.log(err);
        }
        res.redirect('/');
    });
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
//            console.log(charge_obj);
            res.render('thankyou', { title: config.site.title, 'cobj':charge_obj, email: req.session.key });
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

router.get('/members/payment', (req, res, next) => {
  if (!req.session.key) {
      res.render('login', {title: config.site.title});
  } else {
    getUser(req, req.session.key)
    .then((user) => {
      res.render('cart');
    })
    .catch((err) => {
      console.log(err.stack);
      res.status(500).send();
    });
  }
});

router.get('/members/clientarea', function(req, res, next) {
    if (!req.session.key) {
        res.render('login', {title: config.site.title});
    } else {
        try {
            getUser(req, req.session.key)
            .then((user) => {
              console.log(user);
              res.render('clientarea', { title: config.site.title, user:user, email: user.email });
            })
            .catch((err) => {
              console.log(err.stack);
              res.status(500).send();
            });
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

const getUser = (req, email) => {
  return new Promise((resolve, reject) => {
    let Users = req.db.collection('users');
    Users.findOne({email:email})
    .then((result) => {
      resolve(result);
    })
    .catch((err) => {
      console.log(err.stack);
      reject(err);
    });
  })
}

module.exports = router;
