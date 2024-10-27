// var firebase = require("firebase");
var admin = require("firebase-admin");
var User = require("../user/User");

function IsJsonString(str) {
  try {
    JSON.parse(str);
  } catch (e) {
    return false;
  }
  return true;
}

class UserController {
  /**
   * Retrive all the categories
   * @param  {[type]}   body     [fbObject, device_token]
   * @param  {[type]}   uri      [description]
   * @param  {Function} callback [description]
   * @return {[type]}            [description]
   */
  getUser(uid, callback) {
    User.getUser(admin, uid,
      (responseCode, responseMessage) => {
        callback(responseCode, responseMessage);
      });
  };
  deleteUser(uid, body, callback) {
    User.deleteUser(uid, body, (status, data) => {
      callback(status, data);
    });
  }
  getPublicProfile(uid, callback) {
    User.getPublicProfileOfUser(admin, uid,
      (responseCode, responseMessage) => {
        callback(responseCode, responseMessage);
      });
  };
  saveUserLocaton(body, uri, callback) {
    var uid = body.user_id;
    var location = body.location;
    if (IsJsonString(location)) {
      User.saveLocationForUserToFirebase(admin, null, uid, JSON.parse(location), (responseCode, responseMessage) => {
        callback(responseCode, responseMessage);
      });
    } else {
      callback('422', "error: Location data is missing");
    }
  };

  saveLocation(body, user_type, callback) {
    var uid = body.user_id;
    var location = body.location;
    if (IsJsonString(location)) {
      User.saveLocationForUserToFirebase(admin, user_type, null, JSON.parse(location), (responseCode, responseMessage) => {
        callback(responseCode, responseMessage);
      });
    } else {
      callback('422', "error: Location data is missing");
    }
  };

  update_payment_method(body, uid, callback) {
    User.savePaymentInfoForUserToFirebase(admin, uid, body, (responseCode, responseMessage) => {
      callback(responseCode, responseMessage);
    });

  };

  update_wepay_account(body, uid, callback) {
    User.saveWePayInfoForUserToFirebase(admin, uid, body, (responseCode, responseMessage) => {
      callback(responseCode, responseMessage);
    });

  };

  openProjects(uid, callback) {
    User.getMyProjects(admin, 'projects/open', uid, (responseCode, promises) => {
      Promise.all(promises).then(values => {
        values = values.filter(v => v !== null);
        var listingObjWithOffer = values;
        User.getPublicUser(values, 'jobber', admin, (responseCode, promises) => {
          if (Object.keys(promises).length === 0) {
            callback(responseCode, values);
          } else {
            Promise.all(promises).then(values => {
              listingObjWithOffer.offers = values;
              callback(responseCode, listingObjWithOffer);
            }).catch(function(err) {
              // log that I have an error, return the entire array;
              console.log('A promise failed to resolve', err);
              callback(404, err);
              return arrayOfPromises;
            });
          }
        });
      }).catch(function(err) {
        // log that I have an error, return the entire array;
        console.log('A promise failed to resolve', err);
        callback(404, err);
        return arrayOfPromises;
      });

    });
  };

  completedProjects(uid, callback) {
    User.getMyProjects(admin, 'projects/completed', uid, (responseCode, promises) => {
      Promise.all(promises).then(values => {
        var listingObjWithOffer = values;
        User.getPublicUser(values, 'jobber', admin, (responseCode, promises) => {
          Promise.all(promises).then(values => {
            listingObjWithOffer.offers = values;
            callback(responseCode, listingObjWithOffer);
          }).catch(function(err) {
            // log that I have an error, return the entire array;
            console.log('A promise failed to resolve', err);
            callback(404, err);
            return arrayOfPromises;
          });
        });
      }).catch(function(err) {
        // log that I have an error, return the entire array;
        console.log('A promise failed to resolve', err);
        callback(404, err);
        return arrayOfPromises;
      });
    });
  };

