var licensingABTest

function transformLicensing (obj) {
  obj = obj || {}
  obj.scriptopen = "<script"
  obj.scriptclose = "</script>"
  return obj  
}

function getOtherLicensingPlatforms () {
  return ['Facebook', 'Instagram', 'Vimeo']
}

function transformLicensingOtherPlatformsPage (obj) {
  obj = obj || {}
  obj.platforms = getOtherLicensingPlatforms()
  obj.email = isSignedIn() ? session.user.email : ''
  return obj
}

function transformLicensingContentCreators (obj, done) {
  obj = transformLicensing(obj)
  //Create the split test
  licensingABTest = new SplitTest({
    name: 'licensing-ab',
    dontCheckStarter: true,
    modifiers: {
      'a': function (_this) {
        obj.splitTestA = true
        obj.splitTestB = false
      },
      'b' : function (_this) {
        obj.splitTestA = false
        obj.splitTestB = true
      }
    },
    onStarted: function () {
      done(null, obj)
    }
  })
  licensingABTest.start()
}

function pickBackground(){
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
  var buyButtons = document.querySelectorAll('[role=licensing-cta]')
  buyButtons.forEach(function (btn) {
    btn.addEventListener('click', function (e) {
      licensingABTest.convert()
      return true
    })
  })
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

function copyCrediting (e, el){
  el.focus()
  el.select()
  document.execCommand('copy')
  toasty('Crediting copied to clipboard.')
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

function submitLicensingOtherPlatforms (e) {
  e.preventDefault()
  var data = getDataSet(e.target)

  data.type = "licensing_other_platforms"
  data.date = new Date().toISOString()

  var email = data.email

  if(!email || email.indexOf('@') <= 0) {
    return alert('Please enter a valid email')
  }

  var other = data.other
  if(!other) {
    var found = false
    var others = getOtherLicensingPlatforms()
    for(var i = 0; i < others.length; i++) {
      if(data[others[i]]) {
        found = true
        break
      }
    }

    if(!found) {
      alert('Please select at least one platform')
    }
  }
  if(isSignedIn()) {
    data.userId = session.user._id
  }
  requestWithFormData({
    url: 'https://submit.monstercat.com', 
    method: 'POST', 
    data: data
  }, function (err, obj, xhr) {
    if (err) return toasty(Error(err.message))
    else {
      toasty("Thanks, we'll let you know when those are available!")
      document.getElementById('submit-licensing-other-platforms').disabled = true
    }
  })
}