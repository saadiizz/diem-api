// var firebase = require("firebase");
var admin = require("firebase-admin");
var adminUtils = require("../Utils/Admin_Utils.js");
const format = require("util").format;
// Imports the Google Cloud client library
const { Storage } = require("@google-cloud/storage");
// Your Google Cloud Platform project ID
var projectId = "diem-development";
var keyFilename = "serviceAccountKeyStaging.json";
if (process.env.NODE_ENV == "prod") {
  projectId = "diem-7f3fa";
  keyFilename = "serviceAccountKey.json";
}
// Creates a client
const storage = new Storage({
  projectId: projectId,
  keyFilename: keyFilename,
});

// The name for the new bucket
var bucketName = "diem-development.appspot.com";
if (process.env.NODE_ENV == "prod") {
  bucketName = "diem-7f3fa.appspot.com";
}
const bucket = storage.bucket(bucketName);

class UploadController {
  /**
   * Upload the image file to Google Storage
   * @param {File} file object that will be uploaded to Google Storage
   */
  uploadImageToStorage(file, uid, url) {
    let prom = new Promise((resolve, reject) => {
      var size = Object.keys(file).length;
      var obj = new Array();
      let pathUrl = url;
      if (size < 1) {
        return reject("No image file");
      }
      for (let i = 0; i < size; i++) {
        if (!file[i]) {
          return reject(new Error("No image file"));
        }
        console.log(file[i].mimetype);
        if (
          file[i].mimetype !== "image/jpeg" &&
          file[i].mimetype !== "image/png"
        ) {
          return reject(new Error("Not an Image"));
        }
        let name = file[i].originalname ? file[i].originalname : null;
        let newFileName = this.getStoragePath(uid, url, null, name);
        let fileUpload = bucket.file(newFileName);
        const blobStream = fileUpload.createWriteStream({
          metadata: {
            contentType: file[i].mimetype,
          },
        });
        blobStream.on("error", (error) => {
          reject("Something is wrong! Unable to upload at the moment.");
        });

        blobStream.on("finish", () => {
          // The public URL can be used to directly access the file via HTTP.
          const url = format(
            `https://storage.googleapis.com/${bucket.name}/${fileUpload.name}`
          );
          if (pathUrl == "/JOBS/profile") {
            this.makePublic(newFileName);
          }
          resolve(url);
        });
        blobStream.end(file[i].buffer);
      }
    });

    return prom;
  }

  /**
   * Upload the image file to Google Storage
   * @param {File} file object that will be uploaded to Google Storage
   */
  uploadImageToStorageListings(file, uid, url, listingID) {
    let prom = new Promise((resolve, reject) => {
      var counter = 0;
      var size = Object.keys(file).length;
      var obj = new Array();
      if (size < 1) {
        return reject("No image file");
      }
      for (let i = 0; i < size; i++) {
        if (!file[i]) {
          return reject("One of many file is missing or corrupt image file");
        }
        if (
          file[i].mimetype !== "image/jpeg" &&
          file[i].mimetype !== "image/png"
        ) {
          return reject("File(s) is not an Image");
        }
        let newFileName = this.getStoragePath(
          uid,
          url,
          listingID,
          listingID + "_" + i
        );
        let fileUpload = bucket.file(newFileName);

        const blobStream = fileUpload.createWriteStream({
          metadata: {
            contentType: file[i].mimetype,
          },
        });

        blobStream.on("error", (error) => {
          reject("Something is wrong! Unable to upload at the moment.");
        });

        blobStream.on("finish", () => {
          // The public URL can be used to directly access the file via HTTP.
          const url = format(
            `https://storage.googleapis.com/${bucket.name}/${fileUpload.name}`
          );
          obj.push({
            imageurl: url,
            filename: newFileName,
            contentType: file[i].mimetype,
          });
          counter = counter + 1;
          this.makePublic(newFileName);
          if (counter === size) {
            resolve(obj);
          }
        });
        blobStream.end(file[i].buffer);
      }
    });
    return prom;
  }

