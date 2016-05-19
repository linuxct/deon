var endhost   = 'https://connect.monstercat.com'
var endpoint  = endhost + '/api'
var datapoint = 'https://s3.amazonaws.com/data.monstercat.com'
var session   = null
var strings   = {
  "error": "An error occured.",
  "createPlaylist": "Give a name for new playlist.",
  "renamePlaylist": "Give a new name for this playlist.",
  "destroyPlaylist": "Are you sure you want to remove this playlist?",
  "accountUpdated": "Your account information has been saved.",
  "settingsUpdated": "Your preferred settings have been updated.",
  "addedToPlaylist": "Song succesfully added to playlist.",
  "removedFromPlaylist": "Song succesfully removed from playlist.",
  "passwordMissing": "You must enter a password.",
  "passwordReset": "Your password has been reset. Please sign in.",
  "passwordResetEmail": "Check your email for a link to reset your password."
}
var downloadOptions = [
  {
    name: "WAV (Original)",
    value: "wav"
  }, {
    name: "FLAC",
    value: "flac"
  }, {
    name: "MP3 320",
    value: "mp3_320"
  }, {
    name: "MP3 V0",
    value: "mp3_v0"
  }, {
    name: "MP3 V2",
    value: "mp3_v2"
  }, {
    name: "MP3 128",
    value: "mp3_128"
  }
]

document.addEventListener("DOMContentLoaded", function (e) {
  renderHeader()
  getSession(function (err, obj, xhr) {
    if (err) {
      // TODO handle this!
      console.warn(err.message)
    }
    session = obj
    renderHeader()
    window.addEventListener("popstate", function popState (e) {
      stateChange(location.pathname + location.search, e.state)
    })
    document.addEventListener("click", interceptClick)
    stateChange(location.pathname + location.search)
  })
})

function isSignedIn () {
  return session && session.user
}

function hasGoldAccess () {
  if (!isSignedIn()) return false
  // TODO finish me
  return false
}

function getSession (done) {
  requestJSON({
    url: endpoint + '/self/session',
    withCredentials: true
  }, done)
}

function signIn (e, el) {
  requestJSON({
    url: endhost + '/signin',
    method: 'POST',
    withCredentials: true,
    data: getDataSet(el)
  }, function (err, obj, xhr) {
    if (err) return window.alert(err.message)
    getSession(function (err, sess) {
      if (err) return window.alert(err.message)
      session = sess
      renderHeader()
      go("/")
    })
  })
}

function signOut (e, el) {
  requestJSON({
    url: endhost + '/signout',
    method: 'POST',
    withCredentials: true
  }, function (err, obj, xhr) {
    if (err) return window.alert(err.message)
    session.user = null
    renderHeader()
    go("/")
  })
}

function recoverPassword (e, el) {
  var data = getDataSet(el)
  data.returnUrl = location.protocol + '//' + location.host + '/reset-password?key=:code'
  requestJSON({
    url: endhost + '/password/send-verification',
    method: 'POST',
    withCredentials: true,
    data: data
  }, function (err, obj, xhr) {
    if (err) return window.alert(err.message)
    window.alert(strings.passwordResetEmail)
  })
}

function updatePassword (e, el) {
  var data = getDataSet(el)
  if (!data.password) return window.alert(strings.passwordMissing)
  data.code = queryStringToObject(window.location.search).key
  requestJSON({
    url: endhost + '/password/reset',
    method: 'POST',
    withCredentials: true,
    data: data
  }, function (err, obj, xhr) {
    if (err) return window.alert(err.message)
    window.alert(strings.passwordReset)
    go('/signin')
  })
}

function signUp (e, el) {
  requestJSON({
    url: endpoint + '/signup',
    method: 'POST',
    withCredentials: true,
    data: getDataSet(el)
  }, function (err, obj, xhr) {
    if (err) return window.alert(err.message)
    getSession(function (err, sess) {
      if (err) return window.alert(err.message)
      session = sess
      renderHeader()
      go("/")
    })
  })
}

