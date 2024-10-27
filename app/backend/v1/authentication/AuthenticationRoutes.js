var express = require('express');
var AuthenticationController = require('./AuthenticationController');
var firebase = require('./../routes.js');
var Multer = require('multer');
/**
 * Router object
 */
const router = express.Router();
const auth = new AuthenticationController();
var multer = Multer({
  storage: Multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024 // no larger than 5mb, you can change as needed.
  }
});
/**
 * Authentication by email
 * @param  {[type]} req  [description]
 * @param  {[type]} res) {		var       body [description]
 * @return {[type]}      [description]
 */
router.post('/signin/email', (req, res) => {

  const body = req.body
  const params = req.originalUrl

  auth.signInWithEmailAndPassword(body, params, (status, obj) => {
    res.status(status).json(obj)
  });
});

/**
 * Authentication by email
 * @param  {[type]} req  [description]
 * @param  {[type]} res) {		var       body [description]
 * @return {[type]}      [description]
 */
router.post('/signin/verify', (req, res) => {

  const body = req.body
  const params = req.originalUrl

  auth.verifyUserToken(body, params, (status, obj) => {
    res.status(status).json(obj)
  });
});

/**
 * Authentication and registration by facebook
 * @param  {[type]} req  [description]
 * @param  {[type]} res) {		var       body [description]
 * @return {[type]}      [description]
 */
router.post('/fb', (req, res) => {
  // asynchronous
  // User.findOne wont fire unless data is sent back
  process.nextTick(() => {
    const body = req.body
    const params = req.originalUrl

    auth.fbAuthenticate(body, params, (status, obj) => {
      res.status(status).json(obj)
    })
  })
});

/**
 * Sign Out
 * @param  {[type]} req  [description]
 * @param  {[type]} res) {		var       body [description]
 * @return {[type]}      [description]
 */
router.post('/signout', (req, res) => {
  // asynchronous
  // User.findOne wont fire unless data is sent back
  process.nextTick(() => {
    const body = req.body
    const params = req.originalUrl

    auth.signOut(body, params, (status, obj) => {
      res.status(status).json(obj)
    })
  })
});


router.get('/token/:user_id?', (req, res) => {
  process.nextTick(() => {
    const user_id = req.query.user_id;
    console.log(user_id);
    if (user_id) {
      auth.customToken(user_id, (status, obj) => {
        res.status(status).json(obj)
      })
    }else{
      res.status(400).json('Missing user id');
    }

  })
});


/**
 * REGISTER BY EMAIL
 * @param  {POST} req  [email, password, name, device_token(optional)]
 * @return {JSON}      [description]
 */
router.post('/signup/email', (req, res, next) => {
  var contype = req.headers['content-type'];
  if (contype === "application/x-www-form-urlencoded") {
    process.nextTick(() => {

      const body = req.body
      const params = req.originalUrl

      auth.emailRegister(body, params, (status, obj) => {
        res.status(status).json(obj)
      })
    })
  } else {
    next();
  }
}, multer.single('image'), (req, res) => {
  process.nextTick(() => {

    const body = req.body
    const file = req.file
    const params = req.originalUrl

    auth.emailRegister(body, params, file, (status, obj) => {
      res.status(status).json(obj)
    })
  })
});

module.exports = router;
