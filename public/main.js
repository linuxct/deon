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
  "addedToPlaylist": "Song succesfully added to playlist.",
  "removedFromPlaylist": "Song succesfully removed from playlist."
}

document.addEventListener("DOMContentLoaded", function (e) {
  renderHeader()
  getSession(function (err, obj, xhr) {
    if (err) console.warn(err.message)
    session = obj
    renderHeader()
    window.addEventListener("popstate", popState)
    document.addEventListener("click", interceptClick)
    stateChange(location.pathname + location.search)
  })
})

function popState(e) {
  stateChange(location.pathname + location.search, e.state)
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

function simpleUpdate (err, obj, xhr) {
  if (err) return window.alert(err.message)
  loadSubSources(document.querySelector('[role="content"]'))
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
      if (err) return window.alert(err)
      loadSubSources(document.querySelector('[role="content"]'), true)
      // TODO toast me brah
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
      if (err) return window.alert(err)
      window.alert(strings.addedToPlaylist)
      // TODO toast me brah
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

function renderHeader () {
  el = document.querySelector('#navigation')
  var target = '[template-name="' + el.getAttribute('template') + '"]'
  template = document.querySelector(target).textContent
  var data = null
  if (session) {
    data = {}
    data.user = session ? session.user : null
  }
  render(el, template, {
    data: data
  })
}

function searchMusic (e, el) {
  var data = getDataSet(el)
  var q = queryStringToObject(window.location.search)
  var filter = []
  if (data.type)
    filter.push('type', data.type)
  if (data.search)
    filter.push('title', data.search)
  q.filters = filter.join(',')
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

function transformMusic () {
  var q    = queryStringToObject(window.location.search)
  q.fields = ['title', 'releaseDate', 'preReleaseDate', 'thumbHashes'].join(',')
  q.limit  = 25
  q.skip   = parseInt(q.skip) || 0
  var filters = (q.filter || "").split(',')
  var search  = ""
  var type    = ""
  for (var i=0; i < filters.length; i+=2) {
    var filter = filters[i]
    var value = filters[i+1]
    if (filter == 'title')
      search = value
    if (filter == 'type')
      type = value
  }
  var types = [
    { value: 'Album', name: "Albums" },
    { value: 'EP', name: "EPs" },
    { value: 'Single', name: "Singles" },
    { value: 'Podcast', name: "Podcasts" }
  ]
  types.forEach(function (item) {
    item.selected = type == item.value
  })
  return {
    search: search,
    types: types,
    query: objectToQueryString(q)
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

function mapRelease (o) {
  o.releaseDate = formatDate(o.releaseDate)
  o.preReleaseDate = formatDate(o.preReleaseDate)
  o.artists = o.renderedArtists
  o.cover = datapoint + '/blobs/' + o.thumbHashes["256"]
  return o
}

function toAtlas (arr, key) {
  var atlas = {}
  arr.forEach(function (item) {
    atlas[item[key]] = item
  })
  return atlas
}

function getArtistsAtlas (tks, done) {
  var ids = []
  tks.forEach(function(track) {
    ids = ids.concat(track.artists.map(function (artist) {
      return artist.artistId
    }))
  })
  ids = uniqueArray(ids)
  url = endpoint + '/catalog/artist?fields=name,websiteDetailsId&ids=' + ids.join(',')
  loadCache(url, function (err, aobj) {
    if (err) return done(err)
    return done(err, toAtlas(aobj.results, '_id'))
  })
}

function mapTrackArtists (track, atlas) {
  return track.artists.map(function (artist) {
    return atlas[artist.artistId]
  })
}

function transformReleaseTracks (obj, done) {
  getArtistsAtlas(obj.results, function (err, atlas) {
    if (!atlas) atlas = {}
    obj.results.forEach(function (track, index, arr) {
      mapReleaseTrack(track, index, arr)
      track.artists = mapTrackArtists(track, atlas)
    })
    done(null, obj)
  })
}

function mapReleaseTrack (o, index, arr) {
  o.trackNumber = index + 1
  o.index       = index
  o.canPlaylist = session ? session.user : null
  return o
}

function uniqueArray (arr) {
  return Array.from(new Set(arr))
}

function transformPlaylistTracks (obj, done) {
  var id = document.querySelector('[playlist-id]').getAttribute('playlist-id')
  var url = endpoint + '/playlist/' + id + '?fields=name,public,tracks'
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
        return track
      })
      done(null, obj)
    })
  })
}

function mapAccount (o) {
  o.countries = Countries.map(function (item) {
    return {
      name: item.name,
      selected: item.name == o.location
    }
  })
  return o
}

function mapWebsiteDetails (o) {
  o.image = o.profileImageBlobId ? datapoint + '/blobs/' + o.profileImageBlobId : undefined
  if (o.bookings || o.managementDetail) {
    o.contact = {
      booking: o.bookings,
      management: o.managementDetail
    }
  }
  return o
}

function transformMarkdown (obj) {
  return marked(obj)
}