function createPlaylist (e, el) {
  var name = window.prompt(strings.createPlaylist)
  if (!name) return
  create('playlist', {name: name}, simpleUpdate)
}

function renamePlaylist (e, el) {
  var name = window.prompt(strings.renamePlaylist)
  if (!name) return
  update('playlist', el.getAttribute('playlist-id'), { name: name }, simpleUpdate)
}

function destroyPlaylist (e, el) {
  if (!window.confirm(strings.destroyPlaylist)) return
  destroy('playlist', el.getAttribute('playlist-id'), simpleUpdate)
}

function removeFromPlaylist (e, el) {
  var pel   = document.querySelector('[playlist-id]')
  var id    = pel ? pel.getAttribute('playlist-id') : ""
  var url   = endpoint + '/playlist/' + id + '?fields=name,public,tracks'
  var index = parseInt(el.getAttribute('playlist-position'))
  if (!id) return window.alert(strings.error)
  loadCache(url, function (err, obj) {
    if (err) return window.alert(err.message)
    var tracks = obj.tracks
    tracks.splice(index, 1)
    update('playlist', id, {tracks: tracks}, function (err, obj, xhr) {
      cache(url, obj)
      if (err) {
        toast({
          message: err.message,
          error: true
        })
      }
      loadSubSources(document.querySelector('[role="content"]'), true)
      updatePlayerPlaylist(id, tracks)
    })
  })
}

function addToPlaylist (e, el) {
  var id    = el.value
  if (!id) return
  var url   = endpoint + '/playlist/' + id
  var index = parseInt(el.getAttribute('playlist-position'))
  var rel   = document.querySelector('[release-id]')
  var item  = {
    trackId: el.getAttribute('track-id'),
    releaseId: rel ? rel.getAttribute('release-id') : ""
  }
  if (!item.releaseId || !item.trackId) return window.alert(strings.error)
  el.disabled = true
  loadCache(url, function (err, obj) {
    if (err) return window.alert(err.message)
    var tracks = obj.tracks
    if (isNaN(index)) index = tracks.length
    tracks.splice(index, 0, item)
    update('playlist', id, {tracks: tracks}, function (err, obj, xhr) {
      cache(url, obj)
      el.disabled = false
      el.selectedIndex = 0
      if (err) {
        toast({
          error: true,
          message: err.message
        })
      }
      updatePlayerPlaylist(id, tracks)
      toast({
        message: strings.addedToPlaylist
      })
    })
  })
}

function togglePlaylistPublic (e, el) {
  el.disabled = true
  update('playlist', el.getAttribute('playlist-id'), {
    public: !!el.checked
  }, function (err, obj) {
    el.disabled = false
    if (!err) return
    window.alert(err.message)
    el.checked = !el.checked
  })
}

function saveAccount (e, el) {
  var data = getDataSet(el, true)
  if (!data) return
  update('self', null, data, function (err) {
    if (err) return window.alert(err.message)
    window.alert(strings.accountUpdated)
    // TODO clear password
  })
}

function saveAccountSettings (e, el) {
  var data = getDataSet(el)
  if (!data) return

  var id = session && session.user ? session.user.userSettingsId : undefined
  update('user-settings', id, data, function (err, settings) {
    if (err) return window.alert(err.message)
    window.alert(strings.settingsUpdated)
    session.settings = settings
  })
}

function buyOutLicense (e, el) {
  go('/buy-license?' + objectToQueryString(getDataSet(el)))
}

function searchMusic (e, el) {
  var data   = getDataSet(el)
  var q      = queryStringToObject(window.location.search)
  var filter = []
  var fuzzy  = []
  if (data.type)
    filter.push('type', data.type)
  if (data.search)
    fuzzy.push('title', data.search)
  q.filters = filter.join(',')
  q.fuzzy   = fuzzy.join(',')
  go('/music?' + objectToQueryString(q))
}

