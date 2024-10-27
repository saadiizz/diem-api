var firebase = require("firebase");
var admin = require("firebase-admin");
var User = require("../user/User");
// not being used
// var provider = new firebase.auth.FacebookAuthProvider();
var UploadController = require("../upload/UploadController");
const sentry = require("@sentry/node");

const upload = new UploadController();

class AuthenticationController {
  /**
   * Create Account with E-mail Method
   * @param  {String} email    	    [Unique idnetifier email]
   * @param  {String} password 	    [password]
   * @param  {String} phoneNumber 	[phoneNumber for user]
   * @param  {String} name 	        [User display name]
   * @return {JSON}				          [Response JSON object for registration]
   */
  emailRegister(body, uri, file, callback) {
    const email = body.email;
    const password = body.password;
    const phoneNumber = body.phoneNumber;
    const firstName = body.firstName;
    const lastName = body.lastName;
    const displayName = body.displayName;
    const photoURL = body.photoURL;
    const deviceToken = body.deviceToken;
    console.log(
      "Email: " +
        email +
        " Password: " +
        password +
        " Phone Number: " +
        phoneNumber
    );
    var newUser = User.User(
      email,
      firstName,
      lastName,
      false,
      phoneNumber,
      password,
      displayName,
      photoURL,
      deviceToken
    );
    console.log(newUser);
    admin
      .auth()
      .createUser({
        email: email,
        emailVerified: false,
        phoneNumber: phoneNumber,
        password: password,
        displayName: displayName,
        photoURL: photoURL,
        disabled: false,
      })
      .then(function (userRecord) {
        // See the UserRecord reference doc for the contents of userRecord.
        console.log("Successfully created new user:", userRecord);

        return userRecord;
      })
      .then(function (userRecord) {
        var refDB = admin.database().ref();
        var usersRef = refDB.child("users");

        // Create a new ref and save data to it in one step
        var userRef = usersRef
          .child(userRecord.uid)
          .set({
            email: email,
            emailVerified: false,
            phoneNumber: phoneNumber,
            password: password,
            displayName: displayName,
            photoURL: photoURL,
            disabled: false,
            metadata: userRecord.metadata,
            creationTime: admin.database.ServerValue.TIMESTAMP,
            lastUpdatedTime: admin.database.ServerValue.TIMESTAMP,
            lastSignInTime: null,
          })
          .then(function () {
            console.log("Successfully stored user data in firebase db:");
          })
          .catch(function (error) {
            console.log("Error storing new user in db:", error);
            callback("403", error);
          });
        return userRecord;
      })
      .then(function (userRecord) {
        if (userRecord) {
          if (file) {
            upload
              .uploadImageToStorage(file, userRecord.uid, "/profile")
              .then((success) => {
                callback(
                  "200",
                  "Successfully stored created user and uploaded profile picture"
                );
              })
              .catch((error) => {
                callback(
                  "200",
                  "Successfully stored created user but Image not stored"
                );
              });
          } else {
            callback(
              "200",
              "Successfully stored created user but Image not attached."
            );
          }
        }
      })
      .catch(function (error) {
        console.log("Error creating new user:", error);
        callback("403", error);
      });
  }

  /**
   * verify idToken for admin rules
   * @param  {[type]}   body     [id_token]
   * @param  {[type]}   uri      [description]
   * @param  {Function} callback [description]
   * @return {[type]}            [description]
   */
  verifyUserToken(body, uri, callback) {
    let idToken = body.id_token;
    firebase
      .auth()
      .currentUser.getIdToken(/* forceRefresh */ true)
      .then(function (id_Token) {
        console.log("User idToken " + idToken);
        idToken = id_Token;
      })
      .catch(function (error) {
        console.log(error);
      });
    admin
      .auth()
      .verifyIdToken(idToken)
      .then(function (decodedToken) {
        var uid = decodedToken.uid;
        console.log("User " + decodedToken.uid);
        callback("200", "Successfully");
      })
      .catch(function (error) {
        // Handle error
        console.log(error);
      });
  }

