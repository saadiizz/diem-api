'use strict';

const functions = require('firebase-functions');
const admin = require('firebase-admin');
admin.initializeApp(functions.config().firebase);
const gcs = require('@google-cloud/storage');
const spawn = require('child-process-promise').spawn;
const path = require('path');
const os = require('os');
const fs = require('fs');
const moment = require('moment-timezone');
const _ = require('underscore')
const { TrackClient, RegionUS, RegionEU } = require("customerio-node");
const schedule = require('node-schedule');
var rule = new schedule.RecurrenceRule();
rule.hour = 7;
rule.minute = 0;
rule.second = 0;
const siteId = functions.config().customerio.siteid;
const apiKey = functions.config().customerio.apikey;
const cio = new TrackClient(siteId, apiKey, {timeout: 20000});
const UpdateCommandEnum = Object.freeze({
  "delete": true,
  "update": false
});
let request = require('request');
const heyMKey = functions.config().heymarket.key;
const heyUrl = functions.config().heymarket.url;
var heyMHeader = {
  'Content-Type': 'application/json',
  'Accept': 'application/json',
  "Authorization":"Bearer "+heyMKey
}



/**
 * When listing is created, write listing into categories
 */
// [START generateThumbnailTrigger]
exports.createListingByCategory = ((snap, context) => {
  var listingId = snap.key;
  console.log('listingId<<',listingId)
  var refDB = admin.database().ref();
  var listingRef = refDB.child("/listing").child(listingId);
  return listingRef.once('value').then(snapshot => {
    const original = snapshot.val();
    console.log('original<<<',original)
    const category = original.category_id;
    const key = snap.key;
    console.log('Category_Id: ' + category);
    console.log('Key: ' + key);
    var postsRef = admin.database().ref("/listingByCategory");
    var userRef = refDB.child("/users").child(original.user_id);
    var triggerName;
    let catData;
    let timezone = original.timezone ? original.timezone : 'Canada/Eastern';
    if(original.preferred_date) {
      var prefferedDate = new Date(parseInt(original.preferred_date));
      prefferedDate = moment(prefferedDate*1000).tz(timezone).format('dddd, MMMM Do');
    }
    if(original.preferred_date_second) {
      var secPrefferedDate = new Date(parseInt(original.preferred_date_second));
      secPrefferedDate = moment(secPrefferedDate*1000).tz(timezone).format('dddd, MMMM Do');
    }
    console.log({ secondary_email: original.secondary_email || '',
    secondary_name: original.secondary_name || '',
    secondary_mobile: original.secondary_mobile || '',})
    if(original.DOD === "true") {
      triggerName = 'dod_job_posted';
      catData = {
        task_title: original.title,
        task_location: original.address,
        sub_category: original.category_name,
        order_num: original.order_num,
        ALC_header: original.ALC_header,
        ALC_description: original.ALC_description,
        preferred_date: prefferedDate,
        preferred_date_second: secPrefferedDate,
        preferred_time: original.preferred_time,
        description: original.description,
        city: original.city,
        jobberFee : original.jobberFee,
        couponApplied: original.couponApplied,
        addOns: original.addOns,
        secondary_email: original.secondary_email || '',
        secondary_name: original.secondary_name || '',
        secondary_mobile: original.secondary_mobile || '',
      }
    } else {
      triggerName = 'job_posted';
      catData = {
        task_title: original.title,
        task_location: original.address,
        sub_category: original.category_name,
        order_num: original.order_num,
        secondary_email: original.secondary_email || '',
        secondary_name: original.secondary_name || '',
        secondary_mobile: original.secondary_mobile || '',
      }
    }
    postsRef.child(category).child(key).set(key,function(error) {
      if (!error) {
        cio.track(original.user_id, {
          name: triggerName,
          data: catData
        });
        return true
        // userRef.once('value').then(usersnap => {
        //   let uData = usersnap.val();
        //   if(uData && uData.hContactData && uData.meta && uData.hContactData.creator_id && uData.meta.phone) {
        //     sendMsgByHeyMarket(uData.hContactData.creator_id, uData.meta.phone, 46581);
        //   } else {
        //     return false;
        //   }
        // }).catch(function(err) {
        //   console.log('Failed in getting users:', err);
        //   return err;
        // });
      } else {
        return error;
      }
    });
  }).catch(function(error) {
    console.log("Getting listing failed: " + error.message)
    return error;
  });
});

exports.closeInActiveListing = ((change, context) => {
  // Grab the current value of what was written to the Realtime Database.
  const original = change.after.val();
  const isActive = original.isActive ?original.isActive : null;
  const category = original.category_id;
  const eventRef = change.after.ref;
  if (!isActive && change.after.changed()) {
    const key = change.after.key;
    console.log('Category_Id: ' + category);
    console.log('Key: ' + key);
    var postsRef = admin.database().ref("/inactive");
    var deleteRef = admin.database().ref("/listingByCategory");
    var deleteRefLocation = admin.database().ref("/listingLocation");
    return postsRef.child(key).set(
      key,
      function(error) {
        if (!error) {
          deleteRef.child(category).child(key).remove()
            .then(function() {
              console.log("Remove succeeded.")
              deleteRefLocation.child(key).remove()
                .then(function() {
                  console.log("Remove succeeded.")
                  return true;
                })
                .catch(function(error) {
                  console.log("Remove failed: " + error.message)
                  return error;
                });
            })
            .catch(function(error) {
              console.log("Remove failed: " + error.message)
              return error;
            });
        } else {
          return error;
        }
      });
  } else {
    return false;
  }
});

exports.createActiveListing = ((change, context) => {
  // Grab the current value of what was written to the Realtime Database.
  const isActive = change.after.val();
  if (isActive) {
    var postsRef = admin.database().ref("/active");
    const key = change.after.key;
    return change.after.ref.parent.once('value')
      .then(snapshot => {
        const listingID = snapshot.ref.key;
        postsRef.child(listingID).set(
          listingID,
          function(error) {
            if (!error) {
              console.log("Active listing added succeeded.")
              return true;
            } else {
              return error;
            }
          });
      })
      .catch(function(error) {
        console.log("Remove failed: " + error.message)
        return error;
      });
    console.log(isActive);
  }
});
exports.updateUserNodeWithListings = ((change, context) => {
  // Grab the current value of what was written to the Realtime Database.
  const original = change.after.val();
  if(original.uid){
    const uid = original.uid;
    const key = change.after.key;
    console.log('Key: ' + key);
    var userRef = admin.database().ref("/users");

    return userRef.child(uid).child('listing/active').child(key).set(
      key,
      function(error) {
        if (!error) {
          return true;
        } else {
          return error;
        }
      });
  }else{
    console.log('uid not found.')
  }
});

exports.listenToUserNodeForJobber = ((change, context) => {
  // Grab the current value of what was written to the Realtime Database.
  const isJobber = change.after.val();
  if (isJobber) {
    return change.after.ref.parent.once('value')
      .then(snapshot => {
        const userID = snapshot.ref.parent.key;
        var userRef = admin.database().ref("/jobbers");
        userRef.update({
          [userID]: userID
        });
        return true;
      })
      .catch(function(error) {
        console.log("Remove failed: " + error.message)
        return error;
      });

  } else {
    return change.after.ref.parent.once('value')
      .then(snapshot => {
        const userID = snapshot.ref.parent.key;
        var userRef = admin.database().ref("/jobbers");
        userRef.remove()
          .then(function() {
            console.log("Remove succeeded.")
            return true;
          })
          .catch(function(error) {
            console.log("Remove failed: " + error.message);
            return error;
          });
      })
      .catch(function(error) {
        console.log("Remove failed: " + error.message)
        return error;
      });
  }
});

exports.listenToUserNodeForRequestor = ((change, context) => {
  // Grab the current value of what was written to the Realtime Database.
  const isJobber = change.after.val();
  if (isJobber) {
    return change.after.ref.parent.once('value')
      .then(snapshot => {
        const userID = snapshot.ref.parent.key;
        var userRef = admin.database().ref("/requestors");
        userRef.update({
          [userID]: userID
        });
        return true;
      })
      .catch(function(error) {
        console.log("Remove failed: " + error.message)
        return error;
      });

  } else {
    return change.after.ref.parent.once('value')
      .then(snapshot => {
        const userID = snapshot.ref.parent.key;
        var userRef = admin.database().ref("/requestors");
        userRef.remove()
          .then(function() {
            console.log("Remove succeeded.")
            return true;
          })
          .catch(function(error) {
            console.log("Remove failed: " + error.message);
            return error;
          });
      })
      .catch(function(error) {
        console.log("Remove failed: " + error.message)
        return error;
      });
  }
});

exports.listenToUserNodeForPushToken = ((change, context) => {

  const deviceToken = change.after.val();
  const key = change.after.key;
  if (deviceToken) {
    return change.after.ref.parent.once('value').then(snapshot => {
      const userID = snapshot.ref.parent.key;
      console.log('userID<<',userID)
      return cio.addDevice(userID, deviceToken, snapshot.val().device_type)
      .then((returnData) => {
        return returnData;
      }).catch((e) => {
        console.log("handled the error" + e);
        return e;
      });
    });

  } else {
    return 0;
  }
});

exports.initializeUserNodeOnCreation = ((change, context) => {
  const userObj = change.val();
  var rating = {};
  var key = "rating";

  rating[key] = 5.0;
  if (userObj.hasOwnProperty('pictureURL')) {
    rating[pictureURL] = " ";
  }
  var userRef = admin.database().ref("/users");

  userRef.child(uid).child("/meta").update(
    rating,
    function(error) {
      if (!error) {
        return true;
      } else {
        return error;
      }
    });
});

exports.updateUserPublicProfileJobber = ((change, context) => {
  const beforeData = change.before.val();
  const afterData = change.after.val();
  console.log('beforeData<<',beforeData);
  console.log('afterData<<',afterData);
  const metadata = afterData;
  console.log('metadata:' + metadata);

  //TODO: Make sure only public info is added here
  if (metadata && metadata.hasOwnProperty('isJobber') && metadata.isJobber == true || metadata && metadata.hasOwnProperty('isJobber') && metadata.isJobber == 'true') {
    return change.after.ref.parent.once('value')
      .then(snapshot => {
        const userID = snapshot.key;
        var userPublic = admin.database().ref("/public_profile");
        let uData = snapshot.val();
        const userData = snapshot.val().meta;
        userPublic.child(userID).child('/jobber').update(userData,
          function(error) {
            if (!error) {
              console.log('userData<<',userData)
              cio.identify(userID, {
                first_name: userData.firstName,
                last_name: userData.lastName,
                mobile: userData.phone,
                email: userData.email,
                jobber: userData.isJobber,
                created_date:userData.JoiningDate,
                location: userData.location,
                device_token: userData.device_token,
                device_type: userData.device_type,
                sms_verified: userData.sms_verified,
                wepay_verified: userData.wepay_verified
              });
              // if(userData && userData.token) {
              //   cio.identify(userData.token, {
              //     user_real_id: userID
              //   })
              // }
              hmCreateContact(uData, userID);
              // hmCreateContact(uData, userID, 46582);
            } else {
              return error;
            }
          });
      })
      .catch(function(error) {
        console.log("Remove failed: " + error.message)
        return error;
      });

  }
  else {
    console.log('Jobber have not isJobber true!')
    return true;
  }
});

exports.updateUserPublicProfileRequestor = ((change, context) => {
  const beforeData = change.before.val();
  const afterData = change.after.val();
  console.log('beforeData<<',beforeData);
  console.log('afterData<<',afterData);
  const metadata = afterData;
  console.log('metadata:' + metadata);
  //TODO: Make sure only public info is added here
  if (metadata && metadata.hasOwnProperty('isRequestor') && metadata.isRequestor == true || metadata && metadata.hasOwnProperty('isRequestor') && metadata.isRequestor == 'true') {
    return change.after.ref.parent.once('value')
      .then(snapshot => {
        const userID = snapshot.key;
        var refDB = admin.database().ref();
        var userRef = refDB.child("/users").child(userID);
        var userPublic = admin.database().ref("/public_profile");
        let uData = snapshot.val();
        const userData = snapshot.val().meta;
        userPublic.child(userID).child('/requestors').update(userData,
          function(error) {
            if (!error) {
              cio.identify(userID, {
                first_name: userData.firstName,
                last_name: userData.lastName,
                mobile: userData.phone,
                email: userData.email,
                requestor: userData.isRequestor,
                created_date:userData.JoiningDate,
                location: userData.location,
                device_token: userData.device_token,
                device_type: userData.device_type,
                sms_verified: userData.sms_verified,
                wepay_verified: userData.wepay_verified
              });
              // if(userData && userData.token) {
              //   cio.identify(userData.token, {
              //     user_real_id: userID
              //   })
              // }
              hmCreateContact(uData, userID);
              // hmCreateContact(uData, userID, 46583);
            } else {
              return error;
            }
          });
      })
      .catch(function(error) {
        console.log("Remove failed: " + error.message)
        return error;
      });
  }
  else {
    console.log('Requestor have not isRequestor true!')
    return true;
  }
});

exports.updateUserDataOnCIO = ((change, context) =>{
  const beforeData = change.before.val();
  const afterData = change.after.val();
  console.log('beforeData<<',beforeData);
  console.log('afterData<<',afterData);
  let userUID = change.after.key
  let filterData = {};
  console.log('userUID',userUID)
  var refDB = admin.database().ref();
  var rRef = refDB.child("/users").child(userUID);
  return rRef.once('value').then(userSnap => {
    let userData = userSnap.val();
    if(userData && userData.meta){
      console.log('userSnap',userData.meta)
      if(afterData && afterData.meta && afterData.meta.location && ((beforeData.meta.location != afterData.meta.location) || !userData.filterData)){
        console.log('beforeData.meta.loation',beforeData.meta.location)
        console.log('afterData.meta.loation',afterData.meta.location)
        console.log('innnn location')
        let b;
        b = afterData.meta.location.split(",")
        b = b.reverse()
        console.log(b)
        let city = b[2] ? b[2].trim() : ''
        let country  = b[0] ? b[0].trim(): '';
        console.log('country',country)
        if(country == ("India" || "IN")){
          country = "IN"
        }
        if(country == ("Canada" || "CANADA" ||"CA")){
          country = "CA"
        }
        if(country == ("USA" || "US") ){
          country = "USA"
        }
        if(country == "UK" ){
          country = "UK"
        }
        if(country == "Philippines" ){
          country = "PH"
        }
        if(country == "Ireland" ){
          country = "IE"
        }
        if(country == "Pakistan" ){
          country = "PK"
        }
        console.log("city :",city, "country : ",country)
        filterData = {"city":city, "country" : country}
        rRef.update({"filterData":filterData},function(error){
          if(error){
              console.log('error', error)
        }else{
          console.log("filterData Updated Successfully.")
          }
        })
      }
      console.log('filterData',filterData)
      let updateData = {};
      if(userData.dodUser){
        updateData.dodUser = userData.dodUser
      }
      if(Object.keys(filterData).length){
        console.log('inn if fil', filterData)
        updateData.city = filterData.city
        updateData.country = filterData.country
      }else if(userData.filterData){
        updateData.city = userData.filterData.city? userData.filterData.city : ''
        updateData.country = userData.filterData.country? userData.filterData.country : ''
      }
      console.log('updateData',updateData)
      cio.identify(userUID, updateData);
    }else{
      console.log('User is not JObber')
      return true;
    }
  })

})

