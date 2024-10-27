/**
 * Copyright 2015 Google Inc. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
'use strict';

const functions = require('firebase-functions');
const admin = require('firebase-admin');
//admin.initializeApp(functions.config().firebase);
const nodemailer = require('nodemailer');
const cloudStorageTrigger = require('./cloud_storage_trigger');
const databaseEventTriggers = require('./database_events');
const { TrackClient, RegionUS, RegionEU } = require("customerio-node");
const siteId = functions.config().customerio.siteid;
const apiKey = functions.config().customerio.apikey;
const cio = new TrackClient(siteId, apiKey, {timeout: 20000});
// Configure the email transport using the default SMTP transport and a GMail account.
// For Gmail, enable these:
// 1. https://www.google.com/settings/security/lesssecureapps
// 2. https://accounts.google.com/DisplayUnlockCaptcha
// For other types of transports such as Sendgrid see https://nodemailer.com/transports/
// TODO: Configure the `gmail.email` and `gmail.password` Google Cloud environment variables.
// const gmailEmail = functions.config().gmail.email;
// const gmailPassword = functions.config().gmail.password;
// const mailTransport = nodemailer.createTransport({
//   service: 'gmail',
//   auth: {
//     user: gmailEmail,
//     pass: gmailPassword,
//   },
// });

// Your company name to include in the emails
// TODO: Change this to your app or company name to customize the email sent.
//const APP_NAME = 'DiEM';
const bucketName = functions.config().bucket.name;
let request = require('request');
const heyMKey = functions.config().heymarket.key;
const heyUrl = functions.config().heymarket.url;
// [START sendWelcomeEmail]
/**
 * Sends a welcome email to new user.
 */
// [START onCreateTrigger]
exports.sendWelcomeEmail = functions.auth.user().onCreate((event) => {
  const user = event;
  const email = user.email;
  const displayName = user.displayName;
  const metadata = user.metadata;
  console.log('Test');
  console.log('This is the user', metadata.creationTime);
  var time = Math.round(new Date(metadata.creationTime).getTime()/1000);
  var refDB = admin.database().ref();
  var userRef = refDB.child("/users").child(user.uid);
  cio.identify(user.uid, {
    email: user.email,
    created_at:time,
    first_name: user.displayName,
    profile_picture: user.photoURL,
  });
  userRef.update({welcomeEmailSent:"true"},function(error) {
    if (!error) {
      return true;
    } else {
      return error;
    }
  });
});
// [END sendWelcomeEmail]

// [START sendByeEmail]
/**
 * Send an account deleted email confirmation to users who delete their accounts.
 */
// [START onDeleteTrigger]
exports.sendByeEmail = functions.auth.user().onDelete((event) => {
  const user = event;
  const email = user.email;
  const displayName = user.displayName;
  cio.destroy(user.uid);
  return true;
});
// [END sendByeEmail]


// [START generateThumbnailTrigger]
exports.generateThumbnail = functions.storage.bucket(bucketName).object().onFinalize(cloudStorageTrigger.generateThumbnail);
// [END generateThumbnailTrigger]

exports.updateListingWithImageUrl = functions.storage.bucket(bucketName).object().onFinalize(cloudStorageTrigger.updateListingWithImageUrl);

exports.createListingByCategory = functions.database.ref('/listing/{listingId}').onCreate(databaseEventTriggers.createListingByCategory);

exports.closeInActiveListing = functions.database.ref('/listing/{listingId}').onWrite(databaseEventTriggers.closeInActiveListing);

exports.createActiveListing = functions.database.ref('/listing/{listingId}/isActive').onWrite(databaseEventTriggers.createActiveListing);

exports.updateUserNodeWithListings = functions.database.ref('/listing/{listingId}').onWrite(databaseEventTriggers.updateUserNodeWithListings);


exports.listenToUserNodeForJobber = functions.database.ref('/users/{userId}/meta/isJobber').onWrite(databaseEventTriggers.listenToUserNodeForJobber);

exports.listenToUserNodeForPushToken = functions.database.ref('/users/{userId}/meta/device_token').onWrite(databaseEventTriggers.listenToUserNodeForPushToken);

exports.listenToUserNodeForRequestor = functions.database.ref('/users/{userId}/meta/isRequestor').onWrite(databaseEventTriggers.listenToUserNodeForRequestor);

