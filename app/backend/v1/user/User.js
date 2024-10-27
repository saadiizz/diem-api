"use strict"

var ResponseCreator = require('../Utils/ResponseHandler');
var { GeoFire } = require('geofire');
var Listings = require("../listings/Listings");
var WePayController = require('./../wepay/WePayController');
const _ = require('underscore');
var uuidBase62 = require('uuid-base62');
let { TrackClient } = require('customerio-node');
var async = require('async');
const cron = require("node-cron");
const admin = require("firebase-admin");
const siteId = process.env.SITE_ID;
const apiKey = process.env.API_KEY;
const cio = new TrackClient(siteId, apiKey);
const WePay = new WePayController();
// let request = require('request');
const heyMKey = process.env.HM_KEY;
const heyUrl = process.env.HM_URL;
let heyMHeader = {
  'Content-Type': 'application/json',
  'Accept': 'application/json',
  "Authorization":"Bearer "+heyMKey
}
var {Decimal} = require('decimal.js');
const decimalPrecision = 2;

//schedule tasks to be run on the server   //have to fix the cron job later
// cron.schedule("0 6 * * *", function() {
//   console.log("running a task every day on 6am");
//   let lisitngCrDateAfterThreeMnths, lCreateDate, creatorId;
//   var userRef = admin.database().ref("/users").orderByChild("meta/isRequestor").equalTo("true");
//   userRef.once('value').then(usersnap => {
//     _.each(usersnap.val(), function(userObj, key) {
//       if(userObj && userObj.meta && userObj.meta.JoiningDate) {
//         let currentDate = new Date().getTime();
//         let uCreateDate = userObj.meta.JoiningDate;
//         let dt = new Date(uCreateDate);
//         let uCrDateAfterOneWeek = dt.setDate(dt.getDate() + 7);
//         if(userObj.listing_created_date) {
//           lCreateDate = new Date(userObj.listing_created_date);
//           lisitngCrDateAfterThreeMnths = lCreateDate.setDate(lCreateDate.getDate() + 90);
//         }
//         if(userObj.hContactData && userObj.hContactData.creator_id) {
//           creatorId = userObj.hContactData.creator_id;
//         }
//         if(uCrDateAfterOneWeek && uCrDateAfterOneWeek < currentDate && !userObj.listing_created_date && creatorId && userObj.meta.phone) {
//           sendMsgByHeyMarket(creatorId, userObj.meta.phone, 48392);
//         } else if(lisitngCrDateAfterThreeMnths && lisitngCrDateAfterThreeMnths < currentDate && creatorId && userObj.meta.phone) {
//           sendMsgByHeyMarket(creatorId, userObj.meta.phone, 48483);
//         } else {
//           return false;
//         }
//       } else {
//         return false;
//       }
//     });
//   }).catch(function(err) {
//     console.log('Failed in getting users:', err);
//     return err;
//   });
// });

function saveLocationForUserToFirebase(firebase_admin, user_type, user_id, location, callback) {
  var refDB = firebase_admin.database().ref();
  var userRef = refDB.child(firebase_db_path);
  if (user_id !== null && user_id !== undefined) {
    var geoFire = new GeoFire(refDB.child(firebase_db_path + '/' + user_id));
  } else {
    var geoFire = new GeoFire(refDB.child(firebase_db_path_new_download_locations + '/' + user_type));
  }

  var ref = geoFire.ref();
  var long = parseFloat(location.longitude);
  var lat = parseFloat(location.latitude);
  var GeoLocation = [lat, long];
  try {
    if (user_id !== null && user_id !== undefined) {
      geoFire.set(firebase_db_path_user_locations, GeoLocation).then(function() {
        callback('200', "Saved user location", "TEST");
      }, function(error) {
        //Delete the unused listing
        console.log("Error: " + error);
        callback('422', error);
      });
    } else {
      geoFire.set(refDB.child(firebase_db_path_new_download_locations).push().getKey(), GeoLocation).then(function() {
        console.log("Provided key has been added to GeoFire");
        callback('200', "Saved user location", "TEST");
      }, function(error) {
        //Delete the unused listing
        console.log("Error: " + error);
        callback('422', error);
      });
    }
  } catch (e) {
    callback('422', "Location format incorrect");
  }
}

