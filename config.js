// config.js
require('dotenv').config();
console.log("NODE_ENV: ", process.env.NODE_ENV);

const convict = require('convict');
const admin = require("firebase-admin");
var serviceAccount = require("./serviceAccountKeyStaging.json");

if(process.env.NODE_ENV == 'prod') {
  serviceAccount = require("./serviceAccountKey.json");
}
const config = convict({
  env: {
    doc: "The application environment.",
    format: ['prod', 'dev', 'test'],
    default: 'dev',
    arg: 'nodeEnv',
    env: 'NODE_ENV'
  },
  port: {
    doc: "The port to bind.",
    format: "port",
    default: 8080,
    arg: "port",
    env: "PORT",
  },
  firebase_admin_config: {
    credential: {
      doc: "Firebase Credentials",
      format: '*',
      default: admin.credential.cert(serviceAccount)
    },
    databaseURL: {
      doc: "Database URL",
      format: String,
      default: 'users',
      arg: "firebase_admin_databseURL",
      env: "FIREBASE_DATABASE_URL",
    },
    storageBucket: {
      doc: "Storage Bucket URL",
      format: String,
      default: 'users',
      arg: "firebase_admin_storageBucket",
      env: "FIREBASE_STORAGE_BUCKET",
    }
    // databaseAuthVariableOverride: {
    //   doc: "Option to override the auth object used by your database rules",
    //   format: '*',
    //   default: {uid:'my-service-worker'},
    //   arg: "databaseAuthVariableOverride",
    //   env: "DATABASE_AUTH_VARIABLE_OVERRIDE",
    // }
  },
  firebase_config: {
    apiKey: {
      doc: "Storage Bucket URL",
      format: String,
      default: 'users',
      arg: "firebase_apiKey",
      env: "FIREBASE_API_KEY",
    },
    databaseURL: {
      doc: "Database URL",
      format: String,
      default: 'users',
      arg: "firebase_databseURL",
      env: "FIREBASE_DATABASE_URL",
    },
    authDomain: {
      doc: "Storage Bucket URL",
      format: String,
      default: 'users',
      arg: "firebase_authDomain",
      env: "FIREBASE_AUTH_DOMAIN",
    },
    projectId: {
      doc: "Storage Bucket URL",
      format: String,
      default: 'users',
      arg: "firebase_projectId",
      env: "FIREBASE_PROJECT_ID",
    },
    storageBucket: {
      doc: "Storage Bucket URL",
      format: String,
      default: 'users',
      arg: "firebase_storageBucket",
      env: "FIREBASE_STORAGE_BUCKET",
    },
    messagingSenderId: {
      doc: "Storage Bucket URL",
      format: String,
      default: 'users',
      arg: "firebase_messagingSenderId",
      env: "FIREBASE_MESSAGING_SENDER_ID",
    }

  }
});

const env = config.get('env');
config.loadFile(`./config/${env}.json`);
config.validate({
  allowed: 'strict'
}); // throws error if config does not conform to schema

module.exports = config; // so we can operate with a plain old JavaScript object and abstract away convict (optional)
