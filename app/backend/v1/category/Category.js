var UploadController = require("../upload/UploadController");
const upload = new UploadController();
const _ = require("underscore");

class Category {
  constructor(
    name,
    image,
    description,
    superCategory_Name,
    superCategory_Id,
    isGeneral,
    hasSubCategories,
    isActive,
    DOD,
    timelimit,
    price,
    dodBookingData,
    dodJobDay,
    dodJobExtraTime,
    defaultExpectations
  ) {
    this.name = name;
    this.image = image;
    this.description = description;
    this.superCategory_Name = superCategory_Name;
    this.superCategory_Id = superCategory_Id;
    this.isGeneral = isGeneral;
    this.hasSubCategories = hasSubCategories;
    this.isActive = isActive;
    this.DOD = DOD;
    this.timelimit = timelimit;
    this.price = price;
    this.dodBookingData = dodBookingData;
    this.dodJobDay = dodJobDay;
    this.dodJobExtraTime = dodJobExtraTime;
    this.defaultExpectations = defaultExpectations;
  }
  saveToFirebase(firebase_admin, file, callback) {
    var refDB = firebase_admin.database().ref();
    var categoryRef = refDB.child(firebase_db_path);
    var pushRef = categoryRef.push(
      {
        name: this.name,
        image: this.image,
        description: this.description,
        superCategory_Name: this.superCategory_Name,
        superCategory_Id: this.superCategory_Id,
        isGeneral: this.isGeneral,
        hasSubCategories: this.hasSubCategories,
        isActive: this.isActive,
      },
      function (error) {
        if (error) {
          console.log(
            "Category could not be created. Data could not be saved." + error
          );
          callback("500", error);
        } else {
          console.log("Category created and Data saved successfully.");
          console.log(Object.keys(file).length);
          upload
            .uploadImageToStorageCategory(file, pushRef.key)
            .then((success) => {
              console.log(success[0].imageurl);
              var updateRef = refDB.child(firebase_db_path + "/" + pushRef.key);
              var updateRef = updateRef.update(
                {
                  image: success[0].imageurl,
                },
                function (error) {
                  if (error) {
                    console.log(
                      "Category could not be created. Data could not be saved." +
                        error
                    );
                    callback("500", error);
                  } else {
                    callback(
                      "200",
                      "Category" +
                        " " +
                        "created and Data saved successfully. The id for the Category is: " +
                        pushRef.key,
                      pushRef.key
                    );
                  }
                }
              );
            })
            .catch((error) => {
              callback("400", error, pushRef.key);
              console.log(error);
            });
        }
      }
    );
  }
  static saveHelpCenterToFireBase(data, firebase_admin, file, callback) {
    const refDB = firebase_admin.database().ref();
    const helpCenter_key = data.helpCenterType;
    delete data.key;
    // helpCenter_key contains jobber/requestor key
    const helpCenterRef = refDB.child(`helpCenter/${helpCenter_key}`);
    // There can be more than one helpCenter objects.. So we will use push
    const pushRef = helpCenterRef.push(data, function (error) {
      if (error) {
        console.log("Help Center Data Not Saved: ", error);
        callback("500", error);
      } else {
        console.log("Help Center Ready.. Data Saved Successfully");
        upload //Here we pass the key of pushRef to update it later with image
          .uploadImageToStorageHelpCenter(file, pushRef.key)
          .then((success) => {
            var updateRef = refDB.child(
              `helpCenter/${helpCenter_key}` + "/" + pushRef.key
            ); //Here update pushRef ID with image URL
            var updateRef = updateRef.update(
              {
                helpCenterImage: success[0].imageurl,
              },
              function (error) {
                if (error) {
                  console.log("Help Center Could Not Be Created" + error);
                  callback("500", error);
                } else {
                  callback("200", { helpCenterID: pushRef.key });
                }
              }
            );
          })
          .catch((error) => {
            callback("400", error);
            console.log(error);
          });
      }
    });
  }
  static getHelpCenterFromFireBase(helpCenter_key, firebase_admin, callback) {
    var refDB = firebase_admin.database().ref(); //DB ref
    var helpCenterRef = refDB.child(`helpCenter/${helpCenter_key}`); //helpCenter ref in database
    return helpCenterRef
      .once("value") //gets value just one time.
      .then(function (data) {
        if (data.exists()) {
          var hcArray = new Array();
          data.forEach((obj) => {
            let hcObj = obj.val();
            hcObj.id = obj.key;
            hcArray.push(hcObj);
          });
          callback("200", { helpCenter: hcArray });
        } else {
          callback("200", { helpCenter: [] });
        }
      })
      .catch(function (error) {
        callback("500", error);
      });
  }
  saveSubCategoriesToFirebase(firebase_admin, file, callback) {
    var refDB = firebase_admin.database().ref();
    var categoryRef = refDB.child(firebase_db_path_subcategory);
    var subCategoryObj;
    if (this.DOD === "true") {
      subCategoryObj = {
        name: this.name,
        image: this.image,
        description: this.description,
        superCategory_Name: this.superCategory_Name,
        superCategory_Id: this.superCategory_Id,
        isGeneral: this.isGeneral,
        hasSubCategories: this.hasSubCategories,
        isActive: this.isActive,
        DOD: this.DOD,
        timelimit: this.timelimit,
        price: this.price,
        dodBookingData: this.dodBookingData,
        dodJobDay: this.dodJobDay,
        dodJobExtraTime: this.dodJobExtraTime,
        expectations: this.expectations,
      };
    } else {
      subCategoryObj = {
        name: this.name,
        image: this.image,
        description: this.description,
        superCategory_Name: this.superCategory_Name,
        superCategory_Id: this.superCategory_Id,
        isGeneral: this.isGeneral,
        hasSubCategories: this.hasSubCategories,
        isActive: this.isActive,
      };
    }
    var pushRef = categoryRef.push(subCategoryObj, function (error) {
      if (error) {
        console.log(
          "Category could not be created. Data could not be saved." + error
        );
        callback("500", error);
      } else {
        console.log("Category created and Data saved successfully.");
        console.log(Object.keys(file).length);
        upload
          .uploadImageToStorageCategory(file, pushRef.key)
          .then((success) => {
            var updateSubImageRef = refDB.child(
              firebase_db_path_subcategory + "/" + pushRef.key
            );
            var updateRef = updateSubImageRef.update(
              {
                image: success[0].imageurl,
              },
              function (error) {
                if (error) {
                  console.log(
                    "Category could not be created. Data could not be saved." +
                      error
                  );
                  callback("500", error);
                } else {
                  updateSubImageRef.once("value").then(function (data) {
                    console.log(data.val().superCategory_Id);
                    var t = pushRef.key;
                    var updateCategoryRef = refDB.child(
                      firebase_db_path + "/" + data.val().superCategory_Id
                    );
                    var updatedCategory = updateCategoryRef
                      .child("sub_categories")
                      .child(pushRef.key)
                      .set(pushRef.key, function (error) {
                        if (error) {
                          console.log(
                            "Category could not be created. Data could not be saved." +
                              error
                          );
                          callback("500", error);
                        } else {
                          console.log(updateRef);
                          callback(
                            "200",
                            "Category created and Data saved successfully.",
                            pushRef.key
                          );
                        }
                      });
                  });
                }
              }
            );
          })
          .catch((error) => {
            callback("400", error, pushRef.key);
            console.log(error);
          });
      }
    });
  }
  updateSubCategoriesToFirebase(
    firebase_admin,
    subcategory_id,
    file,
    callback
  ) {
    var refDB = firebase_admin.database().ref();
    var categoryRef = refDB
      .child(firebase_db_path_subcategory)
      .child(subcategory_id);
    var catObj = {
      name: this.name,
      image: this.image,
      description: this.description,
      superCategory_Name: this.superCategory_Name,
      superCategory_Id: this.superCategory_Id,
      isGeneral: this.isGeneral,
      hasSubCategories: this.hasSubCategories,
      isActive: this.isActive,
      dodBookingData: this.dodBookingData,
      dodJobDay: this.dodJobDay,
      dodJobExtraTime: this.dodJobExtraTime,
      defaultExpectations: this.defaultExpectations,
    };
    getFromSubCategoryFirebaseById(firebase_admin, subcategory_id)
      .then(function (data) {
        Object.keys(catObj).forEach(function (key, index) {
          // key: the name of the object key
          // index: the ordinal position of the key within the object
          if (catObj[key] === null || catObj[key] === undefined) {
            console.log("This should be null: " + key);
            catObj[key] = data[key];
          }
        });
        var pushRef = categoryRef.update(
          {
            name: catObj.name,
            image: catObj.image,
            description: catObj.description,
            superCategory_Name: catObj.superCategory_Name,
            superCategory_Id: catObj.superCategory_Id,
            isGeneral: catObj.isGeneral,
            hasSubCategories: catObj.hasSubCategories,
            isActive: catObj.isActive,
            dodBookingData: catObj.dodBookingData
              ? catObj.dodBookingData
              : null,
            dodJobDay: catObj.dodJobDay ? catObj.dodJobDay : null,
            dodJobExtraTime: catObj.dodJobExtraTime
              ? catObj.dodJobExtraTime
              : null,
            defaultExpectations: catObj.defaultExpectations
              ? catObj.defaultExpectations
              : null,
          },
          function (error) {
            if (error) {
              console.log(
                "Category could not be created. Data could not be saved." +
                  error
              );
              callback("500", error);
            } else {
              console.log("Category created and Data saved successfully.");
              console.log(Object.keys(file).length);
              if (Object.keys(file).length > 0) {
                upload
                  .uploadImageToStorageSubCategory(file, subcategory_id)
                  .then((success) => {
                    let updateObj = {};
                    _.each(success, (url) => {
                      if (url.key == "image") updateObj.image = url.imageurl;
                      if (url.key == "highlightImage")
                        updateObj["defaultExpectations/highlightImage"] =
                          url.imageurl;
                      if (url.key == "includedImage")
                        updateObj["defaultExpectations/includedImage"] =
                          url.imageurl;
                      if (url.key == "notIncludedImage")
                        updateObj["defaultExpectations/notIncludedImage"] =
                          url.imageurl;
                      if (url.key == "expectFromUsImage")
                        updateObj["defaultExpectations/expectFromUsImage"] =
                          url.imageurl;
                      if (url.key == "expectFromYouImage")
                        updateObj["defaultExpectations/expectFromYouImage"] =
                          url.imageurl;
                    });
                    var updateSubImageRef = refDB.child(
                      firebase_db_path_subcategory + "/" + subcategory_id
                    );
                    var updateRef = updateSubImageRef.update(
                      updateObj,
                      function (error) {
                        if (error) {
                          console.log(
                            "Category could not be created. Data could not be saved." +
                              error
                          );
                          callback("500", error);
                        } else {
                          updateSubImageRef.once("value").then(function (data) {
                            console.log(data.val().superCategory_Id);
                            var t = subcategory_id;
                            var updateCategoryRef = refDB.child(
                              firebase_db_path +
                                "/" +
                                data.val().superCategory_Id
                            );
                            var updatedCategory = updateCategoryRef
                              .child("sub_categories")
                              .child(subcategory_id)
                              .set(subcategory_id, function (error) {
                                if (error) {
                                  console.log(
                                    "SubCategory could not be updated. Data could not be saved." +
                                      error
                                  );
                                  callback("500", error);
                                } else {
                                  console.log(updateRef);
                                  callback(
                                    "200",
                                    "SubCategory Data with images updated successfully!."
                                  );
                                }
                              });
                          });
                        }
                      }
                    );
                  })
                  .catch((error) => {
                    callback("400", error, pushRef.key);
                    console.log(error);
                  });
              } else {
                var updateSubImageref = refDB.child(
                  firebase_db_path_subcategory + "/" + subcategory_id
                );
                updateSubImageref.once("value").then(function (data) {
                  var updateCategoryRef = refDB.child(
                    firebase_db_path + "/" + data.val().superCategory_Id
                  );
                  updateCategoryRef
                    .child("sub_categories")
                    .child(subcategory_id)
                    .set(subcategory_id, function (error) {
                      if (error) {
                        console.log(
                          "SubCategory could not be updated. Data could not be saved." +
                            error
                        );
                        callback("500", error);
                      } else {
                        console.log("imgae not updated!");
                        callback(
                          "200",
                          "SubCategory Data updated successfully!"
                        );
                      }
                    });
                });
              }
            }
          }
        );
      })
      .catch((error) => {
        callback("400", error);
        console.log(error);
      });
  }

