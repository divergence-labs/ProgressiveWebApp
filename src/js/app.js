var deferredPrompt;
var enableNotificationButtons = document.querySelectorAll('.enable-notifications');

//Activate Promise polyfill if Promise is not supported by the current browser.
if(!window.Promise){
    window.Promise = Promise;
}



if ('serviceWorker' in navigator) {
    navigator.serviceWorker
        .register('/PWA/sw.js')
        .then(function(){
        })
        .catch(function(err){
            console.log(err);
        });
}

// This event is fired just before browser is supposed to show prompt to install PWA
window.addEventListener('beforeinstallprompt', function(event){
    console.log('beforeinstallprompt fired');
    event.preventDefault();
    deferredPrompt = event;
    return false;
});

if('Notification' in window) {
    for(var i=0; i<enableNotificationButtons.length; i++){
        enableNotificationButtons[i].style.display = 'inline-block';
        enableNotificationButtons[i].addEventListener('click', askForNotificationPermission);
    }
} else {

}

function askForNotificationPermission() {
    Notification.requestPermission(function(result){
        console.log('User choice', result);
        if(result!=='granted'){
            console.log('No notification permission granted');
        } else {
            configurePushSub();
        }
    });
}

function displayConfirmNotification() {
    var options = {
        body: 'You have successfully subscribed.',
        icon: '/PWA/src/images/icons/app-icon-96x96.png',
        image: '/PWA/src/images/main-image-sm.jpg',
        dir: 'ltr',
        lang: 'en-US',
        vibrate: [500, 50, 400, 50, 300],
        data: {
            "url":"https://piyushnariani.github.io/PWA/help"
        },
        badge: '/PWA/src/images/icons/app-icon-96x96.png',
        tag: 'confirm-notification',
        renotify: true,
        actions: [
            {action: 'confirm', title: 'Okay', icon: '/PWA/src/images/icons/tick-icon-256x256.png'},
            {action: 'cancel', title: 'Cancel', icon: '/PWA/src/images/icons/x-icon-256x256.png'}
        ]
    };
    if('serviceWorker' in navigator){
        navigator.serviceWorker.ready
            .then(function(sw){
                sw.showNotification("Welcome to Divergence PWA", options);
            })
    }    
}

function configurePushSub() {
    if(!('serviceWorker' in navigator)){
        return;
    }
    var swreg;
    navigator.serviceWorker.ready
        .then(function(sw){
            swreg = sw;
            return sw.pushManager.getSubscription(); 
        })
        .then(function(subscriptions){
            if(subscriptions === null){
                var vapidPublicKey = 'BCfaZ9dBM9Wu2oYEEz46FUStxRTDBpDzdUqorUygNeKGbGU_UXKzVtHp3Z12OB1YWUlvQtBkgV2s83rP7HBRPf8';
                var convertedVapidKey = urlBase64ToUint8Array(vapidPublicKey);
                //Create a new subscription
                return swreg.pushManager.subscribe({
                    userVisibleOnly: true,
                    applicationServerKey: convertedVapidKey
                });
            } else {
                //Subscription already exists
            }
        })
        .then(function(newSub){
            return fetch('https://pwagram-1e19f.firebaseio.com/divergencesubs.json', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept':'application/json'
                },
                body: JSON.stringify(newSub)
            })
        })
        .then(function(res){
            if(res.ok){
                displayConfirmNotification();
            }
        })
        .catch(function(err){
            console.log(err);
        })
}