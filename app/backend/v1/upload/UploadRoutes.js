var express = require('express');
var UploadController = require('./UploadController');
var jwt = require('jwt-simple');
var Multer = require('multer');
var auth = require('../authentication/AuthenticationController');

/**
 * Router object
 */
const router = express.Router();
const upload = new UploadController();

var multer = Multer({
  storage: Multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024 // no larger than 5mb, you can change as needed.
  }
});

/**
 * Upload to picture to profile
 * @param  {[type]} req  [description]
 * @param  {[type]} res) {		var       body [description]
 * @return {[type]}      [description]
 */
router.post('/profile', auth.isAuthenticated, multer.single('image'), (req, res) => {
  let file = req.file;
  if (file) {
    upload.uploadImageToStorage(file, req.user_identification.uid, req.url).then((success) => {
      res.status(200).send({
        status: 'success'
      });
    }).catch((error) => {
      res.status(400).send({
        status: "Not an Image"
      });
    });
  } else {
    res.status(400).send({
      status: "Missing file"
    });
  }
});

/**
 * Upload to picture to listing
 * @param  {[type]} req  [description]
 * @param  {[type]} res) {		var       body [description]
 * @return {[type]}      [description]
 */
router.post('/listing', auth.isAuthenticated, multer.array('image', 10), (req, res) => {
  let file = req.files;
  if (file) {
    upload.uploadImageToStorageListings(file, req.user_identification.uid, req.url, req.body.listing_id).then((success) => {
      console.log(success);
      res.status(200).send({
        'status':'success',
        'elements':success
      });
    }).catch((error) => {
      res.status(400).send({
        status: error
      });
    });
  } else {
    res.status(400).send({
      status: "Missing file"
    });
  }
});


module.exports = router;