exports.updateWhenOfferAccepted = ((change, context) => {
  const beforeData = change.before.val();
  const afterData = change.after.val();
  console.log('beforeData<<',beforeData);
  console.log('afterData<<',afterData);

  const offerKey = change.after.val();
  const acceptKey = change.after.key;
  var refDB = admin.database().ref();
  console.log('Offer Key: ' + offerKey);
  console.log('Accept Key: ' + acceptKey);
  var creatorId;

  if (offerKey !== null && acceptKey !== null) {
    var offerRef = refDB.child("/offers").child(offerKey);
    var listingLocationRef = refDB.child("/listingLocation");
    return offerRef.once('value').then(snapshot => {
      const offerObj = snapshot.val();
      const listingID = offerObj.listingID;
      const offerID = offerObj.offerID;
      const requestorUID = offerObj.requestorUID;
      const userId = offerObj.requestorUID;
      const jobberUID = offerObj.jobberUID;
      var assigned = offerObj.assignedJobber && offerObj.assignedJobber.length ? offerObj.assignedJobber : [];
      console.log('assigned',assigned)
      var Subjobber1_first_name = assigned && assigned[0] ? assigned[0].firstName  : ''
      var Subjobber1_last_name = assigned && assigned[0] ? assigned[0].lastName  : ''
      var Subjobber1_mobile = assigned && assigned[0] ? assigned[0].phone : ''
      var Subjobber1_email = assigned && assigned[0] ? assigned[0].email : ''
      var Subjobber1_pay = assigned && assigned[0] ? assigned[0].jobberPrice : ''
      var Subjobber2_first_name = assigned && assigned[1] ? assigned[1].firstName : ''
      var Subjobber2_last_name = assigned && assigned[1] ? assigned[1].lastName : ''
      var Subjobber2_mobile = assigned && assigned[1] ? assigned[1].phone : ''
      var Subjobber2_email = assigned && assigned[1] ? assigned[1].email : ''
      var Subjobber2_pay = assigned && assigned[1] ? assigned[1].jobberPrice : ''
      console.log('Subjobber1_first_name',Subjobber1_first_name)
      console.log('Subjobber1_mobile',Subjobber1_mobile)
      console.log('Subjobber1_mobile',Subjobber1_mobile)
      console.log('Subjobber1_email',Subjobber1_email)
      console.log('Subjobber1_pay',Subjobber1_pay)
      console.log('Subjobber2_first_name',Subjobber2_first_name)
      console.log('Subjobber2_mobile',Subjobber2_mobile)
      console.log('Subjobber2_email',Subjobber2_email)
      console.log('Subjobber2_pay',Subjobber2_pay)
      // if(offerObj.start_date) {
      //   var startDate = new Date(offerObj.start_date);
      //   startDate = moment(startDate*1000).tz('Canada/Eastern').format('dddd, MMMM Do');
      // }
      // if(offerObj.start_time) {
      //   var startTime = new Date(offerObj.start_time);
      //   startTime = moment(startTime*1000).tz('Canada/Eastern').format('h:mm a');
      // }
      // if(offerObj.completion_date) {
      //   var endDate = new Date (offerObj.completion_date);
      //   endDate = moment(endDate*1000).tz('Canada/Eastern').format('dddd, MMMM Do');
      // }
      var offerAmount = offerObj.offer_price;
      var jobber_offer_amount = offerObj.jobber_fee;
      console.log('jobberUID<<',jobberUID)
      var jobberRef = refDB.child("/users").child(jobberUID);

      return jobberRef.once('value').then(usersnap => {
        var userObj = usersnap.val();
        var metadata = userObj.meta;
        var deviceToken = metadata.device_token;
        var useremail = metadata.email;
        var jfirstName = metadata.firstName;
        var jlastName = metadata.lastName;
        var jphoneNumber = metadata.phone;
        var time = Math.round(new Date().getTime()/1000);
        console.log('userId<<',userId)
        console.log('metadata<<',metadata)
        console.log('time<<',time)
        console.log('listingID<<',listingID)

        if(userObj && userObj.hContactData && userObj.hContactData.creator_id) {
          creatorId = userObj.hContactData.creator_id;

        }
        console.log('creatorId---', creatorId)

        var rRef = refDB.child("/users").child(requestorUID);
        return rRef.once('value').then(rsnap => {
          var rfirstName = rsnap.val().meta.firstName;
          var rlastName = rsnap.val().meta.lastName;
          var rphoneNumber = rsnap.val().meta.phone;
          var listingRef = refDB.child("/listing").child(listingID);

          return listingRef.once('value').then(listingsnap => {
            var listingObj = listingsnap.val();
            console.log('listingObj<<',listingObj)

            var jobTitle = listingObj.title;
            var category_name = listingObj.category_name;
            var jobLocation = listingObj.address;
            var equipmentProvided = listingObj.equipment;
            var requestorName = listingObj.user_name;
            var priceWithTax = listingObj.priceWithTax;
            var listing_id = listingsnap.key;
            var offer_id = offerKey;
            var rTriggerName;
            var jTriggerName;
            var order_num = listingObj.order_num;
            var description = listingObj.description;
            var ALC_header = listingObj.ALC_header;
            console.log('timezone in  offer accept11111',listingObj.timezone)
            var timezone  = listingObj.timezone ? listingObj.timezone : 'Canada/Eastern'
            console.log('timezone in  offer accept',timezone)
            if(listingObj.DOD === "true") {
              rTriggerName = 'dod_job_accepted_requestor';
              jTriggerName = 'dod_job_accepted_jobber';
            } else {
              rTriggerName = 'offer_accepted_requestor';
              jTriggerName = 'offer_accepted_jobber';
            }

            if(offerObj.start_date) {
              var startDate = new Date(offerObj.start_date);
              startDate = moment(startDate*1000).tz(timezone).format('dddd, MMMM Do');
            }
            if(offerObj.start_time) {
              var startTime = new Date(offerObj.start_time);
              startTime = moment(startTime*1000).tz(timezone).format('h:mm a');
            }
            if(offerObj.completion_date) {
              var endDate = new Date (offerObj.completion_date);
              endDate = moment(endDate*1000).tz(timezone).format('dddd, MMMM Do');
            }

            if(listingObj.jobber_date) {
              var jobberDate = moment(listingObj.jobber_date*1000).tz(timezone).format('dddd, MMMM Do');
            }
            if(listingObj.jobber_time) {
              var jobberTime = moment(listingObj.jobber_time*1000).tz(timezone).format('h:mm a');

            }

            var promises = new Array();
            promises.push(updateAssignedProjects(requestorUID, listingID, false, UpdateCommandEnum.update));
            promises.push(updateAssignedProjects(jobberUID, listingID, true, UpdateCommandEnum.update));
            promises.push(updateOpenProjects(requestorUID, listingID, false, UpdateCommandEnum.delete));
            promises.push(updateOpenProjects(jobberUID, listingID, true, UpdateCommandEnum.delete));
            console.log('rphoneNumber<<',rphoneNumber)
            let d = {
                      task_title: jobTitle,
                      sub_category: category_name,
                      task_location: jobLocation,
                      offer_price: offerAmount,
                      offer_start_date: startDate,
                      offer_start_time: startTime,
                      offer_end_date: endDate,
                      requestor_first_name: rfirstName,
                      requestor_last_name: rlastName,
                      requestor_mobile: rphoneNumber,
                      requestor_price: priceWithTax,
                      jobber_first_name: jfirstName,
                      jobber_last_name: jlastName,
                      jobber_mobile: jphoneNumber,
                      jobber_offer_amount: jobber_offer_amount,
                      jobber_time: jobberTime,
                      jobber_date: jobberDate,
                      listing_id: listingID,
                      offer_id: offer_id,
                      order_num: order_num,
                      description: description,
                      Subjobber1_first_name : Subjobber1_first_name,
                      Subjobber1_mobile : Subjobber1_mobile,
                      Subjobber1_email : Subjobber1_email,
                      Subjobber1_pay : Subjobber1_pay,
                      Subjobber2_first_name : Subjobber2_first_name,
                      Subjobber2_mobile : Subjobber2_mobile,
                      Subjobber2_email : Subjobber2_email,
                      Subjobber2_pay : Subjobber2_pay,
                      dod_package:ALC_header,
                      accepted_id: listingObj.accept_id || '',
                      wepay_checkout_id: listingObj.checkout_id || '',

                    }
            console.log('cio data',d)
            return Promise.all(promises).then(values => {
              console.log(`listingObj.DOD: ${listingObj.DOD}`)

              if(listingObj.DOD === "true") {
                console.log(`1. rTriggerName: ${rTriggerName}`);
                cio.track(userId, {
                  name: rTriggerName,
                  data: {
                    task_title: jobTitle,
                    sub_category: category_name,
                    task_location: jobLocation,
                    offer_price: offerAmount,
                    offer_start_date: startDate,
                    offer_start_time: startTime,
                    offer_end_date: endDate,
                    requestor_first_name: rfirstName,
                    requestor_last_name: rlastName,
                    requestor_mobile: rphoneNumber,
                    requestor_price: priceWithTax,
                    jobber_first_name: jfirstName,
                    jobber_last_name: jlastName,
                    jobber_mobile: jphoneNumber,
                    jobber_offer_amount: jobber_offer_amount,
                    jobber_time: jobberTime,
                    jobber_date: jobberDate,
                    listing_id: listingID,
                    offer_id: offer_id,
                    order_num: order_num,
                    description: description,
                    Subjobber1_first_name : Subjobber1_first_name,
                    Subjobber1_mobile : Subjobber1_mobile,
                    Subjobber1_email : Subjobber1_email,
                    Subjobber1_pay : Subjobber1_pay,
                    Subjobber2_first_name : Subjobber2_first_name,
                    Subjobber2_mobile : Subjobber2_mobile,
                    Subjobber2_email : Subjobber2_email,
                    Subjobber2_pay : Subjobber2_pay,
                    dod_package:ALC_header,
                    accepted_id: listingObj.accept_id || '',
                    wepay_checkout_id: listingObj.checkout_id || '',
                  }
                });

                console.log(`2. jTriggerName: ${jTriggerName}`);
                cio.track(jobberUID, {
                  name: jTriggerName,
                  data: {
                    task_title: jobTitle,
                    sub_category: category_name,
                    task_location: jobLocation,
                    offer_price: offerAmount,
                    offer_start_date: startDate,
                    offer_start_time: startTime,
                    offer_end_date: endDate,
                    requestor_first_name: rfirstName,
                    requestor_last_name: rlastName,
                    requestor_mobile: rphoneNumber,
                    requestor_price: priceWithTax,
                    jobber_first_name: jfirstName,
                    jobber_last_name: jlastName,
                    jobber_mobile: jphoneNumber,
                    jobber_offer_amount: jobber_offer_amount,
                    jobber_time: jobberTime,
                    jobber_date: jobberDate,
                    listing_id: listingID,
                    offer_id: offerID,
                    order_num:order_num,
                    description: description,
                    Subjobber1_first_name : Subjobber1_first_name,
                    Subjobber1_mobile : Subjobber1_mobile,
                    Subjobber1_email : Subjobber1_email,
                    Subjobber1_pay : Subjobber1_pay,
                    Subjobber2_first_name : Subjobber2_first_name,
                    Subjobber2_mobile : Subjobber2_mobile,
                    Subjobber2_email : Subjobber2_email,
                    Subjobber2_pay : Subjobber2_pay,
                    dod_package:ALC_header,
                    accepted_id: listingObj.accept_id || '',
                    wepay_checkout_id: listingObj.checkout_id || '',
                  }
                });

                console.log("before removing listing ref from listingLocation");
                listingLocationRef
                  .child(listingID)
                  .remove()
                  .then(function (error) {
                    if (error) {
                      console.log("Error while removing listing ref from listingLocation", error);
                      return error;
                    }
                    return true;
                  });
              } else {
                console.log(`3. rTriggerName: ${rTriggerName}`);
                cio.track(userId, {
                  name: rTriggerName,
                  data: {
                    task_title: jobTitle,
                    sub_category: category_name,
                    task_location: jobLocation,
                    offer_price: offerAmount,
                    offer_start_date: startDate,
                    offer_start_time: startTime,
                    offer_end_date: endDate,
                    requestor_first_name: rfirstName,
                    jobber_first_name: jfirstName,
                    jobber_mobile: jphoneNumber,
                    requestor_mobile: rphoneNumber,
                    jobber_offer_amount: jobber_offer_amount,
                    jobber_time: jobberTime,
                    jobber_date: jobberDate,
                    listing_id: listingID,
                    offer_id: offerKey,
                    order_num:order_num,
                    description: description,
                    accepted_id: listingObj.accept_id || '',
                      wepay_checkout_id: listingObj.checkout_id || '',
                  }
                });

                console.log(`4. jTriggerName: ${jTriggerName}`);
                cio.track(jobberUID, {
                  name: jTriggerName,
                  data: {
                    task_title: jobTitle,
                    sub_category: category_name,
                    task_location: jobLocation,
                    offer_price: offerAmount,
                    offer_start_date: startDate,
                    offer_start_time: startTime,
                    offer_end_date: endDate,
                    requestor_first_name: rfirstName,
                    jobber_first_name: jfirstName,
                    jobber_mobile: jphoneNumber,
                    requestor_mobile: rphoneNumber,
                    jobber_offer_amount: jobber_offer_amount,
                    jobber_time: jobberTime,
                    jobber_date: jobberDate,
                    listing_id: listingID,
                    offer_id: offerKey,
                    order_num:order_num,
                    description: description,
                    accepted_id: listingObj.accept_id || '',
                      wepay_checkout_id: listingObj.checkout_id || '',
                  }
                });

                jobberRef.child('meta').update({newAssignedJob:"true"}, function(error) {
                  if (error) {
                    console.log("Error in user update." + error);
                    callback('500', error);
                  } else {
                    listingLocationRef.child(listingID).remove().then(function(error) {
                      if(error) {
                        console.log("Error in user update." + error);
                        callback('500', error);
                      }
                      else {
                        return true;
                        // console.log('rule-------', rule)
                        // if(creatorId && jphoneNumber) {
                        //   schedule.scheduleJob(rule, function() {
                        //     console.log('Job reminder scheduler executed----------');
                        //     sendMsgByHeyMarket(creatorId, jphoneNumber, 48099);
                        //   });
                        //   return values;
                        // } else {
                        //   return false;
                        // }
                      }
                    })
                  }
                });
              }
            }).catch(function(err) {
              console.log('A promise failed to resolve', err);
              return err;
            });

          }).catch(function(error) {
            console.log("Error in get listing: " + error.message)
            return error;
          });
        }).catch(function(error) {
        console.log("Error in get requestor: " + error.message)
        return error;
      });
      }).catch(function(error) {
        console.log("Error in get user: " + error.message)
        return error;
      });

    }).catch(function(error) {
      console.log("Remove failed: " + error.message)
      return error;
    });
  }else{
    return false;
  }
});

// exports.updateWhenOfferCompleted = ((change, context) => {
//   const beforeData = change.before.val();
//   const afterData = change.after.val();
//   console.log('beforeData<<',beforeData);
//   console.log('afterData<<',afterData);

//   const acceptKey = change.after.val();
//   const completeKey = change.after.key;
//   var refDB = admin.database().ref();
//   console.log('acceptKey', acceptKey);
//   console.log('completeKey', completeKey);

//   if (acceptKey !== null && completeKey !== null) {
//     var offerRef = refDB.child("/offers").child(acceptKey);
//     return offerRef.once('value').then(snapshot => {
//       const offerObj = snapshot.val();
//       const listingID = offerObj.listingID;
//       const offerID = offerObj.offerID;
//       const requestorUID = offerObj.requestorUID;
//       const jobberUID = offerObj.jobberUID;
//       const offer_price = offerObj.offer_price;
//       const jobber_offer_amount = offerObj.jobber_fee;
//       const extension_time = offerObj.extendedService ? offerObj.extendedService.extensionTime : '';
//       const extension_price = offerObj.extendedService ? offerObj.extendedService.extensionPrice : '';
//       const jobber_tip = offerObj.jobber_tip ? offerObj.jobber_tip :'';
//       var assigned = offerObj.assignedJobber && offerObj.assignedJobber.length ? offerObj.assignedJobber : [];
//       console.log('assigned',assigned)
//       var Subjobber1_first_name = assigned && assigned[0] ? assigned[0].firstName  : ''
//       var Subjobber1_last_name = assigned && assigned[0] ? assigned[0].lastName  : ''
//       var Subjobber2_first_name = assigned && assigned[1] ? assigned[1].firstName  : ''
//       var Subjobber2_last_name = assigned && assigned[1] ? assigned[1].lastName  : ''
//       // if(offerObj.start_date) {
//       //   var startDate = new Date(offerObj.start_date);
//       //   startDate = moment(startDate*1000).tz('Canada/Eastern').format('dddd, MMMM Do');
//       // }
//       // if(offerObj.completion_date) {
//       //   var endDate = new Date(offerObj.completion_date);
//       //   endDate = moment(endDate*1000).tz('Canada/Eastern').format('h:mm a');
//       // }
//       console.log('jobberUID<<',jobberUID)
//       var jobberRef = refDB.child("/users").child(jobberUID);

//       return jobberRef.once('value').then(usersnap => {
//         var userObj = usersnap.val();
//         var userId = requestorUID;
//         var metadata = userObj.meta;
//         var deviceToken = metadata.device_token;
//         var useremail = metadata.email;
//         var jfirstName = metadata.firstName;
//         var lastName = metadata.lastName;
//         var phoneNumber = metadata.phone;
//         var time = Math.round(new Date().getTime()/1000);
//         console.log('userId<<',userId)
//         console.log('metadata<<',metadata)
//         console.log('time<<',time)
//         console.log('listingID<<',listingID)

//         var rRef = refDB.child("/users").child(requestorUID);
//         return rRef.once('value').then(rsnap => {
//           var rfirstName = rsnap.val().meta.firstName;
//           var listingRef = refDB.child("/listing").child(listingID);
//           return listingRef.once('value').then(listingsnap => {
//             var listingObj = listingsnap.val();
//             console.log('listingObj<<',listingObj)
//             var order_num = listingObj.order_num;
//             var description = listingObj.description;
//             var ALC_header = listingObj.ALC_header;
//             var jobTitle = listingObj.title;
//             var sub_category = listingObj.category_name;
//             var jobLocation = listingObj.address;
//             var equipmentProvided = listingObj.equipment;
//             var requestorName = listingObj.user_name;
//             var timezone  = listingObj.timezone ? listingObj.timezone : 'Canada/Eastern'
//             if(offerObj.start_date) {
//               var startDate = new Date(offerObj.start_date);
//               startDate = moment(startDate*1000).tz(timezone).format('dddd, MMMM Do');
//             }
//             if(offerObj.completion_date) {
//               var endDate = new Date(offerObj.completion_date);
//               endDate = moment(endDate*1000).tz(timezone).format('h:mm a');
//             }

//             var promises = new Array();
//             promises.push(updateCompletedProjects(requestorUID, listingID, false, UpdateCommandEnum.update));
//             promises.push(updateCompletedProjects(jobberUID, listingID, true, UpdateCommandEnum.update));
//             promises.push(updateAssignedProjects(requestorUID, listingID, false, UpdateCommandEnum.delete));
//             promises.push(updateAssignedProjects(jobberUID, listingID, true, UpdateCommandEnum.delete));

//             console.log('phoneNumber<<',phoneNumber)
//             return Promise.all(promises).then(values => {
//               cio.track(userId, {
//                 name: 'requestor_mark_complete',
//                 data: {
//                   task_title: jobTitle,
//                   sub_category: sub_category,
//                   offer_price: offer_price,
//                   requestor_first_name: rfirstName,
//                   jobber_first_name: jfirstName,
//                   jobber_offer_amount:jobber_offer_amount,
//                   listing_id:listingID,
//                   offer_id: offerID,
//                   jobber_tip:jobber_tip,
//                   extension_time:extension_time,
//                   extension_price: extension_price,
//                   order_num:order_num,
//                   dod_package:ALC_header,
//                   Subjobber1_first_name : Subjobber1_first_name,
//                   Subjobber1_last_name : Subjobber1_last_name,
//                   Subjobber2_first_name : Subjobber2_first_name,
//                   Subjobber2_last_name : Subjobber2_last_name
//                 }
//               });
//               cio.track(jobberUID, {
//                 name: 'requestor_mark_complete_jobber',
//                 data: {
//                   task_title: jobTitle,
//                   sub_category: sub_category,
//                   offer_price: offer_price,
//                   requestor_first_name: rfirstName,
//                   jobber_first_name: jfirstName,
//                   jobber_offer_amount: jobber_offer_amount,
//                   listing_id:listingID,
//                   offer_id: offerID,
//                   jobber_tip:jobber_tip,
//                   extension_time: extension_time,
//                   extension_price:extension_price,
//                   order_num:order_num,
//                   dod_package:ALC_header
//                 }
//               });
//               return values;
//             }).catch(function(err) {
//               console.log('A promise failed to resolve', err);
//               return err;
//             });

//           }).catch(function(error) {
//             console.log("Error in get listing: " + error.message)
//             return error;
//           });
//         }).catch(function(error) {
//           console.log("Error in get requestor: " + error.message)
//           return error;
//         });
//       }).catch(function(error) {
//         console.log("Error in get user: " + error.message)
//         return error;
//       });

