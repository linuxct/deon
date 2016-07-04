var endhost         = 'https://connect.monstercat.com'
var endpoint        = endhost + '/api'
var datapoint       = 'https://s3.amazonaws.com/data.monstercat.com'
var session         = null
var pageTitleSuffix = 'Monstercat'
var pageTitleGlue   = ' - '
var lstore          = window.localStorage

document.addEventListener("DOMContentLoaded", function (e) {
  initSocials()
  renderHeader()
  getSession(function (err, obj, xhr) {
    if (err) {
      // TODO handle this!
      console.warn(err.message)
    }
    session = obj
    trackUser()
    renderHeader()
    window.addEventListener("popstate", function popState (e) {
      stateChange(location.pathname + location.search, e.state)
    })
    document.addEventListener("click", interceptClick)
    document.addEventListener("keypress", interceptKeyPress)
    stateChange(location.pathname + location.search)
  })
})

openRoute.completed.push(function () {
  recordPage()
})

function bgmebro() {
  if (!lstore) return
  var m = lstore.getItem('bgon') == 'true' ? 'add' : 'remove'
  document.body.classList[m]('bg')
}

function pageIsReady () {
  window.prerenderReady = true
}

function isSignedIn () {
  return session && session.user
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

function hasGoldAccess () {
  if (!isSignedIn()) return false
  var user = session.user
  // TODO remove temporary support for old checks
  return !!user.goldService || hasLegacyAccess()
}

function hasLegacyAccess () {
  if (!isLegacyUser()) return false
  if (session.subscription) return !!session.subscription.subscriptionActive
  return !!user.subscriptionActive
}

function getSession (done) {
  requestJSON({
    url: endpoint + '/self/session',
    withCredentials: true
  }, done)
}

function recordPage () {
  if (typeof analytics == 'undefined') return
  analytics.page()
}

function recordEvent (name, obj, done) {
  if (typeof done != 'function')
    done = function (err, obj, xhr) {}
  if (location.host.indexOf('localhost') == 0)
    return done(Error('Localhost not supported.'))
  requestJSON({
    url: endpoint + '/analytics/record/event',
    withCredentials: true,
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

function showIntercom (e, el) {
  if (!window.Intercom)
    return toasty(Error('Intercom disabled by Ad-Block. Please unblock.'))
  window.Intercom('show')
}

function searchMusic (e, el) {
  var data   = getTargetDataSet(el, false, true) || {}
  var q      = queryStringToObject(window.location.search)
  var filter = []
  var fuzzy  = []
  if (data.type) {
    filter.push('type', data.type)
  }
  else {
    delete q.filters;
  }
  if (data.search) {
    fuzzy.push('title', data.search)
  }
  else {
    delete q.fuzzy;
  }
  if (filter.length > 0) {
    q.filters = filter.join(',')
  }
  if (fuzzy.length > 0) {
    q.fuzzy   = fuzzy.join(',')
  }
  //q.skip    = 0

  delete q.skip
  delete q.limit

  go('/music?' + objectToQueryString(q))
}

function createCopycredit (title, urls) {
  var credit = 'Title: ' + title + "\n";
  var prefixes = {
    'youtube' : 'Video Link: ',
    'itunes' : 'iTunes Download Link: ',
    'spotify': 'Listen on Spotify: '
  };
  urls.forEach(function (url) {
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
  ids = uniqueArray(ids)
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
      var title = track.title + ' by ' + track.artistsTitle + ' from ' + release.title
      track.copycredit = createCopycredit(title, release.urls)
      done(null, {
        track: track,
        release: release
      })
    })
  })
}

function getPlayUrl (arr, releaseId) {
  if (!(arr instanceof Array)) arr = []
  var release
  for (var i=0; i<arr.length; i++) {
    if (arr[i].albumId == releaseId) {
      release = arr[i]
      break
    }
  }
  return release ? datapoint + '/blobs/' + release.streamHash : undefined
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
  var id = document.querySelector('h1[release-id]').getAttribute('release-id')
  var url = endpoint + '/catalog/release/' + id
  loadCache(url, function (err, res) {
    openModal('release-shopping-modal', {
      data: res
    })
  })
}

function removeYouTubeClaim (e, el) {
  var data = getTargetDataSet(el)
  if (!data || !data.videoId) return
  requestJSON({
    url: endpoint + '/self/remove-claims',
    method: 'POST',
    data: {
      videoId: data.videoId
    },
    withCredentials: true
  }, function (err, obj, xhr) {
    if (err) return window.alert(err.message)
    toasty(strings.claimReleased)
    document.querySelector('input[name="videoId"]').value = ""
  })
}

/* Map Methods
 * Should conform to the array map method parameters.
 */

function mapReleaseTrack (o, index, arr) {
  o.trackNumber = index + 1
  o.index       = index
  o.canPlaylist = isSignedIn() ? { _id: o._id } : null
  o.bpm         = Math.round(o.bpm)
  return o
}

function mapRelease (o) {
  o.releaseDate = formatDate(o.releaseDate)
  o.preReleaseDate = formatDate(o.preReleaseDate)
  o.artists = o.renderedArtists
  if(o.thumbHashes) {
    o.cover = datapoint + '/blobs/' + o.thumbHashes["256"]
    o.coverBig = datapoint + '/blobs/' + o.thumbHashes["1024"]
  }
  if (o.urls instanceof Array) {
    o.copycredit = createCopycredit(o.title + ' by ' + o.artists, o.urls)
    o.share = getReleaseShareLink(o.urls)
    o.purchaseLinks = getReleasePurchaseLinks(o.urls)
    o.purchase = !!o.purchaseLinks.length
  }
  o.downloadLink = getDownloadLink(o._id)
  return o
}

function mapWebsiteDetails (o) {
  if (o.profileImageBlobId)
    o.image = datapoint + '/blobs/' + o.profileImageBlobId
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

function transformRoster () {
  var q = queryStringToObject(window.location.search)
  var thisYear = (new Date()).getFullYear()
  var arr = []
  var i = thisYear
  while (i >= 2012) {
    arr.push(i)
    i--
  }
  return {
    years: arr,
    year: q.year || thisYear
  }
}

function transformRosterYear (obj) {
  obj.results.forEach(function (doc) {
    if (doc.profileImageBlobId)
      doc.uri = doc.vanityUri || doc.websiteDetailsId || doc._id
      doc.image = datapoint + '/blobs/' + doc.profileImageBlobId
  })
  return obj
}

function transformSocialSettings (obj) {
  obj.facebookEnabled = !!obj.facebookId
  obj.googleEnabled = !!obj.googleId
  return obj
}

function transformServices () {
  var user = isSignedIn() ? session.user : {}
  var opts = {
    hasGoldPermanent: !!user.goldService && !user.currentGoldSubscription,
    goldSubscribe: !user.goldService && !user.currentGoldSubscription,
    goldUnsubscribe: (!!user.goldService && !!user.currentGoldSubscription)
  }
  if (isLegacyUser())
    opts = {hasLegacy: true}
  return {
    user: isSignedIn() ? opts : null
  }
}

function transformGoldSubscription (obj) {
  var nobj = {
    nextBillingDate: formatDate(obj.availableUntil),
  }
  if (obj.canceled) {
    nobj.canceled = {
      endDate: formatDate(obj.availableUntil),
    }
  }
  return nobj
}

function transformMusic () {
  var q    = queryStringToObject(window.location.search)
  q.fields = ['title', 'renderedArtists', 'releaseDate', 'preReleaseDate', 'thumbHashes', 'catalogId'].join(',')
  q.limit  = 24
  q.skip   = parseInt(q.skip) || 0
  var fuzzy   = commaStringToObject(q.fuzzy)
  var filters = commaStringToObject(q.filters)
  var type    = filters.type || ""
  var types   = [
    { value: 'Album', name: "Albums" },
    { value: 'EP', name: "EPs" },
    { value: 'Single', name: "Singles" },
    { value: 'Podcast', name: "Podcasts" }
  ]
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
  var q = queryStringToObject(window.location.search)
  if (!q.limit)
    q.limit  = 25
  q.limit = parseInt(q.limit)
  if (!q.skip)
    q.skip= 0
  q.skip = parseInt(q.skip)
  var next = q.skip + q.limit
  var prev = q.skip - q.limit
  if (prev < 0)
    prev = null
  if (next > obj.total)
    next = null
  var nq    = cloneObject(q)
  nq.skip   = next
  var pq    = cloneObject(q)
  pq.skip   = prev
  if (next != null) obj.next     = objectToQueryString(nq)
  if (prev != null) obj.previous = objectToQueryString(pq)
  return transformReleases(obj)
}

function transformReleases (obj) {
  obj.results = obj.results.sort(sortRelease).map(mapRelease)
  obj.skip  = (parseInt(obj.skip) || 0) + 1
  obj.count = obj.skip + obj.results.length - 1
  return obj
}

function transformMarkdown (obj) {
  return marked(obj)
}

function transformBuyOut (obj) {
  if (!obj)
    return queryStringToObject(window.location.search)
  obj.cost = (obj.amountRemaining / 100).toFixed(2)
  return obj
}

function transformWhitelists (obj) {
  obj.results = obj.results.map(function (whitelist) {
    whitelist.paid = (whitelist.amountPaid / 100).toFixed(2)
    whitelist.remaining = (whitelist.amountRemaining / 100).toFixed(2)
    if (whitelist.availableUntil)
      whitelist.nextBillingDate = formatDate(whitelist.availableUntil)
    if (whitelist.subscriptionActive)
      whitelist.cost = (5).toFixed(2)
    whitelist.monthlyCost = 500
    whitelist.canBuyOut = whitelist.paidInFull ? { _id: whitelist._id } : undefined
    if (whitelist.whitelisted)
      whitelist.licenseUrl = endpoint + '/self/whitelist/' + whitelist._id + '.pdf'
    if (whitelist.subscriptionId && !whitelist.subscriptionActive && whitelist.amountRemaining > 0)
      whitelist.resume = { _id: whitelist._id, amount: whitelist.monthlyCost }
    if (whitelist.subscriptionActive)
      whitelist.cancel = { _id: whitelist._id }
    return whitelist
  })
  return obj
}

function transformReleaseTracks (obj, done) {
  getArtistsAtlas(obj.results, function (err, atlas) {
    if (!atlas) atlas = {}
    var releaseId = getLastPathnameComponent()
    obj.results.forEach(function (track, index, arr) {
      mapReleaseTrack(track, index, arr)
      track.releaseId = releaseId
      track.playUrl = getPlayUrl(track.albums, releaseId)
      track.artists = mapTrackArtists(track, atlas)
      track.downloadLink = getDownloadLink(releaseId, track._id)
    })
    done(null, obj)
  })
}

function transformTracks (obj, done) {
  getArtistsAtlas(obj.results, function (err, atlas) {
    if (!atlas) atlas = {}
    obj.results.forEach(function (track, index, arr) {
      var releaseId = track.albums[0].albumId
      mapReleaseTrack(track, index, arr)
      track.releaseId = releaseId
      track.playUrl = getPlayUrl(track.albums, releaseId)
      track.artists = mapTrackArtists(track, atlas)
      track.downloadLink = getDownloadLink(releaseId, track._id)
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

function completedRelease (source, obj) {
  if (obj.error) return
  var r = obj.data
  var artists = []
  var description = r.title + ' is ' + (r.type == 'EP' ? 'an' : 'a') + ' ' + r.type + ' by ' + r.artists

  var releaseDate = new Date(r.releaseDate)
  var months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Desc']
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
}

function completedReleaseTracks (source, obj) {
  appendSongMetaData(obj.data.results)
  var artists = [];
  getArtistsAtlas(obj.data.results, function (err, atlas) {
    for(var i in atlas) {
      artists.push('https://' + window.location.host + '/artist/' + i)
    }
  })
  appendMetaData({
    'music:musician': artists
  })
  pageIsReady()
}

function completedWebsiteDetails (source, obj) {
  if (obj.error) return
  var r = obj.data
  appendMetaData({
    'og:image': r.image,
  })
  if(r.title && r.artists) {
    setPageTitle(r.title + ' by ' + r.artists)
  }
  pageIsReady()
}

function completedArtist (source, obj) {
  if(obj.error) return
  setPageTitle(obj.data.name)
  pageIsReady()
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

function completedArtist (source, obj) {
  if(obj.error) return
  setPageTitle(obj.data.name)
  var meta = {
    'og:title': obj.data.name,
    'og:description': 'Bio and discography for ' + obj.data.name,
    'og:type': 'profile',
    'og:url': location.toString()
  }
  setMetaData(meta)
  pageIsReady()
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

/* UI Stuff */

function canAccessGold (e, el) {
  var hasit = hasGoldAccess()
  if (hasit) return
  e.preventDefault()
  openModal('subscription-required-modal', {
    signedIn: isSignedIn(),
    hasGold: hasGoldAccess()
  })
}

function openTrackCopyCredits (e, el) {
  openModal('track-copycredits-modal', {
    trackId:   el.getAttribute('track-id'),
    releaseId: el.getAttribute('release-id')
  })
}

function renderHeader () {
  var el = document.querySelector('#navigation')
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
  var feedbackBtn = document.querySelector('[role="feedback"]')
  if (feedbackBtn) feedbackBtn.classList.toggle('hide', !isSignedIn())
}

function setPageTitle (title, glue, suffix) {
  if (!glue) glue = pageTitleGlue
  if (!suffix) suffix = pageTitleSuffix
  document.title = (!!title ? (title + glue) : '') + suffix
}
