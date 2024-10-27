"use strict"

var database_admin = require("firebase-admin");
var admin = require("firebase-admin");
var UploadController = require("../upload/UploadController")
const upload = new UploadController();
const _ = require('underscore');


function getJOBSmetropolitinaCity(firebase_admin,  callback) {
	let refDB = firebase_admin.database().ref();

  let cityRef = refDB.child(firebase_db_path_city);
	return cityRef.once("value").then(function(snapshot) {
	    var data = snapshot.val();
	      callback('200', data);
	     }).catch(function(err) {
	    console.log("The read failed: " + err);
	    callback('400', err);
	  });
}

function getVehicle(firebase_admin,  callback) {
  let refDB = firebase_admin.database().ref();

  let vehicleRef = refDB.child(firebase_db_path_vehicle);
  return vehicleRef.once("value").then(function(snapshot) {
      var data = snapshot.val();
        callback('200', data);
       }).catch(function(err) {
      console.log("The read failed: " + err);
      callback('400', err);
    });
}

function getJOBSgender(firebase_admin,  callback) {
  let refDB = firebase_admin.database().ref();

  let genderRef = refDB.child(firebase_db_path_gender);
  return genderRef.once("value").then(function(snapshot) {
      var data = snapshot.val();
        callback('200', data);
       }).catch(function(err) {
      console.log("The read failed: " + err);
      callback('400', err);
    });
}

function getJOBSjobberGrade(firebase_admin,  callback) {
  let refDB = firebase_admin.database().ref();

  let gradeRef = refDB.child(firebase_db_path_jobber_grade);
  return gradeRef.once("value").then(function(snapshot) {
      var data = snapshot.val();
        callback('200', data);
       }).catch(function(err) {
      console.log("The read failed: " + err);
      callback('400', err);
    });
}

function getJOBSstatus(firebase_admin,  callback) {
  let refDB = firebase_admin.database().ref();

  let statusRef = refDB.child(firebase_db_path_status);
  return statusRef.once("value").then(function(snapshot) {
      var data = snapshot.val();
        callback('200', data);
       }).catch(function(err) {
      console.log("The read failed: " + err);
      callback('400', err);
    });
}

function getJOBSactiveness(firebase_admin,  callback) {
  let refDB = firebase_admin.database().ref();

  let activeRef = refDB.child(firebase_db_path_activeness);
  return activeRef.once("value").then(function(snapshot) {
      var data = snapshot.val();
        callback('200', data);
       }).catch(function(err) {
      console.log("The read failed: " + err);
      callback('400', err);
    });
}

function getJOBSlists(firebase_admin,  callback) {
  let refDB = firebase_admin.database().ref();
  let listsRef = refDB.child(firebase_db_path_lists);
  return listsRef.once("value").then(function(snapshot) {
      var data = snapshot.val();
      let listArr = []
      let finalData ={}; 
      snapshot.forEach(function(dataSnap){
        let listArr = [];
        snapshot.child(dataSnap.key).forEach(function(listSnap){
          let listData = listSnap.val();
          listData.id = listSnap.key;
          listArr.push(listData);
        })
        finalData[dataSnap.key] = listArr
      }) 
        callback('200', finalData);
    }).catch(function(err) {
      console.log("The read failed: " + err);
      callback('400', err);
    });
}

function getJOBSreliability(firebase_admin,  callback) {
  let refDB = firebase_admin.database().ref();

  let activeRef = refDB.child(firebase_db_path_reliability);
  return activeRef.once("value").then(function(snapshot) {
      var data = snapshot.val();
        callback('200', data);
       }).catch(function(err) {
      console.log("The read failed: " + err);
      callback('400', err);
    });
}


function getJOBStestTerms(firebase_admin,  callback) {
  let refDB = firebase_admin.database().ref();
  let testRef = refDB.child(firebase_db_path_testTerms);
  return testRef.once("value").then(function(snapshot) {
      var data = snapshot.val();
        callback('200', data);
       }).catch(function(err) {
      console.log("The read failed: " + err);
      callback('400', err);
    });
}

function saveTypeOfWork(firebase_admin, body, callback){
  let refDB = firebase_admin.database().ref();
  let listRef = refDB.child('JOBSlists');
  let saveObj = {
    name : body.name,
    pay : body.pay 
  }
  console.log('body',body)
  let pushRef = listRef.child(body.category).push(saveObj , function(error){
    if(error){
        callback('400', error)
    }else{
      callback('200', "saved successfully.")
    }
  }) 
}

