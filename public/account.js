function saveAccount (e, el) {
  var data = getTargetDataSet(el, true, true)
  if (!data) return
  update('self', null, data, function (err, obj) {
    if (err) return window.alert(err.message)
    window.alert(strings.accountUpdated)
    document.querySelector('[name="password"]').value = ""
    resetTargetInitialValues(el, obj)
  })
}

function saveAccountSettings (e, el) {
  var data = getTargetDataSet(el, true, true)
  if (!data) return
  update('self/settings', null, data, function (err, obj) {
    if (err) return window.alert(err.message)
    window.alert(strings.settingsUpdated)
    session.settings = obj
    resetTargetInitialValues(el, obj)
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
  return o
}