//     }).catch(function(error) {
//       console.log("Remove failed: " + error.message)
//       return error;
//     });
//   }else{
//     return false;
//   }
// });
exports.updateWhenOfferCompleted = ((change, context) => {
  const beforeData = change.before.val();
  const afterData = change.after.val();
  console.log('beforeData<<',beforeData);
  console.log('afterData<<',afterData);

  const acceptKey = change.after.val();
  const completeKey = change.after.key;
  var refDB = admin.database().ref();
  console.log('acceptKey', acceptKey);
  console.log('completeKey', completeKey);

  if (acceptKey !== null && completeKey !== null) {
    var offerRef = refDB.child("/offers").child(acceptKey);
    return offerRef.once('value').then(snapshot => {
      const offerObj = snapshot.val();
      const listingID = offerObj.listingID;
      const offerID = offerObj.offerID;
      const requestorUID = offerObj.requestorUID;
      const jobberUID = offerObj.jobberUID;
      const offer_price = offerObj.offer_price;
      const jobber_offer_amount = offerObj.jobber_fee;
      const extension_time = offerObj.extendedService ? offerObj.extendedService.extensionTime : '';
      const extension_price = offerObj.extendedService ? offerObj.extendedService.extensionPrice : '';
      const jobber_tip = offerObj.jobber_tip ? offerObj.jobber_tip :'';
      var assigned = offerObj.assignedJobber && offerObj.assignedJobber.length ? offerObj.assignedJobber : [];
      console.log('assigned',assigned)
      let subJobbers = {
        Subjobber1_first_name: assigned && assigned[0] ? assigned[0].firstName  : '',
        Subjobber1_last_name: assigned && assigned[0] ? assigned[0].lastName  : '',
        Subjobber2_first_name: assigned && assigned[1] ? assigned[1].firstName  : '',
        Subjobber2_last_name: assigned && assigned[1] ? assigned[1].lastName  : '',
      }
      // We will handle this list later. First just send simple package
      // let extendedServices = (offerObj.extendedService && offerObj.extendedService.list) ? offerObj.extendedService.list : {};
      // var listArray = [];
      // Object.keys(extendedServices).forEach((service) => {
      //   listArray.push({
      //     extension_name: extendedServices[service].extensionTime,
      //     extension_amount: extendedServices[service].extensionPrice,
      //   })
      // });
      // console.log('extendedServices',extendedServices)
      // if(offerObj.start_date) {
      //   var startDate = new Date(offerObj.start_date);
      //   startDate = moment(startDate*1000).tz('Canada/Eastern').format('dddd, MMMM Do');
      // }
      // if(offerObj.completion_date) {
      //   var endDate = new Date(offerObj.completion_date);
      //   endDate = moment(endDate*1000).tz('Canada/Eastern').format('h:mm a');
      // }
      console.log('jobberUID<<',jobberUID)
      var jobberRef = refDB.child("/users").child(jobberUID);

      return jobberRef.once('value').then(usersnap => {
        var userObj = usersnap.val();
        var userId = requestorUID;
        var metadata = userObj.meta;
        var deviceToken = metadata.device_token;
        var useremail = metadata.email;
        var jfirstName = metadata.firstName;
        var jLastName = metadata.lastName;
        var jemail = metadata.email;
        var jmobile = metadata.phone || metadata.mobile || metadata.phoneNumber;
        var lastName = metadata.lastName;
        var phoneNumber = metadata.phone;
        var time = Math.round(new Date().getTime()/1000);
        console.log('userId<<',userId)
        console.log('metadata<<',metadata)
        console.log('time<<',time)
        console.log('listingID<<',listingID)

        var rRef = refDB.child("/users").child(requestorUID);
        return rRef.once('value').then(rsnap => {
          var rfirstName = rsnap.val().meta.firstName;
          let requestorData = rsnap.val().meta;
          var listingRef = refDB.child("/listing").child(listingID);
          return listingRef.once('value').then(listingsnap => {
            var listingObj = listingsnap.val();
            console.log('listingObj<<',listingObj)
            var description = listingObj.description;
            var jobLocation = listingObj.address;
            var equipmentProvided = listingObj.equipment;
            var requestorName = listingObj.user_name;
            var timezone  = listingObj.timezone ? listingObj.timezone : 'Canada/Eastern'
            if(offerObj.start_date) {
              var startDate = new Date(offerObj.start_date);
              startDate = moment(startDate*1000).tz(timezone).format('dddd, MMMM Do');
            }
            if(offerObj.completion_date) {
              var endDate = new Date(offerObj.completion_date);
              endDate = moment(endDate*1000).tz(timezone).format('h:mm a');
            }

            var promises = new Array();
            promises.push(updateCompletedProjects(requestorUID, listingID, false, UpdateCommandEnum.update));
            promises.push(updateCompletedProjects(jobberUID, listingID, true, UpdateCommandEnum.update));
            promises.push(updateAssignedProjects(requestorUID, listingID, false, UpdateCommandEnum.delete));
            promises.push(updateAssignedProjects(jobberUID, listingID, true, UpdateCommandEnum.delete));

            let cData = {//Data that is common among all
              order_num: listingObj.order_num,
              listing_id: listingID,
              sub_category: listingObj.category_name,
              dod_package: listingObj.ALC_header,
            }
            console.log(cData);
            let compData = {//Data passed in Complete Events
              ...cData,
              jobber_first_name: jfirstName,
              offer_price: offer_price,
              requestor_first_name: rfirstName,
              jobber_offer_amount:jobber_offer_amount,
              offer_id: offerID,
              jobber_tip:jobber_tip,
              extension_time:extension_time,
              extension_price: extension_price,
              task_title: listingObj.title,
            }
            console.log(compData)
            let extData = {//this is for tip and extension event
              ...cData,
              jobber_first_name: jfirstName,
              jobber_email: jemail,
              jobber_mobile: jmobile,
              jobber_uuid: jobberUID,
              city: listingObj.city,
              task_title: listingObj.title,
            }
            let reqData = {
              ...cData,
              city: listingObj.city,
              requestor_first_name: requestorData.firstName,
              requestor_last_name: requestorData.lastName,
              requestor_email: requestorData.email,
              requestor_mobile: requestorData.mobile || requestorData.phone || requestorData.phoneNumber,
              requestor_uuid: listingObj.uid,
              task_title: listingObj.title,
            }
            console.log(extData)
            console.log('phoneNumber<<',phoneNumber)
            return Promise.all(promises).then(values => {
              cio.track(userId, {
                name: 'requestor_mark_complete',
                data: {
                  ...cData,
                  job_location: listingObj.address,
                  jobber_first_name: jfirstName,
                  jobber_last_name: jLastName,
                  jobber_email: jemail,
                  jobber_mobile: jmobile,
                  jobber_uuid: jobberUID,
                }
              });
              cio.track(jobberUID, {
                name: 'requestor_mark_complete_jobber',
                data: {
                  ...compData,
                }
              });
              // if(listArray.length > 0){
              //   cio.track(userId, {
              //     name: 'extension_added_by_requestor',
              //     data: {
              //       extendedServices: listArray,//array of extension Data
              //       ...extData,
              //     }
              //   });
              // }

              if(jobber_tip && Number(jobber_tip) > 0){
                cio.track(userId, {
                  name: 'tip_added_by_requestor',
                  data: {
                    tip_amount: jobber_tip,
                    ...extData,
                  }
                });
                cio.track(jobberUID, {
                  name: 'tip_added_by_requestor_for_jobber',
                  data: {
                    tip_amount: jobber_tip,
                    ...reqData,
                  }
                });
              }

              return values;
            }).catch(function(err) {
              console.log('A promise failed to resolve', err);
              return err;
            });

          }).catch(function(error) {
            console.log("Error in get listing: " + error.message)
            return error;
          });
        }).catch(function(error) {
          console.log("Error in get requestor: " + error.message)
          return error;
        });
      }).catch(function(error) {
        console.log("Error in get user: " + error.message)
        return error;
      });

    }).catch(function(error) {
      console.log("Remove failed: " + error.message)
      return error;
    });
  }else{
    return false;
  }
});
exports.updateOfferExtendedService = ((change, context) => {
  const beforeData = (change.before && change.before.val()) ? change.before.val().list : {};
  const afterData = (change.after && change.after.val()) ? change.after.val().list : {};
  const beforeExtArr = beforeData ? Object.keys(beforeData) : [];
  const afterExtArr = afterData ? Object.keys(afterData) : [];
  // Both beforeData and afterData contains extendedService data. We will trigger extension events
  // only on those exntesions that are not present in beforeData but are in afterData.
  const filteredExtension = afterExtArr.filter(key => !beforeExtArr.includes(key));
  const filteredDelExtension = beforeExtArr.filter(key => !afterExtArr.includes(key));
  const offerID = change.after.ref.parent.key;
  const refDB = admin.database().ref();
  refDB.child('offers').child(offerID).once('value').then((snap) => {
    const offerData = snap.val();
    const listingID = offerData.listingID;
    const requestorUID = offerData.requestorUID;
    const jobberUID = offerData.jobberUID;
    refDB.child('listing').child(listingID).once('value').then((snap) => {
      const listingData = snap.val();
      if(filteredExtension.length > 0){
        console.log(filteredExtension.length);
        filteredExtension.forEach((key) => {
          let cData = {//Data that is common among all
            order_num: listingData.order_num,
            task_title: listingData.title,
            listing_id: listingID,
            sub_category: listingData.category_name,
            dod_package: listingData.ALC_header,
          }
          if(afterData[key].addedBy == "requestor"){
            refDB.child('users').child(jobberUID).once('value').then((snap) => {
              const jobberData = snap.val().meta;
              let extData = {//this is for tip and extension event
                ...cData,
                jobber_first_name: jobberData.firstName,
                jobber_last_name: jobberData.lastName,
                jobber_email: jobberData.email,
                jobber_mobile: jobberData.phone,
                jobber_uuid: jobberUID,
                city: listingData.city,
                actionedBy: "requestor",
              }
              cio.track(requestorUID, {
                name: 'extension_added_by_requestor',
                data: {
                  extendedService: [{
                    extension_name: afterData[key].extensionTime,
                    extension_amount: afterData[key].extensionPrice,
                  }],//array of extension Data
                  ...extData,
                }
              });
            });
          }
          else{
            refDB.child('users').child(requestorUID).once('value').then((snap) => {
              const requestorData = snap.val().meta;
              let extData = {//this is for tip and extension event
                ...cData,
                requestor_first_name: requestorData.firstName,
                requestor_last_name: requestorData.lastName,
                requestor_email: requestorData.email,
                requestor_mobile: requestorData.phone,
                requestor_uuid: requestorUID,
                city: listingData.city,
                actionedBy: "jobber",
              }
              cio.track(requestorUID, {
                name: 'extension_added_by_jobber',
                data: {
                  extendedService: [{
                    extension_name: afterData[key].extensionTime,
                    extension_amount: afterData[key].extensionPrice,
                  }],//array of extension Data
                  ...extData,
                }
              });
            });
          }
        });
        return filteredExtension;
      }
      if(filteredDelExtension.length > 0){
        console.log(filteredDelExtension.length);
        filteredDelExtension.forEach((key) => {
          let cData = {//Data that is common among all
            order_num: listingData.order_num,
            task_title: listingData.title,
            listing_id: listingID,
            sub_category: listingData.category_name,
            dod_package: listingData.ALC_header,
          }
          if(beforeData[key].addedBy == "requestor"){
            refDB.child('users').child(jobberUID).once('value').then((snap) => {
              const jobberData = snap.val().meta;
              let extData = {//this is for tip and extension event
                ...cData,
                jobber_first_name: jobberData.firstName,
                jobber_last_name: jobberData.lastName,
                jobber_email: jobberData.email,
                jobber_mobile: jobberData.phone,
                jobber_uuid: jobberUID,
                city: listingData.city,
                actionedBy: "requestor",
              }
              cio.track(requestorUID, {
                name: 'extension_deleted_by_requestor',
                data: {
                  extendedService: [{
                        extension_name: beforeData[key].extensionTime,
                        extension_amount: beforeData[key].extensionPrice,
                      }],//array of extension Data
                  ...extData,
                }
              });
            });
          }
          else{
            refDB.child('users').child(requestorUID).once('value').then((snap) => {
              const requestorData = snap.val().meta;
              let extData = {//this is for tip and extension event
                ...cData,
                requestor_first_name: requestorData.firstName,
                requestor_last_name: requestorData.lastName,
                requestor_email: requestorData.email,
                requestor_mobile: requestorData.phone,
                requestor_uuid: requestorUID,
                city: listingData.city,
                actionedBy: "jobber",
              }
              cio.track(jobberUID, {
                name: 'extension_deleted_by_jobber',
                data: {
                  extendedService: [{
                    extension_name: beforeData[key].extensionTime,
                    extension_amount: beforeData[key].extensionPrice,
                  }],//array of extension Data
                  ...extData,
                }
              });
            });
          }
        });
        return filteredDelExtension;
      }
      else{
        return {};
      }
    })
  })
});
// exports.updateWhenOfferCompletedByJobber = ((change, context) => {
//   console.log('event val<<',change.after.val());
//   const acceptKey = change.after.val();
//   const completeKey = change.after.key;
//   var refDB = admin.database().ref();
//   console.log('acceptKey', acceptKey);
//   console.log('completeKey', completeKey);

//   if (acceptKey !== null && completeKey !== null) {
//     var offerRef = refDB.child("/offers").child(acceptKey);
//     return offerRef.once('value').then(snapshot => {
//       const offerObj = snapshot.val();
//       const listingID = offerObj.listingID;
//       const offerID = offerObj.offerID;
//       const requestorUID = offerObj.requestorUID;
//       const jobberUID = offerObj.jobberUID;
//       // if(offerObj.start_date) {
//       //   var startDate = new Date(offerObj.start_date);
//       //   startDate = moment(startDate*1000).tz('Canada/Eastern').format('dddd, MMMM Do');
//       // }
//       // if(offerObj.completion_date) {
//       //   var endDate = new Date(offerObj.completion_date);
//       //   endDate = moment(endDate*1000).tz('Canada/Eastern').format('dddd, MMMM Do');
//       // }
//       console.log('jobberUID<<',jobberUID)

//       var requestorRef = refDB.child("/users").child(requestorUID);
//       return requestorRef.once('value').then(usersnap => {
//         var userObj = usersnap.val();
//         var userId = jobberUID;
//         var metadata = userObj.meta;
//         var deviceToken = metadata.device_token;
//         var useremail = metadata.email;
//         var rfirstName = metadata.firstName;
//         var lastName = metadata.lastName;
//         var phoneNumber = metadata.phone;
//         var time = Math.round(new Date().getTime()/1000);
//         console.log('userId<<',userId)
//         console.log('metadata<<',metadata)
//         console.log('time<<',time)
//         console.log('listingID<<',listingID)
//         console.log('offerID<<',offerID)

//         var jRef = refDB.child("/users").child(jobberUID);
//         return jRef.once('value').then(jsnap => {
//           var jfirstName = jsnap.val().meta.firstName;
//           var listingRef = refDB.child("/listing").child(listingID);
//           var creatorId;
//           if(userObj && userObj.hContactData && userObj.hContactData.creator_id) {
//             creatorId = userObj.hContactData.creator_id;

//           }
//           console.log('creatorId---', creatorId)
//           return listingRef.once('value').then(listingsnap => {
//             var listingObj = listingsnap.val();
//             console.log('listingObj<<',listingObj)
//             var order_num = listingObj.order_num;
//             var description = listingObj.description;
//             var ALC_header = listingObj.ALC_header;
//             var jobTitle = listingObj.title;
//             var sub_category = listingObj.category_name;
//             var equipmentProvided = listingObj.equipment;
//             var requestorName = listingObj.user_name;

//             var timezone  = listingObj.timezone ?  listingObj.timezone : 'Canada/Eastern'

//             if(offerObj.start_date) {
//               var startDate = new Date(offerObj.start_date);
//               startDate = moment(startDate*1000).tz(timezone).format('dddd, MMMM Do');
//             }
//             if(offerObj.completion_date) {
//               var endDate = new Date(offerObj.completion_date);
//               endDate = moment(endDate*1000).tz(timezone).format('dddd, MMMM Do');
//             }

//             cio.track(userId, {
//               name: 'jobber_mark_complete',
//               data: {
//                 task_title: jobTitle,
//                 sub_category: sub_category,
//                 requestor_first_name: rfirstName,
//                 jobber_first_name: jfirstName,
//                 listing_id: listingID,
//                 offer_id: offerID,
//                 order_num:order_num,
//                 dod_package:ALC_header
//               }
//             });
//             cio.track(requestorUID, {
//               name: 'jobber_mark_complete_requestor',
//               data: {
//                 task_title: jobTitle,
//                 sub_category: sub_category,
//                 requestor_first_name: rfirstName,
//                 jobber_first_name: jfirstName,
//                 listing_id: listingID,
//                 offer_id: offerID
//               }
//             });
//             return;
//             // if(creatorId && phoneNumber) {
//             //   sendMsgByHeyMarket(creatorId, phoneNumber, 46577);
//             // } else {
//               // return false;
//             // }
//           }).catch(function(error) {
//             console.log("Error in get listing: " + error.message)
//             return error;
//           });
//         }).catch(function(error) {
//           console.log("Error in get jobber: " + error.message)
//           return error;
//         });
//       }).catch(function(error) {
//         console.log("Error in get user: " + error.message)
//         return error;
//       });