  static getFromFirebase(firebase_admin, callback) {
    var refDB = firebase_admin.database().ref();
    var categoryRef = refDB.child(firebase_db_path).orderByChild("priority");
    var obj = new Array();
    var promises = new Array();
    categoryRef
      .once("value")
      .then(function (data) {
        data.forEach(function (childData) {
          var Cat = childData.val();
          var Key = childData.key;
          if (Cat.isActive === true && Cat.sub_categories) {
            for (let id in Cat.sub_categories) {
              promises.push(getFromSubCategoryFirebaseById(firebase_admin, id));
            }
            obj.push({
              id: Key,
              value: Cat,
            });
          }
        });
        callback("200", promises, obj);
      })
      .catch((error) => {
        callback("400", error, obj);
        console.log(error);
      });
  }

  updateCategoryFirebaseById(firebase_admin, category_id, file, callback) {
    var refDB = firebase_admin.database().ref();
    upload
      .uploadImageToStorageCategory(file, category_id)
      .then((success) => {
        var updateSubImageRef = refDB.child(
          firebase_db_path + "/" + category_id
        );
        var updateRef = updateSubImageRef.update(
          {
            image: success[0].imageurl,
          },
          function (error) {
            if (error) {
              console.log(
                "Category could not be updated. Data could not be saved." +
                  error
              );
              callback("500", error);
            } else {
              callback(
                "200",
                "Category Data with images updated successfully!."
              );
            }
          }
        );
      })
      .catch((error) => {
        callback("400", error);
        console.log(error);
      });
  }