function savePaymentInfoForUserToFirebase(firebase_admin, user_id, credit_card_obj, callback) {
  credit_card_obj = JSON.parse(JSON.stringify(credit_card_obj))
  var refDB = firebase_admin.database().ref();
  var userRef = refDB.child(firebase_db_path).child(user_id).child('credit_card_obj');
  if(credit_card_obj && credit_card_obj.defaultCard === "true") {
    userRef.once("value").then(function(cardData) {
      if(cardData.val() && cardData.val().credit_card_id) {
        userRef.remove().then(function(error) {
          if (error) {
            console.log("Error: " + error);
            callback('422', error);
          } else {
            console.log('Old card removed!')
            userRef.push(credit_card_obj,function(error) {
              if (error) {
                console.log("Error: " + error);
                callback('422', error);
              } else {
                console.log("Payment info saved!!");
                callback('200', "Saved user credit_card_obj");
              }
            });
          }
        });
      }
      else {
        console.log("cardData", cardData.val())
        cardData.forEach(cardObj => {
          if(cardObj && cardObj.val().defaultCard === "true") {
            userRef.child(cardObj.key).update({defaultCard:"false"}, error => {
              if(error) {
                console.log("Error: " + error);
                callback('422', error);
              }
              else {
                console.log('CardInfo updated successfully!')
              }
            })
          }
        });
        userRef.push(credit_card_obj,function(error) {
          if (error) {
            console.log("Error: " + error);
            callback('422', error);
          } else {
            console.log("Payment info saved");
            callback('200', "Saved user credit_card_obj");
          }
        });
      }
    }).catch(function(err) {
      console.log("Failed in getting cardInfo: " + err);
      callback('400', err)
    });
  }
  else {
    if(credit_card_obj.defaultCard === "false") {
      userRef.once("value").then(function(cardData) {
        console.log("cardData", cardData.val())
        console.log("credit_card_obj", credit_card_obj)
        if(cardData.val() && cardData.val().credit_card_id) {
          userRef.remove().then(function(error) {
            if (error) {
              console.log("Error: " + error);
              callback('422', error);
            } else {
              console.log('Old card removed successfully!')
            }
          });
        }
        userRef.push(credit_card_obj,function(error) {
          if (error) {
            console.log("Error: " + error);
            callback('422', error);
          } else {
            callback('200', "Saved user credit_card_obj info!");
          }
        });
      }).catch(function(err) {
        console.log("Failed in getting cardInfo: " + err);
        callback('400', err)
      });
    }
    else {
      userRef.update(credit_card_obj,function(error) {
        if (error) {
          console.log("Error: " + error);
          callback('422', error);
        } else {
          callback('200', "Saved user credit_card_obj information");
        }
      });
    }
  }
}

function saveWePayInfoForUserToFirebase(firebase_admin, user_id, wepay_account, callback) {
  var refDB = firebase_admin.database().ref();
  var userRef = refDB.child(firebase_db_path).child(user_id).child('wepay_account');
  userRef.update(JSON.parse(JSON.stringify(wepay_account)),
    function(error) {
      if (error) {
        console.log("Error: " + error);
        callback('422', error);
      } else {
        console.log("Payment info saved");
        callback('200', "Saved wepay account information", "TEST");
      }

    });
}

function getMyProjects(firebase_admin, childReference, user_id, callback) {
  var refDB = firebase_admin.database().ref();
  var userRef = refDB.child(firebase_db_path).child(user_id).child(childReference);
  userRef.once("value").then(function(snapshot) {
    var data = snapshot.val();
    var promises = new Array();
    for (let id in data) {
      console.log(id);
      promises.push(Listings.getListingFromFirebase(firebase_admin, id, null, null, null));
      promises = promises.filter(v => v !== null);
    }
    // data.foreach(function(childData) {
    //   // var gettingCategories = Listings.getListingFromFirebase(admin, id);
    //   console.log(childData.val());
    // });
    callback('200', promises);
  }).catch(function(err) {
    console.log("The read failed: " + err);
    callback('400', err)
  });
}


function updateMyProjects(firebase_admin, childReference, user_id, listingID, callback) {
  var refDB = firebase_admin.database().ref();
  var userRef = refDB.child(firebase_db_path).child(user_id).child(childReference);
  userRef.update({
    [listingID]: listingID
  }, function(error) {
    console.log('Error:');
    console.log(error);
    if (error) {
      callback('400', error);
    } else {
      callback('200', 'Users my project is updated');
    }
  });
}

function updateUserDetails(userId, data) {
  return admin.database().ref().child(firebase_db_path).child(userId).update(data);
}

function getUser(firebase_admin, user_id, callback) {
  var refDB = firebase_admin.database().ref();
  var userRef = refDB.child(firebase_db_path).child(user_id);
  userRef.once("value").then(function(snapshot) {
    var userData = snapshot.val().meta;
    // userData['dodUser'] = snapshot.val().dodUser;
    if(snapshot.val().masterAdmin) (userData['masterAdmin'] = snapshot.val().masterAdmin);
    if(snapshot.val().dodUser) (userData['dodUser'] = snapshot.val().dodUser);
    if(snapshot.val().filterData) (userData['filterData'] = snapshot.val().filterData);
    if(snapshot.val().requests_date_time_change) {
      let reqArr = [];
      Object.keys(snapshot.val().requests_date_time_change).forEach((key) => {
        if(snapshot.val().requests_date_time_change[key].date_time_change_status == 'requested'){
          reqArr.push(snapshot.val().requests_date_time_change[key]);
        }
      })
      userData['requests_date_time_change'] = reqArr;
    }
    //support_phone:"tel://1-833-343-6277" added by ios dev
    userData['support_phone'] = "1-332-334-2474";
    userData['support_email'] = "help@diemtheapp.com";
    callback('200', userData);
  }).catch(function(err) {
    console.log("The read failed: " + err);
    callback('400', err)
  });
}
function deleteUser(uid, body, callback) {
  getUser(admin, uid, (status, data) => {
    if (status == 200) {
      // send cio event to slack with data which is user data.
      data["reason"] = body.reason;
      cio.track(uid, {
        name: "user_delete_request",
        data: data
      });
      callback(200, { message: "Request Placed Successfully" })
    }
    else {
      callback(status, data)
    }
  })
}
function getPublicProfileOfUser(firebase_admin, user_id, callback) {
  var refDB = firebase_admin.database().ref();
  var userRef = refDB.child(firebase_db_user_public_path).child(user_id);
  userRef.once("value").then(function(snapshot) {
    callback('200', snapshot.val());
  }).catch(function(err) {
    console.log("The read failed: " + err);
    callback('400', err)
  });
}


