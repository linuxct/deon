function transformRedirectTo (obj) {
  obj = obj || {}
  var url = getRedirectTo()
  obj.redirectTo = encodeURIComponent(url)
  return obj
}

function transformSignIn (o) {
  o = transformRedirectTo(o)
  o.buying = getSignInBuying()
  trackSignUpEvents();
  return o
}

function submitSignIn (e, el) {
  var data = getTargetDataSet(el);
  signIn(data, function (err, obj, xhr) {
    if (err) return window.alert(err.message)
    if (xhr.status != 209)
      return onSignIn()
    go('/authenticate-token')
  })
}

function signIn (data, done) {
  data.password = data.password.toString();
  requestJSON({
    url: endhost + '/signin',
    method: 'POST',
    withCredentials: true,
    data: data
  }, done)
}

function authenticateTwoFactorToken (e, el) {
  requestJSON({
    url: endhost + '/signin/token',
    method: 'POST',
    data: getTargetDataSet(el),
    withCredentials: true
  }, function (err, obj, xhr) {
    if (err) return window.alert(err.message)
    onSignIn()
  })
}

function resendTwoFactorToken (e, el) {
  requestJSON({
    url: endhost + '/signin/token/resend',
    method: 'POST',
    withCredentials: true
  }, function (err, obj, xhr) {
    if (err) return window.alert(err.message)
    toasty(strings.tokenResent)
  })
}

function onSignIn(done) {
  if(!done) {
    done = function () {
      go(getRedirectTo());
    }
  }
  getSession(function (err, sess) {
    if (err) return window.alert(err.message)
    session = sess
    trackUser()
    renderHeader()
    renderHeaderMobile()
    done();
  })
}

function signOut (e, el) {
  requestJSON({
    url: endhost + '/signout',
    method: 'POST',
    withCredentials: true
  }, function (err, obj, xhr) {
    if (err) return window.alert(err.message)
    session.user = null
    untrackUser()
    renderHeader()
    renderHeaderMobile()
    go("/")
  })
}

function recoverPassword (e, el) {
  var data = getTargetDataSet(el)
  data.returnUrl = location.protocol + '//' + location.host + '/reset-password?key=:code'
  requestJSON({
    url: endhost + '/password/send-verification',
    method: 'POST',
    withCredentials: true,
    data: data
  }, function (err, obj, xhr) {
    if (err) return window.alert(err.message)
    window.alert(strings.passwordResetEmail)
  })
}

function transformPasswordReset (obj) {
  obj = obj || {};
  var key = queryStringToObject(window.location.search).key;
  obj.missingKey = !key;
  return obj;
}

function updatePassword (e, el) {
  var data = getTargetDataSet(el)
  if (!data.password) return window.alert(strings.passwordMissing)
  if (data.password != data.confirmPassword) return window.alert(strings.passwordDoesntMatch)
  data.code = queryStringToObject(window.location.search).key
  requestJSON({
    url: endhost + '/password/reset',
    method: 'POST',
    withCredentials: true,
    data: data
  }, function (err, obj, xhr) {
    if (err) return window.alert(err.message)
    window.alert(strings.passwordReset)
    go('/signin')
  })
}

function signUp (data, where, done) {
  data.password = data.password.toString();
  requestJSON({
    url: endpoint + where,
    method: 'POST',
    withCredentials: true,
    data: data
  }, function (err, obj, xhr) {
    if(err) {
      return done(err);
    }
    onSignIn(done);
  });
}

function signUpAt (e, el, where) {
  var data = getTargetDataSet(el);
  signUp(data, where, function (err, obj, xhr) {
    if (err) return window.alert(err.message)
    go(getRedirectTo())
  });
}

function validateSignUp (data) {
  if(!data.googleMapsPlaceId) {
    alert('Please enter your location')
    return
  }

  return true
}

function submitSignUp (e, el) {
  var data = getTargetDataSet(el)
  if(!validateSignUp(data)) return
  signUpAt(e, el, '/signup')
}

function getRedirectTo () {
  return queryStringToObject(window.location.search).redirect || "/"
}

function getSignInBuying () {
  var redirectTo = getRedirectTo()
  var buying = false

  if(redirectTo.substr(0, '/account/services'.length) == '/account/services') {
    var qos = redirectTo.substr(redirectTo.indexOf('?')+1)
    var qo = queryStringToObject(qos)
    buying = qo
    if(qo.ref == 'gold') {
      buying.gold = true
    }
  }

  return buying
}

function transformSignUp () {
  var redirectTo = getRedirectTo()
  var buying = getSignInBuying()

  obj = {
    countries: getAccountCountries(),
    buying: buying,
    redirectTo: encodeURIComponent(redirectTo)
  }

  var qo = queryStringToObject(window.location.search)

  if(qo.email) {
    obj.email = qo.email
  }

  if(qo.location) {
    obj.placeNameFull = qo.location
  }

  if(qo.promotions || qo.location) {
    obj.emailOptIns = {
      promotions:true
    }
  }

  return obj
}

function mapConfirmSignup () {
  var obj = queryStringToObject(window.location.search)
  if (!Object.keys(obj).length) return
  obj.countries = getAccountCountries()
  if(obj.email == 'undefined') {
    obj.email = ''
  }
  return obj
}

function completedSignUp () {
  google.maps.event.addDomListener(window, 'load', initLocationAutoComplete);
  trackSignUpEvents();
  initLocationAutoComplete()
}

function trackSignUpEvents () {
  var redirectTo = getRedirectTo();
  if(redirectTo == '/account/services?ref=gold') {
    recordSubscriptionEvent('Redirect to Sign Up', 'Gold Redirect to Signup')
  }
}