// var firebase = require("firebase");
var admin = require("firebase-admin");
var User = require("../user/User");
var Category = require("../category/Category");
var _ = require("underscore");

class CategoryController {
  /**
   * Retrive all the categories
   * @param  {[type]}   body     [fbObject, device_token]
   * @param  {[type]}   uri      [description]
   * @param  {Function} callback [description]
   * @return {[type]}            [description]
   */
  getAllCategories(callback) {
    Category.getFromFirebase(admin, (responseCode, promises, obj) => {
      if (responseCode === "200") {
        Promise.all(promises)
          .then((values) => {
            for (var item in obj) {
              var sub_categoriesArray = new Array();
              for (var subItem of Object.keys(obj[item].value.sub_categories)) {
                var subobj = _.filter(values, function (x) {
                  return x.id == subItem && x.isActive == true;
                });
                if (subobj[0] != null) {
                  sub_categoriesArray.push(subobj[0]);
                }
              }
              obj[item].sub_categories = sub_categoriesArray;
            }
            callback("200", obj);
          })
          .catch(function (err) {
            // log that I have an error, return the entire array;
            console.log("A promise failed to resolve", err);
            callback(404, err);
          });
      } else {
        callback(responseCode, promises);
      }
    });
  }

  /**
   * Retrive all the categories
   * @param  {[type]}   body     [fbObject, device_token]
   * @param  {[type]}   uri      [description]
   * @param  {Function} callback [description]
   * @return {[type]}            [description]
   */
  getAllSubCategories(callback) {
    var gettingCategories = Category.getFromSubCategoryFirebase(admin);
    gettingCategories
      .then(function (data) {
        callback("200", data);
      })
      .catch(function (error) {
        console.log(error.message);
      });
  }

  /**
   * Create category
   * We will restrict this for admin user only
   * @param  {[type]}   body     [fbObject, device_token]
   * @param  {[type]}   uri      [description]
   * @param  {Function} callback [description]
   * @return {[type]}            [description]
   */
  createCategory(body, uri, file, callback) {
    console.log(body.isActive);
    if (body.isActive !== null && body.isActive !== undefined) {
      var isActive = body.isActive.toLowerCase() === "true";
    }
    let newCategory = new Category(
      body.name,
      null,
      body.description,
      null,
      null,
      null,
      true,
      isActive
    );

    newCategory.saveToFirebase(admin, file, (status, obj) => {
      callback(status, obj);
    });
  }
  createHelpCenter(data, file, callback) {
    Category.saveHelpCenterToFireBase(data, admin, file, (status, obj) => {
      callback(status, obj);
    });
  }
  getHelpCenter(helpCenter_key, callback) {
    console.log(helpCenter_key);
    Category.getHelpCenterFromFireBase(helpCenter_key, admin, (status, obj) => {
      callback(status, obj);
    });
  }
  /**
   * Create category
   * We will restrict this for admin user only
   * @param  {[type]}   body     [fbObject, device_token]
   * @param  {[type]}   uri      [description]
   * @param  {Function} callback [description]
   * @return {[type]}            [description]
   */
  createSubCategory(body, uri, file, callback) {
    if (body.isGeneral !== null && body.isGeneral !== undefined) {
      var isGeneral = body.isGeneral.toLowerCase() === "true";
    }
    if (body.isActive !== null && body.isActive !== undefined) {
      var isActive = body.isActive.toLowerCase() === "true";
    }
    let newCategory = new Category(
      body.name,
      null,
      body.description,
      body.superCategory_Name,
      body.superCategory_Id,
      isGeneral,
      false,
      isActive,
      body.DOD,
      body.timelimit,
      body.price,
      body.dodBookingData,
      body.dodJobDay,
      body.dodJobExtraTime
    );

    newCategory.saveSubCategoriesToFirebase(admin, file, (status, obj) => {
      callback(status, obj);
    });
  }

  /**
   * Create category
   * We will restrict this for admin user only
   * @param  {[type]}   body     [fbObject, device_token]
   * @param  {[type]}   uri      [description]
   * @param  {Function} callback [description]
   * @return {[type]}            [description]
   */
  updateSubCategory(body, uri, file, callback) {
    if (body.isGeneral !== null && body.isGeneral !== undefined) {
      var isGeneral = body.isGeneral.toLowerCase() === "true";
    }
    if (body.isActive !== null && body.isActive !== undefined) {
      var isActive = body.isActive.toLowerCase() === "true";
    }
    let newCategory = new Category(
      body.name,
      null,
      body.description,
      body.superCategory_Name,
      body.superCategory_Id,
      isGeneral,
      false,
      isActive,
      body.DOD,
      body.timelimit,
      body.price,
      body.dodBookingData,
      body.dodJobDay,
      body.dodJobExtraTime,
      body.defaultExpectations
    );

    var subcategory_id = body.subcategory_id;

    newCategory.updateSubCategoriesToFirebase(
      admin,
      subcategory_id,
      file,
      (status, obj) => {
        callback(status, obj);
      }
    );
  }

  getSubCategoryById(body, callback) {
    var gettingCategories = Category.getSubCategoryById(
      admin,
      body.subcategory_id
    );
    gettingCategories
      .then(function (data) {
        callback("200", data);
      })
      .catch(function (error) {
        console.log(error.message);
      });
  }

  updateCategory(body, uri, file, callback) {
    if (body.isGeneral !== null && body.isGeneral !== undefined) {
      var isGeneral = body.isGeneral.toLowerCase() === "true";
    }
    if (body.isActive !== null && body.isActive !== undefined) {
      var isActive = body.isActive.toLowerCase() === "true";
    }
    let newCategory = new Category(
      body.name,
      null,
      body.description,
      null,
      null,
      null,
      true,
      isActive
    );

    var category_id = body.category_id;
    newCategory.updateCategoryFirebaseById(
      admin,
      category_id,
      file,
      (status, obj) => {
        callback(status, obj);
      }
    );
  }

  createDodPackage(body, file, callback) {
    Category.createDodPackege(body, admin, file, (status, obj) => {
      callback(status, obj);
    });
  }

  updateDodPackage(body, file, callback) {
    Category.updateDodPackage(body, admin, file, (status, obj) => {
      callback(status, obj);
    });
  }

  uploadBanner(body, file, callback) {
    Category.uploadBanner(body, admin, file, (status, obj) => {
      callback(status, obj);
    });
  }

  getPromotionData(callback) {
    Category.getPromoData(admin, (status, obj) => {
      callback(status, obj);
    });
  }

  saveHeroImageJA(body, file, callback) {
    Category.saveHeroImageJA(body, admin, file, (status, obj) => {
      callback(status, obj);
    });
  }

  getHeroImageData(callback) {
    Category.getHeroImageData(admin, (status, obj) => {
      callback(status, obj);
    });
  }
}

module.exports = CategoryController;