  /**
   * Upload the image file to Google Storage
   * @param {File} file object that will be uploaded to Google Storage
   */
  uploadImageToStorageCategory(file, categoryID) {
    let prom = new Promise((resolve, reject) => {
      var counter = 0;
      var size = Object.keys(file).length;
      var obj = new Array();
      if (size < 1) {
        return reject("No image file");
      }
      for (let i = 0; i < size; i++) {
        console.log(size);
        if (!file[i]) {
          return reject("One of many file is missing or corrupt image file");
        }
        var test = file[i].mimetype === "image/png";
        if (
          file[i].mimetype !== "image/png" &&
          file[i].mimetype !== "image/jpeg"
        ) {
          return reject("File(s) is not an Image");
        }
        let newFileName = this.getStoragePath(
          null,
          "/category",
          categoryID,
          categoryID + "_" + i
        );
        console.log("newFileName", newFileName);
        let fileUpload = bucket.file(newFileName);

        const blobStream = fileUpload.createWriteStream({
          metadata: {
            contentType: file[i].mimetype,
          },
        });

        blobStream.on("error", (error) => {
          console.log(error);
          reject("Something is wrong! Unable to upload at the moment.");
        });

        blobStream.on("finish", () => {
          // The public URL can be used to directly access the file via HTTP.
          const url = format(
            `https://storage.googleapis.com/${bucket.name}/${fileUpload.name}`
          );
          obj.push({
            imageurl: url,
            filename: newFileName,
            contentType: file[i].mimetype,
          });
          this.makePublic(newFileName);
          counter = counter + 1;
          if (counter === size) {
            resolve(obj);
          }
        });

        blobStream.end(file[i].buffer);
      }
    });
    return prom;
  }
  uploadImageToStorageHelpCenter(file, helpCenterID) {
    let prom = new Promise((resolve, reject) => {
      var counter = 0;
      var size = Object.keys(file).length;
      var obj = new Array();
      if (size < 1) {
        return reject("No image file");
      }
      for (let i = 0; i < size; i++) {
        console.log(size);
        if (!file[i]) {
          return reject("One of many file is missing or corrupt image file");
        }
        var test = file[i].mimetype === "image/png";
        if (
          file[i].mimetype !== "image/png" &&
          file[i].mimetype !== "image/jpeg"
        ) {
          return reject("File(s) is not an Image");
        }
        let newFileName = this.getStoragePath(
          null,
          "/helpCenter",
          helpCenterID,
          helpCenterID + "_" + i
        );
        console.log("newFileName", newFileName);
        let fileUpload = bucket.file(newFileName);

        const blobStream = fileUpload.createWriteStream({
          metadata: {
            contentType: file[i].mimetype,
          },
        });

        blobStream.on("error", (error) => {
          console.log(error);
          reject("Something is wrong! Unable to upload at the moment.");
        });

        blobStream.on("finish", () => {
          // The public URL can be used to directly access the file via HTTP.
          const url = format(
            `https://storage.googleapis.com/${bucket.name}/${fileUpload.name}`
          );
          obj.push({
            imageurl: url,
            filename: newFileName,
            contentType: file[i].mimetype,
          });
          this.makePublic(newFileName);
          counter = counter + 1;
          if (counter === size) {
            resolve(obj);
          }
        });

        blobStream.end(file[i].buffer);
      }
    });
    return prom;
  }
  /**
   * Upload the image file to Google Storage
   * @param {File} file object that will be uploaded to Google Storage
   */
  uploadImageToStorageSubCategory(file, categoryID) {
    let prom = new Promise((resolve, reject) => {
      var counter = 0;
      var size = Object.keys(file).length;
      var obj = new Array();
      if (size < 1) {
        return reject("No image file");
      }
      for (let i = 0; i < size; i++) {
        if (!Object.values(file)[i]) {
          return reject("One of many file is missing or corrupt image file");
        }
        var test = Object.values(file)[i][0].mimetype === "image/png";
        if (
          Object.values(file)[i][0].mimetype !== "image/png" &&
          Object.values(file)[i][0].mimetype !== "image/jpeg"
        ) {
          return reject("File(s) is not an Image");
        }
        let newFileName;
        if (Object.values(file)[i][0].fieldname == "image") {
          newFileName = this.getStoragePath(
            null,
            "/category",
            categoryID,
            categoryID + "_" + i
          );
        } else {
          newFileName = this.getStoragePath(
            null,
            "/subCategory",
            categoryID,
            Object.keys(file)[i] + "_" + i
          );
        }
        console.log("newFileName", newFileName);
        let fileUpload = bucket.file(newFileName);

        const blobStream = fileUpload.createWriteStream({
          metadata: {
            contentType: Object.values(file)[i][0].mimetype,
          },
        });

        blobStream.on("error", (error) => {
          console.log(error);
          reject("Something is wrong! Unable to upload at the moment.");
        });

        blobStream.on("finish", () => {
          // The public URL can be used to directly access the file via HTTP.
          const url = format(
            `https://storage.googleapis.com/${bucket.name}/${fileUpload.name}`
          );
          obj.push({
            imageurl: url,
            filename: newFileName,
            contentType: Object.values(file)[i][0].mimetype,
            key: Object.keys(file)[i],
          });
          this.makePublic(newFileName);
          counter = counter + 1;
          if (counter === size) {
            resolve(obj);
          }
        });

        blobStream.end(Object.values(file)[i][0].buffer);
      }
    });
    return prom;
  }