function getPublicProfile(user_id, offerObj, userType, firebase_admin) {
  var refDB = firebase_admin.database().ref();
  var userRef = refDB.child(firebase_db_user_public_path).child(user_id).child(userType);
  return userRef.once("value").then(function(snapshot) {

    var userObj = snapshot.val();
    var reviewArray = new Array();
    if(userObj && userObj.reviews) {
      snapshot.child('reviews').forEach(obj => {
        var arrayObj = obj.val();
        reviewArray.push(arrayObj);
      });
    }
    userObj.reviews = reviewArray;
    offerObj['user_profile'] = userObj;
    if(offerObj.assignedRookieUser && offerObj.assignedRookieUser.length){

      let rookie = offerObj.assignedRookieUser[0]
      var rookieProfile = refDB.child(firebase_db_path_JOBS_profile).child(rookie.id)
      return rookieProfile.once('value').then(function(snapshot){
          let profile = snapshot.val();
          rookie.profile_picture = profile.profile_picture
          // offerObj.assignedRookieUser[0] = rookie
            return offerObj
        })
    }else{
      console.log('in els')
      return offerObj;
    }
  }).catch(function(err) {
    console.log("The read failed: " + err);
    return
  });
}

function getPublicUser(jobPost, userType, firebase_admin, callback) {
  var promises = new Array();
  let offers;
  for (var i = 0; i < jobPost.length; i++) {
    if (jobPost[i] && jobPost[i].offers) {
      offers = jobPost[i].offers;
    }
    else {
      console.log('Posted job have not offer or jobPost is null!')
    }

    if (offers !== null && offers !== undefined) {
      for (var k = 0; k < offers.length; k++) {
        if (userType === 'jobber') {
          promises.push(User.getPublicProfile(offers[k].jobberUID, offers[k], userType, firebase_admin));
        } else {
          userType = 'requestors'
          promises.push(User.getPublicProfile(offers[k].requestorUID, offers[k], userType, firebase_admin));
        }
      }
    }
  }
  console.log("NOT missing implementation");
  callback('200', promises);
}

function editProfile(userObj, user_id, firebase_admin, userType, callback) {
  var refDB = firebase_admin.database().ref();
  var userRef = refDB.child(firebase_db_path).child(user_id).child('meta');

  userRef.once("value").then(function(snapshot) {
    var userFireBaseData = snapshot.val();
    var fullFirebaseName;
    if (userObj.firstName) {
      fullFirebaseName = userFireBaseData.firstName + ' ' + userFireBaseData.lastName
    } else {
      fullFirebaseName = userObj.firstName + ' ' + userObj.lastName
    };
    var firstName = userObj.firstName || userFireBaseData.firstName || null;
    var lastName = userObj.lastName || userFireBaseData.lastName || null;
    var name = fullFirebaseName;
    var rightForTheJob = userObj.rightForTheJob || userFireBaseData.rightForTheJob || null;
    var whenImNotWorking = userObj.whenImNotWorking || userFireBaseData.whenImNotWorking || null;
    var pictureURL = userObj.profile_picture || userFireBaseData.pictureURL || null;
    var work_pictures = userObj.work_pictures || userFireBaseData.work_pictures || null;

    userRef.update({
      firstName: firstName,
      lastName: lastName,
      name: fullFirebaseName,
      rightForTheJob: rightForTheJob,
      whenImNotWorking: whenImNotWorking,
      pictureURL: pictureURL,
      work_pictures: work_pictures
    }, function(error) {
      console.log('Error:');
      console.log(error);
      if (error) {
        callback('400', error);
      } else {
        callback('200', userObj);
      }
    });
  }).catch(function(err) {
    console.log("The read failed: " + err);
    callback('400', err)
  });
}

