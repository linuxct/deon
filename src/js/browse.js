var browseMusicLimit = 25
var browseUri = '/browse' // TODO 'music'

function transformBrowseMusic (obj) {
  obj = obj || {}
  var q    = queryStringToObject(window.location.search)
  q.limit  = (q.pages || 0) * browseMusicLimit
  q.skip   = 0
  obj.query = objectToQueryString(q)
  return obj
}

function mapFilterString (str) {
  return str.substr(0, str.lastIndexOf('s'))
}

function completedBrowseFilters () {
  var q = queryStringToObject(window.location.search)
  filterBrowseMusic.filters.forEach(function (filter) {
    var cel = document.querySelector('[role="filters-list-' + filter + '"]')
    if (!cel) return
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

function completedBrowseMusic () {
  var q = getBrowseMusicQuery()
  q.limit = browseMusicLimit * (parseInt(q.pages) || 1)
  q.skip = 0
  delete q.pages
  openBrowsePage(q)
}

function openBrowsePage (q) {
  var cel = document.querySelector('[role="browse-pages"]')
  if (!cel) return
  var tel = getTemplateEl('browse-page')
  var div = document.createElement('div')
  render(div, tel.textContent, {
    source: endpoint + '/catalog/browse/?' + objectToQueryString(q)
  })
  var ul = div.firstElementChild
  cel.appendChild(ul)
  loadSubSources(ul)
}

function transformMusicBrowseResults (obj, done) {
  var tracks = obj.results
  var playIndexOffset = obj.skip || 0

  //Here we're taking all the tracks and putting them under a release object
  var rmap = {}
  tracks.forEach(function (track, index, arr) {
    var release = track.release
    if(release) {
      release.inEarlyAccess = track.inEarlyAccess
      if (!rmap[release._id]) {
        rmap[release._id] = track.release
      }
      release = rmap[release._id]
      if (!release.tracks) release.tracks = []
      release.tracks.push(track)
    }
  })
  var releases = Object.keys(rmap).map(function (key) { return rmap[key] }).sort(sortRelease)
  releases.forEach(function(release) {
    mapRelease(release)
    release.tracks.forEach(function (track, index, arr) {
      mapTrack(track)
      if(track.streamable) {
        track.index = playIndexOffset
        track.trackNumber = index + 1
        playIndexOffset++
      }
    })
    release.tracks.sort(sortTracks)
  })

  obj.results = releases
  obj.total = obj.total
  obj.hasGoldAccess = hasGoldAccess()
  done(null, obj)
}

function getBrowseMoreButton () {
  return document.querySelector('[role="browse-more"]')
}

function completedMusicBrowseResults (source, obj) {
  player.set(buildTracks())
  var el = getBrowseMoreButton()
  if (!el) return
  var data = obj.data
  var method = data && data.results && data.skip + data.results.length >= data.total ? "add" : "remove"
  el.disabled = false
  el.classList[method]('hide')
  mergeBrowseResults()
  startCountdownTicks()
  //Rebuild the indexes so that the index attribute matches their actual position on the page
  document.querySelectorAll('[play-link]').forEach(function (el, index) {
    el.setAttribute('index', index)
  })

}

function mergeBrowseResults () {
  var map = {}
  var els = toArray(document.querySelectorAll('li[catalog-id]'))
  els.forEach(function (el) {
    var id = el.getAttribute('catalog-id')
    if (!map[id]) map[id] = []
    map[id].push(el)
  })
  Object.keys(map).map(function (key) {
    return map[key]
  }).filter(function (arr) {
    return arr.length > 1
  }).forEach(mergeBrowseResults.forEachMerger)
}
mergeBrowseResults.forEachMerger = function forEachMerger (arr) {
  var a = arr.shift()
  var tbody = a.querySelector('tbody')
  var frag = document.createDocumentFragment()
  for (var j = 0; j < arr.length; j++) {
    var b = arr[j]
    var trs = toArray(b.querySelectorAll('tbody > tr'))
    for (var i = 0; i < trs.length; i++) {
      frag.appendChild(trs[i])
    }
    b.parentElement.removeChild(b)
  }
  tbody.appendChild(frag)
}

function addBrowseFilter (e, el) {
  var cel = document.querySelector('[role="filters-list-' + el.name + 's"]')
  var el = createFilterItem(el.name, el.value)
  cel.appendChild(el)
}

function removeBrowseFilter (e, el) {
  var li = el.parentElement
  li.parentElement.removeChild(li)
}

function getBrowseMusicQuery () {
  return queryStringToObject(window.location.search)
}

function filterBrowseMusic (e, el) {
  var q = getBrowseMusicQuery()
  var data = getTargetDataSet(el) || {}
  filterBrowseMusic.filters.forEach(function (key) {
    if (data[key] && data[key].length > 0) {
      q[key] = data[key]
    } else {
      delete q[key]
    }
  })
  delete q.pages
  delete q.page
  if(data.search) {
    q.search = data.search

    var bpm = parseInt(q.search)
    if(!isNaN(bpm)) {
      q.search = 'bpm:' + bpm
    }
  }
  else {
    delete q.search
  }
  go('?' + objectToQueryString(q))
}
filterBrowseMusic.filters = [
  'tags',
  'genres',
  'types'
]

function autoBrowseMore () {
  var btn = getBrowseMoreButton()
  if (!player) return
  if (window.location.path != browseUri) return
  if (player.index < player.items.length) return
  // Simple logic to avoid retrigger if not available or already loading
  if (btn && btn.classList.contains('hide')) return
  browseMore()
}

function browseMore (e, el) {
  var btn = getBrowseMoreButton()
  if (btn) btn.classList.add('hide')
  var q = getBrowseMusicQuery()
  var pages = parseInt(q.pages) || 1
  q.limit = browseMusicLimit
  q.skip = pages * q.limit
  delete q.pages
  openBrowsePage(q)
  delete q.limit
  delete q.skip
  q.pages = pages + 1
  var title = "Browse Music - " + q.pages + " Pages"
  var url = window.location.origin + window.location.pathname + '?' + objectToQueryString(q)
  document.title = title
  history.pushState({}, title, url)
}