  storeImageDodPackage(file, subCategoryID, packageId) {
    let prom = new Promise((resolve, reject) => {
      var counter = 0;
      var size = Object.keys(file).length;
      var obj = new Array();
      if (size < 1) {
        return reject("No image file");
      }
      for (let i = 0; i < size; i++) {
        if (!Object.values(file)[i]) {
          return reject("One of many file is missing or corrupt image file");
        }
        var test = Object.values(file)[i][0].mimetype === "image/png";
        if (
          Object.values(file)[i][0].mimetype !== "image/png" &&
          Object.values(file)[i][0].mimetype !== "image/jpeg"
        ) {
          return reject("File(s) is not an Image");
        }
        let newFileName = this.getStoragePath(
          null,
          "/subCategory",
          subCategoryID + "_" + packageId,
          Object.keys(file)[i] + "_" + i
        );
        let fileUpload = bucket.file(newFileName);

        const blobStream = fileUpload.createWriteStream({
          metadata: {
            contentType: Object.values(file)[i][0].mimetype,
          },
        });

        blobStream.on("error", (error) => {
          console.log(error);
          reject("Something is wrong! Unable to upload at the moment.");
        });

        blobStream.on("finish", () => {
          // The public URL can be used to directly access the file via HTTP.
          const url = format(
            `https://storage.googleapis.com/${bucket.name}/${fileUpload.name}`
          );
          obj.push({
            imageurl: url,
            filename: newFileName,
            contentType: Object.values(file)[i][0].mimetype,
            key: Object.keys(file)[i],
          });
          this.makePublic(newFileName);
          counter = counter + 1;
          if (counter === size) {
            resolve(obj);
          }
        });

        blobStream.end(Object.values(file)[i][0].buffer);
      }
    });
    return prom;
  }

