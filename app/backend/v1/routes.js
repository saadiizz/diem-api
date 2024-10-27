var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var auths = require("./authentication/AuthenticationRoutes.js");
var category = require("./category/CategoryRoutes.js");
var listing = require("./listings/ListingsRoutes.js");
var user = require("./user/UserRoutes.js");
var UploadToFirebaseStorage = require("./upload/UploadRoutes.js");
var wepay = require("./wepay/WePayRoutes");
var paypal = require("./paypal/PaypalRoutes");
var offer = require("./listings/OfferRoutes")
var management = require("./managements/jobSystemRoutes");
var wePayIPN = require("./wepay/wepayIPN/wePayIPNRoutes");

const router = express.Router()

/*
 * Routes that can be accessed by any one
 */

router.use('/auths', auths);
router.use('/category', category);
router.use('/user', user);
router.use('/upload', UploadToFirebaseStorage);
router.use('/listing', listing);
router.use('/paypal', paypal);
router.use('/wepay', wepay);
router.use('/offer', offer);
router.use('/management', management);
router.use('/ipnStats', wePayIPN);
router.use('/loaderio-9a7e3d78b4da6c6c961aabf11897fe05', router.get('/', (req, res) => {
    res.sendFile(__dirname + '/loaderio-9a7e3d78b4da6c6c961aabf11897fe05.txt');
}));


/*
 * Routes that can be accessed only by autheticated users
 */
// router.get('/api/v1/listings', listings.getAll);
// router.get('/api/v1/listing/:id', listings.getOne);
// router.post('/api/v1/listing/', listings.create);
// router.put('/api/v1/listings/:id', listings.update);
// router.delete('/api/v1/listings/:id', listings.delete);

/*
 * Routes that can be accessed only by authenticated & authorized users
 */
// router.get('/api/v1/admin/users', user.getAll);
// router.get('/api/v1/admin/user/:id', user.getOne);
// router.post('/api/v1/admin/user/', user.create);
// router.put('/api/v1/admin/user/:id', user.update);
// router.delete('/api/v1/admin/user/:id', user.delete);


module.exports = router;
