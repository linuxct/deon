var endpoint        = endhost + '/api'
var newshost        = '/news-api'
var datapoint       = 'https://blobcache.monstercat.com'
var session         = null
var pageTitleSuffix = 'Monstercat'
var pageTitleGlue   = ' - '
var lstore          = window.localStorage
var sixPackSession  = null

preLoadImage('/img/artwork.jpg')
preLoadImage('/img/artwork-merch.jpg')
preLoadImage('/img/artist.jpg')

document.addEventListener("DOMContentLoaded", function (e) {
  initSocials()
  renderHeader()
  loadSession(function (err, obj) {
    sixPackSession  = new sixpack.Session();
    trackUser()
    renderHeader()
    renderHeaderMobile()
    window.addEventListener("popstate", function popState (e) {
      stateChange(location.pathname + location.search, e.state)
    })
    document.addEventListener("click", interceptClick)
    document.addEventListener("dblclick", interceptDoubleClick)
    document.addEventListener("keypress", interceptKeyPress)
    document.addEventListener("submit", interceptSubmit);

    document.addEventListener("click", function (e) {
      var t = e.target;
      var action = t.getAttribute("click-action");
      if(action) {
        var opts = {};
        var label = t.getAttribute('click-label');
        var category = t.getAttribute('click-category');
        if(label) {
          opts.label = label;
        }
        if(category) {
          opts.category = category;
        }
        recordEvent(action, opts);
      }
    });
    stateChange(location.pathname + location.search)
    stickyPlayer()
    completeProfileNotice.start();
  })
})

openRoute.completed.push(function () {
  recordPage()
  renderHeader()
  closeModal()
  window.scrollTo(0,0)
  if (location.pathname == "/") getStats()
})
openRoute.started.push(function () {
  if(typeof(stopCountdownTicks) == 'function') {
    stopCountdownTicks()
  }
})

requestDetect.credentialDomains.push(endhost)

var releaseTypes = {
  album: { value: 'Album', name: "Albums", key: 'album' },
  ep: { value: 'EP', name: "EPs", key: 'ep' },
  single: { value: 'Single', name: "Singles", key: 'single' },
  podcast: { value: 'Podcast', name: "Podcasts", key: 'podcast' }
}

var releaseTypesList = [releaseTypes.album, releaseTypes.ep, releaseTypes.single, releaseTypes.podcast]

function preLoadImage (src) {
  (document.createElement('img')).src = src
}

function bgmebro() {
  if (!lstore) return
  lstore.removeItem('bgon')
}

function pageIsReady () {
  window.prerenderReady = true
}

function isSignedIn () {
  return !!(session && session.user)
}

function hasCompletedProfile () {
  if(!isSignedIn()) {
    return false
  }
  var user = session.user;
  return !(!user.birthday || !user.emailOptIns || user.emailOptIns.length < 3 || !user.geoLocation);
}

function isLegacyUser () {
  if (!isSignedIn()) return false
  var user = session.user
  // Lolwut
  return user.type.indexOf('gold') > -1 ||
    user.type.indexOf('golden') > -1 ||
    user.type.indexOf('license') > -1 ||
    user.type.indexOf('subscriber') > -1 ||
    user.type.indexOf('admin') > -1 ||
    user.type.indexOf('admin_readonly') > -1
}

function isLegacyLocation () {
  return session.user.location && !session.user.hasOwnProperty('googleMapsPlaceId')
}

function hasGoldAccess () {
  if (!isSignedIn()) return false
  // TODO remove temporary support for old checks
  return !!session.user.goldService || hasLegacyAccess()
}

function hasLegacyAccess () {
  if (!isLegacyUser()) return false
  if (session.subscription) return !!session.subscription.subscriptionActive
  if (session.user && typeof session.user.subscriptionActive != 'undefined') return !!session.user.subscriptionActive
  return true
}

function getSession (done) {
  requestJSON({
    url: endpoint + '/self/session',
    withCredentials: true
  }, done)
}

function loadSession (done) {
  getSession(function (err, obj, xhr) {
    if (err) {
      // TODO handle this!
      console.warn(err.message)
      if(err && endhost.indexOf('localhost') > 0) {
        alert('Make sure you have ' + endhost + ' running!')
      }
    }
    session = obj
    done(err, obj)
  })
}

function getSessionName () {
  var names = []
  if(session.user) {
    names = names.concat([session.user.name, session.user.realName, session.user.email.substr(0, session.user.email.indexOf('@'))])
  }
  for(var i = 0; i < names.length; i++) {
    if(names[i] && names[i].length > 0) {
      return names[i]
    }
  }
  return 'guest'
}

function recordPage () {
  if (typeof analytics == 'undefined') return
  analytics.page()
}