  static createDodPackege(data, firebase_admin, file, callback) {
    let subCategoryId = data.subCategoryId;
    var refDB = firebase_admin.database().ref();
    var dodPackageref = refDB
      .child(firebase_db_path_dod_package)
      .child(subCategoryId);
    delete data.subCategoryId;
    var pushRef = dodPackageref.push(data, function (error) {
      if (error) {
        console.log("error while creating dod Package", error);
        callback("400", error);
      } else {
        if (Object.keys(file).length > 0) {
          dodImageUplaod(
            firebase_admin,
            file,
            subCategoryId,
            pushRef.key,
            (status, code) => {
              callback(status, code);
            }
          );
        } else {
          callback("200", "Package created successfully.");
        }
      }
    });
  }

  static updateDodPackage(data, firebase_admin, file, callback) {
    let subCategoryId = data.subCategoryId;
    let dodPackageId = data.dodPackageId;
    var refDB = firebase_admin.database().ref();
    var dodpackageRef = refDB
      .child(firebase_db_path_dod_package)
      .child(subCategoryId)
      .child(data.dodPackageId);
    delete data.dodPackageId;
    delete data.subCategoryId;
    let updateObj = {};
    if (data.description) updateObj.description = data.description;
    if (updateObj.name) updateObj.name = data.name;
    if (updateObj.price) updateObj.price = data.price;
    if (data.expectations.highlightText)
      updateObj["expectations/highlightText"] = data.expectations.highlightText;
    if (data.expectations.includedText)
      updateObj["expectations/includedText"] = data.expectations.includedText;
    if (data.expectations.notIncludedText)
      updateObj["expectations/notIncludedText"] =
        data.expectations.notIncludedText;
    if (data.expectations.expectFromUsText)
      updateObj["expectations/expectFromUsText"] =
        data.expectations.expectFromUsText;
    if (data.expectations.expectFromYouText)
      updateObj["expectations/expectFromYouText"] =
        data.expectations.expectFromYouText;

    dodpackageRef.update(updateObj, function (error) {
      if (error) {
        console.log("error while updating package", error);
        callback("400", error);
      } else {
        if (Object.keys(file).length > 0) {
          dodImageUplaod(
            firebase_admin,
            file,
            subCategoryId,
            dodPackageId,
            (status, code) => {
              callback(status, code);
            }
          );
        } else {
          callback("200", "Package updated successfully.");
        }
      }
    });
  }

