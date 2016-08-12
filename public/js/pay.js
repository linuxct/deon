var STRIPE_PK = 'pk_live_4afTMPX9ckO9an6kq9zGz0QQ' //'pk_test_zZldjt2HNSnXVxLsv3XSjeI3'
var vendorPrices = {
  YouTube: {
    monthly: 1000,
    total: 20000
  },
  Twitch: {
    monthly: 500,
    total: 10000
  },
  Beam: {
    monthly: 500,
    total: 10000
  }
}

function isValidPayMethod (str, obj) {
  if (str != 'stripe' && str != 'paypal') return false
  if (typeof obj[str] != 'function') return false
  return true
}

function buyoutUrl (id) {
  var url = endpoint + '/self/whitelist/'
  if (id) url += id + '/'
  url += 'buyout'
  return url
}

function buyLicense (e, el) {
  var data = getTargetDataSet(el)
  if (!data.vendor) return
  if (!data.identity) return
  if (!data.amount) return
  if (!isValidPayMethod(data.method, buyLicense)) return
  buyLicense[data.method](data)
}

buyLicense.paypal = function buyLicensePayPal (data) {
  requestJSON({
    url: buyoutUrl(data.id),
    method: data.id ? 'PUT' : 'POST',
    withCredentials: true,
    data: {
      provider: 'paypal',
      returnUrl: location.origin + '/account/services/processing?type=buyout',
      cancelUrl: location.origin + '/account/services/canceled-payment',
      vendor: data.vendor,
      identity: data.identity
    }
  }, function (err, body, xhr) {
    if (err) {
      return recordErrorAndAlert(err, 'Buy License PayPal')
    }
    if (!body.redirect) {
      return recordErrorAndGo(Error('Missing paypal redirect'), 'Buy License PayPal', '/account/services/error')
    }
    window.location = body.redirect
  })
}

buyLicense.stripe = function buyLicenseStripe (data) {
  var handler = StripeCheckout.configure({
    key: STRIPE_PK,
    image: '/img/default.png',
    locale: 'auto',
    token: function(token) {
      requestJSON({
        url: buyoutUrl(data.id),
        method: data.id ? 'PUT' : 'POST',
        withCredentials: true,
        data: {
          provider: 'stripe',
          token: token.id,
          vendor: data.vendor,
          identity: data.identity
        }
      }, function (err, body, xhr) {
        if (err) {
          window.alert(err.message)
          return
        }
        go('/account/services/buyout/purchased')
      })
    }
  })

  handler.open({
    name: data.vendor + ' Whitelist',
    description: 'For "' + data.identity + '"',
    amount: data.amount,
    email: session.user.email,
    panelLabel: "Pay {{amount}}"
  })
}

function checkoutSubscriptions (e, el) {
  var els = toArray(document.querySelectorAll('[role="new-subs"] tr') || [])
  var subs = els.map(getDataSet)
  if (!subs.length) return
  var data = getTargetDataSet(el)
  if (!isValidPayMethod(data.method, checkoutSubscriptions)) return
  checkoutSubscriptions[data.method](data, subs)
}

checkoutSubscriptions.paypal = function checkoutSubscriptionsStripe (data, subs) {
  requestJSON({
    url: endpoint + '/self/subscription/services',
    method: 'POST',
    withCredentials: true,
    data: {
      provider: 'paypal',
      returnUrl: location.origin + '/account/services/processing?type=subscriptions',
      cancelUrl: location.origin + '/account/services/canceled-payment',
      services: subs
    }
  }, function (err, body, xhr) {
    if (err) {
      return recordErrorAndAlert(err, 'Checkout Subscriptions PayPal')
    }
    if (!body.redirect) {
      return recordErrorAndGo(Error('Missing paypal redirect'), 'Checkout Subscriptions PayPal', '/account/services/error')
    }
    window.location = body.redirect
  })
}

checkoutSubscriptions.stripe = function checkoutSubscriptionsStripe (data, subs) {
  var handler = StripeCheckout.configure({
    key: STRIPE_PK,
    image: '/img/default.png',
    locale: 'auto',
    token: function(token) {
      // TODO handle temporary UX wait here
      requestJSON({
        url: endpoint + '/self/subscription/services',
        method: 'POST',
        withCredentials: true,
        data: {
          provider: 'stripe',
          token: token.id,
          services: subs
        }
      }, function (err, body, xhr) {
        if (err) return recordErrorAndAlert(err, 'Checkout Subscriptions Stripe')
        go('/account/services/subscribed')
      })
    }
  })
  var cost = getTotalCheckoutCostFromSubs(subs)
  handler.open({
    name: 'Monstercat',
    description: 'Subscription Services',
    amount: cost,
    email: session.user.email,
    panelLabel: "Subscribe {{amount}}"
  })
}