  /**
   * Sign-out
   * @param  {[type]}   body     [id_token]
   * @param  {[type]}   uri      [description]
   * @param  {Function} callback [description]
   * @return {[type]}            [description]
   */
  signOut(body, uri, callback) {
    var user = firebase.auth().currentUser;

    if (!user) {
      // User is signed in.
      callback("404", "Not Logged in");
    }
    firebase
      .auth()
      .signOut()
      .then(function () {
        // Sign-out successful.
        callback("200", "Sign-out successful");
      })
      .catch(function (error) {
        // An error happened.
      });
  }

  /**
   * email login
   * @param  {[type]}   body     [email, password, device_token]
   * @param  {[type]}   uri      [description]
   * @param  {Function} callback [description]
   * @return {[type]}            [description]
   */
  signInWithEmailAndPassword(body, uri, callback) {
    const email = body.username;
    const password = body.password;
    const deviceToken = body.device_token;

    firebase
      .auth()
      .signInWithEmailAndPassword(email, password)
      .then(function (userData) {
        console.log("User " + userData.uid + " created successfully!");
        console.log(
          "User " + firebase.auth().currentUser + " signin successfully!"
        );

        firebase
          .auth()
          .currentUser.getIdToken(/* forceRefresh */ true)
          .then(function (idToken) {
            console.log("User idToken " + idToken);
          })
          .catch(function (error) {
            console.log(error);
          });
        callback("200", userData);
        return userData;
      })
      .then(function (userData) {
        var refDB = admin.database().ref();
        var usersRef = refDB.child("users");
        var userRef = usersRef
          .child(userData.user.uid)
          .child("lastSignInTime")
          .set(admin.database.ServerValue.TIMESTAMP)
          .then(function () {
            console.log("Successfully stored user data in firebase db:");
          })
          .catch(function (error) {
            console.log("Error storing new user in db:", error);
          });
      })
      .catch(function (error) {
        // Handle Errors here.
        console.log("User " + firebase.auth().currentUser + " signin failed!");
        var errorCode = error.code;
        var errorMessage = error.message;
        if (errorCode == "auth/weak-password") {
          console.log("The password is too weak.");
        } else {
          console.log(errorMessage);
        }
        console.log(error);
        callback("404", error);
      });
  }

  /**
   * login with facebook
   * @param  {[type]}   body     [fbObject, device_token]
   * @param  {[type]}   uri      [description]
   * @param  {Function} callback [description]
   * @return {[type]}            [description]
   */
  fbAuthenticate(body, uri, callback) {
    const fbObj = body.fbObject;
    const deviceToken = body.device_token;
    //TODO: use firebase to authenticate facebook
  }

  customToken(uid, callback) {
    console.log(uid);
    admin
      .auth()
      .createCustomToken(uid)
      .then(function (customToken) {
        console.log(customToken);
        var obj = { status: "success", token: customToken, user_id: uid };
        callback("200", obj);
      })
      .catch(function (error) {
        console.log(error);
        callback("400", error);
      });
  }
}

module.exports = AuthenticationController;
module.exports.isAuthenticated = function (req, res, next) {
  const authorization = req.headers["authorization"];
  if (!authorization) {
    res.status(401);
    res.json({
      error: "There is no Authorization header.",
    });
    return false;
  }
  if (!authorization.includes("Bearer ")) {
    res.status(401);
    res.json({
      error: 'Format the Authorization header as "Bearer <Token>"',
    });
    return false;
  }
  const token = authorization.split(" ")[1];
  admin
    .auth()
    .verifyIdToken(token)
    .then((decodedToken) => {
      req.user_identification = {
        uid: "4Ao5XsmWD5WRCTauvRzzpUans673",
        email: "11mar22@diem.com",
        is_email_verified: true,
        // uid: decodedToken.uid,
        // email: decodedToken.email,
        // is_email_verified: decodedToken.email_verified,
      };

      sentry.setUser(req.user_identification);
      return next();
    })
    .catch((error) => {
      res.status(401);
      res.json({
        error: "You are not authorized.",
      });
      return false;
    });
};
