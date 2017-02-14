var catalogMusicLimit = 50

function transformCatalogMusic (obj) {
  obj = obj || {}
  var q    = queryStringToObject(window.location.search)
  q.limit  = catalogMusicLimit
  q.skip   = (q.page-1 || 0) * catalogMusicLimit
  obj.query = objectToQueryString(q)
  return obj
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

function transformMusicCatalogResults(obj, done){
	if (obj.total > 1) obj.showPagination = true
  setPagination(obj, obj.limit)
  
  var trackAtlas = toAtlas(obj.results, '_id')
  obj.results = obj.results.map(function (item, index, arr) {

    var track = mapReleaseTrack(trackAtlas[item._id] || {}, index, arr)
    track.artist = track.artistsTitle
    track.releaseDate = formatDateJSON(track.release.releaseDate)
    track.playUrl = getPlayUrl(track.albums, track.releaseId)
    track.downloadLink = getDownloadLink(track.release._id, track._id)
    track.time = formatDuration(track.duration)

    return track
  })
  return obj
}