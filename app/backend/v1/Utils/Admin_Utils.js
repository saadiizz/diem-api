var admin = require("firebase-admin");

function getCurrentUser(uid){
  admin.auth().getUser(uid).then(function(user) {
    console.log(user);
    return(user);
  }).catch(function(error) {
    console.log(error.message);
    return error;
  });
}

module.exports = {getCurrentUser: getCurrentUser
}
