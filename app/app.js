const throng = require('throng');
const Sentry = require("@sentry/node");
const cors = require("cors");

const WORKERS = process.env.WEB_CONCURRENCY || 1;
var config = require('./../config.js');
const port = (config.get('port') || 8008);
const setupSentry = require('../config/sentry.config');

throng({
  worker: start,
  count: WORKERS,
  lifetime: Infinity,
});

function start() {
  var express = require('express');
  var path = require('path');
  // const curlExpress = require('express-curl');
  var logger = require('morgan');
  var cookieParser = require('cookie-parser');
  var bodyParser = require('body-parser');
  var firebase = require("firebase");
  var admin = require("firebase-admin");
  var serviceAccount = require("../serviceAccountKey.json");

  var routes = require('./backend/v1/routes');
  //var users = require('./routes/users');

  const app = express();

  setupSentry(app);

  var refreshToken; // Get refresh token from OAuth2 flow

  var defaultApp = admin.initializeApp(config.get('firebase_admin_config'));

  console.log("The environment file is: " + process.env.NODE_ENV);

  // Retrieve services via the defaultApp variable...
  var defaultAuth = defaultApp.auth();
  var defaultDatabase = defaultApp.database();
  var bucket = admin.storage().bucket();
  // ... or use the equivalent shorthand notation
  defaultAuth = admin.auth();
  defaultDatabase = admin.database();
  console.log(config.get('firebase_config'));
  console.log(`Current directory: ${process.cwd()}`);
  firebase.initializeApp(config.get('firebase_config'));

  // Express middleware that validates Firebase ID Tokens passed in the Authorization HTTP header.
  // The Firebase ID token needs to be passed as a Bearer token in the Authorization HTTP header like this:
  // `Authorization: Bearer <Firebase ID Token>`.
  // when decoded successfully, the ID Token content will be added as `req.user`.
  const authenticate = (req, res, next) => {
    if (!req.headers.authorization || !req.headers.authorization.startsWith('Bearer ')) {
      res.status(403).send('Unauthorized');
      return;
    }
    const idToken = req.headers.authorization.split('Bearer ')[1];
    admin.auth().verifyIdToken(idToken).then((decodedIdToken) => {
      req.user = decodedIdToken;
      return next();
    }).catch(() => {
      res.status(403).send('Unauthorized');
    });
  };
  // view engine setup
  // app.set('views', path.join(__dirname, 'views'));
  // app.set('view engine', 'ejs');

  // uncomment after placing your favicon in /public
  //app.use(favicon(__dirname + '/public/favicon.ico'));
  app.use(logger('dev'));
  app.use(bodyParser.json());
  app.use(bodyParser.urlencoded({
    extended: false
  }));
  app.use(cookieParser());
  app.use(express.static(path.join(__dirname, 'public')));
  app.use(bodyParser.json());

  app.use(cors())

  app.all('/*', function(req, res, next) {
    // CORS headers
    res.header("Access-Control-Allow-Origin", "*"); // restrict it to the required domain
    res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS');
    // Set custom headers for CORS
    res.header('Access-Control-Allow-Headers', 'Content-type,Accept,X-Access-Token,X-Key');
    if (req.method == 'OPTIONS') {
      res.status(200).end();
    } else {
      next();
    }
  });

  // Auth Middleware - This will check if the token is valid
  // Only the requests that start with /api/v1/* will be checked for the token.
  // Any URL's that do not follow the below pattern should be avoided unless you
  // are sure that authentication is not needed
  // app.all('/api/v1/*', [require('./backend/v1/authentication/AuthenticationRoutes')]);

  app.use((req, res, next) => {
    const url = req.protocol + '://' + (req.headers.host || req.hostname) + req.originalUrl;
    const method = req.method.toUpperCase();
    const headers = req.headers;
    const body = req.body;

    console.log(`\n${method}: ${url}`);
    console.log(`Headers: ${JSON.stringify(headers)}`);
    console.log(`Body: ${JSON.stringify(body)}\n`);
  
    next();
  });

  app.use(Sentry.Handlers.requestHandler());
  app.use(Sentry.Handlers.tracingHandler());

  app.use('/', routes);
  //app.use('/users', users);

  // catch 404 and forward to error handler
  app.use(function(req, res, next) {
    var err = new Error('Not Found');
    err.status = 404;
    next(err);
  });

  // error handlers

  /**
   * Error Handling
   */

  app.use(function(req, res, next) {
    console.log('404')
    let err = new Error('Not Found');
    err.status = 404;
    next(err);
  });


  /**
   * Always serve the same HTML file for all requests
   */

  app.get('*', function(req, res, next) {
    console.log("home page visit");
    res.sendFile(path.resolve(__dirname + '/../public/index.html'));
  });

  app.use(Sentry.Handlers.errorHandler());

  var server = app.listen(port, function() {
    console.info(process.env.NODE_ENV + " server starting on port: " + ":" + port);
  });
  module.exports = app;
}
