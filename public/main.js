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

function searchMusic (e, el) {
  go('/music?' + objToQueryString(getDataSet(el)))
}

function createPlaylist (e, el) {
  var name = window.prompt(strings.createPlaylist)
  if (!name) return
  requestJSON({
    url: endpoint + '/playlist',
    method: "POST",
    data: {
      title: name
    }
  }, function (err, body, xhr) {
    if (err) {
      return console.error(err)
    }
    console.log(body)
    loadSubSources(document.querySelector('[role="content"]'))
  })
}

function renamePlaylist (e, el) {
  var name = window.prompt(strings.renamePlaylist)
  if (!name) return
  requestJSON({
    url: endpoint + '/playlist/' + el.getAttribute('playlist-id'),
    method: "PATCH",
    data: {
      title: name
    }
  }, function (err, body, xhr) {
    if (err) {
      return console.error(err)
    }
    console.log(body)
    loadSubSources(document.querySelector('[role="content"]'))
  })
}

function destroyPlaylist (e, el) {
  window.confirm(strings.destroyPlaylist)
  requestJSON({
    url: endpoint + '/playlist/' + el.getAttribute('playlist-id'),
    method: "DELETE"
  }, function (err, body, xhr) {
    if (err) {
      return console.error(err)
    }
    console.log(body)
    loadSubSources(document.querySelector('[role="content"]'))
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
