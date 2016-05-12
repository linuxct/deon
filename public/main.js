var endhost   = 'https://connect.monstercat.com'
var endpoint  = endhost + '/api'
var datapoint = 'https://s3.amazonaws.com/data.monstercat.com'
var session   = null
var strings   = {
  "createPlaylist": "Give a name for new playlist.",
  "renamePlaylist": "Give a new name for this playlist.",
  "destroyPlaylist": "Are you sure you want to remove this playlist?",
  "accountUpdated": "Your account information has been saved."
}

document.addEventListener("DOMContentLoaded", function (e) {
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
      renderHeader(true)
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

function searchMusic (e, el) {
  go('/music?' + objToQueryString(getDataSet(el)))
}

function simpleUpdate (err, obj, xhr) {
  if (err) {
    return console.error(err.message)
  }
  console.log(obj)
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
  if (!window.confirm(strings.destroyPlaylist))
    return
  destroy('playlist', el.getAttribute('playlist-id'), simpleUpdate)
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
  template = document.querySelector('[template-name="' +
                                    el.getAttribute('template') +
                                    '"]').textContent
  scope = {
    user: session.user
  }
  render(el, template, scope)
}

function formatDate (date) {
  if (!(date instanceof Date)) date = new Date(date)
  return date.toDateString() // TODO add custom method
}

function transformReleases (obj) {
  obj.results = obj.results.map(mapRelease)
  obj.count = obj.results.length
  obj.offset = (parseInt(obj.offset) || 0) + 1
  return obj
}

function mapRelease (o) {
  o.releaseDate = formatDate(o.releaseDate)
  o.preReleaseDate = formatDate(o.preReleaseDate)
  o.artists = o.renderedArtists
  o.cover = datapoint + '/blobs/' + o.thumbHashes["256"]
  return o
}

function transformReleaseTracks (obj) {
  obj.results = obj.results.map(mapReleaseTrack)
  return obj
}

function mapReleaseTrack (o, index, arr) {
  o.trackNumber = index + 1
  o.artists = o.artistsTitle
  return o
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
