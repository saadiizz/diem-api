'use strict';


var config = require('./config.js');
var firebase = require("firebase");
var admin = require("firebase-admin");
admin.initializeApp(config.get('firebase_admin_config'));
firebase.initializeApp(config.get('firebase_config'));
// console.log(config.get('firebase_config'));

var Listing = require("./../app/backend/v1/listings/Listings");

console.log('env',process.env.NODE_ENV)
let uid = (process.env.NODE_ENV == 'prod') ? "8r6vepEvfEOxU5Ek6hk5Wk8VTaM2" : "X9RqeCfXkWSFynqLkOGM7M68K2h2";
//Cron Job to redispatch  not assigned Job after two hours.
function getListingNumber() {
	console.log('running heroku scheduler for getListingNumber' )
    Listing.getListingNumber(admin, uid)
}


getListingNumber();
