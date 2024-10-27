'use strict';


var config = require('./config.js');
var firebase = require("firebase");
var admin = require("firebase-admin");
admin.initializeApp(config.get('firebase_admin_config'));
firebase.initializeApp(config.get('firebase_config'));
// console.log(config.get('firebase_config'));

var Offer = require("./../app/backend/v1/listings/Offers");


//Cron Job to redispatch  not assigned Job after two hours.
function redispatch() {
	console.log('running heroku scheduler for redispatch' )
    Offer.redispatch(admin)
}


redispatch();

