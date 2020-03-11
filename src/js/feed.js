var shareImageButton = document.querySelector('#share-image-button');
var createPostArea = document.querySelector('#create-post');
var closeCreatePostModalButton = document.querySelector('#close-create-post-modal-btn');
var sharedMoments = document.querySelector('#shared-moments');
var form = document.querySelector('form');
var titleInput = document.querySelector('#title');
var locationInput = document.querySelector('#location');
var videoPlayer = document.querySelector('#player');
var canvasElement = document.querySelector('#canvas');
var captureButton = document.querySelector('#capture-btn');
var imagePicker = document.querySelector('#image-picker');
var imagePickerArea = document.querySelector('#pick-image');
var picture;
var locationButton = document.querySelector('#location-btn');
var locationLoader = document.querySelector('#location-loader');
var fetchedLocation;

function initializeMedia() {
  if(!('mediaDevices' in navigator)) {
    navigator.mediaDevices = {};
  }

  if(!('getUserMedia' in navigator.mediaDevices)) {
    navigator.mediaDevices.getUserMedia = function(constraints) {
      var getUserMedia = navigator.webkitGetUserMedia || navigator.mozGetUserMedia;

      if(!getUserMedia) {
        return Promise.reject(new Error('getUserMedia is not implemented!'));
      }

      return new Promise(function(resolve, reject){
        getUserMedia.call(navigator, constraints, resolve, reject);
      });
    }
  }
  navigator.mediaDevices.getUserMedia({video : {facingMode : "environment"}})
    .then(function(stream){
      videoPlayer.srcObject = stream;
      videoPlayer.style.display = 'block';
    })
    .catch(function(err){
      imagePickerArea.style.display = 'block';
    })
}

locationButton.addEventListener('click', function(event){
  if(!('geolocation' in navigator)){
    return;
  }

  locationButton.style.display = 'none';
  locationLoader.style.display = 'block';
  navigator.geolocation.getCurrentPosition(function(position) {
    locationButton.style.display = 'inline';
    locationLoader.style.display = 'none';
    fetchedLocation = {lat: position.coords.latitude, lng: position.coords.longitude};
    locationInput.value = "Latitude: "+fetchedLocation.lat + " Longitude: " + fetchedLocation.lng;
    document.querySelector('#manual-location').classList.add('is-focused');
  }, function(err) {
    console.log(err);
    locationButton.style.display = 'inline';
    locationLoader.style.display = 'none';
    alert("Could not fetch location. Please enter manually!");
    fetchedLocation = null;
  }, {timeout: 7000})
});

function initializeLocation() {
  if(!('geolocation' in navigator)){
    locationButton.style.display = 'none';
  }
}

captureButton.addEventListener('click', function() {
  canvasElement.style.display = 'block';
  videoPlayer.style.display = 'none';
  captureButton.style.display = 'none';
  var context = canvasElement.getContext('2d');
  context.drawImage(videoPlayer, 0, 0, canvas.width, videoPlayer.videoHeight / (videoPlayer.videoWidth / canvas.width));
  videoPlayer.srcObject.getVideoTracks().forEach(function(track){
    track.stop();
  });
  picture = dataURItoBlob(canvasElement.toDataURL());
})

imagePicker.addEventListener('change', function(event) {
  picture = event.target.files[0];
})

function openCreatePostModal() {
  // createPostArea.style.display = 'block';
  // setTimeout(function(){
    createPostArea.style.transform = 'translateY(0)';
    initializeMedia();
    initializeLocation();
  // }, 1);
  if (deferredPrompt){
    deferredPrompt.prompt();

    deferredPrompt.userChoice.then(function(choiceResult){
      console.log(choiceResult.outcome);

      if(choiceResult.outcome==='dismissed'){
        console.log('User cancelled installation');
      }
      else{
        console.log('User added to home screen');
      }
    });
    deferredPrompt = null;
  }

  // if('serviceWorker' in navigator){
  //   navigator.serviceWorker.getRegistrations()
  //     .then(function(registrations) {
  //       for(var i=0; i<registrations.length; i++){
  //         registrations[i].unregister();
  //       }
  //     });
  // }
}

function closeCreatePostModal() {
  // createPostArea.style.display = 'none';
  createPostArea.style.transform = 'translateY(100vh)';
  imagePickerArea.style.display = 'none';
  videoPlayer.style.display = 'none';
  locationButton.style.display = 'inline';
  locationLoader.style.display = 'none';
}