function userReviews(offerID, listingID, reviewObj, user_id, firebase_admin, callback) {
  const refDB = firebase_admin.database().ref();
  const userRef = refDB.child(firebase_db_path);
  const listingOffer = refDB.child(firebase_db_path_offer).child(offerID);
  const userPublic = refDB.child("/public_profile");
  let creatorId;

  listingOffer.once("value").then(function(offerSnapshot) {
    const jobberId = offerSnapshot.val().jobberUID;
    const requesterId = offerSnapshot.val().requestorUID;

    userRef.child(user_id).once("value").then(function(userSnaps) {
      reviewObj.uid = user_id;
      reviewObj.date = Math.round(new Date().getTime()/1000);
      var userObj = userSnaps.val();
      reviewObj.name = userObj.meta.name;
      reviewObj.listingID = listingID;
      reviewObj.offerID = offerID;
      if(userObj.meta.isRequestor == 'true' || userObj.meta.isRequestor == true) {
        var requesterRef = refDB.child(firebase_db_path).child(jobberId).child('reviews');
        var jReviewId = requesterRef.push(reviewObj, function(error) {
          if (error) {
            console.log('Error:', error);
            callback('400', error);
          } else {
            userRef.child(jobberId).once("value").then(function(jobberObj){
              let jPhone = jobberObj.val().meta.phone;
              if(jobberObj.val() && jobberObj.val().hContactData && jobberObj.val().hContactData.creator_id) {
                creatorId = jobberObj.val().hContactData.creator_id;
              }

              userPublic.child(jobberId).child('/jobber/reviews').child(jReviewId.key).update(reviewObj, function(err) {
                if(err) {
                  console.log('err---------',err);
                  callback('500', err)
                }
                else {
                  // if(reviewObj && reviewObj.rating === "5" && jPhone && creatorId) {
                  //   hmSendMsg(creatorId, jPhone, 50139, callback);
                  // } else if(reviewObj && reviewObj.rating <= "3" && jPhone && creatorId) {
                  //   hmSendMsg(creatorId, jPhone, 50140, callback);
                  // }else{
                    callback('200', jobberObj.val().meta)
                  // }
                }
              })
            }).catch(function(err) {
              console.log("Failed to get user:" + err);
              callback('400', err)
            });
          }
        });
      }
      else {
        if(userObj.meta.isJobber == 'true' || userObj.meta.isJobber == true) {
          var jobberRef = refDB.child(firebase_db_path).child(requesterId).child('reviews');
          var rReviewId = jobberRef.push(reviewObj, function(error) {
            console.log('Error:');
            console.log(error);
            if (error) {
              callback('400', error);
            } else {
              userRef.child(requesterId).once("value").then(function(requestorObj){
                let rPhone = requestorObj.val().meta.phone;
                if(requestorObj.val() && requestorObj.val().hContactData && requestorObj.val().hContactData.creator_id) {
                  creatorId = requestorObj.val().hContactData.creator_id;
                }
                userPublic.child(requesterId).child('/requestors/reviews').child(rReviewId.key).update(reviewObj, function(err) {
                  if(err) {
                    console.log('err---------',err);
                    callback('500', err)
                  }
                  else {
                    // if(reviewObj && reviewObj.rating === "5" && rPhone && creatorId) {
                    //   hmSendMsg(creatorId, rPhone, 48390, callback);
                    // } else if(reviewObj && reviewObj.rating <= "3" && rPhone && creatorId) {
                    //   hmSendMsg(creatorId, rPhone, 48391, callback);
                    // }else{
                      callback('200', requestorObj.val().meta)
                    // }
                  }
                })
              }).catch(function(err) {
                console.log("Failed to get user:" + err);
                callback('400', err)
              });
            }
          });
        }
        else {
          console.log('User type not matched!!')
        }
      }
    }).catch(function(err) {
      console.log("Failed to get user:" + err);
      callback('400', err)
    });
  }).catch(function(err) {
    console.log("Failed to get offers:" + err);
    callback('400', err)
  });

}

function reportUser(uid, reason, reporterId, firebase_admin, callback) {
  var refDB = firebase_admin.database().ref();
  var userRef = refDB.child(firebase_db_path).child(reporterId);
  var reportPath = refDB.child(firebase_db_path_user_reported);
  var reportObj = new Object();
  if (reporterId !== undefined && reporterId !== null) {
    reportObj.reporterId = reporterId;
  }
  reportObj.userId = uid;
  reportObj.reason = reason;
  userRef.once('value', function(snapshot) {
    if (snapshot.val().meta.uid) {
      reportPath.push(reportObj, function(error) {
        if (error) {
          console.log('Error:',error);
          callback('400', error);
        } else {
          callback('200', 'User reported successfully!');
        }
      });
    } else {
      callback('400', "User does not exists");
    }
  });
}

function credicardInfo(firebase_admin, user_id, callback) {
  var refDB = firebase_admin.database().ref();
  const userRef = refDB.child(firebase_db_path).child(user_id);
  const cardData = [];
  var promises =  new Array;
  userRef.once("value").then(function(userSnaps) {
    if(userSnaps.val().credit_card_obj) {
      userRef.child('credit_card_obj').once("value").then(function(creditCardData) {
        if(creditCardData.val().credit_card_id) {
          callback('200', cardData);
        }
        else {
          _.each(creditCardData.val(), (d, key)=>{
              d['card_key'] = key;
              promises.push(cardDetails(d))
            })
          Promise.all(promises).then(values => {
            callback('200', values);
          }).catch(function(err) {
            console.log('A promise failed to resolve', err);
            callback(404, err);
          });
        }
      }).catch(function(err) {
        console.log("Failed to get credicardInfo:" + err);
        callback('400', err)
      });
    }
    else {
      callback('200', cardData);
    }
  })
  .catch(function(err) {
    callback('400', err)
  });
}