function formatDate (date) {
  if (!formatDate.months) {
    formatDate.months = [
      "January",
      "Feburary",
      "March",
      "April",
      "May",
      "June",
      "July",
      "August",
      "September",
      "October",
      "November",
      "December"
    ]
  }
  if (!(date instanceof Date)) date = new Date(date)
  return formatDate.months[date.getMonth()] + ' ' +
    date.getDate() + ', ' +
    date.getFullYear()
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
      return artist.artistId
    }))
  })
  ids = uniqueArray(ids)
  var url = endpoint + '/catalog/artist?fields=name,websiteDetailsId&ids=' + ids.join(',')
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
  loadCache(endpoint + '/track/' + obj.trackId, function(err, track) {
    if (err) return done(err);
    loadCache(endpoint + '/release/' + obj.releaseId, function(err, release) {
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

function getPlayUrl (albums, releaseId) {
  var album = (albums || []).find(function(album) {
    return album.albumId == releaseId
  })
  return album ? datapoint + '/blobs/' + album.streamHash : undefined
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
      var track = mapReleaseTrack(item, ptracks[index].releaseId, index)
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
    return atlas[artist.artistId] || {}
  })
}

function isMyPlaylist (playlist) {
  if (!isSignedIn()) return false
  return playlist.userId == session.user._id
}

/* Map Methods
 * Should conform to the array map method parameters.
 */

function mapReleaseTrack (o, index, arr) {
  o.trackNumber = index + 1
  o.index       = index
  o.canPlaylist = isSignedIn() ? { _id: o._id } : null
  return o
}

function mapRelease (o) {
  o.releaseDate = formatDate(o.releaseDate)
  o.preReleaseDate = formatDate(o.preReleaseDate)
  o.artists = o.renderedArtists
  o.cover = datapoint + '/blobs/' + o.thumbHashes["256"]
  if (o.urls instanceof Array)
    o.copycredit = createCopycredit(o.title + ' by ' + o.artists, o.urls)
  o.downloadLink = getDownloadLink(o._id)
  return o
}

function mapSignup () {
  return {
    countries: getAccountCountries()
  }
}

function mapAccount (o) {
  o.countries = getAccountCountries(o.location)
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
  return o
}

/* Transform Methods */

function transformPlaylist (obj) {
  if (isMyPlaylist(obj)) {
    obj.canPublic = {
      _id:    obj._id,
      public: obj.public
    }
  }
  if (isSignedIn())
    obj.canDownload = true
  return obj
}

function transformPlaylistTracks (obj, done) {
  var id = document.querySelector('[playlist-id]').getAttribute('playlist-id')
  var url = endpoint + '/playlist/' + id + '?fields=name,public,tracks,userId'
  var playlist = cache(url)
  var ids = uniqueArray(playlist.tracks.map(function (item) {
    return item.releaseId
  }))
  var url = endpoint + '/catalog/release?fields=title&ids=' + ids.join(',')
  loadCache(url, function(err, aobj) {
    if (err) return done(err)
    var releaseAtlas = toAtlas(aobj.results, '_id')
    var trackAtlas = toAtlas(obj.results, '_id')
    getArtistsAtlas(obj.results, function (err, artistAtlas) {
      if (!artistAtlas) artistAtlas = {}
      obj.results = playlist.tracks.map(function (item, index, arr) {
        var track = mapReleaseTrack(trackAtlas[item.trackId] || {}, index, arr)
        var release = releaseAtlas[item.releaseId] || {}
        track.release = release.title
        track.releaseId = release._id
        track.artists = mapTrackArtists(track, artistAtlas)
        track.playlistId = id
        track.playUrl = getPlayUrl(track.albums, track.releaseId)
        track.artsistsTitle = getArtistsTitle(track.artists)
        track.canRemove = isMyPlaylist(playlist) ? { index: track.index } : undefined
        track.downloadLink = getDownloadLink(release._id, track._id)
        return track
      })
      done(null, obj)
    })
  })
}

function transformMusic () {
  var q    = queryStringToObject(window.location.search)
  q.fields = ['title', 'releaseDate', 'preReleaseDate', 'thumbHashes'].join(',')
  q.limit  = 25
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
  obj.results = obj.results.map(mapRelease)
  obj.skip  = (parseInt(obj.skip) || 0) + 1
  obj.count = obj.skip + obj.results.length - 1
  return obj
}

function transformMarkdown (obj) {
  return marked(obj)
}

function transformBuyOut () {
  return queryStringToObject(window.location.search)
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
      track.artsistsTitle = getArtistsTitle(track.artists)
      track.downloadLink = getDownloadLink(releaseId, track._id)
    })
    done(null, obj)
  })
}