//     }).catch(function(error) {
//       console.log("Remove failed: " + error.message)
//       return error;
//     });
//   }else{
//     return false;
//   }
// });
exports.updateWhenOfferCompletedByJobber = ((change, context) => {
  console.log('event val<<',change.after.val());
  const acceptKey = change.after.val();
  const completeKey = change.after.key;
  var refDB = admin.database().ref();
  console.log('acceptKey', acceptKey);
  console.log('completeKey', completeKey);

  if (acceptKey !== null && completeKey !== null) {
    var offerRef = refDB.child("/offers").child(acceptKey);
    return offerRef.once('value').then(snapshot => {
      const offerObj = snapshot.val();
      const listingID = offerObj.listingID;
      const offerID = offerObj.offerID;
      const requestorUID = offerObj.requestorUID;
      const jobberUID = offerObj.jobberUID;
      // const extendedServices = (offerObj.extendedService && offerObj.extendedService.list) ? offerObj.extendedService.list : {};
      // let extensionArr = [];
      // console.log(extendedServices);
      // Object.keys(extendedServices).forEach((service) => {
      //   // service is the obj with extensionPrice & extensionTime
      //   extensionArr.push({
      //     extension_amount: extendedServices[service].extensionPrice,
      //     extension_name: extendedServices[service].extensionTime
      //   });
      // });
      // if(offerObj.start_date) {
      //   var startDate = new Date(offerObj.start_date);
      //   startDate = moment(startDate*1000).tz('Canada/Eastern').format('dddd, MMMM Do');
      // }
      // if(offerObj.completion_date) {
      //   var endDate = new Date(offerObj.completion_date);
      //   endDate = moment(endDate*1000).tz('Canada/Eastern').format('dddd, MMMM Do');
      // }
      console.log('jobberUID<<',jobberUID)

      var requestorRef = refDB.child("/users").child(requestorUID);
      return requestorRef.once('value').then(usersnap => {
        var userObj = usersnap.val();
        var userId = jobberUID;
        var metadata = userObj.meta;
        var useremail = metadata.email;
        var rfirstName = metadata.firstName;
        var lastName = metadata.lastName;
        var phoneNumber = metadata.phone;
        var time = Math.round(new Date().getTime()/1000);
        console.log('userId<<',userId)
        console.log('metadata<<',metadata)
        console.log('time<<',time)
        console.log('listingID<<',listingID)
        console.log('offerID<<',offerID)

        var jRef = refDB.child("/users").child(jobberUID);
        return jRef.once('value').then(jsnap => {
          var jfirstName = jsnap.val().meta.firstName;
          var jobberData = jsnap.val().meta;
          var listingRef = refDB.child("/listing").child(listingID);
          var creatorId;
          if(userObj && userObj.hContactData && userObj.hContactData.creator_id) {
            creatorId = userObj.hContactData.creator_id;

          }
          console.log('creatorId---', creatorId)
          return listingRef.once('value').then(listingsnap => {
            var listingObj = listingsnap.val();
            console.log('listingObj<<',listingObj)
            var order_num = listingObj.order_num;
            var ALC_header = listingObj.ALC_header;
            var requestorName = listingObj.user_name;
            let city = listingObj.city;
            var timezone  = listingObj.timezone ?  listingObj.timezone : 'Canada/Eastern'

            if(offerObj.start_date) {
              var startDate = new Date(offerObj.start_date);
              startDate = moment(startDate*1000).tz(timezone).format('dddd, MMMM Do');
            }
            if(offerObj.completion_date) {
              var endDate = new Date(offerObj.completion_date);
              endDate = moment(endDate*1000).tz(timezone).format('dddd, MMMM Do');
            }
            let cData = {//Data that is common in all the events
              task_title: listingObj.title,
              sub_category: listingObj.category_name,
              requestor_first_name: rfirstName,
              listing_id: listingID,
            }
            let compData = {
              order_num: listingObj.order_num,
              listing_id: listingID,
              sub_category: listingObj.category_name,
              dod_package: listingObj.ALC_header,
              job_location: listingObj.address,
            }
            cio.track(userId, {
              name: 'jobber_mark_complete',
              data: {
                ...compData,
                requestor_first_name: rfirstName,
                requestor_last_Name: lastName,
                requestor_email: useremail,
                requestor_mobile: phoneNumber,
                requestor_uuid: listingObj.uid,
              }
            });
            // cio.track(userId, {
            //   name: 'extension_added_by_jobber',
            //   data: {
            //     extendedServices: extensionArr,
            //     order_num:order_num,
            //     requestor_last_name: lastName,
            //     requestor_email: useremail,
            //     requestor_mobile: phoneNumber,
            //     jobber_uuid: userId,
            //     dod_package:ALC_header,
            //     city: city,
            //     ...cData,
            //   }
            // });
            cio.track(requestorUID, {
              name: 'jobber_mark_complete_requestor',
              data: {
                ...compData,
                jobber_uuid: userId,
                jobber_first_name: jfirstName,
                jobber_last_name: jobberData.lastName,
                jobber_email: jobberData.email,
                jobber_mobile: jobberData.phone,
              }
            });
            return;
            // if(creatorId && phoneNumber) {
            //   sendMsgByHeyMarket(creatorId, phoneNumber, 46577);
            // } else {
              // return false;
            // }
          }).catch(function(error) {
            console.log("Error in get listing: " + error.message)
            return error;
          });
        }).catch(function(error) {
          console.log("Error in get jobber: " + error.message)
          return error;
        });
      }).catch(function(error) {
        console.log("Error in get user: " + error.message)
        return error;
      });

    }).catch(function(error) {
      console.log("Remove failed: " + error.message)
      return error;
    });
  }else{
    return false;
  }
});

// exports.updateWhenOfferDisputed = ((change, context) => {
//   console.log('event val<<',change.after.val());
//   const acceptVal = change.after.val();
//   const disputeKey = change.after.key;
//   var refDB = admin.database().ref();
//   console.log('acceptVal', acceptVal);
//   console.log('disputeKey', disputeKey);

//   if (acceptVal !== null && disputeKey !== null) {
//     var offerRef = refDB.child("/offers").child(acceptVal.offerId);
//     return offerRef.once('value').then(snapshot => {
//       const offerObj = snapshot.val();
//       console.log('offerObj<<',offerObj)
//       const listingID = offerObj.listingID;
//       const offerID = offerObj.offerID;
//       const requestorUID = offerObj.requestorUID;
//       const jobberUID = offerObj.jobberUID;
//       // if(offerObj.start_date) {
//       //   var offer_start_date = new Date(offerObj.start_date);
//       //   offer_start_date = moment(offer_start_date*1000).tz('Canada/Eastern').format('dddd, MMMM Do');
//       // }
//       var dispute_text = offerObj.disputeReason;
//       console.log('jobberUID<<',jobberUID)
//       console.log('requestorUID<<',requestorUID)

//       var rRef = refDB.child("/users").child(requestorUID);
//       return rRef.once('value').then(rsnapshot => {
//         var rfirstName = rsnapshot.val().meta.firstName;

//         var jRef = refDB.child("/users").child(jobberUID);
//         return jRef.once('value').then(jsnapshot => {
//           var jfirstName = jsnapshot.val().meta.firstName;

//           var userRef = refDB.child("/users").child(acceptVal.uid);
//           return userRef.once('value').then(usersnap => {
//             var userObj = usersnap.val();
//             var userId = usersnap.key;
//             var metadata = userObj.meta;
//             var deviceToken = metadata.device_token;
//             var useremail = metadata.email;
//             var phoneNumber = metadata.phone;
//             var firstName = metadata.firstName;
//             var lastName = metadata.lastName;
//             var time = Math.round(new Date().getTime()/1000);
//             console.log('userId<<',userId)
//             console.log('metadata<<',metadata)
//             console.log('time<<',time)
//             console.log('listingID<<',listingID)
//             var listingRef = refDB.child("/listing").child(listingID);

//             return listingRef.once('value').then(listingsnap => {
//               var listingObj = listingsnap.val();
//               console.log('listingObj<<',listingObj)

//               var timezone = listingObj.timezone ? listingObj.timezone : 'Canada/Eastern'

//               if(offerObj.start_date) {
//                 var offer_start_date = new Date(offerObj.start_date);
//                 offer_start_date = moment(offer_start_date*1000).tz(timezone).format('dddd, MMMM Do');
//               }

//               var jobTitle = listingObj.title;
//               var sub_category = listingObj.category_name;
//               var jobLocation = listingObj.address;
//               var promises = new Array();
//               promises.push(updateDisputedProjects(requestorUID, listingID, false, UpdateCommandEnum.update));
//               promises.push(updateDisputedProjects(jobberUID, listingID, true, UpdateCommandEnum.update));
//               console.log('phoneNumber<<',phoneNumber)
//               return Promise.all(promises).then(values => {
//                 if(metadata.isJobber == true || metadata.isJobber == "true") {
//                   if(listingObj.DOD === "true") {
//                     cio.track(jobberUID, {
//                     name: 'dod_job_disputed_jobber',
//                     data: {
//                       task_title: jobTitle,
//                       sub_category: sub_category,
//                       offer_start_date : offer_start_date,
//                       jobber_first_name: jfirstName,
//                       requestor_first_name: rfirstName,
//                       dispute_text: dispute_text,
//                       listing_id: listingID,
//                       offer_id: offerID
//                     }
//                   });
//                   cio.track(requestorUID, {
//                     name: 'dod_job_disputed_requestor',
//                     data: {
//                       task_title: jobTitle,
//                       sub_category: sub_category,
//                       offer_start_date : offer_start_date,
//                       jobber_first_name: jfirstName,
//                       requestor_first_name: rfirstName,
//                       dispute_text: dispute_text,
//                       listing_id: listingID,
//                       offer_id: offerID
//                     }
//                   });
//                 } else {
//                     cio.track(jobberUID, {
//                       name: 'jobber_dispute',
//                       data: {
//                         task_title: jobTitle,
//                         sub_category: sub_category,
//                         offer_start_date : offer_start_date,
//                         jobber_first_name: jfirstName,
//                         requestor_first_name: rfirstName,
//                         dispute_text: dispute_text,
//                         listing_id: listingID,
//                         offer_id: offerID
//                       }
//                     });
//                     cio.track(requestorUID, {
//                       name: 'jobber_dispute_requestor',
//                       data: {
//                         task_title: jobTitle,
//                         sub_category: sub_category,
//                         offer_start_date : offer_start_date,
//                         jobber_first_name: jfirstName,
//                         requestor_first_name: rfirstName,
//                         dispute_text: dispute_text,
//                         listing_id: listingID,
//                         offer_id: offerID
//                       }
//                     });
//                   }
//                 }
//                 else {
//                   if(listingObj.DOD === "true") {
//                     cio.track(requestorUID, {
//                       name: 'dod_job_disputed_requestor',
//                       data: {
//                         task_title: jobTitle,
//                         sub_category: sub_category,
//                         offer_start_date : offer_start_date,
//                         jobber_first_name: jfirstName,
//                         requestor_first_name: rfirstName,
//                         dispute_text: dispute_text,
//                         listing_id: listingID,
//                         offer_id: offerID
//                       }
//                     });
//                     cio.track(jobberUID, {
//                       name: 'dod_job_disputed_jobber',
//                       data: {
//                         task_title: jobTitle,
//                         sub_category: sub_category,
//                         offer_start_date : offer_start_date,
//                         jobber_first_name: jfirstName,
//                         requestor_first_name: rfirstName,
//                         dispute_text: dispute_text,
//                         listing_id: listingID,
//                         offer_id: offerID
//                       }
//                     });
//                   } else {
//                     cio.track(requestorUID, {
//                       name: 'requestor_dispute',
//                       data: {
//                         task_title: jobTitle,
//                         sub_category: sub_category,
//                         offer_start_date : offer_start_date,
//                         jobber_first_name: jfirstName,
//                         requestor_first_name: rfirstName,
//                         dispute_text: dispute_text,
//                         listing_id: listingID,
//                         offer_id: offerID
//                       }
//                     });
//                      cio.track(jobberUID, {
//                       name: 'requestor_dispute_jobber',
//                       data: {
//                         task_title: jobTitle,
//                         sub_category: sub_category,
//                         offer_start_date : offer_start_date,
//                         jobber_first_name: jfirstName,
//                         requestor_first_name: rfirstName,
//                         dispute_text: dispute_text,
//                         listing_id: listingID,
//                         offer_id: offerID
//                       }
//                     });
//                   }
//                 }
//                 return values;
//               }).catch(function(err) {
//                 console.log('A promise failed to resolve', err);
//                 return err;
//               });

//             }).catch(function(error) {
//               console.log("Error in get listing: " + error.message)
//               return error;
//             });

//           }).catch(function(error) {
//             console.log("Error in get user: " + error.message)
//             return error;
//           });
//         }).catch(function(error) {
//           console.log("Reuquester getting failed: " + error.message)
//           return error;
//         });
//       }).catch(function(error) {
//         console.log("Jobber getting failed: " + error.message)
//         return error;
//       });
//     }).catch(function(error) {
//       console.log("Remove failed: " + error.message)
//       return error;
//     });
//   }else{
//     return false;
//   }
// });
exports.updateWhenOfferDisputed = ((change, context) => {
  console.log('event val<<',change.after.val());
  const acceptVal = change.after.val();
  const disputeKey = change.after.key;
  let refDB = admin.database().ref();
  console.log('acceptVal', acceptVal);
  console.log('disputeKey', disputeKey);

  if (acceptVal !== null && disputeKey !== null) {
    let offerRef = refDB.child("/offers").child(acceptVal.offerId);
    return offerRef.once('value').then(snapshot => {
      const offerObj = snapshot.val();
      console.log('offerObj<<',offerObj)
      const {listingID, offerID, requestorUID, jobberUID} = offerObj;
      // if(offerObj.start_date) {
      //   let offer_start_date = new Date(offerObj.start_date);``
      //   offer_start_date = moment(offer_start_date*1000).tz('Canada/Eastern').format('dddd, MMMM Do');
      // }
      let dispute_text = offerObj.disputeReason;
      console.log('jobberUID<<',jobberUID)
      console.log('requestorUID<<',requestorUID)

      let rRef = refDB.child("/users").child(requestorUID);
      return rRef.once('value').then(rsnapshot => {
        let rData = rsnapshot.val().meta;
        let jRef = refDB.child("/users").child(jobberUID);
        return jRef.once('value').then(jsnapshot => {
          let jData = jsnapshot.val().meta;
          let userRef = refDB.child("/users").child(acceptVal.uid);
          return userRef.once('value').then(usersnap => {
            let userObj = usersnap.val();
            let userMetaData = userObj.meta;
            let time = Math.round(new Date().getTime()/1000);
            console.log('userId<<',usersnap.key);
            console.log('userMetaData<<',userMetaData)
            console.log('time<<',time)
            console.log('listingID<<',listingID)
            let listingRef = refDB.child("/listing").child(listingID);
            return listingRef.once('value').then(listingsnap => {
              let listingObj = listingsnap.val();
              console.log('listingObj<<',listingObj)

              let timezone = listingObj.timezone ? listingObj.timezone : 'Canada/Eastern'

              if(offerObj.start_date) {
                var offer_start_date = new Date(offerObj.start_date);
                offer_start_date = moment(offer_start_date*1000).tz(timezone).format('dddd, MMMM Do');
              }
              let metaData = {
                dispute_reason: dispute_text,
                order_num: listingObj.order_num,
                listing_id: listingID,
                sub_category: listingObj.category_name,
                task_title: listingObj.title,
                dod_package: listingObj.ALC_header,
                city: listingObj.city,
              }
              let rMetadata = {
                ...metaData,
                requestor_first_name: rData.firstName,
                requestor_last_name: rData.lastName,
                requestor_email: rData.email,
                requestor_mobile: rData.phone,
              }
               console.log('rMetadata',rMetadata)
              let jMetadata = {
                ...metaData,
                jobber_first_name: jData.firstName,
                jobber_last_name: jData.lastName,
                jobber_email: jData.email,
                jobber_mobile: jData.phone,
              }
               console.log('jMetadata',jMetadata)
              // The data for events where no change is done
              const data = {
                    ...metaData,
                        offer_start_date : offer_start_date,
                        jobber_first_name: jData.first_name,
                        requestor_first_name: rData.first_name,
                  }
                  console.log('data', data)
              let promises = new Array();
              promises.push(updateDisputedProjects(requestorUID, listingID, false, UpdateCommandEnum.update));
              promises.push(updateDisputedProjects(jobberUID, listingID, true, UpdateCommandEnum.update));
              return Promise.all(promises).then(values => {
                if(listingObj.previousJobStatus == "jobberDispute"){
                  if(listingObj.DOD === "true") {
                    cio.track(jobberUID, {
                    name: 'dispute_by_jobber_for_jobber',
                    data: {
                      ...rMetadata,
                      requestor_uuid: requestorUID
                    }
                  });
                  cio.track(requestorUID, {
                    name: 'dispute_by_jobber_for_requestor',
                    data: {
                      ...jMetadata,
                      jobber_uuid: jobberUID
                    }
                  });
                } else {
                    cio.track(jobberUID, {
                      name: 'jobber_dispute',
                      data: {
                        ...data
                      }
                    });
                    cio.track(requestorUID, {
                      name: 'jobber_dispute_requestor',
                      data: {
                        ...data
                      }
                    });
                  }
                }
                else {
                  if(listingObj.DOD === "true") {
                    cio.track(requestorUID, {
                      name: 'dispute_by_requestor_for_requestor',
                      data: {
                        ...jMetadata,
                        jobber_uuid : jobberUID
                      }
                    });
                    cio.track(jobberUID, {
                      name: 'dispute_by_requestor_for_jobber',
                      data: {
                        ...rMetadata,
                        requestor_uuid: requestorUID
                      }
                    });
                  } else {
                    cio.track(requestorUID, {
                      name: 'requestor_dispute',
                      data: {
                        ...data,
                      }
                    });
                     cio.track(jobberUID, {
                      name: 'requestor_dispute_jobber',
                      data: {
                        ...data,
                      }
                    });
                  }
                }
                return values;
              }).catch(function(err) {
                console.log('A promise failed to resolve', err);
                return err;
              });

            }).catch(function(error) {
              console.log("Error in get listing: " + error.message)
              return error;
            });

          }).catch(function(error) {
            console.log("Error in get user: " + error.message)
            return error;
          });
        }).catch(function(error) {
          console.log("Reuquester getting failed: " + error.message)
          return error;
        });
      }).catch(function(error) {
        console.log("Jobber getting failed: " + error.message)
        return error;
      });
    }).catch(function(error) {
      console.log("Remove failed: " + error.message)
      return error;
    });
  }else{
    return false;
  }
});