function cardDetails(cardData){

  return new Promise(async(resolve, reject) => {
    try {
      if(cardData){
       WePay.getCreditCard(cardData.credit_card_id, (responseCode, responseMessage) => {
         if(responseMessage.state){
          let cardDetails = {};
          Object.keys(responseMessage).forEach((key) => {
            cardDetails[key] = String(responseMessage[key]);
            cardDetails["card_key"] =  cardData.card_key;
            cardDetails["credit_card_id"] = (cardDetails.credit_card_id != 0) ?cardDetails.credit_card_id : cardData.credit_card_id
             resolve(cardDetails);
          })
         }else{
          resolve(responseMessage);
         }
        });
      }
    }catch(e) {
      console.log('Error:', e);
      reject(e);
    }
  })
}
function wePayStatus (wePayStatus, jobberUID) {
  // If wepay status of jobber and one returned from paymentcheckstatus function are same do nothing else update jobber wepay status.
  const jobberRef = firebase_admin.database().ref().child('users').child(jobberUID);
  jobberRef.once('value').then(snap => {
    const jobberData = snap.val();
    if(jobberData.payment_info.state !== wePayStatus){
      // Update jobber WePay state;
      jobberRef.child('payment_info').update({
        "state" : wePayStatus,
      }, (err) => {
        if(err) {
          console.log(err);
        }else{
          // update cio data.
          cio.identify(jobberUID, {
            wepay_state: wePayStatus || "pending",
          });
          console.log("state updated for Jobber: " + jobberUID);
        }
      })
    }
    else{
      console.log("States are equal");
      return;
    }
  }).catch(err => {
    console.log(err);
    return;
  });
}
function deletePaymentInfoForUserToFirebase(firebase_admin, user_id, body, callback) {
  var refDB = firebase_admin.database().ref();
  var userRef = refDB.child(firebase_db_path).child(user_id).child('credit_card_obj');
  // userRef.child(body.card_key).remove().then(function(error) {
    userRef.child(body.card_key).update({state: "deleted"}, function(err) {
    if (err) {
      console.log("Error: " + err);
      callback('422', err);
    } else {
      WePay.deleteCreditCard(body.credit_card_id, (responseCode, responseMessage) => {
        callback(responseCode, responseMessage);
      });
    }
  });
}


function devicePushtoken(body, firebase_admin, callback) {
  console.log('location----------:', body.location)
  console.log('app_type----------:', body.app_type)
  console.log('token----------:', body.token)
  if(body && body.location && body.token) {
    // cio.identify(body.token, {location: body.location});
    callback('200', body.token);
  } else {
    var token = uuidBase62.v4();
    var time = Math.round(new Date().getTime()/1000);
    var email = 'install@'+token+'.com';
    // if(body.location) {
    //   cio.identify(token,
    //   {
    //     email: email,
    //     created_at: time,
    //     os: body.device_type,
    //     location: body.location,
    //     app_type: body.app_type
    //   });
    // } else {
    //   cio.identify(token,
    //   {
    //     email: email,
    //     created_at: time,
    //     os: body.device_type,
    //     app_type: body.app_type
    //   });
    // }
    // cio.addDevice(token, body.device_token, body.device_type)
    callback('200', token);
  }
}

function saveDoorknockerCode(body, firebase_admin, callback) {
  var refDB = firebase_admin.database().ref();
  if(body && body.token && body.doorknocker_code) {
    cio.identify(body.token, {doorknocker_code: body.doorknocker_code});
    cio.track(body.token, {
      name: 'doorknocker_assigned',
      data: {
        doorknocker_code: body.doorknocker_code
      }
    });
    callback('200', body.token)
  } else if(body && body.uid && body.doorknocker_code) {
    var userRef = refDB.child(firebase_db_path).child(body.uid);
    userRef.update({doorknocker_code: body.doorknocker_code}, function(err) {
      if(err) {
        callback('500', err);
      } else {
        cio.identify(body.uid, {doorknocker_code: body.doorknocker_code});
        cio.track(body.uid, {
          name: 'doorknocker_assigned',
          data: {
            doorknocker_code: body.doorknocker_code
          }
        });
        callback('200', body.uid)
      }
    })
  } else {
    callback('400', 'Uid or token is undefined!')
  }
}

function updateJobStatus(firebase_admin, callback) {
  var refDB = firebase_admin.database().ref();
  var listingRef = refDB.child('listing');
  var listingArr = [];
  listingRef.once("value").then(function(userSnaps) {
    _.each(userSnaps.val(), function(listingObj, key) {
      if(listingObj.jobStatus == undefined && listingObj.accept_id == undefined) {
        listingRef.child(key).update({jobStatus:"open"}, function(err) {
          if(err) {
            console.log('err---------',err);
            callback('500', err)
          }
          else {
            console.log('jobStatus is undefined')
          }
        })
      }
    })
    callback('200', 'Listings updated successfully!')
  })
  .catch(function(err) {
    console.log("Failed to get listing:" + err);
    callback('400', err)
  });
}

