var STRIPE_PK = 'pk_test_zZldjt2HNSnXVxLsv3XSjeI3'

function buyOutLicense (e, el) {
  go('/buy-license?' + objectToQueryString(getTargetDataSet(el)))
}

function buyNewLicense (e, el) {
  var data = getTargetDataSet(el)
  if (!data.vendor) return
  if (!data.identity) return
  if (data.licensePayMethod != 'stripe') return

  var handler = StripeCheckout.configure({
    key: STRIPE_PK,
    image: '/default.png',
    locale: 'auto',
    token: function(token) {
      requestJSON({
        url: endpoint + '/self/license/buy',
        method: "POST",
        data: {
          method: 'stripe',
          token: token,
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

function subscribeNewLicense (e, el) {
  var data = getTargetDataSet(el)
  if (!data.vendor) return
  if (!data.identity) return
  if (data.licensePayMethod != 'stripe') return

  var handler = StripeCheckout.configure({
    key: STRIPE_PK,
    image: '/default.png',
    locale: 'auto',
    token: function(token) {
      requestJSON({
        url: endpoint + '/self/license/subscribe',
        method: "POST",
        data: {
          method: 'stripe',
          token: token,
          license: data
        }
      }, function (err, body, xhr) {
        if (err) {
          window.alert(err.message)
          return
        }
        go('/license-subscribed')
      })
    }
  })

  handler.open({
    name: data.vendor + ' Whitelist',
    description: 'For "' + data.identity + '"',
    amount: 500,
    email: session.user.email,
    panelLabel: "Subscribe {{amount}}"
  })
}

function subscribeGold (e, el) {
  var data = getTargetDataSet(el)
  if (data.payMethod != "stripe") return

  var handler = StripeCheckout.configure({
    key: STRIPE_PK,
    image: '/default.png',
    locale: 'auto',
    token: function(token) {
      requestJSON({
        url: endpoint + '/self/gold/subscribe',
        method: "POST",
        data: {
          method: 'stripe',
          token: token
        }
      }, function (err, body, xhr) {
        if (err) {
          window.alert(err.message)
          return
        }
        go('/gold-subscribed')
        // TODO refresh session?
      })
    }
  })

  handler.open({
    name: 'Gold Membership',
    description: 'Monthy Subscription',
    amount: 500,
    email: session.user.email,
    panelLabel: "Subscribe {{amount}}"
  })
}

function unsubscribeGold (e, el) {
  requestJSON({
    url: endpoint + '/self/gold/unsubscribe',
    method: "POST"
  }, function (err, body, xhr) {
    if (err) {
      window.alert(err.message)
      return
    }
    go('/gold-unsubscribed')
    // TODO refresh session?
  })
}
