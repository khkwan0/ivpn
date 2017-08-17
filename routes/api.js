const express = require('express');
const router = express.Router();
const config = require('../config');
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');
const stripe = require('stripe')(config.stripe.secret);
const validator = require('validator');
const crypto = require('crypto');
const zlib = require('zlib');
const ObjectId = require('mongodb').ObjectID;
var moment = require('moment');

moment().format();
router.get('/ips', function(req, res, next) {
	let ips = [
		{name:'Chicago USA',ip:'23.253.99.109', protocol: 'l2tp', remoteid: null, 'psk':'engagebdr'},
		{name:'Midwest USA',ip:'23.253.99.109', protocol: 'l2tp', remoteid: null, 'psk':'engagebdr'},
		{name:'NorCal USA', ip:'23.239.1.81', protcol: 'ikev2', remoteid:'caldrivers.com', 'psk':'engagebdr'},
		{name:'Oregon USA', ip:'34.209.32.24', protcol: 'l2tp', remoteid:null, 'psk':'engagebdr'},
		{name:'Central Canada', ip:'52.60.219.210', protcol: 'l2tp', remoteid:null, 'psk':'engagebdr'},
		{name:'London UK', ip:'35.176.96.160', protcol: 'l2tp', remoteid:null, 'psk':'engagebdr'},
		{name:'Sydney AUS', ip:'54.79.43.165', protcol: 'l2tp', remoteid:null, 'psk':'engagebdr'},
		{name:'Virginia USA', ip:'54.157.42.194', protcol: 'l2tp', remoteid:null, 'psk':'engagebdr'}
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
					response.status = 1;
					response.msg ='ok' ;
          req.session.key = email;
				}
				res.status(200).send(JSON.stringify(response));
			}); 
		} else {
			response.msg = 'Invalid email';
			res.status(401).send(JSON.stringify(response));
		}
	} catch(e) {
		console.log(e.stack);
    res.status(500).send();
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
	var stripe_data = null;
	var token = '';

  if (req.session.key) {
    getUser(req, req.session.key)
    .then((user) => {
      let stripe_data = JSON.parse(req.body.stripe_obj);
      token = stripe_data.id;
      let local_data = {
        uid:user._id,
        email:user.email
      }
      let cus_obj = {
        description: JSON.stringify(local_data),
        source: token
      }
      let amount = req.body.amount;
      if (amount) {
        saveCustomer(req, res, user, cus_obj, local_data, amount);
      } else {
        res.status(404).send();
      }
    })
    .catch((err) => {
      console.log(err.stack);
      res.status(500).send();
    });
  } else {
    res.status(404).send();
  }
});

const saveCustomer = (req, res, user, cus_obj, local_data, amount) => {
	stripe.customers.create(cus_obj, (err, result) => {
		if (err) {
      res.status(200).send(JSON.stringify({status:0, msg: err.message}));
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
      console.log(cus_obj.source);
			let charge_obj = {
				amount: amount,
				currency: 'usd',
				customer: result.id, // customer id from above
//        source: cus_obj.source,
				description: 'IGNITE VPN Subscription charge for ' + local_data.email
			};
			rv = doCharge(charge_obj, user, req, res);
		}
	});
}

router.get('/get_charges', function(req, res, next) {
	if (req.session.key) {
		let email = req.session.key;
		let db = req.db;
		let collection = db.get('charge_history');
		let msg_obj = {
			res: 0,
			msg: ''
		}
		collection.find({email:email}, function(err, result) {
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

function doCharge(charge_obj, user, req, res) {
		let rv_obj = {
			status: 0,
			msg: ''
		};
		// charge it
		stripe.charges.create(charge_obj, function(err, charge) {
			if (err) {
				rv_obj.msg = err;
				res.status(200).send(JSON.stringify(rv_obj));
			} else {
				if (charge.outcome.type == 'authorized') {
					let num_days = 0;
          let freq = req.body.freq;
          let expire_date = '';
					if (freq == 'monthly') {
						expire_date = moment().add(1, 'months').format('YYYY-MM-DD HH:mm:ss');
            expire_date_pretty = moment().add(1, 'months').format('MMMM Do, YYYY');
					}
					if (freq == 'semi') {
						expire_date = moment().add(6, 'months').format('YYYY-MM-DD HH:mm:ss');
            expire_date_pretty = moment().add(6, 'months').format('MMMM Do, YYYY');
					}
					if (freq == 'annual') {
						expire_date = moment().add(1, 'years').format('YYYY-MM-DD HH:mm:ss');
            expire_date_pretty = moment().add(1, 'years').format('MMMM Do, YYYY');
					}

					let db = req.db;
					let collection = db.get('users');
					collection.update({_id:user._id}, { $set: { expire_date:expire_date,package: freq, start: moment().format('MMMM Do, YYYY'), expire_date_pretty:expire_date_pretty } }, function(err, result) {
						if (err) {
							console.log(err);
						}
					});
					collection = db.get('charge_history');
					let datetime = moment().format('YYYY-MM-DD HH:mm:ss');
					let charge_history_obj = {
						user_id: user._id,
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
					collection.find({_id:new ObjectId(user._id)}).then(function(docs) {
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
									reject(err);
								}
								resolve(docs);
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
									reject(err);
								}
								resolve(db_result);
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