function updateFilterDataUser(uid, body, firebase_admin, callback) {
  console.log('uid, body',uid, body)
  let missedCity =  false;
   var refDB = firebase_admin.database().ref();
    let updateObj = {};
    let data ={};
    if(body.minPrice){
      updateObj['filterData/minPrice'] = body.minPrice
      data.minPrice = body.minPrice
    }

    if(body.category_id){
      updateObj['filterData/category_id'] = body.category_id
      data.category_id = body.category_id

    }

    if(body.subcategory_id){
      let subcategory_id = (typeof body.subcategory_id == "string") ? body.subcategory_id.split(",") : body.subcategory_id;
      console.log('subcategory_id',subcategory_id)
      updateObj['filterData/subcategory_id'] = subcategory_id
      data.subcategory_id = subcategory_id

    }
    if(body.queryCenter){
      updateObj['filterData/queryCenter'] = body.queryCenter
      data.queryCenter = body.queryCenter

    }

    if(body.queryRadius){
      updateObj['filterData/queryRadius'] = body.queryRadius
      data.queryRadius = body.queryRadius

    }

    if(missedCity == false){
      console.log('missedCity', missedCity)
    }

    var userRef = refDB.child(firebase_db_path).child(uid);
    userRef.once("value").then(function(userSnap) {
      // console.log('byApi', body.calledByApi, userSnap.val().filterData.subcategory_id)
      if(userSnap.val() && userSnap.val().filterData && userSnap.val().filterData.subcategory_id == undefined &&  body.calledByApi != undefined &&  !body.calledByApi){
        delete updateObj['filterData/subcategory_id']
        delete  data.subcategory_id
         userRef.update(updateObj, function(err) {
          if(err) {
            callback('500', err);
          } else {
            cio.identify(uid, data);
            callback('200', data)
          }
        })
      }else{
        userRef.update(updateObj, function(err) {
          if(err) {
            callback('500', err);
          } else {
            cio.identify(uid, data);
            callback('200', data)
          }
        })
      }
    })
}

function deleteJoblocation(body, firebase_admin, callback) {
  var refDB = firebase_admin.database().ref();
  var listingRef = refDB.child('listing').orderByChild('jobStatus').equalTo(body.jobStatus);
  var listingLocationRef = refDB.child('listingLocation');
  var listingIdArr = [];
  listingLocationRef.once("value").then(function(listingLocationSnaps) {
    _.each(listingLocationSnaps.val(), function(listingObj, key) {
      listingIdArr.push(key);
    })
    if(listingIdArr.length > 0) {
      _.each(listingIdArr, function(ldata, key) {
        listingRef.once("value").then(function(listingSnaps) {
          listingSnaps.forEach(function(data) {
            if(data.key == ldata) {
              listingLocationRef.child(data.key).remove().then(function(error) {
                if(error) {
                  callback('500', error);
                }
                else {
                  console.log('listingLocation deleted successfully!')
                }
              })
            }
          })
        })
        .catch(function(err) {
          console.log("Failed to get listing:" + err);
          callback('400', err)
        });
      })
    }
    callback('200', 'Listings location updated successfully!')
  })
  .catch(function(err) {
    console.log("Failed to get listing:" + err);
    callback('400', err)
  });
}

function clearAcceptedDodListing(uid, firebase_admin, callback) {
  var refDB = firebase_admin.database().ref();
  var userDodListingRef = refDB.child(firebase_db_path).child(uid).child('accepted_dod_listing');
  userDodListingRef.remove().then(function(err) {
    if(err) {
      callback('400', err);
    } else {
      callback('200', "Dod listing updated");
    }
  })
}

function getAppVersion(firebase_admin, callback) {
  var refDB = firebase_admin.database().ref();
  const appVersionRef = refDB.child('app_version');
  appVersionRef.once("value").then(function(appvesionObj) {
    callback('200', appvesionObj.val())
  })
  .catch(function(err) {
    callback('400', err)
  });
}

function bookFreeQuote(body, uid, firebase_admin, callback) {
  if(body) {
    cio.track(uid, {
      name: 'requestor_book_free_quote',
      data: {
        work_data: body.work_data,
        work_time: body.work_time
      }
    });
    callback('200', 'Requestor Book free quote successfully!');
  } else {
    callback('400', 'Requestor book free quote data undefind!');
  }
}

// function hmSendMsg(creator_id, phone_num, template_id, clb) {
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
//       clb('500', error);
//     } else {
//       console.log('res body---', typeof body, body)
//       if(body == 'malformed') {
//         clb('200', 'Msg not send due to some error on heyMarket.');
//       }else if(body != 'invalid_phone') {
//         clb('200', JSON.parse(body));
//       } else {
//         clb('200', body);
//       }
//     }
//   });
// }

