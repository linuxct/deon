function transformBrowseMusic (obj) {
	obj = obj || {}
  var q    = queryStringToObject(window.location.search)
  q.limit  = 25
  q.skip   = parseInt(q.skip) || 0
	obj.query = objectToQueryString(q)

	return obj
}

function completedBrowseMusic () {
	setPageTitle('Browse Monstercat Music')
}

function transformMusicBrowseResults (obj, done) {
	tracks = obj.results.map( function(tandr) {
		tandr.track.release = tandr.release
		console.log('tandr.track.release.catalogId', tandr.track.release.catalogId)
		return tandr.track
	})

	getArtistsAtlas(tracks, function (err, atlas) {
    if (!atlas) atlas = {}
    tracks.forEach(function (track, index, arr) {
      var releaseId = track.release._id
      mapReleaseTrack(track, index, arr)
      track.releaseId = releaseId
      track.playUrl = getPlayUrl(track.albums, releaseId)
      track.artists = mapTrackArtists(track, atlas)
      track.downloadLink = getDownloadLink(releaseId, track._id)
      tracks.push(track)
    })
    obj.results = tracks
    done(null, obj)
  })

	console.log('obj.results', obj.results)
	obj.data = {results: [{name: 'fake', album: 'faker'}]}

	return obj
}

function filterBrowseMusic (e, el) {
  var data   = getTargetDataSet(el, false, true) || {}
  var q = queryStringToObject(window.location.search)
  
  console.log('data', data)

  if(data.tags.length > 0) {
  	q.tags = data.tags
  }
  else {
  	delete q.tags
  } 

  if(data.genres.length > 0) {
  	q.genres = data.genres
  }
  else {
  	delete q.genres
  }   

  if(data.types.length > 0) {
  	q.types = data.types
  }
  else {
  	delete q.types
  } 
  var qs = objectToQueryString(q)

	go('/browse?' + qs)
}