/*exports.initializeUserNodeOnCreation = functions.database.ref('/users/{userId}').onCreate(databaseEventTriggers.initializeUserNodeOnCreation);
*/
exports.updateUserPublicProfileJobber =
functions.database.ref('/users/{userId}/meta').onWrite(databaseEventTriggers.updateUserPublicProfileJobber);

exports.updateUserPublicProfileRequestor =
functions.database.ref('/users/{userId}/meta').onWrite(databaseEventTriggers.updateUserPublicProfileRequestor);

exports.updateWhenOfferAccepted =
functions.database.ref('/accepted_offer/{acceptID}').onWrite(databaseEventTriggers.updateWhenOfferAccepted);

exports.updateWhenOfferCompleted =
functions.database.ref('/completed_offer/{completedID}').onWrite(databaseEventTriggers.updateWhenOfferCompleted);

exports.updateWhenOfferCompletedByJobber =
functions.database.ref('/jobber_completed_offer/{completedID}').onWrite(databaseEventTriggers.updateWhenOfferCompletedByJobber);

exports.updateAfterCancelListingRequester = functions.database.ref('/cancelled_listing/{listingId}').onWrite(databaseEventTriggers.updateAfterCancelListingRequester);

exports.updateAfterCancelJobRequester = functions.database.ref('/offers/{offerId}').onDelete(databaseEventTriggers.updateAfterCancelJobRequester);

exports.updateWhenOfferDisputed =
functions.database.ref('/disputed_offer/{disputedID}').onWrite(databaseEventTriggers.updateWhenOfferDisputed);

exports.reportListing = functions.database.ref('/listingReported/{reportID}').onWrite(databaseEventTriggers.reportListing);

exports.updateAfterDeclineRequester = functions.database.ref('/decline_offer/{offerId}').onWrite(databaseEventTriggers.updateAfterDeclineRequester);

exports.updateWhenMakeOffer = functions.database.ref('/offers/{offerId}').onCreate(databaseEventTriggers.updateWhenMakeOffer);

exports.updateWhenOfferWithdraw = functions.database.ref('/withdraw_offer/{offerId}').onWrite(databaseEventTriggers.updateWhenOfferWithdraw);

exports.RequestorJobberReport = functions.database.ref('/userReported/{reporterId}').onWrite(databaseEventTriggers.RequestorJobberReport);

exports.updateAfterListingTimelimitExpired = functions.database.ref('/timelimitExpiredListing/{listingId}').onCreate(databaseEventTriggers.updateAfterListingTimelimitExpired);

exports.updateWhenUserAddCardInfo =
functions.database.ref('/users/{userId}/credit_card_obj/{cardId}').onCreate(databaseEventTriggers.updateWhenUserAddCardInfo);

exports.reviewAddedAlert = functions.database.ref('/users/{userId}/reviews/{reviewId}').onWrite(databaseEventTriggers.reviewAddedAlert);

exports.updateListingAddress =  functions.database.ref('/listing/{lisitingId}/address').onUpdate(databaseEventTriggers.updateListingAddress)

exports.updateJobDateTime = functions.database.ref('/offers/{offerId}').onUpdate(databaseEventTriggers.updateJobDateTime);
exports.updateOfferAssignedJobber = functions.database.ref('/offers/{offerId}/assignedJobber').onUpdate(databaseEventTriggers.updateOfferAssignedJobber);

exports.updateOfferExtendedService = functions.database.ref('/offers/{offerId}/extendedService').onWrite(databaseEventTriggers.updateOfferExtendedService);

exports.updateRookieUser =  functions.database.ref('/offers/{offerId}/assignedRookieUser').onWrite(databaseEventTriggers.updateRookieUser)

exports.JApushNotifyWhenListingCreated =  functions.database.ref('/listing/{listingId}').onCreate(databaseEventTriggers.JApushNotifyWhenListingCreated);

exports.updateUserDataOnCIO = functions.database.ref('/users/{userId}').onWrite(databaseEventTriggers.updateUserDataOnCIO);

exports.listingJobStatusChange = functions.database.ref('/listing/{listingId}/jobStatus').onUpdate(databaseEventTriggers.listingJobStatusChange);