// function sendMsgByHeyMarket(creator_id, phone_num, template_id) {
//   console.log('sendMsgByHeyMarket');
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


function User(
  email,
  firstName,
  lastName,
  emailVerified,
  phoneNumber,
  password,
  displayName,
  photoURL,
  deviceToken
) {
  this.email = email = email;
  this.firstName = firstName;
  this.lastName = lastName;
  this.emailVerified = emailVerified;
  this.phoneNumber = phoneNumber;
  this.password = password;
  this.displayName = displayName;
  this.photoURL = photoURL;
  this.deviceToken = deviceToken;
}

function UserPublicProfile(
  firstName,
  lastName,
  rightForTheJob,
  whenImNotWorking,
) {
  this.firstName = firstName;
  this.lastName = lastName;
  this.rightForTheJob = rightForTheJob;
  this.whenImNotWorking = whenImNotWorking;
}

function getProjectDetails(listing_id, userType, uid, firebase_admin, callback) {
  var promises = new Array();
  let offers;
  var listingData;
  var refDB = firebase_admin.database().ref();
  var listingRef = refDB.child('listing');
  if(listing_id != undefined && listing_id != null) {
    listingRef.child(listing_id).once("value").then(function(snapshot) {
      offers = snapshot.val().offers;
      if (offers !== null && offers !== undefined) {
        _.each(offers, function(offerObj, key) {
          offerObj.id = key;
          if(offerObj.extendedService && offerObj.extendedService.list){
            var listArray = new Array();
            _.each(offerObj.extendedService.list, (obj, key )=> {
              var listArr = obj;
              listArr.id = key;
              listArray.push(listArr)
            })
            offerObj.extendedService.list = listArray
          }

          if(offerObj.addOns){
            var addOnsArray = new Array();
            _.each(offerObj.addOns, (obj, key )=> {
              var addOnsArr = obj;
              addOnsArr.id = key;
              addOnsArray.push(addOnsArr)
            })
            offerObj.addOns = addOnsArray
          }
          // if(offerObj.charge && !Array.isArray(offerObj.charge)){
          //   let taxRate = new Decimal(snapshot.val().taxRate?snapshot.val().taxRate :13).toDecimalPlaces(decimalPrecision);
          //   let chargeArray = new Array();
          //   let price = new Decimal(offerObj.charge.price)
          //   let priceWithtax = price.add(price.times(taxRate).div(100))
          //   let diemFee = priceWithtax.times(25).div(100)
          //   let wepayFee =  priceWithtax.times(2.9).div(100).add(0.30)
          //   offerObj.charge.priceMinusTax = priceWithtax.sub(diemFee).sub(wepayFee).toDecimalPlaces(decimalPrecision).valueOf();
          //   offerObj.charge.priceWithtax = priceWithtax.valueOf();

          //   chargeArray.push(offerObj.charge)
          //   offerObj.charge = chargeArray
          // }

          let chargeObj = {};
          if(offerObj.charge){
            if( !Array.isArray(offerObj.charge)){
              let taxRate = new Decimal(listingData.taxRate?listingData.taxRate :13).toDecimalPlaces(decimalPrecision);
              let chargeArray = new Array();
              let price = new Decimal(offerObj.charge.price)
              let priceWithtax = price.add(price.times(taxRate).div(100))
              let diemFee = priceWithtax.times(25).div(100)
              let wepayFee =  priceWithtax.times(2.9).div(100).add(0.30)
              offerObj.charge.priceMinusTax = priceWithtax.sub(diemFee).sub(wepayFee).toDecimalPlaces(decimalPrecision).valueOf();
              offerObj.charge.priceWithtax = priceWithtax.valueOf();

              chargeObj.title = offerObj.charge.title
              chargeObj.price = offerObj.charge.price.valueOf()
              chargeObj.priceWithtax = offerObj.charge.priceWithtax.valueOf()
              chargeObj.priceMinusTax = offerObj.charge.priceMinusTax.valueOf()
              chargeObj.chargeType = ''
              chargeArray.push(JSON.parse(JSON.stringify(chargeObj)))
              chargeObj.list = chargeArray
              offerObj.charge = chargeObj
            }else{
              chargeObj = offerObj.charge[0]
              chargeObj.list = JSON.parse(JSON.stringify(offerObj.charge))
              offerObj.charge = chargeObj
            }
          }

          if(offerObj.job_images && offerObj.job_images.jobber){
            var imageArray = new Array();
            _.each(offerObj.job_images.jobber, (obj, key )=> {
              var imgArr = obj;
              imgArr.id = key;
              imageArray.push(imgArr)
            })
            offerObj.job_images.jobber = imageArray
          }

          if (userType === 'jobber') {
            promises.push(User.getPublicProfile(offerObj.jobberUID, offerObj, userType, firebase_admin));
          } else {
            promises.push(User.getPublicProfile(offerObj.requestorUID, offerObj, userType, firebase_admin));
          }
        });
      }
      callback('200', promises);
    }).catch(function(err) {
      console.log("Failed in getListing: " + err);
      callback('400', err);
    });
  } else {
    var userDodListingRef = refDB.child(firebase_db_path).child(uid).child('accepted_dod_listing');
    userDodListingRef.once("value").then(function(dodListingObj) {
      async.eachSeries(dodListingObj.val(), function(lData, cb) {
        listingRef.child(lData).once("value").then(function(listingObj) {
          listingData = listingObj.val();
          delete listingData.offers;
          if (listingData !== null && listingData !== undefined) {
            if (userType === 'jobber') {
              promises.push(User.getPublicProfile(listingData.jobberId, listingData, userType, firebase_admin));
              cb();
            } else {
              promises.push(User.getPublicProfile(listingData.jobberId, listingData, userType, firebase_admin));
              cb();
            }
          }
        });
      }, function(err) {
        console.log('err',err);
        if(err) {
          callback('400', err);
        } else {
          callback('200', promises);
        }
      });
    }).catch(function(err) {
      console.log("Failed in getUsers: " + err);
      callback('400', err);
    });
  }
}