exports.updateAfterCancelJobRequester = ((snap, context) => {
  const listingObj = snap.val();
  console.log('listingObj<<',listingObj)
  var refDB = admin.database().ref();
  var eventName;
  var rEventName;
  var jEventName;
  const listingRef = refDB.child("/listing").child(listingObj.listingID);
  return listingRef.once('value').then(listingsnap => {
    const listingVal = listingsnap.val();
    console.log('listingVal<<',listingVal)
    const listingId = listingObj.listingID;
    const jobber_offer_amount = listingObj.jobber_fee;
    const jobTitle = listingVal.title;
    const sub_category = listingVal.category_name;
    const requestorName = listingVal.user_name;
    const cancelReason = listingVal.cacelReason;
    const jobLocation = listingVal.address;
    const subCategory = listingVal.category_name;
    const order_num = listingVal.order_num;
    const ALC_header = listingVal.ALC_header;


    var promises = new Array();
    var offerId = (listingVal && listingVal.previousOfferData) ? listingVal.previousOfferData.offer_id : listingVal.offer_id;
    console.log('offerId',offerId)
    var acceptId = (listingVal && listingVal.previousOfferData) ? listingVal.previousOfferData.accept_id : listingVal.accept_id;
    let checkAssignedJobberExits = listingObj && listingObj.assignedJobber ? true : false;
    console.log('checkAssignedJobberExits', checkAssignedJobberExits)
    var Subjobber1_first_name = (checkAssignedJobberExits && listingObj.assignedJobber[0] && listingObj.assignedJobber[0].firstName) ? listingObj.assignedJobber[0].firstName : '';
    var Subjobber1_last_name = (checkAssignedJobberExits && listingObj.assignedJobber[0] && listingObj.assignedJobber[0].lastName) ? listingObj.assignedJobber[0].lastName : '';
    var Subjobber1_mobile = (checkAssignedJobberExits && listingObj.assignedJobber[0] && listingObj.assignedJobber[0].phone) ? listingObj.assignedJobber[0].phone : '';
    var Subjobber1_email = (checkAssignedJobberExits && listingObj.assignedJobber[0] && listingObj.assignedJobber[0].email) ? listingObj.assignedJobber[0].email : '';
    var Subjobber1_pay = (checkAssignedJobberExits && listingObj.assignedJobber[0] && listingObj.assignedJobber[0].jobberPrice) ? listingObj.assignedJobber[0].jobberPrice : '';
    var Subjobber2_first_name = (checkAssignedJobberExits && listingObj.assignedJobber[1] && listingObj.assignedJobber[1].firstName) ? listingObj.assignedJobber[1].firstName : '';
    var Subjobber2_last_name = (checkAssignedJobberExits && listingObj.assignedJobber[1] && listingObj.assignedJobber[1].lastName) ? listingObj.assignedJobber[1].lastName : '';
    var Subjobber2_mobile = (checkAssignedJobberExits && listingObj.assignedJobber[1] && listingObj.assignedJobber[1].phone) ? listingObj.assignedJobber[1].phone : '';
    var Subjobber2_email = (checkAssignedJobberExits && listingObj.assignedJobber[1] && listingObj.assignedJobber[1].email) ? listingObj.assignedJobber[1].email : '';
    var Subjobber2_pay = (checkAssignedJobberExits && listingObj.assignedJobber[1] && listingObj.assignedJobber[1].jobberPrice) ? listingObj.assignedJobber[1].jobberPrice : '';

    const ADMIN_RELEASE_JOB_MSG = "Admin released job from jobber"

    if(offerId || (offerId && acceptId)) {
      console.log('listingObj.jobberUID in cacelJob<<', listingObj.jobberUID)
      const jobberId = listingObj.jobberUID;
      const requestorId = listingObj.requestorUID;
      if(offerId && acceptId) {
        if(listingVal.previousJobStatus === ADMIN_RELEASE_JOB_MSG) {
          jEventName = 'admin_released_assigned_job__JOBBER';
          rEventName = 'admin_released_assigned_job__REQUESTOR';
        }
        if(listingVal.previousJobStatus == "jobber Cancelled" || listingVal.jobStatus == "jobber Cancelled") {
          jEventName = 'jobber_cancel_assigned';
          rEventName = 'jobber_cancel_assigned_requestor';
        }
        if(listingVal.jobStatus == "Cancelled") {
          jEventName = 'requestor_cancel_assigned_jobber';
          rEventName = 'requestor_cancel_assigned';
        }
        if((listingVal.previousJobStatus == "jobber Cancelled" || listingVal.jobStatus == "jobber Cancelled") && listingVal.DOD === "true") {
          jEventName = 'jobber_dod_job_cancelled_assigned';
          rEventName = 'jobber_dod_job_cancelled_assigned_requestor';
        }
        if(listingVal.jobStatus == "Cancelled" && listingVal.DOD === "true") {
          jEventName = 'requestor_dod_job_cancelled_assigned_jobber';
          rEventName = 'requestor_dod_job_cancelled_assigned';
        }

        var timezone = listingVal.timezone ? listingVal.timezone : 'Canada/Eastern'

        if(listingObj.start_date) {
          var offer_start_date = new Date(listingObj.start_date);
          offer_start_date = moment(offer_start_date*1000).tz(timezone).format('dddd, MMMM Do');
        }
        if(listingObj.start_time) {
          var offer_start_time = new Date(listingObj.start_time);
          offer_start_time = moment(offer_start_time*1000).tz(timezone).format('h:mm a');
        }

        if(listingObj.jobber_date) {
        var jobberDate = moment(listingObj.jobber_date*1000).tz(timezone).format('dddd, MMMM Do');
        }
        if(listingObj.jobber_time) {
          var jobberTime = moment(listingObj.jobber_time*1000).tz(timezone).format('h:mm a');
        }
        var rRef = refDB.child("/users").child(requestorId);
        return rRef.once('value').then(rsnap => {
          var rfirstName = rsnap.val().meta.firstName;
          var rfirstName = rsnap.val().meta.lastName;

          var jRef = refDB.child("/users").child(jobberId);
          return jRef.once('value').then(jsnap => {
          var jfirstName = jsnap.val().meta.firstName;
          var jlastName = jsnap.val().meta.lastName;
          console.log('inside if<<')
          console.log(`updateAfterCancelJobRequester previousJobStatus: ${listingVal.previousJobStatus}`);
          if(
            listingVal.previousJobStatus == "jobber Cancelled" || 
            listingVal.jobStatus == "jobber Cancelled" || 
            listingVal.previousJobStatus == "requestor reAssign" ||
            listingVal.previousJobStatus === ADMIN_RELEASE_JOB_MSG
          ) {
            promises.push(updateOpenProjects(requestorId, listingId, false, UpdateCommandEnum.update));
            promises.push(updateDisputedProjects(jobberId, listingId, true, UpdateCommandEnum.update));
            promises.push(updateAssignedProjects(requestorId, listingId, false, UpdateCommandEnum.delete));
            promises.push(updateAssignedProjects(jobberId, listingId, true, UpdateCommandEnum.delete));
          }else{
            promises.push(updateDisputedProjects(requestorId, listingId, false, UpdateCommandEnum.update));
            promises.push(updateDisputedProjects(jobberId, listingId, true, UpdateCommandEnum.update));
            promises.push(updateAssignedProjects(requestorId, listingId, false, UpdateCommandEnum.delete));
            promises.push(updateAssignedProjects(jobberId, listingId, true, UpdateCommandEnum.delete));
          }

          console.log('Subjobber1_first_name',Subjobber1_first_name)
          console.log('Subjobber1_mobile',Subjobber1_mobile)
          console.log('Subjobber1_email',Subjobber1_email)
          console.log('Subjobber1_pay',Subjobber1_pay)
          console.log('Subjobber2_first_name',Subjobber2_first_name)
          console.log('Subjobber2_mobile',Subjobber2_mobile)
          console.log('Subjobber2_email',Subjobber2_email)
          console.log('Subjobber2_pay',Subjobber2_pay)
          console.log('ALC_header',ALC_header)
          console.log('order_num',order_num)
          return Promise.all(promises).then(values => {
            if(listingVal.DOD == "true"){
              console.log('in dod check');
              cio.track(requestorId, {
                name: rEventName,
                data: {
                  task_title: jobTitle,
                  sub_category: sub_category,
                  offer_start_date: offer_start_date,
                  offer_start_time: offer_start_time,
                  jobber_first_name: jfirstName,
                  jobber_last_name: jlastName,
                  jobber_offer_amount: jobber_offer_amount,
                  jobber_time: jobberDate,
                  jobber_date: jobberTime,
                  requestor_first_name: rfirstName,
                  cancel_reason: cancelReason,
                  listing_id: listingObj.listingID,
                  Subjobber1_first_name : Subjobber1_first_name,
                  Subjobber1_mobile : Subjobber1_mobile,
                  Subjobber1_email : Subjobber1_email,
                  Subjobber1_pay : Subjobber1_pay,
                  Subjobber2_first_name : Subjobber2_first_name,
                  Subjobber2_mobile : Subjobber2_mobile,
                  Subjobber2_email : Subjobber2_email,
                  Subjobber2_pay : Subjobber2_pay,
                  dod_package:ALC_header,
                  order_num : order_num

                }
              })
              cio.track(jobberId, {
                name: jEventName,
                data: {
                  task_title: jobTitle,
                  sub_category: sub_category,
                  offer_start_date: offer_start_date,
                  offer_start_time: offer_start_time,
                  requestor_first_name: rfirstName,
                  jobber_first_name: jfirstName,
                  jobber_last_name: jlastName,
                  jobber_offer_amount: jobber_offer_amount,
                  jobber_time: jobberDate,
                  jobber_date: jobberTime,
                  cancel_reason: cancelReason,
                  listing_id: listingObj.listingID,
                  Subjobber1_first_name : Subjobber1_first_name,
                  Subjobber1_mobile : Subjobber1_mobile,
                  Subjobber1_email : Subjobber1_email,
                  Subjobber1_pay : Subjobber1_pay,
                  Subjobber2_first_name : Subjobber2_first_name,
                  Subjobber2_mobile : Subjobber2_mobile,
                  Subjobber2_email : Subjobber2_email,
                  Subjobber2_pay : Subjobber2_pay,
                  order_num : order_num,
                  dod_package:ALC_header
                }
              })

            }else{
              console.log('in elssssss check')
              cio.track(requestorId, {
                name: rEventName,
                data: {
                  task_title: jobTitle,
                  sub_category: sub_category,
                  offer_start_date: offer_start_date,
                  offer_start_time: offer_start_time,
                  jobber_first_name: jfirstName,
                  requestor_first_name: rfirstName,
                  cancel_reason: cancelReason,
                  listing_id: listingObj.listingID
                }
              })
              cio.track(jobberId, {
                name: jEventName,
                data: {
                  task_title: jobTitle,
                  sub_category: sub_category,
                  offer_start_date: offer_start_date,
                  offer_start_time: offer_start_time,
                  jobber_first_name: jfirstName,
                  requestor_first_name: rfirstName,
                  cancel_reason: cancelReason,
                  listing_id: listingObj.listingID
                }
              })
            }
            return values;
          }).catch(function(err) {
              console.log('A promise failed to resolve', err);
              return err;
          });
        }).catch(function(err) {
          console.log('A promise failed to jobber', err);
          return err;
        });
      }).catch(function(err) {
        console.log('A promise failed to requestor', err);
        return err;
      });
      }
      else {
        var tName;
        if(listingVal.DOD === "true") {
          tName = 'dod_job_cancelled_open';
        }
        else {
          tName = 'requestor_cancel_open';
        }
        console.log('inside else')
        promises.push(updateDisputedProjects(requestorId, listingId, false, UpdateCommandEnum.update));
        promises.push(updateDisputedProjects(jobberId, listingId, true, UpdateCommandEnum.update));
        promises.push(updateOpenProjects(requestorId, listingId, false, UpdateCommandEnum.delete));
        promises.push(updateOpenProjects(jobberId, listingId, true, UpdateCommandEnum.delete));
        return Promise.all(promises).then(values => {
          cio.track(requestorId, {
            name: tName,
            data: {
              task_title: jobTitle,
              task_location: jobLocation,
              sub_category: sub_category,
              listing_id: listingObj.listingID,
              cancel_reason:cancelReason
            }
          })
          return values;
        }).catch(function(err) {
            console.log('A promise failed to resolve', err);
            return err;
        });
      }
    }
    else {
      console.log('Offer have not accepted!')
    }
  }).catch(function(err) {
    console.log('Failed in get Listing:', err);
    return err;
  });
});

exports.updateAfterCancelListingRequester = ((change, context) => {
  const listingId = change.after.val();
  console.log('listingId<<',listingId)
  var refDB = admin.database().ref();
  var eventName;
  var rEventName;
  var jEventName;
  var eventData;
  var listingRef = refDB.child("/listing").child(listingId);
  return listingRef.once('value').then(listingsnap => {
    const listingVal = listingsnap.val();
    const jobTitle = listingVal.title;
    const sub_category = listingVal.category_name;
    const requestorName = listingVal.user_name;
    const cancelReason = listingVal.cacelReason;
    const jobLocation = listingVal.address;
    const order_num = listingVal.order_num;
    const ALC_header =  listingVal.ALC_header
    const userId = listingVal.user_id;
    var promises = new Array();
    var timezone = listingVal.timezone ? listingVal.timezone : 'Canada/Eastern'
    console.log('listingId<<',listingId)
    if(listingVal.offer_id && listingVal.accept_id) {
      var offerRef = refDB.child("/offers").child(listingVal.offer_id);
      return offerRef.once('value').then(offersnap => {
        const jobberId = offersnap.val().jobberUID;
        const requestorId = offersnap.val().requestorUID;
        if(listingVal.jobStatus == "jobber Cancelled") {
          jEventName = 'jobber_cancel_assigned';
          rEventName = 'jobber_cancel_assigned_requestor';
        }
        if(listingVal.jobStatus == "Cancelled") {
          rEventName = 'requestor_cancel_assigned';
          jEventName = 'requestor_cancel_assigned_jobber';
        }
        if(listingVal.jobStatus == "jobber Cancelled" && listingVal.DOD === "true") {
          jEventName = 'jobber_dod_job_cancelled_assigned';
          rEventName = 'jobber_dod_job_cancelled_assigned_requestor';
        }
        if(listingVal.jobStatus == "Cancelled" && listingVal.DOD === "true") {
          jEventName = 'requestor_dod_job_cancelled_assigned_jobber';
          rEventName = 'requestor_dod_job_cancelled_assigned';
        }
        if(offersnap.start_date) {
          var offer_start_date = new Date(offersnap.start_date);
          offer_start_date = moment(offer_start_date*1000).tz(timezone).format('dddd, MMMM Do');
        }
        if(offersnap.start_time) {
          var offer_start_time = new Date(offersnap.start_time);
          offer_start_time = moment(offer_start_time*1000).tz(timezone).format('h:mm a');
        }
        if(offersnap.jobber_date) {
        var jobberDate = moment(offersnap.jobber_date*1000).tz(timezone).format('dddd, MMMM Do');
        }
        if(offersnap.jobber_time) {
          var jobberTime = moment(offersnap.jobber_time*1000).tz(timezone).format('h:mm a');
        }
        console.log('requestorId<<',requestorId)
        var rRef = refDB.child("/users").child(requestorId);
        return rRef.once('value').then(rsnap => {
          var rfirstName = rsnap.val().meta.firstName;

          var jRef = refDB.child("/users").child(jobberId);
          return jRef.once('value').then(jsnap => {
          var jfirstName = jsnap.val().meta.firstName;

            console.log('jobberId<<',jobberId)
            console.log('rEventName<<',rEventName)
            console.log('jEventName<<',jEventName)
            promises.push(updateDisputedProjects(userID, listingId, false, UpdateCommandEnum.update));
            promises.push(updateDisputedProjects(jobberId, listingId, true, UpdateCommandEnum.update));
            promises.push(updateAssignedProjects(userID, listingId, false, UpdateCommandEnum.delete));
            promises.push(updateAssignedProjects(jobberId, listingId, true, UpdateCommandEnum.delete));
            return Promise.all(promises).then(values => {
              cio.track(requestorId, {
                name: rEventName,
                data: {
                  task_title: jobTitle,
                  sub_category: sub_category,
                  offer_start_date: offer_start_date,
                  offer_start_time: offer_start_time,
                  jobber_first_name: jfirstName,
                  requestor_first_name: rfirstName,
                  jobberTime:jobberTime,
                  jobberDate:jobberDate,
                  cancelReason:cancelReason
                }
              })
              cio.track(jobberId, {
                name: jEventName,
                data: {
                  task_title: jobTitle,
                  sub_category: sub_category,
                  offer_start_date: offer_start_date,
                  offer_start_time: offer_start_time,
                  jobber_first_name: jfirstName,
                  requestor_first_name: rfirstName,
                  jobberTime:jobberTime,
                  jobberDate:jobberDate,
                  cancelReason:cancelReason

                }
              })
              return values;
            }).catch(function(err) {
              console.log('A promise failed to resolve', err);
              return err;
            });
          }).catch(function(err) {
            console.log('Failed in getting jobbers:', err);
            return err;
          });
        }).catch(function(err) {
          console.log('Failed in getting Requestor:', err);
          return err;
        });
      }).catch(function(err) {
        console.log('Failed in getting Offres:', err);
        return err;
      });
    }
    else{
      console.log('userId in if<<',userId)
      var tName;
      if(listingVal.DOD === "true") {
        tName = 'dod_job_cancelled_open';
      }
      else {
        tName = 'requestor_cancel_open';
      }
      var reqRef = refDB.child("/users").child(userId);
      return reqRef.once('value').then(reqsnap => {
        var reqdeviceToken = reqsnap.val().device_token;
        promises.push(updateDisputedProjects(userId, listingId, false, UpdateCommandEnum.update));
      //promises.push(updateDisputedProjects(jobberUID, listingID, true, UpdateCommandEnum.update));
        promises.push(updateOpenProjects(userId, listingId, false, UpdateCommandEnum.delete));
        //promises.push(updateOpenProjects(jobberId, listingId, true, UpdateCommandEnum.delete));
        return Promise.all(promises).then(values => {
        cio.track(userId, {
          name: tName,
          data: {
              task_title: jobTitle,
              task_location: jobLocation,
              sub_category: sub_category,
              dod_package: ALC_header,
              order_num: order_num,
              location: jobLocation,
              cancel_reason:cancelReason
            }
        })
        return values;
        }).catch(function(err) {
            console.log('A promise failed to resolve', err);
            return err;
        });
      }).catch(function(err) {
          console.log('Failed to get requestor:', err);
          return err;
      });
    }
  }).catch(function(err) {
      console.log('Failed in getting listings:', err);
      return err;
  });

});

exports.reportListing = ((change, context) => {
  const reportVal = change.after.val();
  const listingId = change.after.key;
  console.log('reportVal<<',reportVal)
  var reporterId;
  var reason;
  var eventName;
  _.each(reportVal, function(reportData){
    console.log('reportData<<',reportData)
    reporterId = reportData.reporter_uid;
    reason = reportData.reason;
  })
  console.log('reporterId<<',reporterId)
  console.log('listingId<<',listingId)
  console.log('reason<<',reason)
  if(reason == "It’s Spam") {
    console.log('in spam if')
    eventName = 'report_spam';
  }
  if(reason == "It’s Inappropriate") {
    console.log('in Inappropriate if')
    eventName = 'report_inappropriate'
  }
  var refDB = admin.database().ref();
  var listingRef = refDB.child("/listing").child(listingId);
  return listingRef.once('value').then(listingsnap => {
    const listingVal = listingsnap.val();
    const jobTitle = listingVal.title;
    const requestorName = listingVal.user_name;
    var userRef = refDB.child("/users").child(reporterId);
    const userId = reporterId;
    console.log('userId<<',userId)
    return userRef.once('value').then(usersnap => {
      var userObj = usersnap.val();
      var requestorID = userObj.key;
      var metadata = userObj.meta;
      var deviceToken = metadata.device_token;
      console.log('metadata<<',metadata)
      console.log('eventName<<',eventName)
      if(metadata.isRequestor == true || metadata.isRequestor == "true") {
        cio.track(userId, {
          name: eventName,
          data: {
            task_title: jobTitle
          }
        })
      }
      else {
        cio.track(userId, {
          name: 'report_spam',
          data: {
            task_title: jobTitle
          }
        })
      }
    }).catch(function(err) {
        console.log('Failed in getting user:', err);
        return err;
    });
  }).catch(function(err) {
      console.log('Failed in getting listings:', err);
      return err;
  });
});