shareImageButton.addEventListener('click', openCreatePostModal);

closeCreatePostModalButton.addEventListener('click', closeCreatePostModal);

function clearCard() {
  while(sharedMoments.hasChildNodes()){
    sharedMoments.removeChild(sharedMoments.lastChild);
  }
}

function updateUI(data){
  clearCard();
  for(var i=0; i< data.length; i++){
    createCard(data[i]);
  }
}

function sendData(){
  var id = new Date().toISOString();
  var postData = new FormData();
  postData.append('id', id);
  postData.append('title', titleInput.value);
  postData.append('location', locationInput.value);
  postData.append('rawLocationLat', fetchedLocation.lat);
  postData.append('rawLocationLng', fetchedLocation.lng);
  postData.append('file', picture, id + '.png');
  fetch('https://us-central1-pwagram-1e19f.cloudfunctions.net/storePostData', {
    method: 'POST',
    body: postData
  })
  .then(function(res){
    console.log('Sent Data', res);
    getUpdatedData();
  })
}

function createCard(data) {
  var cardWrapper = document.createElement('div');
  cardWrapper.className = 'shared-moment-card mdl-card mdl-shadow--2dp';
  var cardTitle = document.createElement('div');
  cardTitle.className = 'mdl-card__title';
  cardTitle.style.backgroundImage = 'url(' + data.image + ')';
  cardTitle.style.backgroundSize = 'cover';
  cardTitle.style.height = '180px';
  cardWrapper.appendChild(cardTitle);
  var cardTitleTextElement = document.createElement('h2');
  cardTitleTextElement.style.color = 'white';
  cardTitleTextElement.className = 'mdl-card__title-text';
  cardTitleTextElement.textContent = data.title;
  cardTitle.appendChild(cardTitleTextElement);
  var cardSupportingText = document.createElement('div');
  cardSupportingText.className = 'mdl-card__supporting-text';
  cardSupportingText.textContent = data.location;
  cardSupportingText.style.textAlign = 'center';

  // var cardSaveButton = document.createElement('button');
  // cardSaveButton.textContent = 'Save';
  // cardSaveButton.addEventListener('click', onSaveButtonClick)
  // cardSupportingText.appendChild(cardSaveButton);
  
  cardWrapper.appendChild(cardSupportingText);
  componentHandler.upgradeElement(cardWrapper);
  sharedMoments.appendChild(cardWrapper);
}

// Not in use - Allows to cache content based on click event, on Demand
/*
function onSaveButtonClick(event){
  console.log('clicked');
  if('caches' in window){
    caches.open('user-requested')
      .then(function(cache){
        cache.addAll([
          'https://httpbin.org/get',
          '/src/images/sf-boat.jpg'
        ]);
      });
  }
}
*/

getUpdatedData();

function getUpdatedData(){
  var url = 'https://pwagram-1e19f.firebaseio.com/posts.json';
  var networkData = false;
    //Page fetching the data from web using SW
  fetch(url)
  .then(function(res){
    return res.json();
  })
  .then(function(data){
    networkData = true;
    console.log("From web", data);
    var dataArray = [];
    for(var key in data){
      dataArray.push(data[key]);
    }
    updateUI(dataArray);
  });


  //Page getting data from cache directly
  if('indexedDB' in window){
  readAllData('posts')
    .then(function(data){
      if(!networkData){
        console.log('From cache', data);
        updateUI(data);
      }
    })
  }
}

form.addEventListener('submit', function(event) {
  event.preventDefault();
  if(titleInput.value.trim() === '' || locationInput.value.trim() === ''){
    alert('Please enter valid data');
    return;
  }
  closeCreatePostModal();

  if('serviceWorker' in navigator && 'SyncManager' in window){
    navigator.serviceWorker.ready
      .then(function(sw) {
        var post = {
          id: new Date().toISOString(),
          title: titleInput.value,
          location: locationInput.value,
          picture: picture,
          rawLocation: fetchedLocation
        };
        writeData('sync-posts', post)
          .then(function() {
            sw.sync.register('sync-new-posts');
          })
          .then(function() {
            var snackbarContainer = document.querySelector('#confirmation-toast');
            var data = {message: 'Your post was saved for syncing!'};
            snackbarContainer.MaterialSnackbar.showSnackbar(data);
            titleInput.value = '';
            locationInput.value = '';
          })
          .catch(function(err){
            console.log(err);
          });
      });
  } else {
    sendData();
  }
})
