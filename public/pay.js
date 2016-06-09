var STRIPE_PK = 'pk_test_zZldjt2HNSnXVxLsv3XSjeI3'

function isValidPayMethod (str, obj) {
  if (str != 'stripe' && str != 'paypal') return false
  if (typeof obj[str] != 'function') return false
  return true
}

function buyoutUrl (id) {
  var url = endpoint + '/self/whitelist/'
  if (id) url += id
  url += '/buyout'
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
      returnUrl: location.origin + '/services/processing?type=buyout',
      cancelUrl: location.origin + '/services/canceled-payment',
      vendor: data.vendor,
      identity: data.identity
    }
  }, function (err, body, xhr) {
    if (err) return window.alert(err.message)
    window.location = body.redirect
  })
}

buyLicense.stripe = function buyLicenseStripe (data) {
  var handler = StripeCheckout.configure({
    key: STRIPE_PK,
    image: '/default.png',
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
        go('/sevices/buyout/purchased')
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
      returnUrl: location.origin + '/services/processing?type=subscriptions',
      cancelUrl: location.origin + '/services/canceled-payment',
      services: subs
    }
  }, function (err, body, xhr) {
    if (err) return window.alert(err.message)
    window.location = body.redirect
  })
}

checkoutSubscriptions.stripe = function checkoutSubscriptionsStripe (data, subs) {
  var handler = StripeCheckout.configure({
    key: STRIPE_PK,
    image: '/default.png',
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
        if (err) {
          window.alert(err.message)
          return
        }
        go('/services/subscribed')
      })
    }
  })

  var cost = subs.reduce(function (prev, cur) {
    return prev + cur.amount
  }, 0)
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
    if (err) return window.alert(err.message)
    go('/services/unsubscribed')
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
      returnUrl: location.origin + '/services/processing?type=resume',
      cancelUrl: location.origin + '/services/canceled-payment'
    }
  }, function (err, body, xhr) {
    if (err) return window.alert(err.message)
    window.location = body.redirect
  })
}

resumeLicenseConfirm.stripe = function resumeLicenseConfirmStripe (data) {
  var handler = StripeCheckout.configure({
    key: STRIPE_PK,
    image: '/default.png',
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
        if (err) {
          window.alert(err.message)
          return
        }
        go('/services/subscribed')
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
    forward = '/services/buyout/purchased'
  }
  if (obj.type == 'subscriptions' || obj.type == 'resume') {
    uri     = 'subscription/services/complete'
    forward = '/services/subscribed'
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
    if (err) window.alert(err.message)
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
    if (err) {
      window.alert(err.message)
      return
    }
    go('/services/unsubscribed')
  })
}

function redirectServices (e, el) {
  setTimeout(function () {
    window.location = location.origin + '/services'
  }, 5000)
}

/* UI Stuff */

function showNewSubscriptions () {
  document.querySelector('#new-subscriptions').classList.remove('hide')
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
}

function removeSub (e, el) {
  e.path.forEach(function (el) {
    if (el.tagName && el.tagName.toLowerCase() == 'tr')
      el.parentElement.removeChild(el)
  })
}

function subscribeGold (e, el) {
  if (reachedMaxCartSubscriptions())
    return window.alert(strings.cart5)
  if (document.querySelector('[type="hidden"][name="type"][value="gold"]'))
    return window.alert(strings.goldInCart)
  addSub({
    name: "Gold Membership",
    cost: "5.00",
    fields: [
      { key: "name", value: "Gold Membership" },
      { key: "type", value: "gold" },
      { key: "amount", value: 500 }
    ]
  })
  showNewSubscriptions()
  toasty(strings.goldAdded)
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

  var name = "Whitelisting for " + data.identity + " on " + data.vendor
  addSub({
    name: name,
    cost: "5.00",
    fields: [
      { key: "amount", value: 500 },
      { key: "type", value: 'whitelist'},
      { key: "vendor", value: data.vendor },
      { key: "identity", value: data.identity }
    ]
  })
  showNewSubscriptions()
  toasty(strings.whitelistAdded)
}