exports.updateAfterDeclineRequester = ((change, context) => {
  const offerId = change.after.val();
  const declineId = change.after.key;
  console.log('declineId<<',declineId)
  console.log('offerId<<',offerId)
  var refDB = admin.database().ref();
  var promises = new Array();
  var offerRef = refDB.child("/offers").child(offerId);
  return offerRef.once('value').then(offersnap => {
    var offerVal = offersnap.val();
    console.log('offerVal<<',offerVal)
    var listingRef = refDB.child("/listing").child(offerVal.listingID);
    return listingRef.once('value').then(listingsnap => {
      const listingVal = listingsnap.val();
      const listingId =  listingsnap.key;
      const jobTitle = listingVal.title;
      const sub_category = listingVal.category_name;
      const requestorName = listingVal.user_name;
      const jobberId = offerVal.jobberUID;
      const requestorId = offerVal.requestorUID;
      const userId = offerVal.requestorUID;
      const offer_price = offerVal.offer_price;
      const jobber_offer_amount = offerVal.jobber_fee;
      const requestorRef = refDB.child("/users").child(requestorId);
      return requestorRef.once('value').then(requestorSnaps => {
        var requestor_first_name = requestorSnaps.val().meta.firstName;
        console.log('requestor_first_name<<',requestor_first_name)
        const jobberRef = refDB.child("/users").child(jobberId);
        return jobberRef.once('value').then(usersnap => {
          var userObj = usersnap.val();
          var userID = usersnap.key;
          var metadata = userObj.meta;
          var deviceToken = metadata.device_token;
          var useremail = metadata.email;
          var phoneNumber = metadata.phone;
          var firstName = metadata.firstName;
          var lastName = metadata.lastName;
          var jobber_device_token = metadata.device_token;
          console.log('jobberId, listingId',jobberId, listingId)
          promises.push(updateOpenProjects(jobberId, listingId, true, UpdateCommandEnum.delete));
          promises.push(updateDisputedProjects(jobberId, listingId, true, UpdateCommandEnum.update));
          return Promise.all(promises).then(values => {
            cio.track(jobberId, {
              name: 'offer_rejected_jobber',
              data: {
                task_title: jobTitle,
                sub_category: sub_category,
                offer_price: offer_price,
                requestor_first_name: requestor_first_name,
                jobber_first_name: firstName,
                jobber_offer_amount: jobber_offer_amount,
                listing_id: listingId
              }
            })
            cio.track(requestorId, {
              name: 'offer_rejected_requestor',
              data: {
                task_title: jobTitle,
                sub_category: sub_category,
                offer_price: offer_price,
                requestor_first_name: requestor_first_name,
                jobber_first_name: firstName,
                jobber_offer_amount:jobber_offer_amount,
                listing_id: listingId
              }
            })
            return values;
          }).catch(function(err) {
            console.log('A promise failed to resolve', err);
            return err;
          });
        }).catch(function(err) {
            console.log('Failed in getting jobber:', err);
            return err;
        });
      }).catch(function(err) {
          console.log('Failed in getting Requestor:', err);
          return err;
      });

    }).catch(function(err) {
        console.log('Failed in getting listings:', err);
        return err;
    });
  }).catch(function(err) {
      console.log('Failed in getting offers:', err);
      return err;
  });
});

exports.updateWhenMakeOffer = ((snap, context) => {
  const offerId = snap.key;
  var refDB = admin.database().ref();
  console.log('offerId<<',offerId)
  var offerRef = refDB.child("/offers").child(offerId);
  return offerRef.once('value').then(offersnap => {
    const offerVal = offersnap.val();
    console.log('offerVal<<',offerVal)
    var promises = new Array();
    var jobberComment;
    var listingRef = refDB.child("/listing").child(offerVal.listingID);
    return listingRef.once('value').then(listingsnap => {
      const listingVal = listingsnap.val();
      console.log('listingVal<<',listingVal)
      const listingId =  listingsnap.key;
      const jobTitle = listingVal.title;
      const jobLocation = listingVal.address;
      const requestorName = listingVal.user_name;
      const category_name = listingVal.category_name;
      const jobberId = offerVal.jobberUID;
      const requestorId = offerVal.requestorUID;
      const userId = offerVal.jobberUID;
      const offer_price = offerVal.offer_price;
      const jobber_offer_amount = offerVal.jobber_fee;
      const listing_id = offerVal.listingID;
      const offer_id = offerId;
      var timezone = listingVal.timezone ? listingVal.timezone : 'Canada/Eastern'
      if(offerVal.start_date) {
        var offer_start_date = moment(offerVal.start_date*1000).tz(timezone).format('dddd, MMMM Do');
      }
      if(offerVal.start_time) {
        var offer_start_time = moment(offerVal.start_time*1000).tz(timezone).format('h:mm a');
      }
      if(offerVal.completion_date) {
        var offer_end_date =  moment(offerVal.completion_date*1000).tz(timezone).format('dddd, MMMM Do');
      }
      if(offerVal.jobber_date) {
        var jobberDate = moment(listingVal.jobber_date*1000).tz(timezone).format('dddd, MMMM Do');
      }
      if(offerVal.jobber_time) {
        var jobberTime = moment(listingVal.jobber_time*1000).tz(timezone).format('h:mm a');
      }
      if(offerVal.message) {jobberComment = offerVal.message;}else {jobberComment = "no comment";}
      console.log('userId<<',userId)
      const requestorRef = refDB.child("/users").child(requestorId);
      return requestorRef.once('value').then(requestorSnaps => {
        var requesterObj = requestorSnaps.val();
        console.log('requesterObj<<',requesterObj)
        var requesterID = requestorSnaps.key;
        var rMetadata = requesterObj.meta;
        var requestorfirstName = rMetadata.firstName;
        var requestorlastName = rMetadata.lastName;
        var requestoremail = rMetadata.email;
        var requestor_device_token = rMetadata.device_token;
        var requestorphoneNumber = rMetadata.phone;
        const jobberRef = refDB.child("/users").child(jobberId);
        return jobberRef.once('value').then(jobbersnap => {
          var jobberObj = jobbersnap.val();
          console.log('jobberObj<<',jobberObj)
          console.log('jobberComment<<',jobberComment)
          console.log('offer_start_date<<',offer_start_date)
          console.log('offer_end_date<<',offer_end_date)
          console.log('offer_start_time<<',offer_start_time)
          var jobberID = jobbersnap.key;
          var jMetadata = jobberObj.meta;
          var deviceToken = jMetadata.device_token;
          var deviceType = jMetadata.device_type;
          var jobberfirstName = jMetadata.firstName;
          var jobberLastName = jMetadata.lastName;
          var jobberEmail = jMetadata.email;

          console.log('jobberId, listingId<<',jobberId, listingId)
          let jTriggerName;
          let rTriggerName;
          let triggerData;

          if(listingVal.DOD === "true") {
            jTriggerName = 'dod_offer_jobber';
            rTriggerName = 'dod_offer_requestor';
            triggerData = {
              dod_sub_category: category_name,
              job_title: jobTitle,
              location: jobLocation,
              price: offer_price,
              start_date: offer_start_date,
              start_time: offer_start_time,
              jobber_first_name: jobberfirstName,
              jobber_last_name: jobberLastName,
              jobber_email: jobberEmail,
              requestor_first_name: requestorfirstName,
              jobber_time: jobberTime,
              jobber_date: jobberDate,
              listing_id: listing_id,
              offer_id: offer_id
            }
          }
          else {
            jTriggerName = 'offer_made_jobber';
            rTriggerName = 'offer_made_requestor';
            triggerData = {
              task_title: jobTitle,
              task_location: jobLocation,
              sub_category: category_name,
              offer_price: offer_price,
              offer_start_date: offer_start_date,
              offer_start_time: offer_start_time,
              offer_end_date: offer_end_date,
              jobber_first_name: jobberfirstName,
              jobber_last_name: jobberLastName,
              jobber_email: jobberEmail,
              requestor_first_name: requestorfirstName,
              jobber_comment: jobberComment,
              jobber_offer_amount: jobber_offer_amount,
              listing_id: listing_id,
              offer_id: offer_id
            }
          }

          promises.push(updateOpenProjects(jobberId, listingId, false, UpdateCommandEnum.delete));
          return Promise.all(promises).then(values => {
            console.log(`Triggering CIO Event: ${jTriggerName}`, triggerData);
            cio.track(jobberId, {
              name: jTriggerName,
              data: triggerData
            })

            console.log(`Triggering CIO Event: ${rTriggerName}`, triggerData);
            cio.track(requestorId, {
              name: rTriggerName,
              data: triggerData
            })
            return values;
          }).catch(function(err) {
            console.log('A promise failed to resolve', err);
            return err;
          });
        }).catch(function(err) {
            console.log('Failed in getting jobber:', err);
            return err;
        });
      }).catch(function(err) {
          console.log('Failed in getting Requestor:', err);
          return err;
      });

    }).catch(function(err) {
        console.log('Failed in getting listings:', err);
        return err;
    });
  }).catch(function(err) {
      console.log('Failed in getting offers:', err);
      return err;
  });
});

exports.updateWhenOfferWithdraw = ((change, context) => {
  const offerId = change.after.val();
  console.log('offerId<<',offerId)
  var refDB = admin.database().ref();
  var promises = new Array();
  const offerRef = refDB.child('/offers').child(offerId);
  return offerRef.once("value").then(offerSnaps => {
    const offerVal = offerSnaps.val();
    console.log('offerVal<<',offerVal)
    const listingId = offerVal.listingID;
    const userId = offerVal.jobberUID;
    const requestorId = offerVal.requestorUID;
    const offer_price = offerVal.offer_price;
    const jobber_offer_amount = offerVal.jobber_fee;
    const listingRef = refDB.child('/listing').child(listingId);
    return listingRef.once("value").then(listSnaps => {
      var jobTitle = listSnaps.val().title;
      var sub_category = listSnaps.val().category_name;
      const requestorRef = refDB.child("/users").child(requestorId);
      return requestorRef.once("value").then(requestorSnaps => {
        var requesterObj = requestorSnaps.val();
        console.log('requesterObj<<',requesterObj)
        var metadata = requesterObj.meta;
        console.log('metadata<<',metadata)
        var rDeviceToken = metadata.device_token;
        var rDeviceType = metadata.device_type;
        var useremail = metadata.email;
        var phoneNumber = metadata.phone;
        var requestorfirstName = metadata.firstName;
        var lastName = metadata.lastName;
        const jobberRef = refDB.child("/users").child(userId);
        return jobberRef.once("value").then(jobberSnaps => {
          var jobberVal = jobberSnaps.val().meta;
          var jDeviceToken = jobberVal.device_token;
          var jDeviceType = jobberVal.device_type;
          var jobberfirstName = jobberVal.firstName;
          cio.track(userId, {
            name: 'withdraw_offer_jobber',
            data: {
              task_title: jobTitle,
              sub_category: sub_category,
              offer_price: offer_price,
              jobber_offer_amount: jobber_offer_amount,
              requestor_first_name: requestorfirstName,
              jobber_first_name: jobberfirstName
            }
          })
          cio.track(requestorId, {
            name: 'withdraw_offer_requestor',
            data: {
              task_title: jobTitle,
              sub_category: sub_category,
              offer_price: offer_price,
              jobber_offer_amount: jobber_offer_amount,
              requestor_first_name: requestorfirstName,
              jobber_first_name: jobberfirstName
            }
          })
          return;
        }).catch(function(err) {
          console.log('Failed in getting Jobber:', err);
          return err;
        });
      }).catch(function(err) {
          console.log('Failed in getting Requestor:', err);
          return err;
      });
    }).catch(function(err) {
      console.log('Failed in getting listings:', err);
      return err;
    });
  }).catch(function(err) {
      console.log('Failed in getting offerSnaps:', err);
      return err;
  });
});

exports.RequestorJobberReport = ((change, context) => {
  const reportVal = change.after.val();
  const reportId = change.after.key;
  console.log('reportVal<<',reportVal)
  const reporterId = reportVal.reporterId;
  const userId = reportVal.userId;
  const reason = reportVal.reason;
  var eventName;
  var eventData;
  var uId;
  var refDB = admin.database().ref();
  var userRef = refDB.child("/users").child(reporterId);
  return userRef.once('value').then(usnaps => {
    if(usnaps.val().meta.isRequestor == true || usnaps.val().meta.isRequestor == 'true') {
      const uId = usnaps.key;
      var jRef = refDB.child("/users").child(userId);
      return jRef.once('value').then(jsnaps => {
        const jobber_id = jsnaps.key;
        const jobber_email = jsnaps.val().email;
        const jobber_mobile = jsnaps.val().phone;
        eventName = 'requestor_reported_jobber';
        eventData = {
          jobber_id: jobber_id,
          jobber_email: jobber_email,
          jobber_mobile: jobber_mobile
        }
      }).catch(function(err) {
        console.log('Failed in getting jobber:', err);
        return err;
      });
    }

    if(usnaps.val().meta.isJobber == true || usnaps.val().meta.isJobber == 'true') {
      const uId = usnaps.key;
      var rRef = refDB.child("/users").child(userId);
      return rRef.once('value').then(rsnaps => {
        const requestor_id = rsnaps.key;
        const requestor_email = rsnaps.val().email;
        const requestor_mobile = rsnaps.val().phone;
        eventName = 'jobber_reported_requestor';
        eventData = {
          requestor_id: requestor_id,
          requestor_email: requestor_email,
          requestor_mobile: requestor_mobile
        }
      }).catch(function(err) {
        console.log('Failed in getting requestor:', err);
        return err;
      });
    }

    cio.track(uId, {
      name: eventName,
      data: eventData
    })
    return;
  }).catch(function(err) {
      console.log('Failed in getting users:', err);
      return err;
  });
});


exports.updateJobDateTime =((change, context)=>{
  const beforeData = change.before.val();
  const afterData = change.after.val();
  let offerId = change.after.key;
  console.log('offerId.......',offerId)
  var refDB = admin.database().ref();
  const offerRef = refDB.child('offers').child(offerId)
  return offerRef.once('value').then(offerSnap=>{
    let offerData = offerSnap.val();
    const requestorUID = offerData.requestorUID;
    const jobberUID = offerData.jobberUID;
    const listingId = offerData.listingID;
    return refDB.child('listing').child(offerData.listingID).once('value').then(snapshot=>{
      let  listingData = snapshot.val();
      var timezone = listingData.timezone ? listingData.timezone : 'Canada/Eastern'
      let assignedJobber = (offerSnap.val() && offerSnap.val().assignedJobber) ? offerSnap.val().assignedJobber : {};
      let offer_price = offerSnap.val().offer_price
      if(offerData.start_date) {
        var startDate = new Date(offerData.start_date);
        startDate = moment(startDate*1000).tz(timezone).format('dddd, MMMM Do');
      }
      if(offerData.start_time) {
        var startTime = new Date(offerData.start_time);
        startTime = moment(startTime*1000).tz(timezone).format('h:mm a');
      }
      if(offerData.completion_date) {
        var endDate = new Date (offerData.completion_date);
        endDate = moment(endDate*1000).tz(timezone).format('dddd, MMMM Do');
      }

      console.log('jobberUID<<',jobberUID)
      var jobberRef = refDB.child("/users").child(jobberUID);

      return jobberRef.once('value').then(usersnap => {
        var userObj = usersnap.val();
        var jData = userObj.meta;
        var time = Math.round(new Date().getTime()/1000);

        var rRef = refDB.child("/users").child(requestorUID);
        return rRef.once('value').then(rsnap => {
            let rData = rsnap.val().meta;
            const cData = {
                order_num :listingData.order_num,
                listing_id: listingId,
                job_location: listingData.address,
                sub_category: listingData.category_name,
                old_start_date: moment(beforeData.jobber_date*1000).tz(timezone).format('dddd, MMMM Do'),
                old_start_time: moment(beforeData.jobber_time*1000).tz(timezone).format('h:mm a'),
                new_start_date: moment(offerData.jobber_date*1000).tz(timezone).format('dddd, MMMM Do'),
                new_start_time: moment(offerData.jobber_time*1000).tz(timezone).format('h:mm a'),
            }
            // console.log(`rSD: ${beforeData.start_date}, rST: ${beforeData.start_time}`);
            // console.log(`rSD: ${offerData.start_date}, rST: ${offerData.start_time}`);
            // if((offerData.start_date !== beforeData.start_date)|| (offerData.start_time !== beforeData.start_time)){
            //     var jobberDate = moment(listingData.jobber_date*1000).tz(timezone).format('dddd, MMMM Do');
            //     var jobberTime = moment(listingData.jobber_time*1000).tz(timezone).format('h:mm a');
            //     console.log('in    jobber_date')
            //     cio.track(listingData.uid,{
            //       name:'listing_update_date_time',
            //       date:{
            //         offerId:offerId,
            //         task_title: listingData.title,
            //         sub_category: listingData.category_name,
            //         task_location: listingData.address,
            //         offer_price: offer_price,
            //         requestor_first_name: rfirstName,
            //         requestor_mobile: rphoneNumber,
            //         jobber_first_name: jfirstName,
            //         jobber_mobile: jphoneNumber,
            //         requestor_price: listingData.priceWithTax,
            //         listing_id: listingId,
            //         offer_id: listingData.offer_id,
            //         description: listingData.description,
            //         order_num :listingData.order_num,
            //         dod_package: listingData.ALC_header,
            //         description: listingData.description,
            //         Subjobber1_first_name : assignedJobber && assignedJobber[0]? assignedJobber[0].firstName : '',
            //         Subjobber1_mobile : assignedJobber && assignedJobber[0]? assignedJobber[0].phone : '',
            //         Subjobber1_email : assignedJobber && assignedJobber[0]? assignedJobber[0].email : '',
            //         Subjobber1_pay : assignedJobber && assignedJobber[0]? assignedJobber[0].jobberPrice : '',
            //         Subjobber2_first_name : assignedJobber && assignedJobber[1]? assignedJobber[1].firstName : '',
            //         Subjobber2_mobile : assignedJobber && assignedJobber[1]? assignedJobber[1].phone : '',
            //         Subjobber2_email : assignedJobber && assignedJobber[1]? assignedJobber[1].email : '',
            //         Subjobber2_pay : assignedJobber && assignedJobber[1]? assignedJobber[1]. jobberPrice : '',
            //         jobber_date: moment(offerData.jobber_date*1000).tz(timezone).format('dddd, MMMM Do'),
            //         jobber_time: moment(offerData.jobber_time*1000).tz(timezone).format('dddd, MMMM Do')
            //       }
            //     })
            //  }
            // if(afterData.preferred_date && ((afterData.preferred_date !== beforeData.preferred_date)|| (afterData.preferred_time !== beforeData.preferred_time))){
            //     const requestorData = {
            //       requestor_first_name: rData.firstName,
            //       requestor_last_name: rData.lastName,
            //       requestor_mobile: rData.phone,
            //       requestor_email: rData.email,
            //       requestor_uuid: listingData.uid,
            //       old_start_date: moment(beforeData.preferred_date*1000).tz(timezone).format('dddd, MMMM Do') || '',
            //       old_start_time: moment(beforeData.preferred_time*1000).tz(timezone).format('h:mm a') || '',
            //       new_start_date: moment(afterData.preferred_date*1000).tz(timezone).format('dddd, MMMM Do') || '',
            //       new_start_time: moment(afterData.preferred_time*1000).tz(timezone).format('h:mm a') || '',
            //     }
            //     cio.track(jobberUID,{
            //         name:"date_time_changed_by_requestor",
            //         data:{
            //           ...cData,
            //           ...requestorData,
            //         }
            //     })
            // }

            if((offerData.jobber_date !== beforeData.jobber_date)|| (offerData.jobber_time !== beforeData.jobber_time)){
              // console.log(jobberData);
              const requestorData = {
                  requestor_first_name: rData.firstName,
                  requestor_last_name: rData.lastName,
                  requestor_mobile: rData.phone,
                  requestor_email: rData.email,
                  requestor_uuid: listingData.uid,
                }
                cio.track(jobberUID,{
                    name:"date_time_changed_by_requestor",
                    data:{
                      ...cData,
                      ...requestorData,
                    }
                })
              const jobberData = {
                  jobber_first_name: jData.firstName,
                  jobber_last_name: jData.lastName,
                  jobber_email: jData.email,
                  jobber_mobile: jData.phone,
                  jobber_uuid: jobberUID,
                  dod_package: listingData.ALC_header,
                }
              cio.track(listingData.uid,{
                name:'date_time_changed_by_jobber',
                data: {
                    ...cData,
                    ...jobberData
                }
              })
            }
        }).catch(function(err) {
          console.log('Failed in getting requestor:', err);
          return err;
        });
      }).catch(function(err) {
        console.log('Failed in getting jobber:', err);
        return err;
      });

    }).catch(function(err) {
      console.log('Failed in getting listing:', err);
      return err;
    });
  }).catch(function(err) {
    console.log('Failed in getting offer:', err);
    return err;
  });
})


