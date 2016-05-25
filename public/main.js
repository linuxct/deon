var endhost   = 'https://connect.monstercat.com'
var facebookAppId = '282352068773785'
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
  "reorderedPlaylist": "Playlist order saved.",
  "removedFromPlaylist": "Song succesfully removed from playlist.",
  "passwordMissing": "You must enter a password.",
  "passwordReset": "Your password has been reset. Please sign in.",
  "passwordResetEmail": "Check your email for a link to reset your password."
}
var downloadOptions = [
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
    data: getTargetDataSet(el)
  }, function (err, obj, xhr) {
    if (err) return window.alert(err.message)
    onSignIn()
  })
}

function onSignIn() {
  getSession(function (err, sess) {
    if (err) return window.alert(err.message)
    session = sess
    renderHeader()
    go("/")
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
  var data = getTargetDataSet(el)
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
  var data = getTargetDataSet(el)
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
    data: getTargetDataSet(el)
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
  create('playlist', {
    name: name,
    public: session.settings.playlistPublicByDefault
  }, simpleUpdate)
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
  var url   = endpoint + '/playlist/' + id + '?fields=name,public,tracks,userId'
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

function buyOutLicense (e, el) {
  go('/buy-license?' + objectToQueryString(getTargetDataSet(el)))
}

function searchMusic (e, el) {
  var data   = getTargetDataSet(el)
  var q      = queryStringToObject(window.location.search)
  var filter = []
  var fuzzy  = []
  if (data.type)
    filter.push('type', data.type)
  if (data.search)
    fuzzy.push('title', data.search)
  q.filters = filter.join(',')
  q.fuzzy   = fuzzy.join(',')
  q.skip    = 0
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
    return atlas[artist.artistId] || {}
  })
}

function isMyPlaylist (playlist) {
  if (!isSignedIn()) return false
  return playlist.userId == session.user._id
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

function getReleaseShareLink(urls) {
  var link
  var re = /spotify\.com/
  urls.forEach(function (url) {
    if (re.test(url)) {
      link = url
    }
  })
  return link
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
  o.cover = datapoint + '/blobs/' + o.thumbHashes["256"]
  o.coverBig = datapoint + '/blobs/' + o.thumbHashes["1024"]
  if (o.urls instanceof Array) {
    o.copycredit = createCopycredit(o.title + ' by ' + o.artists, o.urls)
    o.share = getReleaseShareLink(o.urls)
    o.purchase = !!o.urls.length
  }
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
  if (o.urls) {
    o.socials = getSocials(o.urls)
  }
  return o
}

function sortRelease (a, b) {
  var a = new Date(a.preReleaseDate || a.releaseDate)
  var b = new Date(b.preReleaseDate || b.releaseDate)
  if (a > b) return -1
  if (a < b) return 1
  return 0
}

/* Transform Methods */

function transformPlaylist (obj) {
  if (isMyPlaylist(obj)) {
    obj.canPublic = {
      _id:    obj._id,
      public: obj.public
    }
  }
  if (hasGoldAccess())
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
        if (isMyPlaylist(playlist)) {
          track.edit = {
            releaseId: release._id,
            _id: track._id,
            title: track.title,
            trackNumber: track.trackNumber,
            index: track.index
          }
        } else {
          track.noEdit = {
            trackNumber: track.trackNumber
          }
        }
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
  obj.results = obj.results.sort(sortRelease).map(mapRelease)
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

/* Completed Methods */

function completedRelease (source, obj) {
  if (obj.error) return
  var r = obj.data
  setMetaData({
    "og:title": r.title,
    "og:image": r.cover,
    "og:url": location.toString(),
    "og:type": "music.album"
  })
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

function addMetaElement (el, key, value) {
  var mel = document.createElement('meta')
  mel.setAttribute('property', key)
  mel.setAttribute('content', value)
  el.insertBefore(mel, el.firstElementChild)
}

function removeMetaElement (el, key) {
  var target = el.querySelector('[property="' + key + '"]')
  if (target)
    target.parentElement.removeChild(target)
}

function setMetaData (obj) {
  var head = document.querySelector('head')
  if (!head) return
  for (var key in obj) {
    removeMetaElement(head, key)
    addMetaElement(head, key, obj[key])
  }
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
  loadSubSources(document.querySelector('[role="content"]'), true, true)
}

function reorderPlaylistFromInputs() {
  var inputs = document.querySelectorAll('[name="trackOrder\\[\\]"')
  //This is a kinda hacky way for not letting them accidentally delete all their tracks
  //by spam clicking while the track list is reloading
  if(inputs.length == 0) {
    return
  }
  var trackOrdering = []
  var trackEls = []
  var changed = false
  for(var i = 0; i < inputs.length; i++) {
    var input = inputs[i]
    var trackId = input.getAttribute('track-id')
    var releaseId = input.getAttribute('release-id')
    var to = parseInt(input.value)
    var from = i + 1
    if(!changed) {
      changed = to != from
    }
    trackOrdering.push({trackId: trackId, releaseId: releaseId, from: from, to: to})
  }
  if(!changed) return
  trackOrdering.sort(function(a, b) {
    //If you change #1 to #6 and leave #6 at #6 then track 1 should be after #6
    //If you move #7 to #3 and leave #3 unchanged, then #7 should be before #3
    if(a.to == b.to) {
      if(a.to > a.from) {
        return 1
      }
      if(a.to < a.from) {
        return -1
      }
      if(b.to > b.from) {
        return -1
      }
      if(b.to < b.from) {
        return 1
      }
      return 0
    }
    return a.to > b.to ? 1 : -1
  })
  trackEls = trackOrdering.map(function (item) {
    return document.querySelector('tr[role="playlist-track"][track-id="' + item.trackId + '"][release-id="' + item.releaseId + '"]')
  })
  var tracksNode = document.querySelector('[role="playlist-tracks"]')
  for(var i = trackEls.length - 1; i >= 0; i--) {
    var before = i == (trackEls.length - 1) ? null : trackEls[i+1]
    tracksNode.insertBefore(tracksNode.removeChild(trackEls[i]), before)
  }
  resetPlaylistInputs()
  savePlaylistOrder();
}

function resetPlaylistInputs() {
  var trackEls = document.querySelectorAll('[role="playlist-track"]')
  for(var i = 0; i < trackEls.length; i++) {
    trackEls[i].querySelector('input[name="trackOrder\[\]"]').value = (i + 1)
  }
}

function savePlaylistOrder() {
  var id = document.querySelector('[playlist-id]').getAttribute('playlist-id')
  var trackEls = document.querySelectorAll('[role="playlist-track"]')
  var trackSaves = []
  for(var i = 0; i < trackEls.length; i++) {
    trackSaves.push({
      trackId: trackEls[i].getAttribute('track-id'),
      releaseId: trackEls[i].getAttribute('release-id')
    })
  }
  var url   = endpoint + '/playlist/' + id + '?fields=name,public,tracks,userId'
  update('playlist', id, {tracks: trackSaves}, function (err, obj, xhr) {
    if (err) {
      toast({
        error: true,
        message: err.message
      })
      return
    }
    cache(url, obj)
    simpleUpdate()
    toast({
      message: strings.reorderedPlaylist
    })
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
}

function reorderPlaylistFromInputs() {
  var inputs = document.querySelectorAll('[name="trackOrder\\[\\]"')
  //This is a kinda hacky way for not letting them accidentally delete all their tracks
  //by spam clicking while the track list is reloading
  if(inputs.length == 0) {
    return
  }
  var trackOrdering = []
  var trackEls = []
  var changed = false
  for(var i = 0; i < inputs.length; i++) {
    var input = inputs[i]
    var trackId = input.getAttribute('track-id')
    var releaseId = input.getAttribute('release-id')
    var to = parseInt(input.value)
    var from = i + 1
    if(!changed) {
      changed = to != from
    }
    trackOrdering.push({trackId: trackId, releaseId: releaseId, from: from, to: to})
  }
  if(!changed) return
  trackOrdering.sort(function(a, b) {
    //If you change #1 to #6 and leave #6 at #6 then track 1 should be after #6
    //If you move #7 to #3 and leave #3 unchanged, then #7 should be before #3
    if(a.to == b.to) {
      if(a.to > a.from) {
        return 1
      }
      if(a.to < a.from) {
        return -1
      }
      if(b.to > b.from) {
        return -1
      }
      if(b.to < b.from) {
        return 1
      }
      return 0
    }
    return a.to > b.to ? 1 : -1
  })
  trackEls = trackOrdering.map(function (item) {
    return document.querySelector('tr[role="playlist-track"][track-id="' + item.trackId + '"][release-id="' + item.releaseId + '"]')
  })
  var tracksNode = document.querySelector('[role="playlist-tracks"]')
  for(var i = trackEls.length - 1; i >= 0; i--) {
    var before = i == (trackEls.length - 1) ? null : trackEls[i+1]
    tracksNode.insertBefore(tracksNode.removeChild(trackEls[i]), before)
  }
  resetPlaylistInputs()
  savePlaylistOrder();
}

function resetPlaylistInputs() {
  var trackEls = document.querySelectorAll('[role="playlist-track"]')
  for(var i = 0; i < trackEls.length; i++) {
    trackEls[i].querySelector('input[name="trackOrder\[\]"]').value = (i + 1)
  }
}

function savePlaylistOrder() {
  var id = document.querySelector('[playlist-id]').getAttribute('playlist-id')
  var trackEls = document.querySelectorAll('[role="playlist-track"]')
  var trackSaves = []
  for(var i = 0; i < trackEls.length; i++) {
    trackSaves.push({
      trackId: trackEls[i].getAttribute('track-id'),
      releaseId: trackEls[i].getAttribute('release-id')
    })
  }
  var url   = endpoint + '/playlist/' + id + '?fields=name,public,tracks,userId'
  update('playlist', id, {tracks: trackSaves}, function (err, obj, xhr) {
    if (err) {
      toast({
        error: true,
        message: err.message
      })
      return
    }
    cache(url, obj)
    simpleUpdate()
    toast({
      message: strings.reorderedPlaylist
    })
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
}

function canAccessGold (e, el) {
  if (hasGoldAccess()) return
  e.preventDefault()
  openModal('subscription-required-modal')
}

function playlistTrackOrderFocus(e, el) {
  el.closest('[role="playlist-track"]').setAttribute('draggable', 'false')
}

function playlistTrackOrderBlur(e, el) {
  el.closest('[role="playlist-track"]').setAttribute('draggable', 'true')
}

function playlistDragStart (e, trackId, releaseId) {
  e.dataTransfer.setData("trackId", trackId)
  e.dataTransfer.setData("releaseId", releaseId)
  e.dataTransfer.setData("childIndex", getChildIndex(e.target))
  e.target.closest('[role="playlist-track"]').classList.add('drag-dragging')
}

function getOffset( el ) {
  var _x = 0;
  var _y = 0;
  while( el && !isNaN( el.offsetLeft ) && !isNaN( el.offsetTop ) ) {
    _x += el.offsetLeft - el.scrollLeft;
    _y += el.offsetTop - el.scrollTop;
    el = el.offsetParent;
  }
  return { top: _y, left: _x };
}

function getEventVertHalf (e, el) {
  var offset = getOffset(el)
  var height = el.offsetHeight
  if(e.clientY < (offset.top + (height / 2))) {
    return 'top'
  }
  return 'bottom'
}

function playlistAllowDrop (e) {
  e.preventDefault();
  var targetTr = e.target.closest('[role="playlist-track"]')
  targetTr.classList.add('drag-active')
  var half = getEventVertHalf(e, targetTr)
  if(half == 'top') {
    targetTr.classList.add('drag-active-top')
    targetTr.classList.remove('drag-active-bottom')
  }
  else {
    targetTr.classList.add('drag-active-bottom')
    targetTr.classList.remove('drag-active-top')
  }
}

function playlistDragLeave (e) {
  e.target.closest('[role="playlist-track"]').classList.remove('drag-active', 'drag-active-top', 'drag-active-bottom')
}

function getChildIndex (child){
  var parent = child.parentNode;
  var children = parent.children;
  var i = children.length - 1;
  for (; i >= 0; i--){
    if (child == children[i]){
      return i
    }
  }
  return i
}

function playlistDrop (e) {
  var trackId = e.dataTransfer.getData('trackId')
  var releaseId = e.dataTransfer.getData('releaseId')
  var droppedTr = e.target.closest('[role="playlist-track"]')
  var draggedTr = document.querySelector('tr[role="playlist-track"][track-id="' + trackId + '"][release-id="' + releaseId + '"]')
  draggedTr.classList.remove('drag-dragging')
  var draggedIndex = e.dataTransfer.getData('childIndex')
  var droppedIndex = getChildIndex(droppedTr)
  var half = getEventVertHalf(e, droppedTr)
  var insertBefore = half == 'top' ? droppedTr : droppedTr.nextSibling
  droppedTr.parentNode.insertBefore(draggedTr, insertBefore)
  droppedTr.classList.remove('drag-active', 'drag-active-bottom', 'drag-active-top')
  resetPlaylistInputs()
  savePlaylistOrder()
}

window.fbAsyncInit = function () {
  FB.init({
    appId: facebookAppId,
    cookie: true,
    version: 'v2.5'
  })
}

function transformSocialSettings (obj) {
  obj.facebookEnabled = !!obj.facebookId
  obj.googleEnabled = !!obj.googleId
  return obj
}

function sendAccessToken(where, done) {
  function handle(res) {
    if (res.status != 'connected' || !res.authResponse)
      return done(Error('User did not authorize.'))

    var data = {
      accessToken: res.authResponse.accessToken
    }
    requestJSON({
      url: endpoint + where,
      method: 'POST',
      data: data,
      withCredentials: true
    }, function (err, obj, xhr) {
      done(err)
    })
  }

  FB.login(handle)
}

function sendIdToken(token, where, done) {
  var data = {
    idToken: token
  }
  requestJSON({
    url: endpoint + where,
    method: 'POST',
    data: data,
    withCredentials: true
  }, function (err, obj, xhr) {
    done(err)
  })
}

function enableGoogleSignin (e, el) {
  if (!gapi.auth2) return

  var auth = gapi.auth2.getAuthInstance()
  auth.signIn()
  .then(function (user) {
    sendIdToken(user.getAuthResponse().id_token, '/self/google/signin/enable', function (err) {
      if (err) return window.alert(err.message)
      window.location.reload()
    })
  })
}

function signInGoogle (e, el) {
  if (!gapi.auth2) return
  var auth = gapi.auth2.getAuthInstance()
  auth.signIn()
  .then(function (user) {
    sendIdToken(user.getAuthResponse().id_token, '/self/google/signin', function (err) {
      if (err) return window.alert(err.message)
      onSignIn()
    })
  })
}

function signInFacebook (e, el) {
  sendAccessToken('/self/facebook/signin', function (err) {
    if (err) return window.alert(err.message)
    onSignIn()
  })
}

function enableFacebookSignin (e, el) {
  sendAccessToken('/self/facebook/signin/enable', function (err) {
    if (err) return window.alert(err.message)
    window.location.reload()
  })
}