  assignedProjects(uid, callback) {
    User.getMyProjects(admin, 'projects/assigned', uid, (responseCode, promises) => {
      Promise.all(promises).then(values => {
        var listingObjWithOffer = values;
        User.getPublicUser(values, 'jobber', admin, (responseCode, promises) => {
          Promise.all(promises).then(values => {

            listingObjWithOffer.offers = values;
            callback(responseCode, listingObjWithOffer);
          }).catch(function(err) {
            // log that I have an error, return the entire array;
            console.log('A promise failed to resolve', err);
            callback(404, err);
            return arrayOfPromises;
          });
        });
      }).catch(function(err) {
        // log that I have an error, return the entire array;
        console.log('A promise failed to resolve', err);
        callback(404, err);
        return arrayOfPromises;
      });
    });
  };
  
  disputedProjects(uid, callback) {
    User.getMyProjects(admin, 'projects/UnderDispute', uid, (responseCode, promises) => {
      Promise.all(promises).then(values => {
        var listingObjWithOffer = values;
        User.getPublicUser(values, 'jobber', admin, (responseCode, promises) => {
          if (Object.keys(promises).length === 0) {
            callback(responseCode, values);
          } else {
            Promise.all(promises).then(values => {
              listingObjWithOffer.offers = values;
              callback(responseCode, listingObjWithOffer);
            }).catch(function(err) {
              // log that I have an error, return the entire array;
              console.log('A promise failed to resolve', err);
              callback(404, err);
              return arrayOfPromises;
            });
          }
        });
      }).catch(function(err) {
        // log that I have an error, return the entire array;
        console.log('A promise failed to resolve', err);
        callback(404, err);
        return arrayOfPromises;
      });

    });
  };

  unfulfilledProjects(uid, callback) {
    User.getMyProjects(admin, 'projects/unfulfilled', uid, (responseCode, promises) => {
      Promise.all(promises).then(values => {
        var listingObjWithOffer = values;
        User.getPublicUser(values, 'jobber', admin, (responseCode, promises) => {
          Promise.all(promises).then(values => {

            listingObjWithOffer.offers = values;
            callback(responseCode, listingObjWithOffer);
          }).catch(function(err) {
            // log that I have an error, return the entire array;
            console.log('A promise failed to resolve', err);
            callback(404, err);
            return arrayOfPromises;
          });
        });
      }).catch(function(err) {
        // log that I have an error, return the entire array;
        console.log('A promise failed to resolve', err);
        callback(404, err);
        return arrayOfPromises;
      });
    });
  };

  openJobberProjects(uid, callback) {
    User.getMyProjects(admin, 'projects/jobber/open', uid, (responseCode, promises) => {
      Promise.all(promises).then(values => {
        values = values.filter(v => v !== null);
        var listingObjWithOffer = values;
        User.getPublicUser(values, 'requestor', admin, (responseCode, promises) => {
          if (Object.keys(promises).length === 0) {
            callback(responseCode, values);
          } else {
            Promise.all(promises).then(values => {
              listingObjWithOffer.offers = values;
              callback(responseCode, listingObjWithOffer);
            }).catch(function(err) {
              // log that I have an error, return the entire array;
              console.log('A promise failed to resolve', err);
              callback(404, err);
              return arrayOfPromises;
            });
          }
        });
      }).catch(function(err) {
        // log that I have an error, return the entire array;
        console.log('A promise failed to resolve', err);
        callback(404, err);
        return arrayOfPromises;
      });

    });
  };