exports.updateListingAddress = ((change,context)=>{
  var refDB = admin.database().ref();
  return change.after.ref.parent.once('value').then(snapshot => {
    let listingId = snapshot.key;
    console.log('listingId',listingId)
    const listingRef = refDB.child('listing').child(listingId)
    return listingRef.once('value').then(snapshot=>{
      let listingData =  snapshot.val();
      var timezone = listingData.timezone ? listingData.timezone : 'Canada/Eastern'
      const offerRef = refDB.child('offers').child(snapshot.val().offer_id)
      return offerRef.once('value').then(offerSnap => {
        let assignedJobber = (offerSnap.val() && offerSnap.val().assignedJobber) ? offerSnap.val().assignedJobber : {};
        let offerObj =  offerSnap.val();
        let offer_price = offerSnap.val().offer_price
        const requestorUID = offerObj.requestorUID;
        const jobberUID = offerObj.jobberUID;
        if(offerObj.start_date) {
          var startDate = new Date(offerObj.start_date);
          startDate = moment(startDate*1000).tz(timezone).format('dddd, MMMM Do');
        }
        if(offerObj.start_time) {
          var startTime = new Date(offerObj.start_time);
          startTime = moment(startTime*1000).tz(timezone).format('h:mm a');
        }
        if(offerObj.completion_date) {
          var endDate = new Date (offerObj.completion_date);
          endDate = moment(endDate*1000).tz(timezone).format('dddd, MMMM Do');
        }
        if(listingData.jobber_date) {
          var jobberDate = moment(listingData.jobber_date*1000).tz(timezone).format('dddd, MMMM Do');
        }
        if(listingData.jobber_time) {
          var jobberTime = moment(listingData.jobber_time*1000).tz(timezone).format('h:mm a');
        }
        console.log('jobberUID<<',jobberUID)
        var jobberRef = refDB.child("/users").child(jobberUID);

        return jobberRef.once('value').then(usersnap => {
          var userObj = usersnap.val();
          var metadata = userObj.meta;
          var deviceToken = metadata.device_token;
          var useremail = metadata.email;
          var jfirstName = metadata.firstName;
          var lastName = metadata.lastName;
          var jphoneNumber = metadata.phone;
          var time = Math.round(new Date().getTime()/1000);

          var rRef = refDB.child("/users").child(requestorUID);
          return rRef.once('value').then(rsnap => {
            var rfirstName = rsnap.val().meta.firstName;
            var rphoneNumber = rsnap.val().meta.phone;

            cio.track(listingData.uid,{
              name:"listing_address_update",
              data:{
                task_title: listingData.title,
                sub_category: listingData.category_name,
                task_location: listingData.address,
                offer_price: offer_price,
                offer_start_date: startDate,
                offer_start_time: startTime,
                offer_end_date: endDate,
                requestor_first_name: rfirstName,
                requestor_mobile: rphoneNumber,
                jobber_first_name: jfirstName,
                jobber_mobile: jphoneNumber,
                jobber_time: jobberTime,
                jobber_date: jobberDate,
                requestor_price: listingData.priceWithTax,
                listing_id: listingId,
                offer_id: listingData.offer_id,
                description: listingData.description,
                order_num :listingData.order_num,
                dod_package: listingData.ALC_header,
                description: listingData.description,
                Subjobber1_first_name : assignedJobber && assignedJobber[0]? assignedJobber[0].firstName : '',
                Subjobber1_mobile : assignedJobber && assignedJobber[0]? assignedJobber[0].phone : '',
                Subjobber1_email : assignedJobber && assignedJobber[0]? assignedJobber[0].email : '',
                Subjobber1_pay : assignedJobber && assignedJobber[0]? assignedJobber[0].jobberPrice : '',
                Subjobber2_first_name : assignedJobber && assignedJobber[1]? assignedJobber[1].firstName : '',
                Subjobber2_mobile : assignedJobber && assignedJobber[1]? assignedJobber[1].phone : '',
                Subjobber2_email : assignedJobber && assignedJobber[1]? assignedJobber[1].email : '',
                Subjobber2_pay : assignedJobber && assignedJobber[1]? assignedJobber[1]. jobberPrice : ''
              }
            })
          }).catch(function(error) {
            console.log("Error in get user: " + error.message)
            return error;
          });
        }).catch(function(error) {
          console.log("Error in getting Jobber: " + error.message)
          return error;
        });

      }).catch(function(error) {
        console.log("Error in getting offer: " + error.message)
        return error;
      });
    }).catch(function(err) {
      console.log('Failed in getting listing:', err);
      return err;
    });
  }).catch(function(err) {
    console.log('Failed in reading:', err);
    return err;
  });
})


exports.updateOfferAssignedJobber = ((change,context)=>{
  var refDB = admin.database().ref();
  return change.after.ref.parent.once('value').then(offerSnap => {
    let offerObj = offerSnap.val();
    let assignedJobber = (offerSnap.val() && offerSnap.val().assignedJobber) ? offerSnap.val().assignedJobber : {};
    let listingId = offerSnap.val().listingID
    let offer_price = offerSnap.val().offer_price
    const requestorUID = offerObj.requestorUID;
    const jobberUID = offerObj.jobberUID;
    // if(offerObj.start_date) {
    //   var startDate = new Date(offerObj.start_date);
    //   startDate = moment(startDate*1000).tz('Canada/Eastern').format('dddd, MMMM Do');
    // }
    // if(offerObj.start_time) {
    //   var startTime = new Date(offerObj.start_time);
    //   startTime = moment(startTime*1000).tz('Canada/Eastern').format('h:mm a');
    // }
    // if(offerObj.completion_date) {
    //   var endDate = new Date (offerObj.completion_date);
    //   endDate = moment(endDate*1000).tz('Canada/Eastern').format('dddd, MMMM Do');
    // }

    console.log('jobberUID<<',jobberUID)
    var jobberRef = refDB.child("/users").child(jobberUID);

    return jobberRef.once('value').then(usersnap => {
      var userObj = usersnap.val();
      var metadata = userObj.meta;
      var deviceToken = metadata.device_token;
      var useremail = metadata.email;
      var jfirstName = metadata.firstName;
      var lastName = metadata.lastName;
      var jphoneNumber = metadata.phone;
      var time = Math.round(new Date().getTime()/1000);

      var rRef = refDB.child("/users").child(requestorUID);
      return rRef.once('value').then(rsnap => {
        var rfirstName = rsnap.val().meta.firstName;
        var rphoneNumber = rsnap.val().meta.phone;

        const listingRef = refDB.child('listing').child(listingId)
        return listingRef.once('value').then(snapshot=>{
          let listingData =  snapshot.val();
          var timezone = listingData.timezone ? listingData.timezone : 'Canada/Eastern'
          if(offerObj.start_date) {
          var startDate = new Date(offerObj.start_date);
            startDate = moment(startDate*1000).tz(timezone).format('dddd, MMMM Do');
          }
          if(offerObj.start_time) {
            var startTime = new Date(offerObj.start_time);
            startTime = moment(startTime*1000).tz(timezone).format('h:mm a');
          }
          if(offerObj.completion_date) {
            var endDate = new Date (offerObj.completion_date);
            endDate = moment(endDate*1000).tz(timezone).format('dddd, MMMM Do');
          }
          if(snapshot.val().jobber_date) {
            var jobberDate = moment(snapshot.val().jobber_date*1000).tz(timezone).format('dddd, MMMM Do');
          }
          if(snapshot.val().jobber_time) {
            var jobberTime = moment(snapshot.val().jobber_time*1000).tz(timezone).format('h:mm a');
          }
            cio.track(offerSnap.val().jobberUID,{
              name:"assigned_subJobber_update",
              data:{
                task_title: snapshot.val().title,
                sub_category: snapshot.val().category_name,
                task_location: snapshot.val().address,
                offer_price: offer_price,
                offer_start_date: startDate,
                offer_start_time: startTime,
                offer_end_date: endDate,
                requestor_first_name: rfirstName,
                requestor_mobile: rphoneNumber,
                jobber_first_name: jfirstName,
                jobber_mobile: jphoneNumber,
                jobber_time: jobberTime,
                jobber_date: jobberDate,
                requestor_price: snapshot.val().priceWithTax,
                listing_id: snapshot.key,
                offer_id: snapshot.val().offer_id,
                description: snapshot.val().description,
                order_num :snapshot.val().order_num,
                dod_package: snapshot.val().ALC_header,
                description: snapshot.val().description,
                Subjobber1_first_name : assignedJobber && assignedJobber[0]? assignedJobber[0].firstName : '',
                Subjobber1_mobile : assignedJobber && assignedJobber[0]? assignedJobber[0].phone : '',
                Subjobber1_email : assignedJobber && assignedJobber[0]? assignedJobber[0].email : '',
                Subjobber1_pay : assignedJobber && assignedJobber[0]? assignedJobber[0].jobberPrice : '',
                Subjobber2_first_name : assignedJobber && assignedJobber[1]? assignedJobber[1].firstName : '',
                Subjobber2_mobile : assignedJobber && assignedJobber[1]? assignedJobber[1].phone : '',
                Subjobber2_email : assignedJobber && assignedJobber[1]? assignedJobber[1].email : '',
                Subjobber2_pay : assignedJobber && assignedJobber[1]? assignedJobber[1]. jobberPrice : ''
              }
            })
        }).catch(function(err) {
          console.log('Failed in getting listing:', err);
          return err;
        });
      }).catch(function(error) {
        console.log("Error in get requestor: " + error.message)
        return error;
      });
    }).catch(function(error) {
      console.log("Error in get jobber: " + error.message)
      return error;
    });
  }).catch(function(err) {
    console.log('Failed in getting offer:', err);
    return err;
  });
})

exports.reviewAddedAlert = ((snap, context)=>{
  const reviewId = snap.after.key;
  let reviewData = snap.after.val();
  console.log('reviewData',reviewData)
    cio.track(reviewData.uid,{
      name:'reviewAddedAlert',
      data:{
        reviewer_name :reviewData.name,
        rating :reviewData.rating,
        feedback :reviewData.feedback,
        badge :reviewData.badge,
        date :reviewData
      }
    })
    return;
})

exports.JApushNotifyWhenListingCreated = ((snap, context)=>{
  console.log('In JA push notify of lisitng ')
  let listingId = snap.key;
  let listingData =  snap.val()
  console.log('listingId<<',listingId)
  return JAPushReusable(listingId, listingData, "jobber_push_notification_new_job")
})

function JAPushReusable(listingId, listingData, triggerKey){
  console.log('listingId<<',listingId, triggerKey)
  var refDB = admin.database().ref();
  var userRef =  refDB.child('users')
  var cityRef =  refDB.child('metropolitanCity')
  var listingRef = refDB.child('/listing').child(listingId);
  var promises = new Array()
  let missedCity = false;
  let prefferedDate = listingData.preferred_date
  let timezone = listingData.timezone ? listingData.timezone : 'Canada/Eastern';
  let dt = new Date();
  console.log('currentDate--- prefferedDate',dt.getTime(),  prefferedDate)
  let dayDifference = prefferedDate - Math.floor(dt.getTime()/1000);
  console.log('dayDifference',dayDifference)
  dayDifference = Math.floor(dayDifference/86400)
  console.log('final day difference', dayDifference)
  console.log('missedCity', missedCity)

  if(dayDifference <= 5){
    console.log('')
    return cityRef.once('value').then(snapshot => {
      let cityData = snapshot.val();
      console.log('cityData',cityData)
      console.log('city', listingData.city)
      let metroCity = _.filter(cityData, function(d){
        return _.contains(d, listingData.city)
      })
      console.log('metroCity',metroCity)
      console.log('In listing', listingData)
      return userRef.once('value').then(jSnap=>{
        console.log('in user ref')
        _.each(jSnap.val(), function(jobberData){
            if(jobberData && jobberData.meta && (jobberData.meta.isJobber == "true") && jobberData.filterData && (jobberData.filterData.country == listingData.country)){
              if(_.contains(metroCity[0], jobberData.filterData.city)){
                missedCity = true;
                console.log('inside city', jobberData.filterData.city, jobberData.meta.uid)
                console.log('JObtype match',listingData.category_id,  _.contains(jobberData.filterData.subcategory_id, listingData.category_id))
                if(jobberData.filterData.subcategory_id){
                  if(_.contains(jobberData.filterData.subcategory_id, listingData.category_id)){
                    console.log('Job type matched', triggerKey)
                    promises.push(JApushNotify(listingData, listingId, jobberData.meta.uid, triggerKey));
                  }else{
                    console.log('Job type not matched')
                  }
                }else{
                  console.log('Job type not selected.', triggerKey)
                  promises.push(JApushNotify(listingData, listingId, jobberData.meta.uid, triggerKey));
                }
              }else{
                console.log('City not matched')
              }
            }else{
              console.log('No filterData available/Country is different from listing.')
            }
        })
        return Promise.all(promises).then(values => {
          console.log('in promisee return ')
          console.log('in promisee return missedCity',missedCity)
          if(missedCity == false){
            console.log('in missed city', listingData.city)
            listingRef.update({"missedCityAlert":true}, function(err) {
              if(err) {
                return values;
              }else {
                let prefferedDate ;
                let timezone = listingData.timezone ? listingData.timezone : 'Canada/Eastern';
                if(listingData.preferred_date) {
                  prefferedDate = new Date(parseInt(listingData.preferred_date));
                  prefferedDate = moment(prefferedDate*1000).tz(timezone).format('dddd, MMMM Do');
                }
                let data={
                  ALC_header :listingData.ALC_header,
                  jobber_fee: listingData.jobberFee,
                  job_title: listingData.title,
                  job_description: listingData.description,
                  prefferedDate :prefferedDate,
                  preferred_time:listingData.preferred_time,
                  job_location : listingData.address,
                  city :listingData.city,
                  country :listingData.country,
                  listingId:listingId
                }
                console.log('data',data)
                cio.track(listingData.uid,{
                  name:'missing_metro',
                  data:data
                })
                return values;
              }
            })
          }else{
            let obj = {};
            obj[triggerKey] = true;
            console.log('obj in update ',obj)
            listingRef.update(obj, function(err) {
              if(err) {
                return values;
              }else {
                return values;
              }
            })
            return values;
          }
        }).catch(function(err) {
          console.log('A promise failed to resolve', err);
          return err;
        });

      }).catch(function(err) {
        console.log('Failed in getting user:', err);
        return err;
      });

    }).catch(function(err) {
        console.log('Failed in metropolitan city:', err);
        return err;
    });
  }else{
    console.log('listing preffered Date is greater than 5 days from today.')
    return promises;
  }
}


function JApushNotify(listingData, listingId, juid, triggerKey){
  console.log('in  ext func',juid, triggerKey)
  let prefferedDate, secondaryDate, data = {};
  let timezone = listingData.timezone ? listingData.timezone : 'Canada/Eastern';
  if(listingData.preferred_date) {
    prefferedDate = new Date(parseInt(listingData.preferred_date));
    prefferedDate = moment(prefferedDate*1000).tz(timezone).format('dddd, MMMM Do');
  }
  if(listingData.preferred_date_second) {
    secondaryDate = new Date(parseInt(listingData.preferred_date_second));
    secondaryDate = moment(secondaryDate*1000).tz(timezone).format('dddd, MMMM Do');
  }
  if(triggerKey === "jobber_push_notification_new_job"){
      data = {
        order_num: listingData.order_num,
        jobber_pay: listingData.jobberFee,
        job_description: listingData.description,
        job_location : listingData.address,
        prefferedDate :prefferedDate,
        secondaryDate: secondaryDate || '',
        preferred_time:listingData.preferred_time,
        listingId:listingId,
        sub_category: listingData.category_name,
        task_title: listingData.title,
        dod_package: listingData.ALC_header,
        city :listingData.city,
        country :listingData.country,
      }
      cio.track(juid,{
        name:triggerKey,
        data:data
      });
      return;
  }
  if(triggerKey === "different_diemer_for_jobber"){
    admin.database().ref().child('/users').child(listingData.uid).once('value').then((snap) => {
      const requestorData = snap.val().meta;
      data = {
        order_num: listingData.order_num,
        jobber_pay: listingData.jobberFee,
        job_description: listingData.description,
        job_location : listingData.address,
        prefferedDate :prefferedDate,
        secondaryDate: secondaryDate || '',
        preferred_time:listingData.preferred_time,
        requestor_first_name: requestorData.firstName,
        requestor_last_name: requestorData.lastName,
        requestor_email: requestorData.email,
        requestor_mobile: requestorData.phone,
        requestor_uuid: listingData.uid,
        listingId:listingId,
        sub_category: listingData.category_name,
        task_title: listingData.title,
        dod_package: listingData.ALC_header,
        city :listingData.city,
      }
      cio.track(juid,{
        name:triggerKey,
        data:data
      });
      return;
    });
  }else{
    data={
      ALC_header :listingData.ALC_header,
      jobber_fee: listingData.jobberFee,
      job_title: listingData.title,
      job_description: listingData.description,
      prefferedDate :prefferedDate,
      preferred_time:listingData.preferred_time,
      job_location : listingData.address,
      city :listingData.city,
      country :listingData.country,
      listingId:listingId
    }
    console.log('data',data)
    cio.track(juid,{
      name:triggerKey,
      data:data
    });
    return;
  }
}