function saveJOBSprofile(firebase_admin, body, file, callback) {
  console.log('data', body)
  let refDB =  firebase_admin.database().ref();
  let profileRef = refDB.child(firebase_db_path_profile);
  let typeOfWork = (typeof body.typeOfWork == "string") ? body.typeOfWork.split("$") : body.typeOfWork;
  let typeOfWorkData = []
  _.each(typeOfWork, (d)=>{
    console.log('d',d)
     typeOfWorkData.push(JSON.parse(d))
  })
  typeOfWork = typeOfWorkData
  let declarations = (typeof body.declarations == "string") ? body.declarations.split(",") : body.declarations;
  let hearAboutUs = body.hearAboutUs ? body.hearAboutUs : '';
  let saveObj = {
    firstName : body.firstName,
    lastName : body.lastName ,
    fullLegalName : body.fullLegalName ,
    JOBSgender : body.JOBSgender ,
    JOBSvehicle : body.JOBSvehicle ,
    addressStreet : body.addressStreet ,
    addressCity : body.addressCity ,
    addressProvince : body.addressProvince ,
    contactEmail : body.contactEmail ,
    contactPhone : body.contactPhone ,
    metropolitanCity : body.metropolitanCity,
    declarations : declarations,
    dateAdded : body.dateAdded,
    JOBSjobberGrade : "undefined" ,
    JOBSactiveness : "undefined" ,
    JOBSreliability : "undefined" ,
    aboutYourself: body.aboutYourself ,
    typeOfWork : typeOfWork,
    JOBSstatus : "Inactive",
    JOBSjobsCompleted : "0" ,
    JOBSjobsCancelled : "0",
    JOBSjobsDispute: "0",
    hearAboutUs: hearAboutUs
  } 
  body.bussinessName  && (saveObj.bussinessName = body.bussinessName) ;
  body.bussinessNumber  && (saveObj.bussinessNumber = body.bussinessNumber) ;
  body.country  && (saveObj.country = body.country) ;
  console.log('saveObj in create profile',saveObj)
    admin.auth().createUser({
        email: body.contactEmail,
        emailVerified: false,
        password: body.password,
        displayName: body.displayName,
        disabled: false,
      })
      .then(function(userRecord) {
        // See the UserRecord reference doc for the contents of userRecord.
     
        console.log("Successfully created new user:", userRecord);

        return userRecord;
      }).then(function(userRecord){

        let obj = {
          [userRecord.uid]: saveObj
        };

        profileRef.update(obj, function(error){
          if(error){
            callback('400', error)
          }else{
            if(file && file.profile_picture !== undefined && file.id_pictures !== undefined){
              let images ={}
              upload.uploadImageToStorage(file.profile_picture, userRecord.uid, '/JOBS/profile').then((profile_image) => {
                  console.log('profle_image',profile_image)
                  images.profile_picture = profile_image;
                  upload.uploadImageToStorageProfileWork(file.id_pictures, userRecord.uid, '/JOBS/id_pictures').then((id_image) => {
                    images.id_pictures = id_image;
                    console.log('id_image',id_image)
                    profileRef.child(userRecord.uid).update(images, function(error) {
                      if(error){
                        callback('400', error)
                      }else{
                        callback('200', {"message":"JOBS Profile created successfully..","user":userRecord, "profile_image":profile_image})
                      }
                    })
                  }).catch((error) => {
                    callback('400', error);
                })
              }).catch((error) => {
                  callback('400', error)
              });
            }else{
              callback('200', {"message":"JOBS Profile created successfully.","user":userRecord})
            }
          }
        })
      }).catch(function(error) {
        console.log("Error creating new user:", error);
        callback('403', error)
      });
}


function getAllJOBSprofileData(firebase_admin, body, callback){
  console.log('body',body)
  let tabValue = body.tabValue;
  let refDB = firebase_admin.database().ref();
  let profileRef = refDB.child(firebase_db_path_profile);

  (body.tabValue == "Inactive") && (profileRef = profileRef.orderByChild("JOBSstatus").equalTo(body.tabValue));
  (body.tabValue == "Active") && (profileRef = profileRef.orderByChild("JOBSstatus").equalTo(body.tabValue));

  return profileRef.once("value").then(function(snapshot) {
      let data = snapshot.val();
      let listArr = [];
      snapshot.forEach(function(dataSnap){
          let listData = dataSnap.val();
          listData.id = dataSnap.key;
          listArr.push(listData);
          if(listData && listData.internal_notes){
            var notesArray = new Array();
            let notes = listData.internal_notes
            for (var notesKey in notes) {
              var notesVal = notes[notesKey];
              notesVal.id = notesKey;
              notesArray.push(notesVal);
            };
            listData.internal_notes = notesArray
          }
      }) 
        callback('200', listArr);
       }).catch(function(err) {
      console.log("The read failed: " + err);
      callback('400', err);
    });
}