function recordEvent (name, obj, done) {
  if (typeof done != 'function')
    done = function (err, obj, xhr) {}
  if (ENV=='development') {
    //This is here to quickly toggle between wanting to record events and not wanting to
    if(false) {
      return done(Error('Not recording events in development mode.'))
    }
    console.warn('Recording an event while in development mode: ', name, obj)
  }

  requestJSON({
    url: endhost + '/analytics/record/event',
    withCredentials: true,
    method: 'POST',
    data: {
      event: name,
      properties: obj
    }
  }, done)
}

function recordErrorAndAlert (err, where) {
  recordEvent('Error', {
    message: err.message,
    where: where
  })
  window.alert(err.message)
}

function recordErrorAndGo (err, where, uri) {
  recordEvent('Error', {
    message: err.message,
    where: where
  })
  go(uri)
}

function recordGoldEvent (action, obj, done) {
  obj = obj || {};
  obj.category = 'Gold';
  return recordEvent(action, obj, done);
}

function recordSubscriptionEvent (name, obj, done) {
  if(typeof(obj) == 'string') {
    obj = {
      label: obj
    };
  }
  obj = obj || {};
  obj.category = 'Subscriptions';
  return recordEvent(name, obj, done);
}

function trackUser () {
  if (!isSignedIn()) return
  analytics.identify(session.user._id, {
    email: session.user.email,
    name: session.user.realName
  })
}

function untrackUser () {
  analytics.reset()
}

function showFront (e, el) {
  var front = document.getElementById('front-form');

  var scope = {};
  var meta = [{
    name: 'currentPage',
    value: window.location.toString()
  }, {
    name: 'browser',
    value: bowser.name + ' ' + bowser.version
  }];

  if(isSignedIn()) {
    scope.email = session.user.email;
    meta.push({
      name: 'uid',
      value: session.user._id
    });
    meta.push({
      name: 'gold',
      value: hasGoldAccess() ? 'Yes' : 'No'
    });
    scope.name = session.user.realName || session.user.name;
  }

  scope.meta = meta;
  showFront.scope = scope;
  renderFrontForm();
  front.classList.toggle('show', true);
}

function renderFrontForm () {
  var front = document.getElementById('front-form');
  render(front, getTemplateEl('front-form').textContent, showFront.scope);
}

function closeFrontForm (e) {
  if(e) {
    e.preventDefault();
  }
  document.getElementById('front-form').classList.toggle('show', false);
}

function submitFrontForm (e, el) {
  var front = document.getElementById('front-form');
  var button = document.querySelector('#front-form button[type=submit]');

  e.preventDefault();
  var form = e.target;
  var formData = getDataSet(e.target);
  var url = form.getAttribute('action');

  var errors = [];

  if(!formData.email) {
    errors.push('Email is required');
  }

  if(!formData.body) {
    errors.push('Message is required');
  }

  if(errors.length > 0) {
    showFront.scope.errors = errors;
    renderFrontForm();
    return;
  }

  button.disabled = true;
  button.innerHTML = 'Sending...';
  requestJSON({
    url: endpoint + '/support/send',
    data: formData,
    method: 'POST'
  }, function (err, resp, xhr) {
    button.disabled = false;
    button.innerHTML = 'Submit';
    if(err) {
      showFront.scope.errors = [err.toString()];
      renderFrontForm();
      return;
    }
    toasty('Message sent!')
    closeFrontForm();
  })
}

function showIntercom (e, el) {
  if (!window.Intercom)
    return toasty(Error('Intercom disabled by Ad-Block. Please unblock.'))
  window.Intercom('show')
}

//This is for shorting copy crediting for Facebook and Twitter and the like
function createCopycreditOther (track) {
  var credit = track.title + ' by '
  var artists = []
  track.artists = track.artists || []
  for(var i = 0; i < track.artists.length; i++) {
    artists.push(track.artists[i].name)
  }
  artists.push('@Monstercat')
  return credit + artists.join(', ')
}

function createCopycredit (title, urls) {
  var credit = 'Title: ' + title + "\n";
  var prefixes = {
    'youtube' : 'Video Link: ',
    'itunes' : 'iTunes Download Link: ',
    'spotify': 'Listen on Spotify: '
  };
  urls = urls || []
  urls.forEach(function (url) {
    if (!url) return
    for(var site in prefixes) {
      if(url.indexOf(site) > 0) {
        credit += prefixes[site] + url + "\n";
      }
    }
  })
  return credit;
}

function getArtistsAtlas (tks, done) {
  var ids = []
  tks = tks || [];
  tks.forEach(function(track) {
    ids = ids.concat((track.artists || []).map(function (artist) {
      return artist.artistId || artist._id
    }))
  })
  ids = uniqueArray(ids).filter(filterNil)
  if (!ids.length) return done(null, [])
  var url = endpoint + '/catalog/artists-by-users?ids=' + ids.join(',')
  loadCache(url, function (err, aobj) {
    if (err) return done(err)
    return done(err, toAtlas(aobj.results, '_id'))
  })
}