function getDiemJobberForAdmin(firebase_admin, callback){
  var refDB = firebase_admin.database().ref();
  var diemJobberRef = refDB.child(firebase_db_path_diem_jobber);
  diemJobberRef.once('value').then(function(snapshot){
    var dataArray = new Array();
    snapshot.forEach(obj => {
      var arrayObj = obj.val();
      arrayObj.id = obj.key;
      dataArray.push(arrayObj);
    });
    callback('200', dataArray)
  }).catch(function(err) {
    console.log("Failed in getUsers: " + err);
    callback('400', err);
  });
}

function createSubJobber(data, firebase_admin, callback){
  var refDB = firebase_admin.database().ref();
  var diemJobberRef = refDB.child(firebase_db_path_diem_jobber);
  diemJobberRef.push(data,function(error){
    if(error){
      console.log('error', error)
      callback('400', error)
    }else{
      callback('200', 'SubJobber added successfully.')
    }
  })
}

function updateSubJobber(subJobberId, data, firebase_admin, callback){
  delete data.subJobberId;
  var refDB = firebase_admin.database().ref();
  var diemJobberRef = refDB.child(firebase_db_path_diem_jobber).child(subJobberId);
  diemJobberRef.update(data,function(error){
      if(error){
          console.log('error', error)
      callback('400',error)
    }else{
        callback('200', "SubJobber Updated Successfully.")
      }
    })
  }

function getStatesProvinceData(firebase_admin , callback){
  var refDB = firebase_admin.database().ref();
  var countryRef = refDB.child(firebase_db_path_diem_country);
  countryRef.once('value').then(function(snapshot){

      callback('200', snapshot.val())

   }).catch(function(err) {
    console.log("Failed in state/Province Data: " + err);
    callback('400', err);
  });
}



var User = {
  User,
  saveLocationForUserToFirebase,
  savePaymentInfoForUserToFirebase,
  getMyProjects,
  updateMyProjects,
  updateUserDetails,
  getUser,
  getPublicProfile,
  getPublicUser,
  UserPublicProfile,
  editProfile,
  getPublicProfileOfUser,
  saveWePayInfoForUserToFirebase,
  userReviews,
  reportUser,
  devicePushtoken,
  updateJobStatus,
  deleteJoblocation,
  getProjectDetails,
  credicardInfo,
  deleteUser,
  deletePaymentInfoForUserToFirebase,
  clearAcceptedDodListing,
  saveDoorknockerCode,
  getAppVersion,
  bookFreeQuote,
  getDiemJobberForAdmin,
  createSubJobber,
  updateSubJobber,
  getStatesProvinceData,
  updateFilterDataUser
};
module.exports = User;

module.exports.isAuthenticated = function(req, res, next) {
  const authorization = req.headers["authorization"];
  if (!authorization) {
    res.status(401)
    res.json({
      "error": "There is no Authorization header."
    });
    return false;
  }
  if (!authorization.includes("Bearer ")) {
    res.status(401)
    res.json({
      "error": 'Format the Authorization header as "Bearer <Token>"'
    });
    return false;
  }
  const token = authorization.split(" ")[1];
  admin.auth().verifyIdToken(token)
    .then(decodedToken => {
      req.user_identification = {
        uid: decodedToken.uid,
        email: decodedToken.email,
        is_email_verified: decodedToken.email_verified
      };

      return next();
    }).catch(error => {
      res.status(401)
      res.json({
        "error": "You are not authorized."
      });
      return false;
    });
};
const firebase_db_path = 'users';
const firebase_db_user_public_path = 'public_profile';
const firebase_db_path_user_locations = 'location';
const firebase_db_path_new_download_locations = 'new_download_location';
const firebase_db_path_meta_data = 'meta';
const firebase_db_path_offer = 'offers';
const firebase_db_path_user_reported = 'userReported';
const firebase_db_path_diem_jobber = "diem_jobber";
const firebase_db_path_diem_country = "diem_country";
const firebase_db_path_JOBS_profile = 'JOBSprofile';