  /**
   * Upload the image file to Google Storage
   * @param {File} file object that will be uploaded to Google Storage
   */
  storeImageAssignedJob(file, listingId, offerId) {
    console.log("listingId,  offerId", listingId, offerId);
    let prom = new Promise((resolve, reject) => {
      var counter = 0;
      var size = Object.keys(file).length;
      var obj = new Array();
      if (size < 1) {
        return reject("No image file");
      }
      console.log("size in image upload", size);
      for (let i = 0; i < size; i++) {
        console.log(size);
        if (!file[i]) {
          return reject("One of many file is missing or corrupt image file");
        }
        var test = file[i].mimetype === "image/png";
        if (
          file[i].mimetype !== "image/png" &&
          file[i].mimetype !== "image/jpeg"
        ) {
          return reject("File(s) is not an Image");
        }
        let newFileName = this.getStoragePath(
          null,
          "/listing/offer/jobber_job_pictures",
          listingId + "/" + offerId,
          file[i].originalname + "_" + i
        );
        console.log("newFileName", newFileName);
        let fileUpload = bucket.file(newFileName);

        const blobStream = fileUpload.createWriteStream({
          metadata: {
            contentType: file[i].mimetype,
          },
        });

        blobStream.on("error", (error) => {
          console.log(error);
          reject("Something is wrong! Unable to upload at the moment.");
        });

        blobStream.on("finish", () => {
          // The public URL can be used to directly access the file via HTTP.
          const url = format(
            `https://storage.googleapis.com/${bucket.name}/${fileUpload.name}`
          );
          obj.push({
            url: url,
            name: file[i].originalname,
          });
          this.makePublic(newFileName);
          counter = counter + 1;
          if (counter === size) {
            resolve(obj);
          }
        });

        blobStream.end(file[i].buffer);
      }
    });
    return prom;
  }

  /**
   * Upload the image file to Google Storage
   * @param {File} file object that will be uploaded to Google Storage
   */
  uploadImageToStorageProfileWork(file, uid, url) {
    let prom = new Promise((resolve, reject) => {
      var counter = 0;
      var size = Object.keys(file).length;
      var obj = new Array();
      if (size < 1) {
        return reject("No image file");
      }
      for (let i = 0; i < size; i++) {
        console.log(size);
        if (!file[i]) {
          return reject("One of many file is missing or corrupt image file");
        }
        if (
          file[i].mimetype !== "image/jpeg" &&
          file[i].mimetype !== "image/png"
        ) {
          return reject("File(s) is not an Image");
        }
        let name = file[i].originalname ? i + "_" + file[i].originalname : i;
        let newFileName = this.getStoragePath(uid, url, null, name);
        console.log("filename:");
        console.log(newFileName);
        let fileUpload = bucket.file(newFileName);

        const blobStream = fileUpload.createWriteStream({
          metadata: {
            contentType: file[i].mimetype,
          },
        });

        blobStream.on("error", (error) => {
          reject("Something is wrong! Unable to upload at the moment.");
        });

        blobStream.on("finish", () => {
          // The public URL can be used to directly access the file via HTTP.
          const url = format(
            `https://storage.googleapis.com/${bucket.name}/${fileUpload.name}`
          );
          obj.push({
            imageurl: url,
            filename: newFileName,
            contentType: file[i].mimetype,
          });
          this.makePublic(newFileName);
          counter = counter + 1;
          if (counter === size) {
            resolve(obj);
          }
        });

        blobStream.end(file[i].buffer);
      }
    });
    return prom;
  }

  /**
   * Upload the image file to Google Storage
   * @param {File} file object that will be uploaded to Google Storage
   */
  uploadPromoImageToStorage(file) {
    let prom = new Promise((resolve, reject) => {
      var counter = 0;
      var size = Object.keys(file).length;
      var obj = new Array();
      if (size < 1) {
        return reject("No image file");
      }
      console.log("size in image upload", size);
      for (let i = 0; i < size; i++) {
        console.log(size);
        if (!file[i]) {
          return reject("One of many file is missing or corrupt image file");
        }
        var test = file[i].mimetype === "image/png";
        if (
          file[i].mimetype !== "image/png" &&
          file[i].mimetype !== "image/jpeg"
        ) {
          return reject("File(s) is not an Image");
        }
        let newFileName = this.getStoragePath(
          null,
          "/promo/banner",
          null,
          file[i].originalname
        );
        let fileUpload = bucket.file(newFileName);

        const blobStream = fileUpload.createWriteStream({
          metadata: {
            contentType: file[i].mimetype,
          },
        });

        blobStream.on("error", (error) => {
          console.log(error);
          reject("Something is wrong! Unable to upload at the moment.");
        });

        blobStream.on("finish", () => {
          // The public URL can be used to directly access the file via HTTP.
          const url = format(
            `https://storage.googleapis.com/${bucket.name}/${fileUpload.name}`
          );
          obj.push({
            url: url,
            name: file[i].originalname,
          });
          this.makePublic(newFileName);
          counter = counter + 1;
          if (counter === size) {
            resolve(obj);
          }
        });

        blobStream.end(file[i].buffer);
      }
    });
    return prom;
  }