  static getFromSubCategoryFirebase(firebase_admin, callback) {
    var refDB = firebase_admin.database().ref();
    var categoryRef = refDB.child(firebase_db_path_subcategory);
    var obj = new Array();
    return categoryRef
      .orderByChild("priority")
      .once("value")
      .then(function (data) {
        data.forEach(function (childData) {
          var Cat = childData.val();
          var Key = childData.key;
          if (Cat.isActive === true) {
            obj.push({
              id: Key,
              value: Cat,
            });
          }
        });
        return obj;
      });
  }

  static getSubCategoryById(firebase_admin, subcategory_id) {
    var refDB = firebase_admin.database().ref();
    var categoryRef = refDB.child(firebase_db_path_subcategory);
    return categoryRef
      .child(subcategory_id)
      .once("value")
      .then(function (data) {
        var subcat = data.val();
        subcat.id = data.key;
        return subcat;
      })
      .catch(function (error) {
        console.log(error.message);
        return;
      });
  }

  static uploadBanner(body, firebase_admin, file, callback) {
    var refDB = firebase_admin.database().ref();
    var updatePackageImageRef = refDB.child(firebase_db_path_promotion);

    upload
      .uploadPromoImageToStorage(file)
      .then((success) => {
        let updateObj = {
          promoBannerImage: success[0].url,
        };
        console.log("updateObj", updateObj);
        updatePackageImageRef.update(updateObj, function (error) {
          if (error) {
            console.log("Banner image could not be uploaded." + error);
            callback("500", error);
          } else {
            console.log("Banner Image updated successfully!.");
            callback("200", "Banner Image updated successfully!");
          }
        });
      })
      .catch((error) => {
        callback("400", error);
        console.log(error);
      });
  }