function cancelLicenseSubscription (e, el) {
  if (!window.confirm(strings.cancelWhitelistSub)) return
  var id = el.getAttribute('whitelist-id')
  // TODO handle wait UX
  requestJSON({
    url: endpoint + '/self/whitelist/' + id + '/cancel',
    method: 'PUT',
    withCredentials: true
  }, function (err, obj, xhr) {
    if (err) return recordErrorAndAlert(err, 'Cancel License Subscription')
    go('/account/services/unsubscribed')
  })
}

function resumeLicenseSubscription (e, el) {
  var data = getTargetDataSet(el)
  openModal('resume-whitelist', data)
}

function resumeLicenseConfirm (e, el) {
  var data = getTargetDataSet(el)
  if (!data.id) return
  if (!data.vendor) return
  if (!data.identity) return
  if (!data.amount) return
  if (!isValidPayMethod(data.method, resumeLicenseConfirm)) return
  resumeLicenseConfirm[data.method](data)
}

resumeLicenseConfirm.paypal = function resumeLicenseConfirmPayPal (data) {
  requestJSON({
    url: endpoint + '/self/whitelist/' + data.id + '/resume',
    method: 'PUT',
    withCredentials: true,
    data: {
      provider: 'paypal',
      returnUrl: location.origin + '/account/services/processing?type=resume',
      cancelUrl: location.origin + '/account/services/canceled-payment'
    }
  }, function (err, body, xhr) {
    if (err)
      return recordErrorAndAlert(err, 'Resume License Confirm PayPal')
    if (!body.redirect)
      return recordErrorAndGo(Error('Missing PayPal redirect.'), 'Resume License Confirm PayPal', '/account/services/error')
    window.location = body.redirect
  })
}

resumeLicenseConfirm.stripe = function resumeLicenseConfirmStripe (data) {
  var handler = StripeCheckout.configure({
    key: STRIPE_PK,
    image: '/img/default.png',
    locale: 'auto',
    token: function(token) {
      // TODO handle temporary UX wait here
      requestJSON({
        url: endpoint + '/self/whitelist/' + data.id + '/resume',
        method: 'PUT',
        withCredentials: true,
        data: {
          provider: 'stripe',
          token: token.id
        }
      }, function (err, body, xhr) {
        if (err)
          return recordErrorAndAlert(err, 'Resume License Confirm Stripe')
        go('/account/services/subscribed')
      })
    }
  })
  handler.open({
    name: 'Whitelist Subscription',
    amount: data.amount,
    description: data.vendor + ' - ' + data.identity,
    email: session.user.email,
    panelLabel: "Resubscribe {{amount}}"
  })
}

function completedProcessing () {
  var obj     = queryStringToObject(location.search)
  var uri     = null
  var forward = null
  if (obj.type == 'buyout') {
    uri     = 'whitelist/buyout/complete'
    forward = '/account/services/buyout/purchased'
  }
  if (obj.type == 'subscriptions' || obj.type == 'resume') {
    uri     = 'subscription/services/complete'
    forward = '/account/services/subscribed'
  }
  if (!uri) {
    // TODO display in page and check all data was recieved
    return window.alert('An error occured because there was no data recieved to move forward.')
  }
  requestJSON({
    url: endpoint + '/self/' + uri,
    withCredentials: true,
    method: 'POST',
    data: {
      token: obj.token,
      payerId: obj.PayerID
    }
  }, function (err, obj, xhr) {
    if (err)
      return recordErrorAndAlert(err, 'Complete Processing')
    go(forward)
  })
}

function unsubscribeGold (e, el) {
  if (!window.confirm(strings.unsubscribeGold))
    return
  requestJSON({
    url: endpoint + '/self/subscription/gold/cancel',
    withCredentials: true,
    method: "POST"
  }, function (err, body, xhr) {
    if (err)
      return recordErrorAndAlert(err, 'Unsubscribe Gold')
    go('/account/services/unsubscribed')
  })
}

function redirectServices (e, el) {
  setTimeout(function () {
    window.location = location.origin + '/account/services'
  }, 5000)
}

function getTotalCheckoutCostFromSubs (arr) {
  return arr.reduce(function (prev, cur) {
    return prev + cur.amount
  }, 0)
}

