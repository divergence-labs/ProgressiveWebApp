const functions = require('firebase-functions');
const admin = require('firebase-admin');
const cors = require('cors')({origin: true});
const webpush = require('web-push');
var serviceAccount = require("./pwagram-key.json");
var vapidKeys = require('./vapidKeys.json');

// // Create and Deploy Your First Cloud Functions
// // https://firebase.google.com/docs/functions/write-firebase-functions
//
admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: 'https://pwagram-1e19f.firebaseio.com/'
});
var mailto = "mailto:" + vapidKeys.mailTo;

exports.storePostData = functions.https.onRequest(function(request, response) {
    cors(request, response, function() {
        admin.database().ref('posts').push({
            id: request.body.id,
            title: request.body.title,
            location: request.body.location,
            image: request.body.image
        })
        .then(function(){
            webpush.setVapidDetails(mailto, vapidKeys.publicKey, vapidKeys.privateKey);
            return admin.database().ref('divergencesubs').once('value');
        })
        .then(function(subscriptions){
            subscriptions.forEach(function(sub){
                var pushConfig = {
                    endpoint: sub.val().endpoint,
                    keys: {
                        auth: sub.val().keys.auth,
                        p256dh: sub.val().keys.p256dh
                    }
                };
                webpush.sendNotification(pushConfig, JSON.stringify({title: 'New Post', content: 'New post added', openURL: '/PWA/help'}))
                    .catch(function(err){
                        console.log(err);
                    })
            });
            response.status(201).json({message: 'Data stored', id: request.body.id});
        })
        .catch(function(err){
            response.status(500).json({error: err});
        })
    });
});
