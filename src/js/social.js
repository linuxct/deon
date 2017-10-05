function initSocials() {
  if (typeof gapi == 'undefined') return
  gapi.load('auth2', function() {
    gapi.auth2.init({
        client_id: "1045912784861-pq08ad3cuglsfta2cea54ffurpmihpr9.apps.googleusercontent.com",
        scope: "profile email"
    })
  })
}

function fbAsyncInit () {
  if (typeof FB == 'undefined') return
  FB.init({
    appId: '282352068773785',
    cookie: true,
    version: 'v2.5'
  })
}

function sendAccessToken(where, done) {
  function handle(res) {
    if (res.status != 'connected' || !res.authResponse)
      return done(Error('User did not authorize.'))

    var data = {
      token: res.authResponse.accessToken
    }
    requestJSON({
      url: endpoint + where,
      method: 'POST',
      data: data,
      withCredentials: true
    }, function (err, obj, xhr) {
      done(err, xhr ? xhr.status : null)
    })
  }

  FB.login(handle)
}

function sendIdToken(token, where, done) {
  var data = {
    token: token
  }
  requestJSON({
    url: endpoint + where,
    method: 'POST',
    data: data,
    withCredentials: true
  }, function (err, obj, xhr) {
    done(err, xhr ? xhr.status : null)
  })
}

function enableGoogleSignin (e, el) {
  if (!gapi.auth2) return

  var auth = gapi.auth2.getAuthInstance()
  auth.signIn()
  .then(function (user) {
    sendIdToken(user.getAuthResponse().id_token, '/self/google/enable', function (err) {
      if (err) return window.alert(err.message)
      window.location.reload()
    })
  })
}

/**
 * This is fired by a user clicking the Facebook button
 */
function clickSignInFacebook (e, el, done) {
  signInFacebook(onSocialSignIn);
}

/**
 * This is fired by a user clicking the Google button
 */
function clickSignInGoogle (e, el, done) {
  signInGoogle(onSocialSignIn);
}

function signInGoogle (done) {
  if (!gapi.auth2) return
  var auth = gapi.auth2.getAuthInstance()
  auth.signIn()
  .then(function (user) {
    sendIdToken(user.getAuthResponse().id_token, '/google/signin', done)
  })
}

function signInFacebook (done) {
  sendAccessToken('/facebook/signin', done)
}

function onSocialSignIn (err, status) {
  if (err) return window.alert(err.message)
  if (status === 303)
    return window.confirm(strings.noAccount) ? go('/sign-up') : ''

  onSignIn()
}

function enableFacebookSignin (e, el) {
  sendAccessToken('/self/facebook/enable', function (err) {
    if (err) return window.alert(err.message)
    if (status === 303) return go('/sign-up')
    window.location.reload()
  })
}

function signUpSocial (e, el) {
  var data = getTargetDataSet(el)
  var where = data.submitWhere
  signUpAt(e, el, where)
}

function signUpGoogle (opts, found) {
  opts = opts || {};
  if (!gapi.auth2) return
  var auth = gapi.auth2.getAuthInstance()
  auth.signIn()
  .then(function (user) {
    signInGoogle(function (err, status){
      if(status == 200) {
        if(typeof(found) == 'function') {
          return found(null, user);
        }
        //They are trying to sign up for a new account using Google, but we already have an account attachedto that Google account
        toasty('Account found, reloading page');
        return location.reload();
      }
      else if(status == 303) {
        var obj = {
          name: user.getBasicProfile().getName(),
          email: user.getBasicProfile().getEmail(),
          token: user.getAuthResponse().id_token,
          submitWhere: '/google/signup'
        }
        if(opts.redirect) {
          obj.redirect = opts.redirect
        }
        return go('/confirm-sign-up?' + objectToQueryString(obj))
      }
    })
  })
}

function clickSignUpFacebook (e, el) {
  signUpFacebook({
    redirect: getRedirectTo()
  });
}

function clickSignUpGoogle (e, el){
  signUpGoogle({
    redirect: getRedirectTo()
  });
}

function signUpFacebook (opts, found) {
  opts = opts || {};
  function handle(res) {
    if (res.status != 'connected' || !res.authResponse)
      return

    FB.api('/me?fields=name,email', function (ares) {
      signInFacebook(function (err, status) {
        if(status == 200) {
          if(typeof(found) == 'function') {
            return found(null, ares);
          }
          //They are trying to sign up for a new account using Facebook, but we already have an account attachedto that Facebook account
          toasty('Account found, reloading page');
          return location.reload();
        }
        else {
          var obj = {
            name: ares.name,
            email: ares.email,
            token: res.authResponse.accessToken,
            submitWhere: '/facebook/signup'
          }
          if(opts.redirect) {
            obj.redirect = opts.redirect
          }
          return go('/confirm-sign-up?' + objectToQueryString(obj))
        }
      });
    });
  }

  FB.login(handle, {scope: 'public_profile,email'})
}

function unlinkFacebook (e, el) {
  unlinkAccount('facebook')
}

function unlinkGoogle (e, el) {
  unlinkAccount('google')
}

function unlinkAccount (which) {
  requestJSON({
    url: endpoint + '/self/' + which + '/unlink',
    method: 'POST',
    withCredentials: true
  }, function (err, obj, xhr) {
    if (err) return window.alert(err.message)
    window.location.reload()
  })
}
