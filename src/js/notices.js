function SiteNotice (args) {
  this.template = ''
  this.hideForDays = 7
  for(var k in args) {
    this[k] = args[k]
  }
  if (!this.transform) {
    this.transform = function (done) {
      done(null, {})
    }
  }

  if (!this.completed) {
    this.completed = function () {}
  }

  if (!this.shouldOpen) {
    this.shouldOpen = function () {
      return true
    }
  }
}

SiteNotice.prototype.start = function () {
  var scope = {}

  if (!this.shouldOpen() || !this.isCookieExpired()) {
    this.close()
    return
  }
  this.transform(function (err, result) {
    scope = result
    this.render(scope)
  }.bind(this))
}

SiteNotice.prototype.getCookieName = function () {
  return 'hide_notice_' + this.name
}

SiteNotice.prototype.isCookieExpired = function () {
  var iso = getCookie(this.getCookieName())

  if (!iso || !iso.length) {
    return true
  }

  var expired = new Date(iso).getTime() < new Date().getTime()
  return expired
}

SiteNotice.prototype.getNoticeEl = function () {
  var el = document.querySelector('#site-notices [notice=' + this.name + ']')
  if (!el) {
    var div = document.createElement('div')
    div.setAttribute('notice', this.name)
    div.setAttribute('class', 'notice-container')
    document.querySelector('#site-notices').appendChild(div)
    return div
  }

  return el
}

SiteNotice.prototype.render = function (scope) {
  var noticeEl = this.getNoticeEl()

  render(noticeEl, getTemplateEl(this.template).textContent, scope)
  noticeEl.classList.toggle('hide', false)
  var height = noticeEl.getBoundingClientRect().height

  document.body.classList.toggle('showing-notice', true)
  noticeEl.classList.toggle(this.name, true)
  if (this.completed) {
    this.completed()
  }
}

SiteNotice.prototype.close = function () {
  document.body.classList.toggle('showing-notice', true)
  var noticeEl = this.getNoticeEl()

  noticeEl.classList.toggle('hide', true)
  noticeEl.classList.toggle(this.name, false)
}

SiteNotice.prototype.setHideUntilByDays = function (days) {
  var daysMS = 24 * 60 * 60 * 1000
  var hideUntil = new Date(new Date().getTime() + (days * daysMS))
  setCookie(this.getCookieName(), hideUntil.toISOString())
}

//When a user closes it instead of our code
//This also sets a cookie to hide the notice for a time
SiteNotice.prototype.closeByUser = function () {
  this.setHideUntilByDays(this.hideForDays)
  this.close()
}

SiteNotice.prototype.expireCookie = function () {
  setCookie(this.getCookieName(), new Date().toISOString())
}

/*========================================
=            COMPLETE PROFILE            =
========================================*/

var completeProfileNotice = new SiteNotice({
  hideForDays: 0,
  name: 'complete-profile',
  template: 'notice-complete-profile',
  transform: function (done) {
    var obj = {};

    done(null, obj)
  },
  shouldOpen: function () {
    return isSignedIn() && !hasCompletedProfile()
  },
  completed: function () {}
})

function closeCompleteProfileNotice (e) {
  completeProfileNotice.closeByUser()
}

function submitCompleteProfile (e) {
  e.preventDefault()
  var form = e.target
  var button = form.querySelector('button.button--cta')

  function resetButton () {
    button.innerHTML = 'Save'
    button.disabled = false
    form.disabled = false
  }

  var data = getDataSet(document.querySelector("[role=complete-profile-form]"), true, true)

  data = transformSubmittedAccountData(data)
  var exclude = {
    birthday: !!session.user.birthday,
    location: !!session.user.geoLocation
  }
  var errors = validateAccountData(data, exclude)

  if (errors.length) {
    errors.forEach(function (er) {
      toasty(new Error(er))
    })
    return
  }

  if (session.user.birthday) {
    //
    delete data.birthday
  }

  button.disabled = true
  button.innerHTML = 'Submitting...'
  form.disabled = true

  update('self', null, data, function (err, obj) {
    resetButton()
    if (err) return toasty(new Error(err.message))
    toasty('Profile complete, thank you!')
    completeProfileNotice.close()
    closeModal()
    renderHeader()
    renderHeaderMobile()
  })
}

function clickCompleteProfile (e) {
  var obj = {}
  var numEmailOptins = 3 //How many optin lists we maintain

  obj.sections = {
    birthday: !session.user.birthday,
    emails: !session.user.emailOptIns || session.user.emailOptIns.length < numEmailOptins,
    location: !session.user.geoLocation
  }
  openModal('complete-profile-modal', obj)
  initLocationAutoComplete()
}

/*========================================
=            INSTINCT NOTICE            =
========================================*/
var instinctNotice = new SiteNotice({
  hideForDays: 7,
  name: 'instinct-video',
  template: 'notice-instinct-video'
})

function clickCloseInstinctVideoNotice (e) {
  instinctNotice.closeByUser()
}

function clickInstinctVideoNotice (e) {
  instinctNotice.setHideUntilByDays(instinctNotice.hideForDays * 2)
}

/*==========================================
=            GOLD DISCOUNT CODE            =
==========================================*/
var goldShopNextCodeDate = ''
var goldShopCodeNotice = new SiteNotice({
  hideForDays: 40,
  name: 'gold-discount',
  template: 'notice-gold-shop-code',
  transform: function (done) {
    requestSelfShopCodes(function (err, result) {
      if (err) {
        return done(err)
      }
      var lastCode = getCookie('last-gold-shop-code')

      this.currentCode = result.currentCode

      goldShopNextCodeDate = new Date(result.nextCodeDate).toISOString()
      done(null, result)
    }.bind(this))
  },
  shouldOpen: function () {
    return isSignedIn() && hasGoldAccess()
  }
})

function closeGoldShopDiscountNotice () {
  var cookieName = goldShopCodeNotice.getCookieName()

  goldShopCodeNotice.close()
  setCookie('last-gold-shop-code', goldShopCodeNotice.currentCode.code)
  setCookie(cookieName, goldShopNextCodeDate)
}
