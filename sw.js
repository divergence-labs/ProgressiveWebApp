importScripts('/PWA/src/js/idb.js');
importScripts('/PWA/src/js/utility.js');

var CACHE_STATIC = 'static';
var CACHE_STATIC_VERSION = '22';
var CACHE_STATIC_NAME = CACHE_STATIC + "-v" + CACHE_STATIC_VERSION;

var CACHE_DYNAMIC = 'dynamic';
var CACHE_DYNAMIC_VERSION = '7';
var CACHE_DYNAMIC_NAME = CACHE_DYNAMIC + "-v" + CACHE_DYNAMIC_VERSION;

//Trim Cache function
// function trimCache(cacheName, maxItems) {
//     caches.open(cacheName)
//         .then(function(cache){
//             return cache.keys()
//                 .then(function(keys){
//                     if(keys.length > maxItems){
//                         cache.delete(keys[0])
//                             .then(trimCache(cacheName, maxItems));
//                     }
//                 });
//         });
// }

var STATIC_FILES = [
    '/PWA/',
    '/PWA/index.html',
    '/PWA/fallback.html',
    '/PWA/src/js/utility.js',
    '/PWA/src/js/app.js',
    '/PWA/src/js/idb.js',
    '/PWA/src/js/feed.js',
    '/PWA/src/js/promise.js',
    '/PWA/src/js/fetch.js',
    '/PWA/src/js/material.min.js',
    '/PWA/src/css/app.css',
    '/PWA/src/css/feed.css',
    '/PWA/src/images/main-image.jpg',
    'https://fonts.googleapis.com/css?family=Roboto:400,700',
    'https://fonts.googleapis.com/icon?family=Material+Icons',
    'https://cdnjs.cloudflare.com/ajax/libs/material-design-lite/1.3.0/material.indigo-pink.min.css'
];

var dbPromise = idb.open('posts-store', 1, function(db) {
    if(!db.objectStoreNames.contains('posts')){
        db.createObjectStore('posts', {keyPath: 'id'});
    }
});

self.addEventListener('install', function(event) {
    console.log('[Service Worker] Installing service worker...', event);
    event.waitUntil(
        caches.open(CACHE_STATIC_NAME)
            .then(function(cache) {
                console.log('[SW] Precaching App Shell');
                cache.addAll(STATIC_FILES);
            })
    )
});

self.addEventListener('activate', function(event) {
    console.log('[Service Worker] Activating Service worker...', event);
    event.waitUntil(
        caches.keys()
            .then(function(keyList) {
                return Promise.all(keyList.map(function(key) {
                    if(key !== CACHE_STATIC_NAME && key !== CACHE_DYNAMIC_NAME){
                        console.log('[SW] Removing old cache.', key);
                        return caches.delete(key);
                    }
                }));
            })
    );
    return self.clients.claim();
});

//Cache with network fallback strategy
// self.addEventListener('fetch', function(event) {
//     event.respondWith(
//         caches.match(event.request)
//             .then(function(response) {
//                 if(response) {
//                     return response;
//                 } else {
//                     return fetch(event.request)
//                         .then(function(res){
//                             return caches.open(CACHE_DYNAMIC_NAME)
//                                 .then(function(cache) {
//                                     cache.put(event.request.url, res.clone());
//                                     return res;
//                                 });
//                         })
//                         .catch(function(err){
//                             return caches.open(CACHE_STATIC_NAME)
//                                     .then(function(cache){
//                                         return cache.match('/fallback.html');
//                                     });
//                         });
//                 }
//             })
//     );
// });

//Cache Only strategy
// self.addEventListener('fetch', function(event){
//     event.respondWith(caches.match(event.request));
// });

//Network only strategy
// self.addEventListener('fetch', function(event){
//     event.respondWith(fetch(event.request));
// });

//Network with cache fallback strategy
// self.addEventListener('fetch', function(event){
//     event.respondWith(
//         fetch(event.request)
//             .then(function(res){
//                 return caches.open(CACHE_DYNAMIC_NAME)
//                     .then(function(cache){
//                         cache.put(event.request.url, res.clone());
//                         return res;
//                     });
//             })
//             .catch(function(err){
//                 return caches.match(event.request);
//             })
//     );
// });

