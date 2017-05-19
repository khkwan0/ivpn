var express = require('express');
var redis = require('redis');
var session = require('express-session');
var RedisStore = require('connect-redis')(session);
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var config = require('./config');
var mongo = require('mongodb');
var monk = require('monk');
var mysql = require('mysql');

var db = monk(config.mongo.host+':'+config.mongo.port+'/'+config.mongo.db);
var index = require('./routes/index');
var api = require('./routes/api');
var nunjucks = require('nunjucks');

var connection = mysql.createConnection({
    host: config.radius_db.host,
    user: config.radius_db.user,
    password: config.radius_db.pwd,
    database: config.radius_db.db
});
connection.connect();

var app = express();
nunjucks.configure('views', {
    autoescape: true,
    express:app
});

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'html');

// uncomment after placing your favicon in /public
//app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
app.use(logger('dev'));
app.use(cookieParser());
app.use(session({
        store: new RedisStore({
                        host: config.redis.host,
                        port: config.redis.port,
                        db: config.redis.sess_select
        }),
        resave: false,
        saveUninitialized: false,
        secret: config.redis.secret
    })
);
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, 'public')));
app.use(function(req, res,next) {
    req.db = db;
    req.radius = connection;
    next();
});

app.use('/', index);
app.use('/api', api);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  console.log(err.stack);
  // render the error page
  res.status(err.status || 500).send();
});

module.exports = app;
