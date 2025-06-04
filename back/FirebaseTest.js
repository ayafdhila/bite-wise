const admin = require('firebase-admin');
const serviceAccount = require('./firebase-admin-sdk.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

console.log("Firebase connectée !");
