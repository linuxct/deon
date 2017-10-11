function transformSubmittedAccountData (data) {
  var str = data.birthday_year + '-' + data.birthday_month + '-' + data.birthday_day;
  if(!data.birthday_year || data.birthday_year <= 1900) {
    data.birthday = null;
  }
  else {
    data.birthday = new Date(str);
  }
  delete data.birthday_day;
  delete data.birthday_month;
  delete data.birthday_year;
  return data;
}

function validateAccountData (data, exclude) {
  exclude = exclude || {};
  var errors = [];
  if(!exclude.birthday) {
    if(!data.birthday || data.birthday.toString() == 'Invalid Date' || data.birthday.getFullYear() < 1900 || data.birthday.getFullYear() > new Date().getFullYear()) {
      errors.push('Invalid birthday entered');
    }
  }
  if(!exclude.location) {
    if(!data.googleMapsPlaceId) {
      errors.push('Location is required');
    }
  }
  return errors;
}

function saveAccount (e, el) {
  var data = getTargetDataSet(el, true, true)
  data = transformSubmittedAccountData(data);
  if (!data) return
  var wasLegacy = isLegacyLocation()
  var errors = validateAccountData(data);
  if(errors.length > 0) {
    errors.forEach(function (err) {
      toasty(new Error(err));
    })
    return
  }
  update('self', null, data, function (err, obj) {
    if (err) return window.alert(err.message)
    toasty(strings.accountUpdated)
    document.querySelector('[name="password"]').value = ""
    resetTargetInitialValues(el, obj)
    loadSession(function (err, obj) {
      if(wasLegacy && !isLegacyLocation()) {
        reloadPage()
      }
      completeProfileNotice.start();
    })
  })
}

function saveAccountSettings (e, el) {
  var data = getTargetDataSet(el, false, true)
  if (!data) return
  update('self/settings', null, data, function (err, obj) {
    if (err) return window.alert(err.message)
    toasty(strings.settingsUpdated)
    session.settings = obj
    resetTargetInitialValues(el, obj)
  })
}

function saveShopEmail (e, el) {
  var data = getTargetDataSet(el, true, true)
  if (!data) return
  update('self', null, data, function (err, obj) {
    if (err) return window.alert(err.message)
    toasty(strings.shopEmailUpdated)
    session.user.shopEmail = data.shopEmail
  })
}
function saveRedditUsername (e, el) {
  var data = getTargetDataSet(el, false, true)
  if (!data) {
    data = {redditUsername: null}
  }
  requestJSON({
    url: endpoint + '/self/update-reddit',
    method: 'PUT',
    data: data,
    withCredentials: true
  }, function (err, obj, xhr) {
    if (err) return window.alert(err.message)
    toasty('Flair set')
    session.user.redditUsername = data.redditUsername
  })
}

function enableTwoFactor (e, el) {
  var data = getTargetDataSet(el, false, true)
  if (!data) return
  data.number = String(data.number)
  requestJSON({
    url: endpoint + '/self/two-factor',
    method: 'PUT',
    data: data,
    withCredentials: true
  }, function (err, obj, xhr) {
    if (err) return window.alert(err.message)
    window.location.hash = '#two-factor'
    reloadPage()
    toasty(strings.twoFactorPending)
  })
}

function confirmTwoFactor (e, el) {
  var data = getTargetDataSet(el, false, true)
  if (!data) return
  data.number = String(data.number)
  requestJSON({
    url: endpoint + '/self/two-factor/confirm',
    method: 'PUT',
    data: data,
    withCredentials: true
  }, function (err, obj, xhr) {
    if (err) return window.alert(err.message)
    reloadPage()
    window.location.hash = '#two-factor'
    toasty(strings.twoFactorConfirmed)
  })
}

function disableTwoFactor (e, el) {
  requestJSON({
    url: endpoint + '/self/two-factor/disable',
    method: 'PUT',
    withCredentials: true
  }, function (err, obj, xhr) {
    if (err) return window.alert(err.message)
    reloadPage()
    toasty(strings.twoFactorDisabled)
  })
}

function mapAccount (o) {
  o.countries = getAccountCountries(o.location)
  if (!o.twoFactorId && !o.pendingTwoFactorId) {
    o.enableTwoFactor = {
      countries: CountryCallingCodes
    }
    o.twoFactor = false
  }
  else if(o.pendingTwoFactorId) {
    o.confirmingTwoFactor = true
    o.twoFacotr = false
  }
  else if(o.twoFactorId) {
    o.twoFactor = true
  }
  if(o.birthday) {
    var date = new Date(o.birthday);
    o.birthday_year = date.getUTCFullYear();
    o.birthday_day = ('0' + (date.getUTCDate()).toString()).substr(-2);
    o.birthday_month = ('0' + (date.getUTCMonth() + 1).toString()).substr(-2);
  }
  o.hasGoldAccess = hasGoldAccess()
  o.endhost = endhost
  o.shopEmail = session.user.shopEmail ? session.user.shopEmail : session.user.email
  o.locationLegacy = isLegacyLocation()
  o.emailOptIns = transformEmailOptins(o.emailOptIns)
  return o
}

function transformEmailOptins (optinsArray) {
  if(!optinsArray) return {}
  return optinsArray.reduce(function (atlas, value) {
    atlas[value.type] = value.in
    return atlas
  }, {})
}

function completedAccount () {
  scrollToHighlightHash()
  hookValueSelects();
  initLocationAutoComplete()
}

function transformVerify (obj) {
  obj.code = window.location.pathname.split('/')[2]
  obj.isSignedIn = isSignedIn()
  return obj
}

function completedVerify () {
  initLocationAutoComplete()
}

function verifyInvite (e, el) {
  var data = getTargetDataSet(el)

  if(!data.googleMapsPlaceId) {
    return alert('Location is required.')
  }

  if(!data.password) {
    return alert('Password is required.')
  }

  requestJSON({
    url: endhost + '/invite/complete',
    method: 'POST',
    data: data
  }, function (err, result) {
    if(err) {
      return toasty(new Error(err))
    }
    toasty('Account verified, please sign in')
    go('/signin')
  })
}

function transformAccountSettings (obj) {
  obj.downloadOptions = transformAccountSettings.options.map(function (opt) {
    opt = cloneObject(opt)
    opt.selected = opt.value == obj.preferredDownloadFormat
    return opt
  })
  return obj
}

transformAccountSettings.options = [
  {
    name: "MP3 320kbps",
    value: "mp3_320"
  }, {
    name: "MP3 128kbps",
    value: "mp3_128"
  }, {
    name: "MP3 V0",
    value: "mp3_v0"
  }, {
    name: "MP3 V2",
    value: "mp3_v2"
  }, {
    name: "WAV",
    value: "wav"
  }, {
    name: "FLAC",
    value: "flac"
  },
]