function getFromFirebase(firebase_admin, callback) {
    var refDB = firebase_admin.database().ref();
    var categoryRef = refDB.child('category').orderByChild('priority');
    var obj = new Array();
    var promises = new Array();
    categoryRef.once("value")
      .then(function(data) {
        data.forEach(function(childData) {
          var Cat = childData.val();
          var Key = childData.key;
          if (Cat.isActive === true && Cat.sub_categories) {
            for (let id in Cat.sub_categories) {
              promises.push(getFromSubCategoryFirebaseById(firebase_admin, id));
            }
            obj.push({
              id: Key,
              value: Cat
            });
          }
        });
        callback('200', promises, obj);
      }).catch((error) => {
        callback('400', error, obj);
        console.log(error);
      });
  }

  function getFromSubCategoryFirebaseById(firebase_admin, subcategory_id) {
  var refDB = firebase_admin.database().ref();
  var categoryRef = refDB.child('sub_category');
  return categoryRef.child(subcategory_id).once("value")
    .then(function(data) {
      var subcat = data.val();
          delete subcat.defaultExpectations
          delete subcat.superCategory_Id
          delete subcat.superCategory_Name
          delete subcat.image
          delete subcat.description
          subcat.id = data.key
          return subcat;
    }).catch(function(error) {
      console.log(error.message);
      return;
    });
}

function editJOBSuserProfile(body, user_id, firebase_admin, callback){
  console.log('data', body, user_id)
  let refDB = firebase_admin.database().ref();
  let userRef = refDB.child('users').child(user_id).child('meta')
  let profileRef =  refDB.child(firebase_db_path_profile)

  let updateObj = {};
  profileRef.child(user_id).once('value').then(function(snapshot){
    let userData = snapshot.val();
    let id_pictures;
    let typeOfWork;
    if(userData && userData.id_pictures && body.id_pictures){
      id_pictures = [...userData.id_pictures, ...body.id_pictures]
    }else{
      id_pictures = body.id_pictures
    }
    typeOfWork = (typeof body.typeOfWork == "string") ? body.typeOfWork.split("$") : body.typeOfWork;
    let typeOfWorkData = []
    _.each(typeOfWork, (d)=>{
      console.log('d',d)
       typeOfWorkData.push(JSON.parse(d))
    })
    typeOfWork = typeOfWorkData
    body.JOBSstatus  && (updateObj.JOBSstatus = body.JOBSstatus)
    body.JOBSreliability && (updateObj.JOBSreliability = body.JOBSreliability)
    body.JOBSjobberGrade && (updateObj.JOBSjobberGrade = body.JOBSjobberGrade)
    body.JOBSactiveness && (updateObj.JOBSactiveness = body.JOBSactiveness)
    body.JOBSvehicle && (updateObj.JOBSvehicle = body.JOBSvehicle)
    body.JOBSgender && (updateObj.JOBSgender = body.JOBSgender)
    body.metropolitanCity && (updateObj.metropolitanCity = body.metropolitanCity)
    body.profile_picture && (updateObj.profile_picture = body.profile_picture )
    body.id_pictures && (updateObj.id_pictures = id_pictures)
    body.typeOfWork && (updateObj.typeOfWork = typeOfWork)
    body.JOBSjobsDispute && (updateObj.JOBSjobsDispute = body.JOBSjobsDispute)
    body.JOBSjobsCancelled && (updateObj.JOBSjobsCancelled = body.JOBSjobsCancelled)
    body.addressCity && (updateObj.addressCity = body.addressCity)
    body.addressProvince && (updateObj.addressProvince = body.addressProvince)
    body.addressStreet && (updateObj.addressStreet = body.addressStreet)
    body.bussinessName && (updateObj.bussinessName = body.bussinessName)
    body.bussinessNumber && (updateObj.bussinessNumber = body.bussinessNumber)
    body.contactPhone && (updateObj.contactPhone = body.contactPhone)
    body.aboutYourself && (updateObj.aboutYourself = body.aboutYourself)
    body.hearAboutUs && (updateObj.hearAboutUs = body.hearAboutUs)
    body.firstName && (updateObj.firstName = body.firstName)
    body.lastName && (updateObj.lastName = body.lastName)
    body.fullLegalName && (updateObj.fullLegalName = body.fullLegalName)
    body.country && (updateObj.country = body.country)
    console.log('updateObj', updateObj )
    let pushRef = profileRef.child(user_id).update(updateObj ,function(error){
      if(error){
        callback('400', error)
      }else{
        if(body.profile_picture){
          console.log('innnnnn')
            userRef.update({"pictureURL":body.profile_picture}, function(error){
              if(error){
                callback('400', error)
              }else{
                callback('200', {"message":'User updated successfully.', "data":updateObj})
              }
            })
        }else{
          callback('200', {"message":'User updated successfully.', "data":updateObj})
        }
      }
    })
  }).catch((error) => {
    callback('400', error);
    console.log(error);
  });
}