  completedJobberProjects(uid, callback) {
    User.getMyProjects(admin, 'projects/jobber/completed', uid, (responseCode, promises) => {
      Promise.all(promises).then(values => {
        values = values.filter(v => v !== null);
        var listingObjWithOffer = values;
        User.getPublicUser(values, 'requestor', admin, (responseCode, promises) => {
          Promise.all(promises).then(values => {
             listingObjWithOffer.offers = values;
            callback(responseCode, listingObjWithOffer);
          }).catch(function(err) {
            // log that I have an error, return the entire array;
            console.log('A promise failed to resolve', err);
            callback(404, err);
            return arrayOfPromises;
          });
        });
      }).catch(function(err) {
        // log that I have an error, return the entire array;
        console.log('A promise failed to resolve', err);
        callback(404, err);
        return arrayOfPromises;
      });
    });
  };

  assignedJobberProjects(uid, callback) {
    User.getMyProjects(admin, 'projects/jobber/assigned', uid, (responseCode, promises) => {
      Promise.all(promises).then(values => {
        values = values.filter(v => v !== null);
        var listingObjWithOffer = values;
        User.getPublicUser(values, 'requestor', admin, (responseCode, promises) => {
          Promise.all(promises).then(values => {
            listingObjWithOffer.offers = values;
            callback(responseCode, listingObjWithOffer);
          }).catch(function(err) {
            // log that I have an error, return the entire array;
            console.log('A promise failed to resolve', err);
            callback(404, err);
            return arrayOfPromises;
          });
        });
      }).catch(function(err) {
        // log that I have an error, return the entire array;
        console.log('A promise failed to resolve', err);
        callback(404, err);
        return arrayOfPromises;
      });
    });
  };

  myCalendarJobberProjects(uid, callback) {
    let dt = new Date();
    let date = Math.floor(dt.setDate(dt.getDate() -1))/1000;
    User.getMyProjects(admin, 'projects/jobber/assigned', uid, (responseCode, promises) => {
      Promise.all(promises).then(values => {
        values = values.filter(v => (v !== null) && v.offers && (v.jobStatus !== 'Cancelled'));
        var filteredValues = values.filter(v => { 
           return ( v.offers[0].start_date > date ||  v.offers[0].jobber_date > date)
        });
        var listingObjWithOffer = filteredValues;
        User.getMyProjects(admin, 'projects/jobber/completed', uid, (responseCode, promises) => {
          Promise.all(promises).then(values => {
            values = values.filter(v => (v !== null) && (v.complete_date > date));
            listingObjWithOffer = [...listingObjWithOffer, ...values]
            User.getPublicUser(listingObjWithOffer, 'requestor', admin, (responseCode, promises) => {
              Promise.all(promises).then(values => {
                listingObjWithOffer.offers = values;
                callback(responseCode, listingObjWithOffer);
              }).catch(function(err) {
                // log that I have an error, return the entire array;
                console.log('A promise failed to resolve', err);
                callback(404, err);
                return arrayOfPromises;
              });
            });
          }).catch(function(err) {
            // log that I have an error, return the entire array;
            console.log('A promise failed to resolve', err);
            callback(404, err);
            return arrayOfPromises;
          });
        });
      }).catch(function(err) {
        // log that I have an error, return the entire array;
        console.log('A promise failed to resolve', err);
        callback(404, err);
        return arrayOfPromises;
      });
    });
  };

  disputedJobberProjects(uid, callback) {
    User.getMyProjects(admin, 'projects/jobber/UnderDispute', uid, (responseCode, promises) => {
      Promise.all(promises).then(values => {
        values = values.filter(v => v !== null && v.jobStatus !== "open" && v.jobStatus !== "assigned" && v.jobStatus !== "requesterCompleted" && v.jobStatus !== "jobberCompleted");
        var listingObjWithOffer = values;
        User.getPublicUser(values, 'requestor', admin, (responseCode, promises) => {
          if (Object.keys(promises).length === 0) {
            callback(responseCode, values);
          } 
          else {
            Promise.all(promises).then(values => {
              listingObjWithOffer.offers = values;
              callback(responseCode, listingObjWithOffer);
            }).catch(function(err) {
              console.log('A promise failed to resolve', err);
              callback(404, err);
              return arrayOfPromises;
            });
          }
        });
      }).catch(function(err) {
        console.log('A promise failed to resolve', err);
        callback(404, err);
        return arrayOfPromises;
      });

    });
  };

