const express = require('express');
const router = express.Router();
const config = require('../config');
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');
const stripe = require('stripe')(config.stripe.secret);
const validator = require('validator');
const crypto = require('crypto');
const zlib = require('zlib');
var moment = require('moment');

moment().format();

router.get('/ips', function(req, res, next) {
    let ips = [
        {name:'Chicago USA',ip:'23.253.99.109'},
        {name:'Midwest USA',ip:'23.253.99.109'}
    ];
    res.status(200).send(JSON.stringify(ips));
});

router.post('/register', function(req, res, next) {
    let response = {
        status: 0,
        msg: ''
    };
    try {
        var user_data = req.body;
        var uname = user_data.uname;
        var pwd = user_data.pwd;
        var email = user_data.email;
        var freq = user_data.freq;

        uname = validator.escape(uname);
        if (validator.isEmail(email)) {
            let db = req.db;
            let collection = db.get('users');
            datetime = moment().format('YYYY-MM-DD HH:mm:ss');
            let user = {
                name: uname,
                password: pwd,
                email: email,
                reg_date: datetime,
                merch_customer_id: '',
                expire_date: datetime,
                active: 1,
                merch_customer_info: {}
            };
            collection.insert(user, function(err, doc) {
                if (err) {
                    console.log(err);
                    if (err.code == 11000) {
                        response.msg = 'Username: '+uname+' and/or Email: '+email+' already exists.';
                    } else {
                        response.msg = err.errmsg;
                    }
                } else {
                    var uobj = {
                        uid: doc._id,
                        e:email,
                        c:'usd',
                        f:freq
                    };
                    encrypted = encrypt(JSON.stringify(uobj));
                    response.status = 1;
                    response.msg = encrypted;
                }
                res.status(200).send(JSON.stringify(response));
            }); 

        /*
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
            */
        } else {
            response.msg = 'Invalid email';
            res.status(200).send(JSON.stringify(response));
        }
    } catch(e) {
        console.log(e);
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
//        console.log(stripe_data);
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
 //   console.log(cus_obj);
    stripe.customers.create(cus_obj, function(err, result) {
        if (err) {
            console.log(err);
        } else {
            result.description = JSON.parse(result.description);
//            console.log('create ciustomer: ' + JSON.stringify(result));
            let db = req.db;
            let collection = db.get('users');
            collection.update({"email":local_data.email}, { $set: { "merch_customer_id": result.id, "merch_customer_info": result } }, function(err, result) {
                if (err) {
                    console.log(err);
                }
            });
/*
            query = "update users set merch_customer_id='"+result.id+"', merch_customer_info='"+JSON.stringify(result)+"' where email='"+local_data.email+"'";
            connection.query(query, function(err, db_result, fields) {
                if (err) {
                    console.log(err);
                } else {
                    console.log(db_result);
                }
            });
            */

            amount = getAmount(uobj);
            let charge_obj = {
                amount: amount,
                currency: uobj.c,
                customer: result.id, // customer id from above
                description: 'IGNITE VPN Subscription charge for ' + uobj.e
            };
            rv = doCharge(charge_obj, uobj, req, res);
        }
    });
});

router.get('/get_charges', function(req, res, next) {
    if (req.session.key) {
        let user = JSON.parse(req.session.user);
        let db = req.db;
        let collection = db.get('charge_history');
        let msg_obj = {
            res: 0,
            msg: ''
        }
        collection.find({user_id:user._id}, function(err, result) {
            if (err) {
                console.log(err);
            } else {
                console.log(result);
                msg_obj.res = 1,
                msg_obj.msg = result
            }
            res.status(200).send(JSON.stringify(msg_obj));
        });
    } else {
        res.status(404).send();
    }
});

function doCharge(charge_obj, uobj, req, res) {
    try {
//        console.log(charge_obj);

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
//                console.log(charge)
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

                    let db = req.db;
                    let collection = db.get('users');
                    collection.update({_id:uobj.uid}, { $set: { expire_date:expire_date } }, function(err, result) {
                        if (err) {
                            console.log(err);
                        }
                    });
                    collection = db.get('charge_history');
                    let datetime = moment().format('YYYY-MM-DD HH:mm:ss');
                    let charge_history_obj = {
                        user_id: uobj.uid,
                        datetime: datetime,
                        outcome: charge.outcome.type,
                        charge: charge
                    }
                    collection.insert(charge_history_obj, function(err, result) {
                        if (err) {
                            console.log(err);
                        }
                    });

                    collection = db.get('users');
                    collection.find({_id:uobj.uid}).then(function(docs) {
                        return new Promise((resolve, reject)=> {
                            let radius = req.radius;
                            let uname = docs[0].name;
                            let pwd = docs[0].password;
                            let query = 'insert into radcheck values(0, ?, "User-Password", ":=", ?)';
                            var inserts = [uname, pwd];
                            query = radius.format(query, inserts);
                            radius.query(query, function(err, db_result, fields) {
                                if (err) {
                                    console.log(err);
                                    return reject(err);
                                }
                                return resolve(docs);
                            });
                        });
                    }).then((docs)=> {
                        return new Promise((resolve, reject)=> {
                            let radius = req.radius;
                            let uname = docs[0].name;
                            let gname = config.radius_db.group_name;
                            let query = 'insert into radusergroup values(?, ?, 1)';
                            var inserts = [uname, gname];
                            query = radius.format(query, inserts);
                            console.log(query);
                            radius.query(query, function(err, db_result, fields) {
                                if (err) {
                                    console.log(err);
                                    return reject(err);
                                }
                                return resolve(db_result);
                            });
                        });
                    }).catch((err)=> {
                        console.log(err);
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