  static getPromoData(firebase_admin, callback) {
    var refDB = firebase_admin.database().ref();
    var promoRef = refDB.child(firebase_db_path_promotion);
    return promoRef
      .once("value")
      .then(function (data) {
        callback("200", data.val());
      })
      .catch(function (error) {
        console.log(error.message);
        callback("400", error);
      });
  }

  static saveHeroImageJA(body, firebase_admin, file, callback) {
    let refDB = firebase_admin.database().ref();
    let JaHeroImageRef = refDB.child(firebase_db_path_JA_heroImage);

    upload
      .uploadHeroImageToStorage(file)
      .then((success) => {
        console.log("success", success);
        let updateObj = {
          heroImage: success[0].url,
        };
        if (body.promoUrl && body.promoUrl != null) {
          updateObj.promoUrl = body.promoUrl;
        }
        console.log("updateObj", updateObj);
        JaHeroImageRef.update(updateObj, function (error) {
          if (error) {
            console.log("Hero image could not be uploaded." + error);
            callback("500", error);
          } else {
            console.log("Hero Image updated successfully!.");
            callback("200", {
              message: "Hero Image updated successfully!",
              data: updateObj,
            });
          }
        });
      })
      .catch((error) => {
        callback("400", error);
        console.log(error);
      });
  }