function getTotalCheckoutCost (arr) {
  var els = toArray(document.querySelectorAll('[role="new-subs"] tr') || [])
  return getTotalCheckoutCostFromSubs(els.map(getDataSet))
}

/* UI Stuff */

function updateTotalCheckoutCost () {
  var cost = getTotalCheckoutCost()
  var el = document.querySelector('[role="total-cost"]')
  el.textContent = (cost / 100).toFixed(2)
  if (cost <= 0) {
    showNewSubscriptions(false)
  }
}

function showNewSubscriptions (value) {
  if (typeof value == 'undefined') value = true
  var method = value ? 'remove' : 'add'
  document.querySelector('#new-subscriptions').classList[method]('hide')
}

function reachedMaxCartSubscriptions () {
  return (document.querySelectorAll('[role="new-subs"] tr') || []).length >= 5
}

function addSub (obj) {
  var t = getTemplateEl('subscription-row')
  var container = document.querySelector('[role="new-subs"]')
  var div = document.createElement('tbody')
  render(div, t.textContent, obj)
  container.appendChild(div.firstElementChild)
  updateTotalCheckoutCost()
  showNewSubscriptions()
}

function removeSub (e, el) {
  e.path.forEach(function (el) {
    if (el.tagName && el.tagName.toLowerCase() == 'tr')
      el.parentElement.removeChild(el)
  })
  updateTotalCheckoutCost()
}

function subscribeGold (e, el) {
  if (reachedMaxCartSubscriptions())
    return window.alert(strings.cart5)
  if (document.querySelector('[type="hidden"][name="type"][value="gold"]'))
    return window.alert(strings.goldInCart)
  var data = getTargetDataSet(el) || {}
  var opts = {
    name: "Gold Membership",
    cost: "5.00",
    fields: [
      { key: "name", value: "Gold Membership" },
      { key: "type", value: "gold" },
      { key: "amount", value: 500 }
    ]
  }
  var fin = function (opts) {
    addSub(opts)
    toasty(strings.goldAdded)
  }
  if (data.trialCode) {
    el.classList.add('working')
    el.disabled = true
    return requestJSON({
      url: endpoint + "/services/gold/code/" + data.trialCode
    }, function (err, obj, xhr) {
      el.classList.remove('working')
      el.disabled = false
      if (xhr.status == 404) return window.alert(strings.codeNotFound)
      if (err) return window.alert(err.message)
      if (!obj) return window.alert(strings.error)
      if (!obj.valid) return window.alert(strings.codeNotValid)
      opts.name += " (" + obj.code + ' - ' + obj.durationDays + " Free Days)"
      opts.fields.push({ key: "trialCode", value: obj.code })
      fin(opts)
    })
  }
  fin(opts)
}

function alreadyInCart (data) {
  return !!document.querySelector('[type="hidden"][value="'+data.vendor+'"]') &&
    !!document.querySelector('[type="hidden"][value="'+data.identity+'"]')
}

function subscribeNewLicense (e, el) {
  if (reachedMaxCartSubscriptions())
    return window.alert(strings.cart5)

  var data = getTargetDataSet(el)
  if (!data) return
  if (!data.vendor) return
  if (!data.identity) return

  if (alreadyInCart(data))
    return window.alert(strings.licenseInCart)

  el.classList.add('working')
  el.disabled = true
  requestJSON({
    url: endpoint + '/whitelist/status/?vendor=' + data.vendor.toLowerCase() + '&identity=' + data.identity
  }, function (err, obj, xhr) {
    el.classList.remove('working')
    el.disabled = false
    if (err) return window.alert(err.message)
    if (!obj) return window.alert(strings.error)
    if (!obj.valid) return window.alert(strings.invalidIdentity)
    var name = "Whitelisting for " + data.identity + " on " + data.vendor
    addSub({
      name: name,
      cost: (vendorPrices[data.vendor].monthly / 100).toFixed(2),
      fields: [
        { key: "amount", value: vendorPrices[data.vendor].monthly },
        { key: "type", value: 'whitelist'},
        { key: "vendor", value: data.vendor },
        { key: "identity", value: data.identity }
      ]
    })
    toasty(strings.whitelistAdded)
  })
}

function selectServiceBuyout (e, el) {
  var id = el.value
  if (!vendorPrices[id]) return

  document.querySelector('[role="buyout-price"]').textContent = '$' + (vendorPrices[id].total / 100).toFixed(2)
}