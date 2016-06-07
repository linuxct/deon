var STRIPE_PK = 'pk_test_zZldjt2HNSnXVxLsv3XSjeI3'

function isValidPayMethod (str, obj) {
  if (str != 'stripe' && str != 'paypal') return false
  if (typeof obj[str] != 'function') return false
  return true
}

function buyLicense (e, el) {
  var data = getTargetDataSet(el)
  if (!data.vendor) return
  if (!data.identity) return
  if (!isValidPayMethod(data.method, buyLicense)) return
  buyLicense[data.method](data)
}

buyLicense.paypal = function buyLicensePayPal (data) {
  console.warn('not implemented')
}

buyLicense.stripe = function buyLicenseStripe (data) {
  var handler = StripeCheckout.configure({
    key: STRIPE_PK,
    image: '/default.png',
    locale: 'auto',
    token: function(token) {
      requestJSON({
        url: endpoint + '/self/license/buy',
        method: "POST",
        withCredentials: true,
        data: {
          method: 'stripe',
          token: token.id,
          license: data
        }
      }, function (err, body, xhr) {
        if (err) {
          window.alert(err.message)
          return
        }
        go('/license-bought')
      })
    }
  })

  handler.open({
    name: data.vendor + ' Whitelist',
    description: 'For "' + data.identity + '"',
    amount: 20000,
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
      returnUrl: location.origin + '/subscribed',
      cancelUrl: location.origin + '/canceled-payment',
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
        go('/subscribed')
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
    go('/unsubscribed')
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
