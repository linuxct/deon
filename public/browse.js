var browseMusicLimit = 25

function transformBrowseMusic (obj) {
	obj = obj || {}
  var q    = queryStringToObject(window.location.search)
  q.limit  = browseMusicLimit
  q.skip   = parseInt(q.skip) || 0
	obj.query = objectToQueryString(q)
	obj.releaseTypes = releaseTypesList
	checkedTypes = q.types ? q.types.split(',') : []
	obj.releaseTypes.forEach(function (item) {
    item.checked = checkedTypes.indexOf(item.key) >= 0
  })
	return obj
}

function completedBrowseMusic () {
  var q    = queryStringToObject(window.location.search)

	if (q.tags) {
		document.querySelector('input[name="tags"]').value = q.tags
	}
	if (q.genres) {
		document.querySelector('input[name="genres"]').value = q.genres
	}
}

function transformMusicBrowseResults (obj, done) {
	tracks = obj.results

  var q = queryStringToObject(window.location.search)
  if (!q.limit)
    q.limit  = browseMusicLimit
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
    tracks.forEach(function (track, index, arr) {
      var releaseId = track.release._id
      mapReleaseTrack(track, index)
      track.releaseId = releaseId
      track.playUrl = getPlayUrl(track.albums, releaseId)
      track.artists = mapTrackArtists(track, atlas)
      track.downloadLink = getDownloadLink(releaseId, track._id)
      track.genresList = track.genres.filter(function (i) { return i !== track.genre }).join(", ")
      track.genreBonus = track.genres.length > 1 ? ('+' + (track.genres.length - 1)) : ''
      track.genreLink = encodeURIComponent(track.genre)
    })
    obj.results = tracks
    obj.skip = obj.skip + 1
	  obj.total = obj.total
    done(null, obj)
  })

	obj.data = {results: [{name: 'fake', album: 'faker'}]}

	return obj
}

function filterBrowseMusic (e, el) {
  var data   = getTargetDataSet(el, false, true) || {}
  var q = queryStringToObject(window.location.search)
  
  if(data.tags && data.tags.length > 0) {
  	q.tags = data.tags
  }
  else {
  	delete q.tags
  } 

  if(data.genres && data.genres.length > 0) {
  	q.genres = data.genres
  }
  else {
  	delete q.genres
  }   

  if(data.types && data.types.length > 0) {
  	q.types = data.types
  }
  else {
  	delete q.types
  } 
  var qs = objectToQueryString(q)

	go('/browse?' + qs)
}