  unfulfilledJobberProjects(uid, callback) {
    User.getMyProjects(admin, 'projects/jobber/unfulfilled', uid, (responseCode, promises) => {
      Promise.all(promises).then(values => {
        values = values.filter(v => v !== null);
        var listingObjWithOffer = values;
        User.getPublicUser(values, 'requestor', admin, (responseCode, promises) => {
          Promise.all(promises).then(values => {
            listingObjWithOffer.offers = values;
            callback(responseCode, listingObjWithOffer);
          }).catch(function(err) {
            // log that I have an error, return the entire array;
            console.log('A promise failed to resolve', err);
            callback(404, err);
            return arrayOfPromises;
          });
        });
      }).catch(function(err) {
        // log that I have an error, return the entire array;
        console.log('A promise failed to resolve', err);
        callback(404, err);
        return arrayOfPromises;
      });
    });
  };

  updateOpenProjects(uid, listingID, isFromJobber, callback) {
    if (isFromJobber) {
      User.updateMyProjects(admin, 'projects/jobber/open', uid, listingID, (responseCode, responseMessage) => {
        callback(responseCode, responseMessage);
      });
    } else {
      User.updateMyProjects(admin, 'projects/open', uid, listingID, (responseCode, responseMessage) => {
        callback(responseCode, responseMessage);
      });
    }
  };

  updateCompletedProjects(uid, listingID, isFromJobber, callback) {
    if (isFromJobber) {
      User.updateMyProjects(admin, 'projects/jobber/completed', uid, listingID, (responseCode, responseMessage) => {
        callback(responseCode, responseMessage);
      });
    } else {
      User.updateMyProjects(admin, 'projects/completed', uid, listingID, (responseCode, responseMessage) => {
        callback(responseCode, responseMessage);
      });
    }

  };

  updateAssignedProjects(uid, listingID, isFromJobber, callback) {
    if (isFromJobber) {
      User.updateMyProjects(admin, 'projects/jobber/assigned', uid, listingID, (responseCode, responseMessage) => {
        callback(responseCode, responseMessage);
      });
    } else {
      User.updateMyProjects(admin, 'projects/assigned', uid, listingID, (responseCode, responseMessage) => {
        callback(responseCode, responseMessage);
      });
    }
  };

  updateUnfulfilledProjects(uid, listingID, isFromJobber, callback) {
    if (isFromJobber) {
      User.updateMyProjects(admin, 'projects/jobber/unfulfilled', uid, listingID, (responseCode, responseMessage) => {
        callback(responseCode, responseMessage);
      });
    } else {
      User.updateMyProjects(admin, 'projects/unfulfilled', uid, listingID, (responseCode, responseMessage) => {
        callback(responseCode, responseMessage);
      });
    }
  };

  editUserProfile(body, userId, isFromJobber, callback) {
    if (isFromJobber) {
      var UserPublicProfile = new User.UserPublicProfile(
        body.firstName,
        body.lastName,
        body.rightForTheJob,
        body.whenImNotWorking,
        body.profile_picture,
        body.work_pictures
      );
      User.editProfile(body, userId, admin, 'jobber', (responseCode, responseMessage) => {
        callback(responseCode, responseMessage);
      });
    } else {
      User.editProfile(UserPublicProfile, userId, admin, 'requestor', (responseCode, responseMessage) => {
        callback(responseCode, responseMessage);
      });
    }
  };

  saveUserReviews(body, userId, callback) {
    User.userReviews(body.offer_id, body.listing_id, body.review, userId, admin, (responseCode, responseMessage) => {
      callback(responseCode, responseMessage);
    });
  };

  reportUser(body, uid, callback){
    User.reportUser(body.userId, body.reason, uid, admin, (responseCode, responseMessage) => {
      callback(responseCode, responseMessage);
    });
  }