function transformAccountSettings(obj) {
  obj.downloadOptions = downloadOptions.map(function (opt) {
    opt = cloneObject(opt)
    opt.selected = opt.value == obj.preferredDownloadFormat
    return opt;
  })
  return obj
}

/* Helpers */

function uniqueArray (arr) {
  return Array.from(new Set(arr))
}

function toAtlas (arr, key) {
  var atlas = {}
  arr.forEach(function (item) {
    atlas[item[key]] = item
  })
  return atlas
}

function getAccountCountries (current) {
  return Countries.map(function (item) {
    return {
      name: item.name,
      selected: item.name == current
    }
  })
}

function getLastPathnameComponent () {
  return location.pathname.substr(location.pathname.lastIndexOf('/') + 1)
}

function commaStringToObject (str) {
  var obj = {}
  var arr = (str || "").split(',')
  for (var i = 0; i < arr.length; i += 2) {
    obj[arr[i]] = arr[i+1]
  }
  return obj
}

function requestSimple (method, what, obj, done) {
  requestJSON({
    url: endpoint + '/' + what,
    method: method,
    data: obj,
    withCredentials: true
  }, done)
}

function create (what, obj, done) {
  requestSimple("POST", what, obj, done)
}

function update (what, id, obj, done) {
  var path = id ? what + '/' + id : what
  requestSimple("PATCH", path, obj, done)
}

function destroy (what, id, done) {
  requestSimple("DELETE", what + '/' + id, null, done)
}

/* UI Stuff */

function toast (opts) {
  var container = document.querySelector('[role="toasts"]')
  if (!container) return
  var div = document.createElement('div')
  var template = document.querySelector('[template-name="toast"]')
  if (!template) return
  render(div, template.textContent, opts)
  var el = div.firstElementChild
  container.appendChild(el)
  setTimeout(function () {
    container.removeChild(el)
  }, opts.time || 3000)
}

function openModal (name, data) {
  var el         = getTemplateEl(name)
  var opts       = getElementSourceOptions(el)
  var container  = document.querySelector('[role="modals"]')
  opts.container = container
  opts.data      = data
  if (opts.source) {
    loadSource(opts)
  }
  else {
    renderTemplateOptions(opts)
  }
  container.classList.add('open')
}

function closeModal () {
  var container = document.querySelector('[role="modals"]')
  container.classList.remove('open')
  container.removeChild(container.firstElementChild)
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
}

function togglePassword (e, el) {
  var target = 'input[name="' + el.getAttribute('toggle-target') + '"]'
  var tel    = document.querySelector(target)
  if (!tel) return
  var type   = tel.getAttribute('type') == 'password' ? 'text' : 'password'
  var cls    = type == 'password' ? 'eye-slash' : 'eye'
  tel.setAttribute('type', type)
  var iel    = el.firstElementChild
  if (!iel) return
  iel.classList.remove('fa-eye')
  iel.classList.remove('fa-eye-slash')
  iel.classList.add('fa-' + cls)
}

function openTrackCopyCredits (e, el) {
  openModal('track-copycredits-modal', {
    trackId:   el.getAttribute('track-id'),
    releaseId: el.getAttribute('release-id')
  })
}

// TODO don't use this...
function simpleUpdate (err, obj, xhr) {
  if (err) return window.alert(err.message)
  loadSubSources(document.querySelector('[role="content"]'))
}

function canAccessGold (e, el) {
  if (hasGoldAccess()) return
  e.preventDefault()
  openModal('subscription-required-modal')
}
