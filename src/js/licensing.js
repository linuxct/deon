function transformLicensing (obj) {
  obj = obj || {}
  obj.scriptopen = "<script"
  obj.scriptclose = "</script>"
  return obj  
}

function pickBackground(){
  function randomChooser(n){
    return Math.floor(Math.random() * n+1);
  }
  var quantity = 5;
  var randomNumber = randomChooser(quantity);
  var word = "";
  var license = document.querySelector('#licensing');
  var words = ['first', 'second', 'third', 'fourth', 'fifth']
  license.classList.add(words[randomNumber-1])
}

function completedLicensing () {
  pickBackground() 
}

function completedContentCreatorLicensing () {
  pickBackground()
  scrollToHighlightHash()
}

function completedCommercialLicensing () {   
  pickBackground();
}

function submitCommercialLicensing (e, el) {
  e.preventDefault();
  var data = getTargetDataSet(el)
  data.date = new Date().toISOString()
  var fullname = data.fullName,
      email = data.email,
      songs = data.songs;
  var ef = document.querySelector('#errorForm')
  ef.classList.remove('shown')
  if (fullname && email && songs){
    requestWithFormData({
      url: "https://google-sheet.monstercat.com/1us0PqnmbgeCsrgDpYXIxEB3mX0VtzG-IwZjmwD2iqWI/3",
      data: data,
      method: 'POST'
    }, function (err, resp) {
      if(err) {
        ef.innerText = "There's been an error. Please try again later."
        ef.classList.add('shown')
        return 
      }
      else {
        ef.classList.remove('shown')
        document.querySelector('#submitBtn').value = 'Success!'
        document.querySelector('#submitBtn').classList.add('submitted')
      }

    })
  } else{
    ef.innerText = "Please fill out your name, email and the songs required."
    ef.classList.add('shown')
  }      
}

function showCrediting (e, el) {
  var type = el.getAttribute('credit-type')
  var credits = document.querySelectorAll('textarea.copycredits[credit-type]')
  for(var i = 0; i < credits.length; i++) {
    var c = credits[i]
    var t = credits[i].getAttribute('credit-type')
    credits[i].classList.toggle('hide', t != type)
  }
}

function openTrackLicensing (e, el) {
  openModal('track-licensing-modal', {
    trackId:   el.getAttribute('track-id'),
    releaseId: el.getAttribute('release-id'),
    signedIn: isSignedIn()
  })
}

function openReleaseLicensing (e, el) {
  openModal('release-licensing-modal', {
    releaseId: el.getAttribute('release-id'),
    signedIn: isSignedIn()
  })
}