  getCredicardInfo(userId, callback) {
    User.credicardInfo(admin, userId, (responseCode, data) => {
      callback(responseCode, data);
    });
  };

  deleteCredicardInfo(body, uid, callback) {
    User.deletePaymentInfoForUserToFirebase(admin, uid, body, (responseCode, responseMessage) => {
      callback(responseCode, responseMessage);
    });
  };

  devicePushtoken(body, callback){
    User.devicePushtoken(body, admin, (responseCode, responseMessage) => {
      callback(responseCode, responseMessage);
    });
  }

  updateJobStatus(callback){
    User.updateJobStatus(admin, (responseCode, responseMessage) => {
      callback(responseCode, responseMessage);
    });
  }

  deleteJoblocation(body, callback){
    User.deleteJoblocation(body, admin, (responseCode, responseMessage) => {
      callback(responseCode, responseMessage);
    });
  }

  async getUserProjects_admin(adminId, userId, projectType, callback) {
    const refDB = admin.database().ref();
    const adminInfo = (await refDB.child("users").child(adminId).once("value")).val();
    if (adminInfo.roles && adminInfo.roles.admin) {
      this.userProjects({ job_type: projectType }, userId, callback);
    } else {
      callback(403, "You are not authorized to use this API");
    }
  }

  updateUser(userId, data) {
    return User.updateUserDetails(userId, data);
  }

  userProjects(body, uid, callback) {
    User.getMyProjects(admin, body.job_type, uid, (responseCode, promises) => {
      Promise.all(promises).then(values => {
        values = values.filter(v => v !== null);
        callback(responseCode, values);
      }).catch(function(err) {
        console.log('A promise failed to resolve', err);
        callback(404, err);
      });

    });
  };

  projectDetails(body, uid, callback) {
    User.getProjectDetails(body.listing_id, body.userType, uid, admin, (responseCode, promises) => {
      if (Object.keys(promises).length === 0) {
        callback(responseCode, []);
      } else {
        Promise.all(promises).then(userData => {
          callback(responseCode, userData);
        }).catch(function(err) {
          console.log('A promise failed to resolve', err);
          callback(404, err);
        });
      }
    });
  };

  clearAcceptedDodListing(uid, callback) {
    User.clearAcceptedDodListing(uid, admin, (responseCode, responseMessage) => {
      callback(responseCode, responseMessage);
    });
  };

  saveDoorknockerCode(body, callback) {
    User.saveDoorknockerCode(body, admin, (responseCode, responseMessage) => {
      callback(responseCode, responseMessage);
    });
  }
  
  getAppVersion(callback) {
    User.getAppVersion(admin, (responseCode, data) => {
      callback(responseCode, data);
    });
  };

  requestorBookFreeQuote(body, uid, callback) {
    User.bookFreeQuote(body, uid, admin, (responseCode, responseMessage) => {
      callback(responseCode, responseMessage);
    });
  }

  getDiemJobberForAdmin(uid, callback){
    User.getDiemJobberForAdmin(admin,(responseCode, responseMessage)=>{
      callback(responseCode, responseMessage);
    })
  }

  createSubJobber(body, callback){
    User.createSubJobber(body, admin,(responseCode, responseMessage)=>{
      callback(responseCode, responseMessage);
    })
  }

  updateSubJobber(body, callback){
    User.updateSubJobber(body.subJobberId,  body, admin,(responseCode, responseMessage)=>{
      callback(responseCode, responseMessage);
    })
  }

  getStatesProvinceData(callback){
    User.getStatesProvinceData(admin,(responseCode, responseMessage)=>{
      callback(responseCode, responseMessage);
    })
  }

  updateFilterDataUser(uid, body, callback){
    User.updateFilterDataUser(uid,  body, admin,(responseCode, responseMessage)=>{
      callback(responseCode, responseMessage);
    })
  }

}

module.exports = UserController;
