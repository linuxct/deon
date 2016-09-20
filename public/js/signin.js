function transformRedirectTo (obj) {
  obj = obj || {}
  var url = getRedirectTo()
  obj.redirectTo = encodeURIComponent(url)
  return obj
}

function transformSignIn (o) {
  o = transformRedirectTo(o)
  return o
}

function signIn (e, el) {
  requestJSON({
    url: endhost + '/signin',
    method: 'POST',
    withCredentials: true,
    data: getTargetDataSet(el)
  }, function (err, obj, xhr) {
    if (err) return window.alert(err.message)
    if (xhr.status != 209)
      return onSignIn()
    go('/authenticate-token')
  })
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

function onSignIn() {
  getSession(function (err, sess) {
    if (err) return window.alert(err.message)
    session = sess
    trackUser()
    renderHeader()
    go(getRedirectTo())
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

function updatePassword (e, el) {
  var data = getTargetDataSet(el)
  if (!data.password) return window.alert(strings.passwordMissing)
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


function signUpAt (e, el, where) {
  requestJSON({
    url: endpoint + where,
    method: 'POST',
    withCredentials: true,
    data: getTargetDataSet(el)
  }, function (err, obj, xhr) {
    if (err) return window.alert(err.message)
    getSession(function (err, sess) {
      if (err) return window.alert(err.message)
      session = sess
      renderHeader()
      go(getRedirectTo())
    })
  })
}

function signUp (e, el) {
  signUpAt(e, el, '/signup')
}

function getRedirectTo() {
  return queryStringToObject(window.location.search).redirect || "/"
}

function mapSignup () {
  var redirectTo = getRedirectTo()
  var buying = false

  if(redirectTo.substr(0, '/account/services'.length) == '/account/services') {
    var qos = redirectTo.substr(redirectTo.indexOf('?')+1)
    var qo = queryStringToObject(qos)
    buying = qo
  }

  return {
    countries: getAccountCountries(),
    buying: buying,
    redirectTo: encodeURIComponent(redirectTo)
  }
}

function mapConfirmSignup () {
  var obj = queryStringToObject(window.location.search)
  if (!Object.keys(obj).length) return
  obj.countries = getAccountCountries()
  return obj
}