//Cache then network strategy
self.addEventListener('fetch', function(event){
    var url = 'https://pwagram-1e19f.firebaseio.com/posts';
    if(event.request.url.indexOf(url) > -1){
        event.respondWith(
            fetch(event.request)
                .then(function(response){
                    var clonedRes = response.clone();
                    clearAllData('posts')
                        .then(function() {
                            return clonedRes.json();
                        })
                        .then(function(data){
                            for(var key in data){
                                writeData('posts', data[key]);
                            }
                        })
                    return response;
                })    
        );
    } else if(inInArray(event.request.url, STATIC_FILES)){
        event.respondWith(
            caches.match(event.request)
        )
    } else {
        event.respondWith(
            //Check if the response if present in the cache
            caches.match(event.request)
                .then(function(response){
                    if(response){
                        return response;
                    } 
                    //Fetch from web when not present in the cache and then store in the cache
                    else {
                        return fetch(event.request)
                            .then(function(res){
                                return caches.open(CACHE_DYNAMIC_NAME)
                                    .then(function(cache){
                                        // trimCache(CACHE_DYNAMIC_NAME, 20);
                                        cache.put(event.request.url, res.clone());
                                        return res;
                                    });
                            })
                            .catch(function(err){
                                return caches.open(CACHE_STATIC_NAME)
                                    .then(function(cache){
                                        if(event.request.headers.get('accept').includes('text/html')){
                                            return cache.match('/PWA/fallback.html');
                                        }
                                    });
                            });
                    }
                })
        );
    }
})

// self.addEventListener('sync', function(event){
//   console.log('[SW] Syncing posts', event);
//   if(event.tag === 'sync-new-posts'){
//       console.log('[SW] Syncing...');
//       event.waitUntil(
//           readAllData('sync-posts')
//             .then(function(data){
//                 for(var dt of data){
//                     fetch('https://us-central1-pwagram-1e19f.cloudfunctions.net/storePostData', {
//                         method: 'POST',
//                         headers: {
//                         'Content-Type': 'application/json',
//                         'Accept': 'application/json'
//                         },
//                         body: JSON.stringify({
//                         id: dt.id,
//                         title: dt.title,
//                         location: dt.location,
//                         image: 'https://firebasestorage.googleapis.com/v0/b/pwagram-1e19f.appspot.com/o/sf-boat.jpg?alt=media&token=e9389353-1039-46ac-876d-9b488944ed29'
//                         })
//                     })
//                     .then(function(res){
//                         console.log('Sent Data', res);
//                         if(res.ok){
//                             res.json()
//                                 .then(function(resData){
//                                     deleteItem('sync-posts', resData.id);
//                                 })
//                         }
//                     })
//                     .catch(function(err){
//                         console.log('Error while syncing!', err);
//                     })
//                 }
//             })
//       );
//   }
// })

self.addEventListener('sync', function(event) {
    console.log('[Service Worker] Background syncing', event);
    if (event.tag === 'sync-new-posts') {
      console.log('[Service Worker] Syncing new Posts');
      event.waitUntil( 
        // const client = await clients.get(event.clientId);
        // console.log(client);
        readAllData('sync-posts')
          .then(function(data) {
            for (var dt of data) {
              var postData = new FormData();
              postData.append('id', dt.id);
              postData.append('title', dt.title);
              postData.append('location', dt.location);
              postData.append('rawLocationLat', dt.rawLocation.lat);
              postData.append('rawLocationLng', dt.rawLocation.lng);
              postData.append('file', dt.picture, dt.id + '.png');
              fetch('https://us-central1-pwagram-1e19f.cloudfunctions.net/storePostData', {
                method: 'POST',
                body: postData
              })
                .then(function(res) {
                  console.log('Sent data', res);
                  if (res.ok) {
                      res.json()
                        .then(function(resData){
                            deleteItem('sync-posts', resData.id);
                        })
                  }
                })
                .catch(function(err) {
                  console.log('Error while sending data', err);
                });
            }
          })          
        );
    }
  });
  

function inInArray(string, array){
    for(var i=0; i<array.length; i++){
        if(array[i] === string){
            return true;
        }
    }
    return false;
}

self.addEventListener('notificationclick', function(event) {
    var notification = event.notification;
    var action = event.action;
    console.log("notification", notification);
    console.log("Event", event);
    
    if(action === 'confirm'){
        console.log('Confirm was chosen');
        notification.close();
    }
    else if(action === 'cancel'){
        console.log(action);
        notification.close();
    }
    else {
        event.waitUntil(
            clients.matchAll()
                .then(function(cls){
                    var client = cls.find(function(c) {
                        return c.visibilityState === 'visible';
                    });

                    if(client !== undefined){
                        client.navigate(notification.data.url);
                        client.focus();
                    } else {
                        clients.openWindow(notification.data.url);
                    }
                    notification.close();
                })
        )
    }
});

self.addEventListener('notificationclose', function(event){
    console.log("Notification was closed", event);
});

self.addEventListener('push', function(event){
    console.log('Push notification rcvd', event);
    var data = {title: 'New', content: 'Something new happened!', openURL: '/'}
    if(event.data){
        data = JSON.parse(event.data.text());
    }

    var options = {
        body: data.content,
        icon: '/PWA/src/images/icons/app-icon-96x96.png',
        badge : '/PWA/src/images/icons/app-icon-96x96.png',
        image: '/PWA/src/images/main-image-sm.jpg',
        data: {
            url: data.openURL
        }
    }

    event.waitUntil(
        self.registration.showNotification(data.title, options)
    );
})