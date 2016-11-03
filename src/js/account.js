function saveAccount (e, el) {
  var data = getTargetDataSet(el, true, true)
  if (!data) return
  update('self', null, data, function (err, obj) {
    if (err) return window.alert(err.message)
    toasty(strings.accountUpdated)
    document.querySelector('[name="password"]').value = ""
    resetTargetInitialValues(el, obj)
  })
}

function saveAccountSettings (e, el) {
  var data = getTargetDataSet(el, true, true)
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
  console.log('data', data)
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

function updateBackground (e, el) {
  if (!lstore) return
  lstore.setItem('bgon', el.checked)
  bgmebro()
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
    reloadPage()
    toasty(strings.twoFactorEnabled)
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
  if (!o.twoFactorId) {
    o.enableTwoFactor = {
      countries: CountryCallingCodes
    }
  }
  o.hasGoldAccess = hasGoldAccess()
  o.endhost = endhost
  o.shopEmail = session.user.shopEmail ? session.user.shopEmail : session.user.email
  return o
}

function completedAccount () {
  scrollToHighlightHash()
}

function transformAccountSettings(obj) {
  obj.bgon = false
  if (lstore)
    obj.bgon = lstore.getItem('bgon') == 'true' ? true : false
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

