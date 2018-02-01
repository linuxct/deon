var catalogMusicLimit = 50

function transformCatalogMusic (obj) {
  obj = obj || {}
  var q    = queryStringToObject(window.location.search)
  q.limit  = catalogMusicLimit
  q.skip   = (q.page-1 || 0) * catalogMusicLimit
  obj.query = objectToQueryString(q)
  return obj
}

function transformCatalogFilters (obj) {
  var q = queryStringToObject(window.location.search)
  obj.search = q.search
  return obj
}

function completedCatalogFilters () {
  setTimeout(function () {
    var input = document.querySelector('input[name=search]')
    input.focus()
    input.value = input.value
  }, 1)
}

function completedCatalogMusic () {
  var q = getBrowseMusicQuery()
  q.limit = catalogMusicLimit
  q.skip = (q.page-1 || 0) * catalogMusicLimit
  delete q.page
  openCatalogPage(q)
}

function openCatalogPage (q) {
  var cel = document.querySelector('[role="catalog-pages"]')
  if (!cel) return
  var tel = getTemplateEl('catalog-page')

  var div = document.createElement('div')
  render(div, tel.textContent, {
    source: endpoint + '/catalog/browse/?' + objectToQueryString(q)
  })

  cel.appendChild(div)
  loadSubSources(div)
}

function transformMusicCatalogResults (obj, done){
  if (obj.total > 1) obj.showPagination = true
  setPagination(obj, obj.limit)
  var streamableIndex = 0
  obj.results = obj.results.map(function (item, index, arr) {
    var track = mapTrack(item)
    track.index = streamableIndex
    if(track.streamable) {
      streamableIndex++
    }
    return track
  })

  obj.tableHeaders = getSortableHeaders()

  return obj
}

function getSortableHeaders (sortBy, direction) {
  var qo = queryStringToObject(window.location.search)

  var headers =
  [ { label: 'Track'
    , field: 'title'
    , xsHidden: false
    } ,
    { label: 'Artists'
    , field: 'artists'
    , xsHidden: false
    } ,
    { label: 'Release'
    , field: 'release'
    , xsHidden: false
    } ,
    { label: 'Time'
    , field: 'time'
    , xsHidden: true
    } ,
    { label: 'BPM'
    , field: 'bpm'
    , xsHidden: true
    } ,
    { label: 'Genre'
    , field: 'genre'
    , xsHidden: true
    } ,
    { label: 'Date'
    , field: 'date'
    , xsHidden: true
    }
  ]

  headers = headers.map(function (h) {
    var qo = queryStringToObject(window.location.search)
    h.active = qo.sortOn == h.field
    h.asc = qo.sortValue == 1
    h.desc = qo.sortValue == -1

    qo.sortOn = h.field

    if(h.active) {
      qo.sortValue = h.asc ? -1 : 1
    }
    else {
      qo.sortValue = 1
    }

    h.href = '/catalog?' + objectToQueryString(qo)
    return h
  })

  return headers
}