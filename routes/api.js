const express = require('express');
const router = express.Router();
const config = require('../config');
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');
const stripe = require('stripe')(config.stripe.secret);
const mysql = require('mysql');
const validator = require('validator');
const crypto = require('crypto');
const zlib = require('zlib');
var moment = require('moment');

connection = mysql.createConnection({
    host:   config.db.host,
    user:   config.db.user,
    password: config.db.pwd,
    database: config.db.db
});

connection.connect();

moment().format();

router.post('/register', function(req, res, next) {
    try {
        var user_data = req.body;
        var uname = user_data.uname;
        var pwd = user_data.pwd;
        var email = user_data.email;
        var freq = user_data.freq;

        uname = validator.escape(uname);
        let response = {
            status: 0,
            msg: ''
        };
        if (validator.isEmail(email)) {
            var query = 'insert into users(name, password, email) values("'+uname+'", "'+pwd+'", "'+email+'")';
            connection.query(query, function(err, result, fields) {
                if (err) {
                    console.log(err.code);
                    if (err.code == 'ER_DUP_ENTRY') {
                        response.msg = 'Username: '+uname+' and/or Email: '+email+' already exists.';
                    } else {
                        response.msg = err.code;
                    }
                    res.status(200).send(JSON.stringify(response));
                } else {
                    if (typeof result.insertId != 'undefined') {
                        var uobj = {
                            uid: result.insertId,
                            e:email,
                            c:'usd',
                            f:freq
                        };
                        encrypted = encrypt(JSON.stringify(uobj));
                        response.status = 1;
                        response.msg = encrypted;
                        res.status(200).send(JSON.stringify(response));
                    } else {
                        response.msg = 'Registration error.  Please check inputs.';
                        res.status(200).send(JSON.stringify(response));
                    }
                }
            });
        } else {
            response.msg = 'Invalid email';
            res.status(200).send(JSON.stringify(response));
        }
    } catch(e) {
        response.msg = e
        res.status(200).send(JSON.stringify(response));
    }

});

function encrypt(in_s) {
    let cipher = crypto.createCipher(config.crypto.algorithm, config.crypto.password);
    let encrypted = cipher.update(in_s,'utf8','hex');
    encrypted += cipher.final('hex');
    return encrypted;
}

function decrypt(in_s) {
    try {
        let decipher = crypto.createDecipher(config.crypto.algorithm, config.crypto.password);
        let decrypted = decipher.update(in_s, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        return decrypted;
    } catch(e) {
        throw(e);
    }
}

router.post('/charge_new', function(req, res, next) {
    var uobj = null;
    var stripe_data = null;
    var token = '';

    // decrypt passed user obj
    try {
        decrypted  = decrypt(req.body.udata);
        uobj = JSON.parse(decrypted);
    } catch(e) {
        console.log(e);
        res.status(200).send(e);
    }

    // parse token data
    try {
        stripe_data = JSON.parse(req.body.stripe_obj);
        token = stripe_data.id;
        console.log(stripe_data);
    } catch(e) {
        console.log(e);
        res.status(200).send(e);
    }

    //create a customer on the gateway
    let local_data = {
        uid:uobj.uid,
        email:uobj.e 
    }
    let cus_obj = {
        description: JSON.stringify(local_data),
        source: token
    }
    console.log(cus_obj);
    stripe.customers.create(cus_obj, function(err, result) {
        if (err) {
            console.log(err);
        } else {
            result.description = JSON.parse(result.description);
            console.log('create ciustomer: ' + JSON.stringify(result));
            query = "update users set merch_customer_id='"+result.id+"', merch_customer_info='"+JSON.stringify(result)+"' where email='"+local_data.email+"'";
            connection.query(query, function(err, db_result, fields) {
                if (err) {
                    console.log(err);
                } else {
                    console.log(db_result);
                }
            });

            amount = getAmount(uobj);
            let charge_obj = {
                amount: amount,
                currency: uobj.c,
                customer: result.id, // customer id from above
                description: 'IGNITE VPN Subscription charge for ' + uobj.e
            };
            rv = doCharge(charge_obj, uobj, res);
        }
    });
});

function doCharge(charge_obj, uobj, res) {
    try {
        console.log(charge_obj);

        // what we return to ajax call
        let rv_obj = {
            status: 0,
            msg: ''
        };
        // charge it
        stripe.charges.create(charge_obj, function(err, charge) {
            if (err) {
                console.log(err);
                rv_obj.msg = err;
                res.status(200).send(JSON.stringify(rv_obj));
            } else {
                console.log(charge)
                if (charge.outcome.type == 'authorized') {
                    let num_days = 0;
                    if (uobj.f == 'monthly') {
                        expire_date = moment().add(1, 'months').format('YYYY-MM-DD HH:mm:ss');
                    }
                    if (uobj.f == 'semi') {
                        expire_date = moment().add(6, 'months').format('YYYY-MM-DD HH:mm:ss');
                    }
                    if (uobj.f == 'annual') {
                        expire_date = moment().add(1, 'years').format('YYYY-MM-DD HH:mm:ss');
                    }

                    let query = 'update users set expire_date="'+expire_date+'" where user_id="'+uobj.uid+'"';
                    connection.query(query, function(err, db_result, fields) {
                        if (err) {
                            console.log(err);
                        }
                    });
                    query = 'insert into charge_history values(NULL, '+uobj.uid+', "'+moment().format('YYYY-MM-DD HH:mm:ss')+'","'+charge.outcome.type+'", "'+connection.escape(JSON.stringify(charge))+'")';
                    connection.query(query, function(err, db_result, fields) {
                        if (err) {
                            console.log(err);
                        }
                    });
                    zlib.deflate(JSON.stringify(charge), function(err, buffer) {
                        try {
                            charge_data = buffer.toString('base64');
                            charge_data = encrypt(charge_data);
                            rv_obj.status = 1;
                            rv_obj.msg = charge_data;
                            res.status(200).send(JSON.stringify(rv_obj));
                        } catch(e) {
                            console.log(e);
                            rv_obj.msg = e;
                            res.status(200).send(JSON.stringify(rv_obj));
                        }
                    })
                } else {
                    rv_obj.msg = 'declined';
                    res.status(200).send(JSON.stringify(rv_obj));
                }
            }
        });
    } catch(e) {
        res.status(200).send('unknown');
    }
}

function getAmount(uobj) {
    var amount = 0;
    if (uobj.f == 'monthly') {
        amount = config.price.monthly * 100; 
    }
    if (uobj.f == 'semi') {
        amount = config.price.semi* 100;
    }
    if (uobj.f == 'annual') {
        amount = config.price.annual * 100;
    }
    amount = Math.trunc(amount);
    return amount;
}

module.exports = router;