function getJOBSuserById(body, firebase_admin, callback){
  console.log('body', body.id)
  let userId = body.id;
  console.log('userId'.userId)
  let refDB =  firebase_admin.database().ref();
  let userRef = refDB.child(firebase_db_path_profile).child(userId)

  userRef.once('value').then(function(snapShot){
    let data = snapShot.val();
    if(data && data.internal_notes){
      var notesArray = new Array();
      let notes = data.internal_notes
      for (var notesKey in notes) {
        var notesVal = notes[notesKey];
        notesVal.id = notesKey;
        notesArray.push(notesVal);
      };
      data.internal_notes = notesArray
    }
    data.id = snapShot.key
    callback('200', data)
  }).catch(function(error){
      console.log(error.message)
      callback('400', error.message)
  })
}


function addInternalNotesJOBS(body, firebase_admin, callback){
  let userId =  body.userId
  const refDB = database_admin.database().ref();
  const profileRef = refDB.child(firebase_db_path_profile).child(userId).child('internal_notes');
  let addData = {
    text: body.text,
    addedAt: body.date
  }
  let pushRef =  profileRef.push(addData, function(error) {
    if (error) {
      console.log(error);
      callback('500', error);
    } else {
      addData.key = pushRef.key;
      callback('200', {"message": "Internal Notes Added successfully.", "data":addData})
    }
  }).catch(function(error){
      console.log(error.message)
      callback('400', error.message)
  })
}

function editInternalNotesJOBS(body, firebase_admin, callback){
  console.log('body', body)
  let userId =  body.userId
  let notesId = body.notesId
  const refDB = database_admin.database().ref();
  const profileRef = refDB.child(firebase_db_path_profile).child(userId).child('internal_notes').child(notesId);
  profileRef.update({"text":body.text}, function(error) {
    if (error) {
      console.log(error);
      callback('500', error);
    } else {
      callback('200', {"message": "Internal Notes Added successfully.", "data":{"text":body.text, "id":notesId}})
    }
  }).catch(function(error){
      console.log(error.message)
      callback('400', error.message)
  })
}


function removeInternalNotesJOBS(body, firebase_admin, callback){
  let notesId = body.notesId;
  let userId =  body.userId;
  const refDB = database_admin.database().ref();
  const profileRef = refDB.child(firebase_db_path_profile).child(userId).child('internal_notes');
  profileRef.child(notesId).remove().then(function(error) {
  if (error) {
      console.log(error);
      callback('400', error)
    } else {
      console.log("Internal Notes removed Successfully.");
      callback('200', {"message": "Internal Notes removed Successfully."})
    }
  }).catch(function(error){
      console.log(error.message)
      callback('400', error.message)
  });
}

function removeIdImage(body, firebase_admin, callback) {
  console.log('body', body)
  let userId = body.userId;
  let fileName = body.fileName;

  const refDB = database_admin.database().ref();
  const profileRef = refDB.child(firebase_db_path_profile).child(userId);

  profileRef.once('value').then(function(snapShot){
    let userData =  snapShot.val();
    let imageData  = userData.id_pictures.filter(v => v !== null && v.filename != fileName);
    profileRef.update({"id_pictures":imageData}, function(error) {
    if (error) {
      console.log(error);
      callback('500', error);
    } else {
      callback('200',  {"message": "Image removed Successfully."})
    }
  }).catch(function(error){
      console.log(error.message)
      callback('400', error.message)
  })
  })

}


var JOBSystem = {
  getJOBSmetropolitinaCity,
  getVehicle,
  getJOBSgender,
  getJOBSjobberGrade,
  getJOBSstatus,
  getJOBSactiveness,
  saveJOBSprofile,
  getJOBSlists,
  getJOBStestTerms,
  saveTypeOfWork,
  getAllJOBSprofileData,
  getFromFirebase,
  getJOBSuserById,
  editJOBSuserProfile,
  getJOBSreliability,
  addInternalNotesJOBS,
  removeInternalNotesJOBS,
  editInternalNotesJOBS,
  removeIdImage
};
module.exports = JOBSystem;

const firebase_db_path_city = 'JOBSmetropolitanCity';
const firebase_db_path_vehicle = 'JOBSvehicle';
const firebase_db_path_gender = 'JOBSgender';
const firebase_db_path_jobber_grade = 'JOBSjobberGrade';
const firebase_db_path_status = 'JOBSstatus';
const firebase_db_path_activeness = 'JOBSactiveness';
const firebase_db_path_profile = 'JOBSprofile';
const firebase_db_path_lists = 'JOBSlists';
const firebase_db_path_testTerms = 'JOBStestTerms';
const firebase_db_path_reliability = 'JOBSreliability';