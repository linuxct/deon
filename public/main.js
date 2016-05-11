var endpoint = 'https://connect.monstercat.com/api'
var strings = {
  "createPlaylist": "Give a name for new playlist.",
  "renamePlaylist": "Give a new name for this playlist.",
  "destroyPlaylist": "Are you sure you want to remove this playlist?"
}

document.addEventListener("DOMContentLoaded", function (e) {
  window.addEventListener("popstate", function (e) {
    stateChange(location.pathname + location.search, e.state)
  })
  document.addEventListener("click", interceptClick)
  stateChange(location.pathname + location.search)
})

function requestSimple (method, what, obj, done) {
  requestJSON({
    url: endpoint + '/' + what,
    method: method,
    data: obj
  }, done)
}

function create (what, obj, done) {
  requestSimple("POST", what, obj, done)
}

function update (what, id, obj, done) {
  requestSimple("PATCH", what + '/' + id, obj, done)
}

function destroy (what, id, done) {
  requestSimple("DELETE", what + '/' + id, null, done)
}

function searchMusic (e, el) {
  go('/music?' + objToQueryString(getDataSet(el)))
}

function simpleUpdate (err, body, xhr) {
  if (err) {
    return console.error(err.message)
  }
  console.log(body)
  loadSubSources(document.querySelector('[role="content"]'))
}

function createPlaylist (e, el) {
  var name = window.prompt(strings.createPlaylist)
  if (!name) return
  create('playlist', {title: name}, simpleUpdate)
}

function renamePlaylist (e, el) {
  var name = window.prompt(strings.renamePlaylist)
  if (!name) return
  update('playlist', el.getAttribute('playlist-id'), { title: name }, simpleUpdate)
}

function destroyPlaylist (e, el) {
  if (!window.confirm(strings.destroyPlaylist))
    return
  destroy('playlist', el.getAttribute('playlist-id'), simpleUpdate)
}

function togglePlaylistPublic (e, el) {
  update('playlist', el.getAttribute('playlist-id'), {
    public: !!el.checked
  }, function (err, obj) {
    if (!err) return
    window.alert(err.message)
    el.checked = !el.checked
  })
}

function transformReleases (obj) {
  obj.results.forEach(transformRelease)
  return obj
}

function transformRelease (o) {
  o.released = (new Date(o.released)).toDateString()
  return o
}

function transformReleaseTracks (obj) {
  obj.results.forEach(transformReleaseTrack)
  return obj
}

function transformReleaseTrack (o, index, arr) {
  o.trackNumber = index + 1
  return o
}