// exports.listingJobStatusChange = ((snap, context)=>{
//   console.log('in listing job status change activity',snap.after.ref.parent.key)
//   let lKey = snap.after.ref.parent.key;
//   return snap.after.ref.parent.once('value').then(listingSnap => {
//     console.log('listingSnap',listingSnap.val())
//     let listingData =  listingSnap.val();
//     if((listingData.previousJobStatus == "jobber Cancelled" || listingData.jobStatus == "jobber Cancelled") && (listingData.urgent_dispatch == undefined || listingData.urgent_dispatch == false)) {
//       return JAPushReusable(lKey, listingData, "urgent_dispatch")
//     }else{
//       console.log('Not Urgent Dispatch')
//     }

//     if((listingData.previousJobStatus == "requestor reAssign" || listingData.jobStatus == "requestor reAssign") && (listingData.dispatch_reassign == undefined || listingData.dispatch_reassign == false)) {
//       return JAPushReusable(lKey, listingData, "dispatch_reassign")
//     }else{
//       console.log('Not requestor reAssign')
//     }
//   })
// })
exports.listingJobStatusChange = ((snap, context)=>{
  let lKey = snap.after.ref.parent.key;
  return snap.after.ref.parent.once('value').then(listingSnap => {
    let listingData =  listingSnap.val();
    if((listingData.previousJobStatus == "jobber Cancelled" || listingData.jobStatus == "jobber Cancelled") && (listingData.urgent_dispatch == undefined || listingData.urgent_dispatch == false)) {
      return JAPushReusable(lKey, listingData, "urgent_dispatch")
    }else{
      console.log('Not Urgent Dispatch')
    }
    if((listingData.previousJobStatus == "requestor reAssign" || listingData.jobStatus == "requestor reAssign") && (listingData.different_diemer_for_jobber == undefined || listingData.different_diemer_for_jobber == false)) {
        let offerID, jobberUID, listingID;
        if(listingData.offers === undefined){
          offerID = listingData.previousOfferData.offer_id;
          jobberUID = listingData.previousOfferData.offer[offerID].jobberUID;
          listingID = listingData.previousOfferData.offer[offerID].listingID;
        }else{
          offerID = listingData.offer_id;
          jobberUID = listingData.offers[offerID].jobberUID;
          listingID = listingData.offers[offerID].listingID;
        }
        admin.database().ref().child("/users").child(jobberUID).once('value').then(snap => {
          const jobberData = snap.val().meta;
          let timezone = listingData.timezone ? listingData.timezone : 'Canada/Eastern';
          if(listingData.preferred_date) {
            var prefferedDate = moment(parseInt(listingData.preferred_date)*1000).tz(timezone).format('dddd, MMMM Do');
          }
          if(listingData.preferred_date_second) {
            var secondaryDate = moment(parseInt(listingData.preferred_date_second)*1000).tz(timezone).format('dddd, MMMM Do');
          }
          cio.track(listingData.uid, {
          name: "different_diemer_for_requestor",
          data: {
            order_num: listingData.order_num,
            jobber_pay: listingData.jobberFee,
            job_description: listingData.ALC_description,
            job_location: listingData.address,
            preferred_date: prefferedDate,
            secondary_date: secondaryDate,
            preferred_time: listingData.preferred_time,
            task_title: listingData.title,
            sub_category: listingData.category_name,
            dod_package: listingData.ALC_header,
            city: listingData.city,
            listing_id: listingID,
            jobber_first_name: jobberData.firstName,
            jobber_last_name: jobberData.lastName,
            jobber_email: jobberData.email,
            jobber_mobile: jobberData.phone,
            jobber_uuid: jobberUID
          }
        });
        });
      return JAPushReusable(lKey, listingData, "different_diemer_for_jobber")
    }else{
      console.log('Not requestor reAssign')
    }
  })
})


exports.updateRookieUser =  ((snap, context)=>{
  // var refDB = admin.database().ref();
  console.log('in update Rookie user ')
  var promises = new Array();
  return snap.after.ref.parent.once('value').then(offerSnap => {
    let offerObj = offerSnap.val();
    let listingId = offerObj.listingID
    console.log('offerObj',offerObj)
    console.log('listingId',listingId)
    if(offerObj && offerObj.assignedRookieUser){
      console.log('in assigned Rookie iff')
      let assignedRookie =  offerObj.assignedRookieUser;

      // _.each(assignedRookie, (rookie)=>{
      //   console.log('rookie', rookie)
      //   let rookieID = rookie.id
        promises.push(rookieUserActivity(assignedRookie, listingId, "assigned"));
        return Promise.all(promises).then(values => {
            return values;
          }).catch(function(err) {
            console.log('A promise failed to resolve', err);
            return err;
          });
      // })
    }
  });
})




function rookieUserActivity(assignedRookieUser , listingId , key){
  var promises = new Array();
  _.each(assignedRookieUser, (rookie)=>{
    console.log('rookie', rookie)
    let rookieID = rookie.id
    if(key == "assigned"){
      promises.push(updateAssignedProjectsJOBS(rookieID, listingId, true, UpdateCommandEnum.update));
    }
    if(key  == "complete"){
      promises.push(updateAssignedProjectsJOBS(rookieID, listingId, true, UpdateCommandEnum.delete));
      promises.push(updateCompletedProjectsJOBS(rookieID, listingId, false, UpdateCommandEnum.update));
    }

    if(key == "cancel"){
      promises.push(updateDisputedProjectsJOBS(rookieID, listingId, true, UpdateCommandEnum.update));
      promises.push(updateAssignedProjectsJOBS(rookieID, listingId, true, UpdateCommandEnum.delete));
    }
  })
  return Promise.all(promises).then(values => {
      return values;
    }).catch(function(err) {
      console.log('A promise failed to resolve', err);
      return err;
    });
}



exports.RequesterJobberLocationSetup = ((change, context) => {
  const locationVal = change.after.val();
  const userId = locationVal.uid;
  cio.track(userId, {
    name: 'location_setup',
    data: {
      onboarding_location: location
    }
  })
});

exports.updateAfterListingTimelimitExpired = ((snap, context) => {
  const listingId = snap.val();
  console.log('listingId<<', listingId)
  var refDB = admin.database().ref();
  const listingRef = refDB.child('/listing').child(listingId);
  return listingRef.once("value").then(listSnaps => {
    var jobTitle = listSnaps.val().title;
    var sub_category = listSnaps.val().category_name;
    const offer_price = listSnaps.val().budget;
    const jobber_offer_amount = listSnaps.val().jobberFee;
    var requestorId = listSnaps.val().user_id;
    const requestorRef = refDB.child("/users").child(requestorId);
    return requestorRef.once("value").then(requestorSnaps => {
      var requesterObj = requestorSnaps.val();
      console.log('requesterObj<<', requesterObj)
      var metadata = requesterObj.meta;
      var requestorfirstName = metadata.firstName;
      cio.track(requestorId, {
        name: 'job_expired',
        data: {
          task_title: jobTitle,
          sub_category: sub_category,
          offer_price: offer_price,
          jobber_offer_amount: jobber_offer_amount,
          requestor_first_name: requestorfirstName
        }
      })
      return;
    }).catch(function(err) {
      console.log('Failed in getting Requestor:', err);
      return err;
    });
  }).catch(function(err) {
    console.log('Failed in getting listings:', err);
    return err;
  });
});

exports.updateWhenUserAddCardInfo = ((snap, context) => {
  const cardObj = snap.val();
  console.log('cardObj-----',cardObj)
  var refDB = admin.database().ref();
  const userRef = refDB.child(firebase_db_path);
  if(cardObj && cardObj.uid) {
    return userRef.child(cardObj.uid).once("value").then(userObj => {
      var userData = userObj.val();
      var userID = userObj.key;
      cio.track(userID, {
        name: 'card_save_requestor',
        data: {
          first_name: userData.firstName,
          last_name: userData.lastName,
          mobile: userData.phone,
          email: userData.email,
          requestor: userData.isRequestor,
          created_date:userData.JoiningDate,
          location: userData.location,
          device_token: userData.device_token,
          device_type: userData.device_type,
          sms_verified: userData.sms_verified
        }
      });
    }).catch(function(err) {
      console.log('Failed in getting listings:', err);
      return err;
    });
  } else {
    return true;
  }
});

function updateOpenProjects(uid, listingID, isFromJobber, updateCommand) {
  console.log('in updateOpenProjects',uid, listingID, isFromJobber, updateCommand)

  if (isFromJobber) {
    return updateMyProjects(admin, 'projects/jobber/open', uid, listingID, updateCommand);
  } else {
    return updateMyProjects(admin, 'projects/open', uid, listingID, updateCommand);
  }
};

function updateCompletedProjects(uid, listingID, isFromJobber, updateCommand) {
  if (isFromJobber) {
    return updateMyProjects(admin, 'projects/jobber/completed', uid, listingID, updateCommand);
  } else {
    return updateMyProjects(admin, 'projects/completed', uid, listingID, updateCommand);
  }

};

function updateCompletedProjectsJobber(uid, listingID, isFromJobber, updateCommand) {
  if (isFromJobber) {
    return updateMyProjects(admin, 'projects/jobber/assigned', uid, listingID, updateCommand);
  } else {
    return updateMyProjects(admin, 'projects/assigned', uid, listingID, updateCommand);
  }

};

function updateAssignedProjects(uid, listingID, isFromJobber, updateCommand) {
  console.log('in updateAssignedProjects',uid, listingID, isFromJobber, updateCommand)
  if (isFromJobber) {
    return updateMyProjects(admin, 'projects/jobber/assigned', uid, listingID, updateCommand);
  } else {
    return updateMyProjects(admin, 'projects/assigned', uid, listingID, updateCommand);
  }
};

function updateUnfulfilledProjects(uid, listingID, isFromJobber, updateCommand) {
  if (isFromJobber) {
    return updateMyProjects(admin, 'projects/jobber/unfulfilled', uid, listingID, updateCommand);
  } else {
    return updateMyProjects(admin, 'projects/unfulfilled', uid, listingID, updateCommand);
  }
};

function updateDisputedProjects(uid, listingID, isFromJobber, updateCommand) {
  if (isFromJobber) {
    return updateMyProjects(admin, 'projects/jobber/UnderDispute', uid, listingID, updateCommand);
  } else {
    return updateMyProjects(admin, 'projects/UnderDispute', uid, listingID, updateCommand);
  }

};

function updateMyProjects(firebase_admin, childReference, user_id, listingID, updateCommand) {
  console.log('in update my projects ',childReference, user_id, listingID, updateCommand)
  var refDB = firebase_admin.database().ref();
  if (updateCommand) {
    const userRef = refDB.child(firebase_db_path).child(user_id).child(childReference).child(listingID);
    userRef.remove()
      .then(function() {
        return true;
      })
      .catch(function(error) {
        console.log("Remove failed: " + error.message)
        return error;
      });
  } else {
    const UserRef = refDB.child(firebase_db_path).child(user_id).child(childReference);
    return UserRef.update({
      [listingID]: listingID
    }, function(error) {
      console.log('Error:');
      console.log(error);
      if (error) {
        return error;
      } else {
        return true;
      }
    });
  }
};


 // To update JOBS profile with lsiting //


function updateCompletedProjectsJOBS(uid, listingID, isFromJobber, updateCommand) {
  let d;
  if (isFromJobber) {
    d =  updateMyProjectsJOBS(admin, 'projects/jobber/completed', uid, listingID, updateCommand);
    if(d){
      return  updateMyProjects(admin, 'projects/jobber/completed', uid, listingID, updateCommand);
    }
    return;
  } else {
    d = updateMyProjectsJOBS(admin, 'projects/completed', uid, listingID, updateCommand);
    if(d){
      return updateMyProjects(admin, 'projects/completed', uid, listingID, updateCommand);
    }
    return;
  }

};


function updateAssignedProjectsJOBS(uid, listingID, isFromJobber, updateCommand) {
  console.log('in updateAssignedProjects JOBS',uid, listingID, isFromJobber, updateCommand)
  let d;
  if (isFromJobber) {
    d = updateMyProjectsJOBS(admin, 'projects/jobber/assigned', uid, listingID, updateCommand);
    if(d){
      return updateMyProjects(admin, 'projects/jobber/assigned', uid, listingID, updateCommand);
    }
    return;

  } else {
    d = updateMyProjectsJOBS(admin, 'projects/assigned', uid, listingID, updateCommand);
    if(d){
      return updateMyProjects(admin, 'projects/assigned', uid, listingID, updateCommand);
    }
    return;
  }
};


function updateDisputedProjectsJOBS(uid, listingID, isFromJobber, updateCommand) {
  let d;
  if (isFromJobber) {
    d = updateMyProjectsJOBS(admin, 'projects/jobber/UnderDispute', uid, listingID, updateCommand);
    if(d){
      return updateMyProjects(admin, 'projects/jobber/UnderDispute', uid, listingID, updateCommand);
    }
  } else {
    d = updateMyProjectsJOBS(admin, 'projects/UnderDispute', uid, listingID, updateCommand);
    if(d){
      return updateMyProjectsJOBS(admin, 'projects/UnderDispute', uid, listingID, updateCommand);
    }
  }

};

function updateMyProjectsJOBS(firebase_admin, childReference, user_id, listingID, updateCommand) {
  console.log('in update my projects ',childReference, user_id, listingID, updateCommand)
  var refDB = firebase_admin.database().ref();
  if (updateCommand) {
    const userRef = refDB.child(firebase_db_path_JOBS_profile).child(user_id).child(childReference).child(listingID);
    userRef.remove()
      .then(function() {
        return true;
      })
      .catch(function(error) {
        console.log("Remove failed: " + error.message)
        return error;
      });
  } else {
    const UserRef = refDB.child(firebase_db_path_JOBS_profile).child(user_id).child(childReference);
    return UserRef.update({
      [listingID]: listingID
    }, function(error) {
      console.log('Error:');
      console.log(error);
      if (error) {
        return error;
      } else {
        return true;
      }
    });
  }
}

// function sendMsgByHeyMarket(creator_id, phone_num, template_id) {
//   console.log('creator_id----', creator_id)
//   console.log('phone_num----', phone_num)
//   console.log('template_id----', template_id)
//   request({
//     method: 'POST',
//     url: heyUrl+'/message/send',
//     headers: heyMHeader,
//     body: JSON.stringify({
//       "creator_id": creator_id,
//       "inbox_id": 11669,
//       "phone_number": phone_num,
//       "template_id": template_id
//     })
//   }, function (error, response, body) {
//     if(error) {
//       console.log('err---------', error)
//       return error;
//     } else {
//       console.log('res body---', body)
//       return body;
//     }
//   });
// }

function hmCreateContact(userData, uid) {
  console.log('hmCreateContact');
  console.log('userData----', userData);
  console.log('uid----', uid);
  if(userData && uid && userData.meta.sms_verified == "true" && userData.welcomeEmailSent == "true") {
    var refDB = admin.database().ref();
    var userRef = refDB.child("/users").child(uid);
    let custom_data = {
      "47291" : '',
      "49452" : userData.meta.location ? userData.meta.location : '',
      "47528" : userData.meta.device_type ? userData.meta.device_type : '',
      "48701" : '',
      "49197" : (userData.meta.isJobber && userData.meta.isJobber == "true") ? "true" : "false",
      "49198" : userData.meta.isRequestor && userData.meta.isRequestor == "true" ? "true" : "false"
    };
    const body = {
      "display_name": userData.meta.name ? userData.meta.name : '',
      "email": userData.meta.email,
      "phone": userData.meta.phone,
      "custom": custom_data
    };
    console.log('payload body--', body)
    request({
      method: 'POST',
      url: heyUrl+'/contact',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        "Authorization":"Bearer "+heyMKey
      },
      body: JSON.stringify(body)
    }, function (error, response, body) {
      console.log('body----??', body)
      if(error) {
        console.log('error---', error);
        return false;
      } else if(body && body != 'bad_data') {
        var contactData = JSON.parse(body);
        var contactId = contactData.id;
        request({
          method: 'GET',
          url: heyUrl+'/contact/'+contactId,
          headers: heyMHeader,
        }, function (err, response, body) {
          if(err) {
            console.log('error---------', err)
            return err;
          } else if(body) {
            return true;
            // var hmContactData = JSON.parse(body);
            // console.log('hmContactData-->>',hmContactData)
            // request({
            //   method: 'POST',
            //   url: heyUrl+'/message/send',
            //   headers: heyMHeader,
            //   body: JSON.stringify({
            //     "creator_id": hmContactData.creator_id,
            //     "inbox_id": 11669,
            //     "phone_number": userData.meta.phone,
            //     "template_id": template_id
            //   })
            // }, function (error, response, body) {
            //   if(error) {
            //     console.log('err---------', error)
            //     console.log('body--------->>', body)
            //     return error;
            //   } else {
            //     if(body && body != 'bad_data') {
            //       userRef.update({'hContactData':hmContactData, welcomeEmailSent:"false"},function(error) {
            //         if (!error) {
            //           return true;
            //         } else {
            //           return error;
            //         }
            //       });
            //     } else {
            //       return false;
            //     }
            //   }
            // });
          } else {
            return false;
          }
        });
      } else {
        return false;
      }
    });
  } else {
    return false;
  }
}

const firebase_db_path = 'users';
const firebase_db_path_JOBS_profile = 'JOBSprofile';