  /**
   * Upload the image file to Google Storage
   * @param {File} file object that will be uploaded to Google Storage
   */
  uploadHeroImageToStorage(file) {
    let prom = new Promise((resolve, reject) => {
      var counter = 0;
      var size = Object.keys(file).length;
      var obj = new Array();
      if (size < 1) {
        return reject("No image file");
      }
      console.log("size in image upload", size);
      for (let i = 0; i < size; i++) {
        console.log(size);
        if (!file[i]) {
          return reject("One of many file is missing or corrupt image file");
        }
        var test = file[i].mimetype === "image/png";
        if (
          file[i].mimetype !== "image/png" &&
          file[i].mimetype !== "image/jpeg"
        ) {
          return reject("File(s) is not an Image");
        }
        let newFileName = this.getStoragePath(
          null,
          "/ja/hero_image",
          null,
          file[i].originalname
        );
        let fileUpload = bucket.file(newFileName);

        const blobStream = fileUpload.createWriteStream({
          metadata: {
            contentType: file[i].mimetype,
          },
        });

        blobStream.on("error", (error) => {
          console.log(error);
          reject("Something is wrong! Unable to upload at the moment.");
        });

        blobStream.on("finish", () => {
          // The public URL can be used to directly access the file via HTTP.
          const url = format(
            `https://storage.googleapis.com/${bucket.name}/${fileUpload.name}`
          );
          obj.push({
            url: url,
            name: file[i].originalname,
          });
          this.makePublic(newFileName);
          counter = counter + 1;
          if (counter === size) {
            resolve(obj);
          }
        });

        blobStream.end(file[i].buffer);
      }
    });
    return prom;
  }

  removeImage(url) {
    let prom = new Promise((resolve, reject) => {
      var imageRef = storageRef.child(url);

      imageRef
        .delete()
        .then(function (success) {
          console.log("image deleted");
          resolve("200", "image deleted");
        })
        .catch(function (error) {
          console.log("err", error);
          reject("400", error);
        });
    });
    return prom;
  }

  makePublic(filename) {
    // Makes the file public
    bucket
      .file(filename)
      .makePublic()
      .then(() => {
        console.log(`gs://${bucketName}/${filename} is now public.`);
      })
      .catch((err) => {
        console.error("ERROR:", err);
      });
    // [END storage_make_public]
  }

  getStoragePath(uid, url, listing_ID, filename) {
    console.log("TEST");
    switch (url) {
      case "/profile":
        return `${uid}/profile_picture/${uid}_profile`;
        break;
      case "/listing":
        return `${uid}/listing/${listing_ID}/${filename}`;
        break;
      case "/listing/createListing":
        return `${uid}/listing/${listing_ID}/${filename}`;
        break;
      case "/category":
        return `category/${listing_ID}/${filename}`;
        break;
      case "/helpCenter":
        return `/helpCenter/${filename}`;
        break;
      case "/subCategory":
        return `subCategory/${listing_ID}/${filename}`;
        break;
      case "/dodPackage":
        return `subCategory/${listing_ID}/${filename}`;
        break;
      case "/user/work_pictures":
        return `${uid}/work_pictures/${uid}_work_pictures/${filename}`;
        break;
      case "/listing/offer/jobber_job_pictures":
        return `/listing/offer/jobber_job_pictures/${listing_ID}/${filename}`;
        break;
      case "/promo/banner":
        return `/promotion/banner/${filename}`;
        break;
      case "/ja/hero_image":
        return `/JA/hero_image/${filename}`;
        break;
      case "/JOBS/profile":
        return `JOBS/${uid}/profile_picture/${filename}`;
        break;
      case "/JOBS/id_pictures":
        return `JOBS/${uid}/id_picture/${filename}`;
        break;
      default:
        return `profile/${uid}_profile`;
    }
  }
}

module.exports = UploadController;