  static getHeroImageData(firebase_admin, callback) {
    var refDB = firebase_admin.database().ref();
    var heroRef = refDB.child(firebase_db_path_JA_heroImage);
    return heroRef
      .once("value")
      .then(function (data) {
        if (data.exists()) {
          callback("200", data.val());
        } else {
          callback("200", { message: "Hero Image not found." });
        }
      })
      .catch(function (error) {
        console.log(error.message);
        callback("400", error);
      });
  }
}

function getFromSubCategoryFirebaseById(firebase_admin, subcategory_id) {
  var refDB = firebase_admin.database().ref();
  var categoryRef = refDB.child(firebase_db_path_subcategory);
  return categoryRef
    .child(subcategory_id)
    .once("value")
    .then(function (data) {
      var subcat = data.val();
      if (subcat.DOD == "true" && data.key) {
        subcat.id = data.key;
        return getSubCatDodPackage(firebase_admin, data.key, subcat);
      } else {
        subcat.id = data.key;
        return subcat;
      }
    })
    .catch(function (error) {
      console.log(error.message);
      return;
    });
}

function getSubCatDodPackage(admin, subCatId, subCatdata) {
  var refDB = admin.database().ref();
  var dodPackageRef = refDB.child(firebase_db_path_dod_package).child(subCatId);
  let extServData;
  return dodPackageRef
    .once("value")
    .then(function (snapshot) {
      return refDB
        .child("service_extension")
        .child(subCatId)
        .once("value")
        .then(function (extServSanp) {
          if (extServSanp.exists()) {
            extServData = extServSanp.val().service
              ? extServSanp.val().service[0]
              : {};
          }
          if (snapshot.exists()) {
            var returnArray = new Array();
            snapshot.forEach(function (childData) {
              var dodPackage = childData.val();
              dodPackage.id = childData.key;
              returnArray.push(dodPackage);
            });
            subCatdata["extensionService"] = extServData;
            subCatdata["dodBookingData"] = returnArray;
            return subCatdata;
          } else {
            subCatdata["extensionService"] = extServData;
            return subCatdata;
          }
        });
    })
    .catch((error) => {
      console.log(error);
      return "400", error;
    });
}

function dodImageUplaod(
  firebase_admin,
  file,
  subCategoryId,
  packageId,
  callback
) {
  var refDB = firebase_admin.database().ref();
  upload
    .storeImageDodPackage(file, subCategoryId, packageId)
    .then((success) => {
      let updateObj = {};
      _.each(success, (url) => {
        if (url.key == "highlightImage")
          updateObj["expectations/highlightImage"] = url.imageurl;
        if (url.key == "includedImage")
          updateObj["expectations/includedImage"] = url.imageurl;
        if (url.key == "notIncludedImage")
          updateObj["expectations/notIncludedImage"] = url.imageurl;
        if (url.key == "expectFromUsImage")
          updateObj["expectations/expectFromUsImage"] = url.imageurl;
        if (url.key == "expectFromYouImage")
          updateObj["expectations/expectFromYouImage"] = url.imageurl;
      });
      var updatePackageImageRef = refDB.child(
        firebase_db_path_dod_package + "/" + subCategoryId + "/" + packageId
      );
      var updateRef = updatePackageImageRef.update(updateObj, function (error) {
        if (error) {
          console.log(
            "Package could not be created/updated. Data could not be saved." +
              error
          );
          callback("500", error);
        } else {
          console.log("SubCategory Data with images updated successfully!.");
          callback(
            "200",
            "SubCategory Data with images updated successfully!."
          );
        }
      });
    })
    .catch((error) => {
      callback("400", error);
      console.log(error);
    });
}

const firebase_db_path = "category";
const firebase_db_path_subcategory = "sub_category";
const firebase_db_path_dod_package = "dod_package";
const firebase_db_path_promotion = "promotion";
const firebase_db_path_JA_heroImage = "JA_heroImage";

var CategoryExport = {
  Category,
  getFromSubCategoryFirebaseById,
};
module.exports = Category;