function getArtistsTitle(artists) {
  if (artists.length == 0)
    return '';
  if (artists.length == 1)
    return artists[0].name
  var names = artists.map(function(artist) {
    return artist.name
  })
  return names.join(', ') + ' & ' + names.pop()
}

//How you should mention an artist on twitter
//Use their @ username if we have, otherwise just their name
function getArtistTwitterMention (artist) {
  if(artist.urls) {
    var socials = getSocialsAtlas(artist.urls);
    if(socials.twitter) {
      var matches = socials.twitter.link.match(/^https?:\/\/(www\.)?twitter\.com\/(#!\/)?([^\/]+)(\/\w+)*$/);
      var username;
      if(matches && matches[3]) {
        var username = matches[3]
        if(username.substr(0, 1) != '@') {
          username = '@' + username;
        }
        return username;
      }
    }
  }

  return artist.name
}

/* Loads the required release and track data specified by the object.
 * Object Requirments:
 *   releaseId
 *   trackId
 */
function loadReleaseAndTrack (obj, done) {
  loadCache(endpoint + '/catalog/track/' + obj.trackId, function(err, track) {
    if (err) return done(err);
    loadCache(endpoint + '/catalog/release/' + obj.releaseId, function(err, release) {
      if (err) return done(err)
      var title = track.title + ' by ' + track.artistsTitle;
      if(track.title != release.title) {
        title += ' from ' + release.title
      }
      track.copycredit = createCopycredit(title, release.urls)
      track.copycreditOther = createCopycreditOther(track)
      done(null, {
        track: track,
        release: release,
        signedIn: isSignedIn()
      })
    })
  })
}

function getPlayUrl (arr, releaseId) {
  var hash
  if (arr instanceof Array) {
    var release
    for (var i=0; i<arr.length; i++) {
      if (arr[i].albumId == releaseId) {
        hash = (arr[i] || {}).streamHash
        break
      }
    }
  } else if (arr.streamHash) {
    hash = arr.streamHash
  }
  return hash ? datapoint + '/blobs/' + hash : undefined
}

function getMyPreferedDownloadOption () {
  var f = "mp3_320"
  if (isSignedIn() && session.settings)
    return session.settings.preferredDownloadFormat || f
  return f
}

function getDownloadLink (releaseId, trackId) {
  var opts = {
    method: 'download',
    type: getMyPreferedDownloadOption()
  }
  if (trackId) opts.track = trackId
  return endpoint + '/release/' + releaseId + '/download?' + objectToQueryString(opts)
}

function getGetGoldLink () {
  return '/gold/get'
}

function updatePlayerPlaylist (playlistId, ptracks) {
  var url = endpoint + "/playlist/" + playlistId + "/tracks"
  loadCache(url, function(err, obj) {
    if (err) return window.alert(err) // TODO handle this error better
    var tracks = obj.results.map(function (item, index) {
      var track = mapReleaseTrack(item, index)
      track.playlistId = playlistId
      return track
    })
  }, true)
}

// TODO rename to getTrackArtistsByAtlas
function mapTrackArtists (track, atlas) {
  return (track.artists || []).filter(function (obj) {
    return !!obj
  }).map(function (artist) {
    var o = atlas[artist.artistId]
    if (!o) return {}
    return {
      uri: o.vanityUri || o.websiteDetailsId || o._id,
      name: o.name
    }
  })
}

function getSocials (urls) {
  var socials = {
    twitter: /twitter\.com/,
    facebook: /facebook\.com/,
    soundcloud: /soundcloud\.com/,
    "youtube-play": /youtube\.com/
  }
  var arr = []
  urls.forEach(function (url) {
    for (var tag in socials) {
      if (socials[tag].test(url)) {
        arr.push({
          link: url,
          icon: tag
        })
      }
    }
  })
  return arr
}

function getSocialsAtlas (urls) {
  var socials = getSocials(urls);
  var atlas = socials.reduce(function (at, value, index) {
    at[value.icon] = value;
    return at
  }, {})
  return atlas;
}

function getReleaseShareLink (urls) {
  var link
  var re = /spotify\.com/
  urls.forEach(function (url) {
    if (re.test(url)) {
      link = url
    }
  })
  return link
}

function getReleasePurchaseLinks (urls) {
  var storemap = {
    'Buy from Bandcamp': /bandcamp\.com/,
    'Download On iTunes': /apple\.com/,
    'Get From Beatport': /beatport\.com/,
    'Get on Google Play': /play\.google\.com/
  }
  var links = urls.reduce(function (v, url) {
    for (var key in storemap) {
      if (storemap[key].test(url)) {
        v.push({name: key, url: url})
      }
    }
    return v
  }, [])
  return links
}

function openPurchaseRelease (e, el) {
  var el = document.querySelector('h1[release-id]')
  var id = el.getAttribute('catalog-id') || el.getAttribute('release-id')
  var url = endpoint + '/catalog/release/' + id
  loadCache(url, function (err, res) {
    openModal('release-shopping-modal', {
      data: mapRelease(res)
    })
  })
}

function removeYouTubeClaim (e, el) {
  var data = getTargetDataSet(el)
  var videoIdInput = document.querySelector('input[name="videoId"]');
  if (!data || !data.videoId) return

  var videoId = data.videoId
  if (videoId.indexOf('youtu')>-1){
    videoId = youTubeIdParser(videoId)
    if (!videoId) return toasty(Error('Please make sure to enter a YouTube ID or a valid YouTube URL.'))
    videoIdInput.value = videoId;
  }

  requestJSON({
    url: endpoint + '/self/remove-claims',
    method: 'POST',
    data: {
      videoId: videoId
    },
    withCredentials: true
  }, function (err, obj, xhr) {
    if (err) return window.alert(err.message)
    toasty(strings.claimReleased)
    videoIdInput.value = ""
  })
}

function youTubeIdParser(url){
  var regExp = /^.*(youtu\.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/
  var match = url.match(regExp)
  // ids have 11 characters but that's not something they guarantee
  return (match && match[2].length >= 11) ? match[2] : false
}

/* Map Methods
 * Should conform to the array map method parameters.
 */

function mapReleaseTrack (o, index, trackNumber) {
  if(!o) {
    return {}
  }
  if(arguments.length < 3) {
    trackNumber = index + 1
  }
  o.trackNumber = trackNumber
  o.index       = index
  o.canPlaylist = isSignedIn() && !o.inEarlyAccess && o.streamable ? { _id: o._id } : null
  o.bpm         = Math.round(o.bpm)
  o.licensable  = o.licensable === false ? false : true
  o.showDownloadLink = (o.downloadable && o.streamable) || o.freeDownloadForUsers

  return o
}

function mapRelease (o) {
  var pdate = typeof o.preReleaseDate != 'undefined' ? new Date(o.preReleaseDate) : undefined
  var rdate = new Date(o.releaseDate)
  var now = new Date()
  o.releaseDateObj = new Date(rdate)
  if(pdate && ((o.inEarlyAccess && now < pdate) || (!o.inEarlyAccess && now < rdate))) {
    o.preReleaseDateObj = new Date(pdate)
    o.preReleaseDate = formatDate(o.preReleaseDateObj)
    o.releaseDate = null
    o.releaseDateObj = null
  } else {
    o.releaseDate = formatDate(o.releaseDateObj)
    o.preReleaseDate = null
    o.preReleaseDateObj = null
  }
  o.artists = o.renderedArtists
  o.cover = o.coverUrl + '?image_width=512';
  o.coverBig = o.coverUrl + '?image_width=1024';
  if (o.urls instanceof Array) {
    o.copycredit = createCopycredit(o.title + ' by ' + o.artists, o.urls)
    o.share = getReleaseShareLink(o.urls)
    o.purchaseLinks = getReleasePurchaseLinks(o.urls)
    o.purchase = !!o.purchaseLinks.length
  }
  o.copycreditOther = createCopycreditOther(o)
  o.downloadLink = getDownloadLink(o._id)
  // Since we use catalogId for links, if not present fallback to id
  // If causes problems just create new variable to use for the URI piece
  if (!o.catalogId) o.catalogId = o._id
  return o
}

function transformWebsiteDetails (o) {
  if (o.profileImageUrl) {
    o.image = o.profileImageUrl
    o.imageSmall = o.profileImageUrl + "?image_width=256"
  }
  if (isNaN(o.imagePositionY))
    o.imagePositionY = 60
  if (o.bookings || o.managementDetail) {
    o.contact = {
      booking: o.bookings,
      management: o.managementDetail
    }
  }
  if (o.urls) {
    o.socials = getSocials(o.urls)
  }
  return o
}

/* Transform Methods */

function transformHome (obj) {
  var results = obj.results.map(mapRelease).filter(function (i) {
    return i.type != "Podcast"
  })
  results.sort(sortRelease)
  obj.featured = results.shift()
  obj.releases = results
  obj.releases.length = 8
  obj.hasGoldAccess = hasGoldAccess()
  if(obj.hasGoldAccess) {
    var thankyous = ['Thanks for being Gold, ' + getSessionName() + '.',
    'Stay golden, ' + getSessionName() + '.',
    "Here's an early taste for you, " + getSessionName() + '.',
    'Enjoy the early music, ' + getSessionName() + ' ;)']
    obj.goldThankYou = thankyous[randomChooser(thankyous.length)-1]
  }
  return obj
}

function transformPodcast (obj) {
  obj.podcasts = obj.results.map(mapRelease)
  obj.podcasts.length = 8
  obj.podcasts.forEach(function (i, index, arr) {
    i.episode = (i.title).replace('Monstercat Podcast ','').replace(/[()]/g, '')
  })
  return obj
}

function transformMerch (obj) {
  obj.products = obj.products.slice(0,8)
  return obj
}

function transformRoster () {
  var q = queryStringToObject(window.location.search)
  var thisYear = (new Date()).getFullYear()
  var arr = []
  var i = thisYear
  while (i >= 2011) {
    arr.push({
      year: i,
      selected: i == q.year
    })
    i--
  }
  return {
    years: arr,
    selectedYear: q.year || 2017//0 // featured year is 0
  }
}

function transformRosterYear (obj) {
  obj.results.forEach(function (doc) {
    if (doc.profileImageUrl)
      doc.uri = doc.vanityUri || doc.websiteDetailsId || doc._id;
      doc.image = doc.profileImageUrl;
  });
  obj.results.sort(function (a, b) {
    a = a.name.toLowerCase()
    b = b.name.toLowerCase()
    if (a < b) return -1
    if (a > b) return 1
    return 0
  });
  return obj
}

function transformSocialSettings (obj) {
  obj.facebookEnabled = !!obj.facebookId
  obj.googleEnabled = !!obj.googleId
  return obj
}

function getUserServicesScope (done) {
  var user = isSignedIn() ? session.user : {}
  var hasGold = !!user.goldService;
  var opts = {
    isSignedIn: isSignedIn(),
    gold: {
      has: hasGold,
      permanent: hasGold && !user.currentGoldSubscription, //If you have gold and no sub then you have free/permanent gold
      canSubscribe: !hasGold, //If you don't have it you can sub. If you DO have it, but you've canceled,  you can also sub
      subscribed: hasGold && user.currentGoldSubscription, //A canceled subscription will set this to true
      canceled: null, //We get this from the server below
      endDate: null,
      nextBillingDate: null
    }
  }
  if (isLegacyUser()) {
    opts = {hasLegacy: true}
  }
  var scope = {
    user: opts,
    qs: window.location.search
  }

  if(opts.isSignedIn && opts.gold.subscribed){
    requestJSON({
      method: 'GET',
      url: endhost+ '/api/self/gold-subscription',
      withCredentials: true
    }, function (err, json){
      var gold = transformGoldSubscription(json);
      scope.user.gold = Object.assign(scope.user.gold, gold);
      if(scope.user.gold.canceled){
        scope.user.gold.canSubscribe = true;
      }
      done(err, scope);
    });
  }
  else {
    done(null, scope)
  }
}

function transformServices (obj, done) {
  getUserServicesScope(function (err, opts) {
    if(err) {
      return window.alert(err.message);
    }
    var qo = queryStringToObject(window.location.search)

    transformServices.scope =  {
      user: opts.user,
      qs: encodeURIComponent(window.location.search),
      signUpRedirect: true,
      onpageSignUp: false
    }

    if(qo.hasOwnProperty('humble')) {
      transformServices.scope.user.humble = true
    }

    if(!isSignedIn()) {
      transformServices.scope.onpageSignUp = true;
      transformServices.scope.signUpRedirect = false;
      transformServices.scope.showSignUp = transformServices.scope.onpageSignUp && !isSignedIn();
    }
    done(null, transformServices.scope);
  });
}

function transformMusic () {
  var q    = queryStringToObject(window.location.search)
  q.fields = ['title', 'renderedArtists', 'releaseDate', 'preReleaseDate', 'coverUrl', 'catalogId'].join(',')
  objSetPageQuery(q, q.page, {perPage: 24})
  var fuzzy   = commaStringToObject(q.fuzzy)
  var filters = commaStringToObject(q.filters)
  var type    = filters.type || ""
  var types = cloneObject(releaseTypesList)

  types.forEach(function (item) {
    item.selected = type == item.value
  })
  return {
    search: fuzzy.title || "",
    types:  types,
    query:  objectToQueryString(q)
  }
}

function transformMusicReleases (obj) {
  setPagination(obj, 24)
  return transformReleases(obj)
}

function transformReleases (obj) {
  obj.results     = obj.results.sort(sortRelease).map(mapRelease)
  obj.showingFrom = (obj.skip || 0) + 1
  obj.showingTo   = obj.skip + obj.results.length
  return obj
}

function isVariousArtistsRelease(obj) {
  var artists = obj.artists || ""
  return artists.toLowerCase().indexOf("various artists") > -1
}

function transformUserReleases (obj) {
  obj = transformReleases(obj)
  obj.releases = obj.results.filter(function(i) {
    return !isVariousArtistsRelease(i)
  })
  obj.appearsOn = obj.results.filter(function(i) {
    return isVariousArtistsRelease(i)
  })
  return obj
}

function transformMarkdown (obj) {
  return marked(obj)
}

function scrollToAnimated (el, opts) {
  opts = opts || {}
  var duration = opts.duration || 1000
  var padding = opts.padding || -20
  var top = el.getBoundingClientRect().top
  animatedScrollTo(document.body, top + padding, duration)
}

function scrollToEl (el, opts) {
  opts = opts || {}
  var padding = opts.padding || -20
  var top = el.getBoundingClientRect().top
  window.scrollTo(0, top+padding);
}

function anchorScrollTo (e, el) {
  e.preventDefault()
  scrollToAnimated(document.querySelector(el.getAttribute('href')))
  return false
}

function scrollToHighlightHash () {
  if(location.hash) {
    var attempts = 0
    var attempt = function () {
      var el = document.querySelector(location.hash)
      if(el) {
        setTimeout(function () {
          scrollToAnimated(el)
          el.classList.add('anchor-highlight')
          setTimeout(function () {
            el.classList.add('anchor-highlight-off')
          }, 2000)
        }, 1000)
      }
      else {
        attempts++
        if(attempts < 10) {
          setTimeout(attempt, 100)
        }
      }
    }
    attempt()
  }
}

function completedMarkdown (obj) {
  scrollToHighlightHash()
}

function transformWhitelists (obj) {
  obj.results = obj.results.map(function (whitelist) {
    whitelist.paid = whitelist.paidInFull ? 'PAID' : '$' + (whitelist.amountPaid / 100).toFixed(2)
    whitelist.remaining = (whitelist.amountRemaining / 100).toFixed(2)
    if (whitelist.availableUntil)
      whitelist.nextBillingDate = formatDate(whitelist.availableUntil)
    if (whitelist.subscriptionActive)
      whitelist.cost = (whitelist.amount / 100).toFixed(2)
    whitelist.monthlyCost = whitelist.amount
    whitelist.canBuyOut = whitelist.paidInFull ? { _id: whitelist._id } : undefined
    if (whitelist.whitelisted)
      whitelist.licenseUrl = endpoint + '/self/whitelist-license/' + whitelist.identity
    if (whitelist.subscriptionId && !whitelist.subscriptionActive && whitelist.amountRemaining > 0)
      whitelist.resume = { _id: whitelist._id, amount: whitelist.monthlyCost }
    if (whitelist.subscriptionActive)
      whitelist.cancel = { _id: whitelist._id }
    whitelist.vendorName = getVendorName(whitelist.vendor);
    return whitelist
  })
  return obj
}

function transformReleaseTracks (obj, done) {
  var input = document.querySelector('input[role=release-id][release-id]')
  var releaseId = input ? input.getAttribute('release-id') : ''

  getArtistsAtlas(obj.results, function (err, atlas) {
    if (!atlas) atlas = {}
    var trackIndex = 0;
    obj.results.forEach(function (track, index, arr) {
      track.playUrl = getPlayUrl(track.albums, releaseId)
      mapReleaseTrack(track, trackIndex, index+1)
      if(track.playUrl) {
        trackIndex++
      }
      track.releaseId = releaseId
      track.artists = mapTrackArtists(track, atlas)
      track.downloadLink = getDownloadLink(releaseId, track._id)
      track.time = formatDuration(track.duration)
    })
    obj.hasGoldAccess = hasGoldAccess()
    obj.shopifyEmbeds = []
    var artistsCount = 0

    for(var k in atlas) {
      var artist = atlas[k]
      // prevent Monstercat counting as Artist on Podcasts
      if(artist.name !== "Monstercat" && artist.shopifyCollectionId) {
        obj.shopifyEmbeds.push({
          name: artist.name,
          shopifyCollectionId: artist.shopifyCollectionId
        })
      }
      artistsCount++
    }

    //Limit number of embeds to 1
    if(artistsCount > 1) {
      obj.shopifyEmbeds = []
    }

    done(null, obj)
  })
}

// TODO Refactor
function transformTracks (obj, done) {
  getArtistsAtlas(obj.results, function (err, atlas) {
    if (!atlas) atlas = {}
    var num = -1;
    obj.results.forEach(function (track, index, arr) {
      var releaseId = track.albums[0].albumId
      track.playUrl = getPlayUrl(track.albums, releaseId)
      if(track.playUrl) {
        num++;
      }
      mapReleaseTrack(track, num, arr)
      track.releaseId = releaseId
      track.artists = mapTrackArtists(track, atlas)
      track.downloadLink = getDownloadLink(releaseId, track._id)
      track.time = formatDuration(track.duration)
    })
    done(null, obj)
  })
}

function appendSongMetaData (tracks) {
  if (tracks) {
    var songs = []
    for(var i = 0; i < tracks.length; i++) {
      var trackId = tracks[i].trackId ? tracks[i].trackId : tracks[i]._id
      songs.push('https://' + window.location.host + '/track/' + trackId)
    }
    appendMetaData({
      'music:song': songs
    })
  }
}

/* Completed Methods */

function completedHome (source, obj) {
  startCountdownTicks()
}

function featuredReleaseCountdownEnd () {
  loadSubSources(document.querySelector('[role="home-featured"]'), true)
}

function releasePageCountdownEnd () {
  reloadPage()
}

function completedRelease (source, obj) {
  if (obj.error) return
  var r = obj.data
  var artists = []
  var description = r.title + ' is ' + (r.type == 'EP' ? 'an' : 'a') + ' ' + r.type + ' by ' + r.artists

  var releaseDate = new Date(r.releaseDate)
  var months = getMonths()
  if(r.releaseDate) {
    description += ' released on ' + months[releaseDate.getMonth()] + ' ' + releaseDate.getDay() + ' ' + releaseDate.getYear()
  }
  description += '.'
  var meta = {
    "og:title": r.title + ' by ' + r.artists,
    "og:image": r.cover,
    "og:description": description,
    "og:url": location.toString(),
    "og:type": "music.album",
    "music:release_date": releaseDate.toISOString()
  }
  setMetaData(meta)
  setPageTitle(r.title + ' by ' + r.artists)
  startCountdownTicks()
}

function completedReleaseTracks (source, obj) {
  if(!obj) {
    return
  }
  appendSongMetaData(obj.data.results)
  var artistLinks = [];
  getArtistsAtlas(obj.data.results, function (err, atlas) {
    for(var i in atlas) {
      artistLinks.push('https://' + window.location.host + '/artist/' + i)
    }
  })
  appendMetaData({
    'music:musician': artistLinks
  })
  pageIsReady()
  var embeds = document.querySelectorAll('[collection-id][role=shopify-embed]')
  embeds.forEach(function (node) {
    ShopifyBuyInit(node.getAttribute('collection-id'), node)
  })
  updateControls()
  //For releases with a single song, we change the download link of the album
  //so it's just that song. That way people don't download a ZIP file of one song
  if(obj.data.results.length == 1) {
    var button = document.querySelector('a[role=download-release]');
    if(button) {
      button.setAttribute('href', obj.data.results[0].downloadLink)
    }
  }
}

function completedMusic (source, obj) {
  if(obj.error) return
  var parts = []
  var qs = queryStringToObject(window.location.search)
  var filter = qs.filters
  if(qs.filters) {
    //TODO: better pluralization
    //TODO: better support for filtering by more than just type
    parts.push(qs.filters.substr('type,'.length) + 's')
  }
  else {
    parts.push('Music')
  }
  if(qs.fuzzy) {
    //TODO: make this better for if/when fuzzy thing changes
    parts.push('Search: ' + qs.fuzzy.substr('title,'.length))
  }
  if(qs.page) {
    qs.page = parseInt(qs.page)
    if(qs.page > 1) {
      parts.push('Page ' + qs.page)
    }
  }
  setPageTitle(parts.join(pageTitleGlue))
  pageIsReady()
}

function completedArtist (source, obj) {
  if(obj.error) return
  setPageTitle(obj.data.name)
  var meta = {
    'og:title': obj.data.name,
    'og:description': 'Bio and discography for ' + obj.data.name,
    'og:type': 'profile',
    'og:url': location.toString(),
    'og:image': obj.data.image
  }
  setMetaData(meta)
  pageIsReady()
  if(obj.data.shopifyCollectionId) {
    ShopifyBuyInit(obj.data.shopifyCollectionId)
  }
}

function completedMusic (source, obj) {
  if(obj.error) return
  var parts = []
  var qs = queryStringToObject(window.location.search)
  var filter = qs.filters
  if(qs.filters) {
    //TODO: better pluralization
    //TODO: better support for filtering by more than just type
    parts.push(qs.filters.substr('type,'.length) + 's')
  }
  else {
    parts.push('Music')
  }
  if(qs.fuzzy) {
    //TODO: make this better for if/when fuzzy thing changes
    parts.push('Search: ' + qs.fuzzy.substr('title,'.length))
  }
  if(qs.skip) {
    var page = Math.round(parseInt(qs.skip) / parseInt(qs.limit)) + 1
    if(page > 1) {
      parts.push('Page ' + page)
    }
  }
  setPageTitle(parts.join(pageTitleGlue))
  pageIsReady()
}

function completedRoster (){
  var rosterSelect = document.querySelector('[role=roster-select]')
  rosterSelect.addEventListener('change', function(){
    var year = this.options[this.selectedIndex].value
    if (year !== "0") window.location.href = '/artists/?year='+year
    else window.location.href = '/artists/'
  })
}

/* UI Stuff */

function accessDownloadOrModal (e, el) {
  if(el.getAttribute('free-download-for-users') == 'true') {
    if(isSignedIn()) {
      return true
    }
    else {
      e.preventDefault()
      var opts = {
        releaseTitle: el.getAttribute('release-title'),
        redirect: encodeURIComponent(window.location),
        trackTitle: el.getAttribute('track-title'),
      }
      openModal('freedownload-for-users-modal', opts)
    }
  }
  else {
    return canDownloadOrModal(e, el)
  }
}

function canDownload () {
  return hasGoldAccess() || (session.user && session.user.type && session.user.type.indexOf('artist') > -1);
}

function canDownloadOrModal (e, el) {
  if(canDownload()) return true
  e.preventDefault()
  openModal('subscription-required-modal', {
    signedIn: isSignedIn()
  })
}

function openReleaseArt (e, el) {
  openModal('release-art-modal', {
    src: el.getAttribute('big-src')
  })
}

function transformCurrentUrl (data) {
  data = data || {}
  data.currentUrl = encodeURIComponent(window.location.pathname + window.location.search)
  return data
}

function renderHeader () {
  var el = document.querySelector('#navigation')
  var target = '[template-name="' + el.getAttribute('template') + '"]'
  var template = document.querySelector(target).textContent
  var data = transformCurrentUrl()
  if (session) {
    data.user = session ? session.user : null
  }
  render(el, template, {
    data: data
  })
}

function renderHeaderMobile () {
  var el = document.querySelector('#navigation-mobile')
  var target = '[template-name="' + el.getAttribute('template') + '"]'
  var template = document.querySelector(target).textContent
  var data = null
  if (session) {
    data = {}
    data.user = session ? session.user : null
  }
  render(el, template, {
    data: data
  })
}

function setPageTitle (title, glue, suffix) {
  if (!glue) glue = pageTitleGlue
  if (!suffix) suffix = pageTitleSuffix
  document.title = (!!title ? (title + glue) : '') + suffix
}

function pageToQuery (page, opts) {
  opts = opts || {}
  opts.perPage = opts.perPage || 25
  page = page || 1

  return {skip: (page - 1) * opts.perPage, limit: opts.perPage}
}

function objSetPageQuery (obj, page, opts) {
  var sl = pageToQuery(page, opts);
  obj.skip = sl.skip
  obj.limit = sl.limit
}

function setPagination (obj, perPage) {
  var q = queryStringToObject(window.location.search)
  q.page = parseInt(q.page) || 1
  //TODO: Calculate whether prev or next are required
  //based on current page and the numperpage
  var nq = cloneObject(q)
  var pq  = cloneObject(q)
  nq.page = nq.page + 1
  pq.page = pq.page - 1
  if (q.page * perPage < obj.total) {
    obj.next     = objectToQueryString(nq)
  }
  if (q.page > 1) {
    obj.previous = objectToQueryString(pq)
  }
  obj.showingFrom = Math.max((q.page - 1) * perPage, 1)
  if (obj.next) {
    obj.showingTo = q.page == 1 ? perPage : obj.showingFrom + perPage - 1
  }
  else {
    obj.showingTo = obj.total
  }
}

function getStats () {
  requestJSON({
    url: 'https://www.monstercat.com/stats.json',
  }, function (err, obj) {
    if (err || !obj) return // Silently don't worry.
    getStats.fulfill(obj)
  })
}

getStats.fulfill = function (map) {
  Object.keys(map).forEach(function (key) {
    var stat = map[key]
    var el = document.querySelector('[stats-name="'+key+'"]')
    if (!el) return
    var h3 = el.querySelector('h3')
    var p = el.querySelector('p')
    if (!h3 || !p) return
    h3.textContent = getStats.translate(stat.value)
    p.textContent  = stat.name
  })
}

getStats.translate = function (value) {
  if (isNaN(value)) return value
  if (value >= 1000000 ) {
    return (value / 1000000).toFixed(1) + 'm'
  } else if (value >= 100000) {
    return (value / 1000).toFixed(0) + 'k'
  }
  return value
}

function joinDiscord (e, el) {
  var data = getTargetDataSet(el)
  var parent = getDataSetTargetElement(el)
  if (!data.discordId) return window.alert("Please provide a Discord User Id.")
  var container = parent.querySelector('[role="response"]')
  var template = getTemplateEl("joinDiscordResponse")
  var div = document.createElement("div")
  render(container, template.textContent, {loading: true})
	el.disabled = true
	el.classList.add("on")
  requestJSON({
    method:"POST", 
    url: endpoint + "/self/discord/join", 
    withCredentials: true, 
    data: data
  }, function (err, body, xhr) { 
    el.disabled = false;
    el.classList.remove("on");
    var invites = body.invites;
    if (!err && invites) {
      if (invites.gold) body.goldJoinUrl = "https://discord.gg/" + invites.gold
      if (invites.licensee) body.licenseeJoinUrl = "https://discord.gg/" + invites.licensee
    }
    render(container, template.textContent, {
      error: err,
      data: body 
    })
  });
}
