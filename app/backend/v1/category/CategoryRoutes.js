var express = require("express");
var CategoryController = require("./CategoryController");
var jwt = require("jwt-simple");
var firebase = require("./../routes.js");

/**
 * Router object
 */
const router = express.Router();
const category = new CategoryController();
var Multer = require("multer");
var multer = Multer({
  storage: Multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // no larger than 5mb, you can change as needed.
  },
});
/**
 * Retrive all the categories
 * @param  {[type]} req  [description]
 * @param  {[type]} res) {		var       body [description]
 * @return {[type]}      [description]
 */
router.get("/", (req, res) => {
  const body = req.body;
  const params = req.originalUrl;

  category.getAllCategories(body, params, (status, obj) => {
    res.status(status).json(obj);
  });
});

/**
 * Create a categories
 * @param  {[type]} req  [description]
 * @param  {[type]} res) {		var       body [description]
 * @return {[type]}      [description]
 */
router.post("/createCategory", multer.array("image", 1), (req, res) => {
  const body = req.body;
  const params = req.originalUrl;
  let file = req.files;
  if (file) {
    category.createCategory(body, params, file, (status, obj) => {
      res.status(status).json(obj);
    });
  } else {
    res.status(400).send({
      status: "Missing file",
    });
  }
});

router.post("/updateCategory", multer.array("image", 1), (req, res) => {
  const body = req.body;
  const params = req.originalUrl;
  let file = req.files;
  if (file) {
    category.updateCategory(body, params, file, (status, obj) => {
      res.status(status).json(obj);
    });
  } else {
    res.status(400).send({
      status: "Missing file",
    });
  }
});

/**
 * Create a categories
 * @param  {[type]} req  [description]
 * @param  {[type]} res) {		var       body [description]
 * @return {[type]}      [description]
 */
router.post("/createSubCategory", multer.array("image", 1), (req, res) => {
  const body = req.body;
  const params = req.originalUrl;
  let file = req.files;
  if (file) {
    category.createSubCategory(body, params, file, (status, obj) => {
      res.status(status).json(obj);
    });
  } else {
    res.status(400).send({
      status: "Missing file",
    });
  }
});

/**
 * Create a categories
 * @param  {[type]} req  [description]
 * @param  {[type]} res) {		var       body [description]
 * @return {[type]}      [description]
 */
router.post(
  "/updateSubCategory",
  multer.fields([
    { name: "image", maxCount: 1 },
    { name: "highlightImage", maxCount: 1 },
    { name: "notIncludedImage", maxCount: 1 },
    { name: "includedImage", maxCount: 1 },
    { name: "expectFromUsImage", maxCount: 1 },
    { name: "expectFromYouImage", maxCount: 1 },
  ]),
  (req, res) => {
    const body = req.body;
    const params = req.originalUrl;
    let file = req.files;
    category.updateSubCategory(body, params, file, (status, obj) => {
      res.status(status).json(obj);
    });
  }
);

/**
 * get all categories
 * @param  {[type]} req  [description]
 * @param  {[type]} res) {		var       body [description]
 * @return {[type]}      [description]
 */
router.get("/getCategories", (req, res) => {
  category.getAllCategories((status, obj) => {
    res.status(status).json(obj);
  });
});

/**
 * get all categories
 * @param  {[type]} req  [description]
 * @param  {[type]} res) {		var       body [description]
 * @return {[type]}      [description]
 */
router.get("/getSubCategories", (req, res) => {
  category.getAllSubCategories((status, obj) => {
    res.status(status).json(obj);
  });
});

router.post("/getSubCategory", (req, res) => {
  let body = req.body;
  category.getSubCategoryById(body, (status, obj) => {
    res.status(status).json(obj);
  });
});

/**
 * Create a DOD Package
 * @param  {[type]} req  [description]
 * @param  {[type]} res) {		var       body [description]
 * @return {[type]}      [description]
 */
router.post(
  "/createDodPackage",
  multer.fields([
    { name: "image", maxCount: 1 },
    { name: "highlightImage", maxCount: 1 },
    { name: "notIncludedImage", maxCount: 1 },
    { name: "includedImage", maxCount: 1 },
    { name: "expectFromUsImage", maxCount: 1 },
    { name: "expectFromYouImage", maxCount: 1 },
  ]),
  (req, res) => {
    const body = req.body;
    const params = req.originalUrl;
    let file = req.files;
    if (file) {
      category.createDodPackage(body, file, (status, obj) => {
        res.status(status).json(obj);
      });
    } else {
      res.status(400).send({
        status: "Missing file",
      });
    }
  }
);

/**
 * Update a DOD Package
 * @param  {[type]} req  [description]
 * @param  {[type]} res) {		var       body [description]
 * @return {[type]}      [description]
 */
router.post(
  "/updateDodPackage",
  multer.fields([
    { name: "image", maxCount: 1 },
    { name: "highlightImage", maxCount: 1 },
    { name: "notIncludedImage", maxCount: 1 },
    { name: "includedImage", maxCount: 1 },
  ]),
  (req, res) => {
    const body = req.body;
    const params = req.originalUrl;
    let file = req.files;
    category.updateDodPackage(body, file, (status, obj) => {
      res.status(status).json(obj);
    });
  }
);

router.post("/uploadBanner", multer.array("image", 1), (req, res) => {
  const body = req.body;
  let file = req.files;
  category.uploadBanner(body, file, (status, obj) => {
    res.status(status).json(obj);
  });
});

router.get("/getPromoData", (req, res) => {
  category.getPromotionData((status, obj) => {
    res.status(status).json(obj);
  });
});

router.post("/saveHeroImageJA", multer.array("image", 1), (req, res) => {
  const body = req.body;
  let file = req.files;
  category.saveHeroImageJA(body, file, (status, obj) => {
    res.status(status).json(obj);
  });
});

router.get("/getHeroImageData", (req, res) => {
  category.getHeroImageData((status, obj) => {
    res.status(status).json(obj);
  });
});
router.get("/getHelpCenter/:helpCenterType?", (req, res) => {
  //If req.params.key(optional) contains jobber than get jobber data else requestor data.
  // req.params are passed as part of the URL. req.query are passed as values in the url
  const helpCenter_key = req.query.helpCenterType || "requestor";
  category.getHelpCenter(helpCenter_key, (status, obj) => {
    obj.support_phone = "1-332-334-2474";
    obj.support_email = "help@diemtheapp.com";
    res.status(status).json(obj);
  });
});
router.post(
  "/saveHelpCenter",
  multer.array("helpCenterImage", 1),
  (req, res) => {
    const helpCenter = req.body;
    const file = req.files;
    // category = CategoryController();
    category.createHelpCenter(helpCenter, file, (status, obj) => {
      res.status(status).json(obj);
    });
    //On Success. Response will contain helpCenter ID.
  }
);
module.exports = router;
