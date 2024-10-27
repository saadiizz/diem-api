module.exports.isAdmin = async (req, res, next) => {
  const admin = require("firebase-admin");
  const refDB = admin.database().ref();

  if (!req.user_identification || !req.user_identification.uid) {
    return res.status(401).json({ message: "Authentication needed" });
  }

  const adminData = (
    await refDB.child("users").child(req.user_identification.uid).once("value")
  ).val();

  if (!adminData.roles || !adminData.roles.admin) {
    return res
      .status(401)
      .json({ message: "You are not authorized to access this information" });
  }

  next();
};
