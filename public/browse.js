function transformBrowseMusic (obj) {
	obj = obj || {}
	query = {
		skip: 0,
		limit: 25
	}
	obj.query = objectToQueryString(query)

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

	//TODO: Make this actual pagination
	obj.previous = 'skip=20&limit=20'
	obj.next = 'skip=25&limit=11'
	obj.data = {results: [{name: 'fake', album: 'faker'}]}

	return obj
}