var browseMusicLimit = 25

function transformBrowseMusic (obj) {
  obj = obj || {}
  var q    = queryStringToObject(window.location.search)
  q.limit  = browseMusicLimit
  q.skip   = parseInt(q.skip) || 0
  obj.query = objectToQueryString(q)
  return obj
}

function mapFilterString (str) {
  return str.substr(0, str.lastIndexOf('s'))
}

function completedBrowseMusic () {
  var q = queryStringToObject(window.location.search)
  var cel = document.querySelector('[role="filters-list"]')
  if (!cel) return
  filterBrowseMusic.filters.forEach(function (filter) {
    var values = (q[filter] || '').split(',').map(mapStringTrim).filter(filterNil)
    values.forEach(function (value) {
      var el = createFilterItem(mapFilterString(filter), value)
      cel.appendChild(el)
    })
  })
}

function createFilterItem (type, value) {
  var div = document.createElement('div')
  var template = getTemplateEl('browse-filter-item')
  render(div, template.textContent, {
    type: type,
    value: value
  })
  return div.firstElementChild
}

function transformMusicBrowseResults (obj, done) {
  tracks = obj.results

  var q = queryStringToObject(window.location.search)
  if (!q.limit)
    q.limit = browseMusicLimit
  q.limit = parseInt(q.limit)
  if (!q.skip)
    q.skip= 0
  q.skip = parseInt(q.skip)

  var next = obj.skip + browseMusicLimit
  var prev = obj.skip - browseMusicLimit

  if(next <= obj.total) {
    var nq = cloneObject(q)
    nq.skip = next
    obj.next = objectToQueryString(nq)
  }

  if(prev >= 0) {
    var pq = cloneObject(q)
    pq.skip = prev
    obj.previous = objectToQueryString(pq)
  }

  getArtistsAtlas(tracks, function (err, atlas) {
    if (!atlas) atlas = {}
    var rmap = {}
    tracks.forEach(function (track, index, arr) {
      var release = track.release
      if (!rmap[release._id]) rmap[release._id] = track.release
      delete track.release
      release = rmap[release._id]
      if (!release.tracks) release.tracks = []
      release.tracks.push(track)
    })
    var releases = Object.keys(rmap).map(function (key) { return rmap[key] })
    releases.forEach(function(release) {
      mapRelease(release)
      release.tracks.forEach(function (track) {
        mapReleaseTrack(track)
        track.releaseId    = release._id
        track.trackNumber  = getTrackNumber(track, release._id)
        track.playUrl      = getPlayUrl(track.albums, release._id)
        track.artists      = mapTrackArtists(track, atlas)
        track.downloadLink = getDownloadLink(release._id, track._id)
        track.genresList   = track.genres.filter(function (i) { return i !== track.genre }).join(", ")
        track.genreBonus   = track.genres.length > 1 ? ('+' + (track.genres.length - 1)) : ''
        track.genreLink    = encodeURIComponent(track.genre)
      })
      release.tracks.sort(sortTracks)
    })
    releases.sort(sortRelease)

    obj.results = releases
    obj.skip = obj.skip + 1
    obj.total = obj.total
    done(null, obj)
  })
}

function addBrowseFilter (e, el) {
  var cel = document.querySelector('[role="filters-list"]')
  var el = createFilterItem(el.name, el.value)
  cel.appendChild(el)
}

function removeBrowseFilter (e, el) {
  var li = el.parentElement
  li.parentElement.removeChild(li)
}

function filterBrowseMusic (e, el) {
  var q = queryStringToObject(window.location.search)
  var data = getTargetDataSet(el) || {}
  filterBrowseMusic.filters.forEach(function (key) {
    if (data[key] && data[key].length > 0) {
      q[key] = data[key]
    } else {
      delete q[key]
    }
  })
  go('/browse?' + objectToQueryString(q))
}
filterBrowseMusic.filters = [
  'tags',
  'genres',
  'types'
]
