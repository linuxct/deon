function createPlaylist (e, el) {
  var name = window.prompt(strings.createPlaylist)
  if (!name) return
  create('playlist', {
    name: name,
    public: session.settings ? session.settings.playlistPublicByDefault : false
  }, simpleUpdate)
}

function renamePlaylist (e, el) {
  var name = window.prompt(strings.renamePlaylist)
  if (!name) return
  update('playlist', el.getAttribute('playlist-id'), { name: name }, simpleUpdate)
}

function destroyPlaylist (e, el) {
  if (!window.confirm(strings.destroyPlaylist)) return
  destroy('playlist', el.getAttribute('playlist-id'), simpleUpdate)
}

function removeFromPlaylist (e, el) {
  var pel   = document.querySelector('[playlist-id]')
  var id    = pel ? pel.getAttribute('playlist-id') : ""
  var url   = endpoint + '/playlist/' + id + '?fields=name,public,tracks,userId'
  var index = parseInt(el.getAttribute('playlist-position'))
  if (!id) return window.alert(strings.error)
  loadCache(url, function (err, obj) {
    if (err) return window.alert(err.message)
    var tracks = obj.tracks
    tracks.splice(index, 1)
    update('playlist', id, {tracks: tracks}, function (err, obj, xhr) {
      if (err) return toasty(err)
      cache(url, obj)
      loadSubSources(document.querySelector('[role="content"]'), true)
      updatePlayerPlaylist(id, tracks)
    })
  })
}

function addToPlaylist (e, el) {
  var id    = el.value
  if (!id) return
  var url   = endpoint + '/playlist/' + id
  var index = parseInt(el.getAttribute('playlist-position'))
  var item  = {
    trackId: el.getAttribute('track-id'),
    releaseId: el.getAttribute('release-id')
  }
  if (!item.releaseId || !item.trackId) return window.alert(strings.error)
  el.disabled = true
  loadCache(url, function (err, obj) {
    if (err) return window.alert(err.message)
    var tracks = obj.tracks
    if (isNaN(index)) index = tracks.length
    tracks.splice(index, 0, item)
    update('playlist', id, {tracks: tracks}, function (err, obj, xhr) {
      el.disabled = false
      el.selectedIndex = 0
      if (err) return toasty(err)
      cache(url, obj)
      updatePlayerPlaylist(id, tracks)
      toasty(strings.addedToPlaylist)
    })
  })
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

function isMyPlaylist (playlist) {
  if (!isSignedIn()) return false
  return playlist.userId == session.user._id
}

function transformPlaylist (obj) {
  if (isMyPlaylist(obj)) {
    obj.canPublic = {
      _id:    obj._id,
      public: obj.public
    }
  }
  if (isSignedIn()) {
    var opts = {
      method: 'download',
      type: getMyPreferedDownloadOption()
    }
    obj.downloadUrl = endpoint + '/playlist/' + obj._id + '/download?' + objectToQueryString(opts)
  }
  return obj
}

function transformPlaylistTracks (obj, done) {
  var id = document.querySelector('[playlist-id]').getAttribute('playlist-id')
  var url = endpoint + '/playlist/' + id + '?fields=name,public,tracks,userId'
  var playlist = cache(url)
  var ids = uniqueArray(playlist.tracks.map(function (item) {
    return item.releaseId
  }))
  var url = endpoint + '/catalog/release?fields=title&ids=' + ids.join(',')
  loadCache(url, function(err, aobj) {
    if (err) return done(err)
    var releaseAtlas = toAtlas(aobj.results, '_id')
    var trackAtlas = toAtlas(obj.results, '_id')
    getArtistsAtlas(obj.results, function (err, artistAtlas) {
      if (!artistAtlas) artistAtlas = {}
      obj.results = playlist.tracks.map(function (item, index, arr) {
        var track = mapReleaseTrack(trackAtlas[item.trackId] || {}, index, arr)
        var release = releaseAtlas[item.releaseId] || {}
        track.release = release.title
        track.releaseId = release._id
        track.artists = mapTrackArtists(track, artistAtlas)
        track.playlistId = id
        track.playUrl = getPlayUrl(track.albums, track.releaseId)
        track.canRemove = isMyPlaylist(playlist) ? { index: track.index } : undefined
        track.downloadLink = getDownloadLink(release._id, track._id)
        track.time = formatDuration(track.duration)
        if (isMyPlaylist(playlist)) {
          track.edit = {
            releaseId: release._id,
            _id: track._id,
            title: track.title,
            trackNumber: track.trackNumber,
            index: track.index
          }
        } else {
          track.noEdit = {
            trackNumber: track.trackNumber
          }
        }
        return track
      })
      done(null, obj)
    })
  })
}

function completedPlaylist (source, obj) {
  if(obj.error) return
  var pl = obj.data
  setPageTitle(pl.name + pageTitleGlue + 'Playlist')  
  setMetaData({
    'og:type': 'music.playlist',
    'og:title': pl.name,
    'og:url': location.toString()
  })
  appendSongMetaData(obj.data.tracks)
  pageIsReady()
}

function reorderPlaylistFromInputs() {
  var inputs = document.querySelectorAll('[name="trackOrder\\[\\]"')
  //This is a kinda hacky way for not letting them accidentally delete all their tracks
  //by spam clicking while the track list is reloading
  if(inputs.length == 0) {
    return
  }
  var trackOrdering = []
  var trackEls = []
  var changed = false
  for(var i = 0; i < inputs.length; i++) {
    var input = inputs[i]
    var trackId = input.getAttribute('track-id')
    var releaseId = input.getAttribute('release-id')
    var to = parseInt(input.value)
    var from = i + 1
    if(!changed) {
      changed = to != from
    }
    trackOrdering.push({trackId: trackId, releaseId: releaseId, from: from, to: to})
  }
  if(!changed) return
  trackOrdering.sort(function(a, b) {
    //If you change #1 to #6 and leave #6 at #6 then track 1 should be after #6
    //If you move #7 to #3 and leave #3 unchanged, then #7 should be before #3
    if(a.to == b.to) {
      if(a.to > a.from) {
        return 1
      }
      if(a.to < a.from) {
        return -1
      }
      if(b.to > b.from) {
        return -1
      }
      if(b.to < b.from) {
        return 1
      }
      return 0
    }
    return a.to > b.to ? 1 : -1
  })
  trackEls = trackOrdering.map(function (item) {
    return document.querySelector('tr[role="playlist-track"][track-id="' + item.trackId + '"][release-id="' + item.releaseId + '"]')
  })
  var tracksNode = document.querySelector('[role="playlist-tracks"]')
  for(var i = trackEls.length - 1; i >= 0; i--) {
    var before = i == (trackEls.length - 1) ? null : trackEls[i+1]
    tracksNode.insertBefore(tracksNode.removeChild(trackEls[i]), before)
  }
  resetPlaylistInputs()
  savePlaylistOrder();
}

function resetPlaylistInputs() {
  var trackEls = document.querySelectorAll('[role="playlist-track"]')
  for(var i = 0; i < trackEls.length; i++) {
    var input = trackEls[i].querySelector('input[name="trackOrder\[\]"]')
    input.value = (i + 1)
    input.setAttribute('tab-index', input.value)
  }
}

function savePlaylistOrder() {
  var id = document.querySelector('[playlist-id]').getAttribute('playlist-id')
  var trackEls = document.querySelectorAll('[role="playlist-track"]')
  var trackSaves = []
  for(var i = 0; i < trackEls.length; i++) {
    trackSaves.push({
      trackId: trackEls[i].getAttribute('track-id'),
      releaseId: trackEls[i].getAttribute('release-id')
    })
  }
  var url   = endpoint + '/playlist/' + id + '?fields=name,public,tracks,userId'
  update('playlist', id, {tracks: trackSaves}, function (err, obj, xhr) {
    if (err) return toasty(err)
    cache(url, obj)
    simpleUpdate()
    toasty(strings.reorderedPlaylist)
  })
}

function reorderPlaylistFromInputs() {
  var inputs = document.querySelectorAll('[name="trackOrder\\[\\]"')
  //This is a kinda hacky way for not letting them accidentally delete all their tracks
  //by spam clicking while the track list is reloading
  if(inputs.length == 0) {
    return
  }
  var trackOrdering = []
  var trackEls = []
  var changed = false
  for(var i = 0; i < inputs.length; i++) {
    var input = inputs[i]
    var trackId = input.getAttribute('track-id')
    var releaseId = input.getAttribute('release-id')
    var to = parseInt(input.value)
    var from = i + 1
    if(!changed) {
      changed = to != from
    }
    trackOrdering.push({trackId: trackId, releaseId: releaseId, from: from, to: to})
  }
  if(!changed) return
  trackOrdering.sort(function(a, b) {
    //If you change #1 to #6 and leave #6 at #6 then track 1 should be after #6
    //If you move #7 to #3 and leave #3 unchanged, then #7 should be before #3
    if(a.to == b.to) {
      if(a.to > a.from) {
        return 1
      }
      if(a.to < a.from) {
        return -1
      }
      if(b.to > b.from) {
        return -1
      }
      if(b.to < b.from) {
        return 1
      }
      return 0
    }
    return a.to > b.to ? 1 : -1
  })
  trackEls = trackOrdering.map(function (item) {
    return document.querySelector('tr[role="playlist-track"][track-id="' + item.trackId + '"][release-id="' + item.releaseId + '"]')
  })
  var tracksNode = document.querySelector('[role="playlist-tracks"]')
  tracksNode.innerHTML = ''
  for(var i = 0; i < trackEls.length; i ++) {
    tracksNode.insertBefore(trackEls[i], null)
  }
  resetPlaylistInputs()
  savePlaylistOrder();
}

function resetPlaylistInputs() {
  var trackEls = document.querySelectorAll('[role="playlist-track"]')
  for(var i = 0; i < trackEls.length; i++) {
    trackEls[i].querySelector('input[name="trackOrder\[\]"]').value = (i + 1)
  }
}

function savePlaylistOrder() {
  var id = document.querySelector('[playlist-id]').getAttribute('playlist-id')
  var trackEls = document.querySelectorAll('[role="playlist-track"]')
  var trackSaves = []
  for(var i = 0; i < trackEls.length; i++) {
    trackSaves.push({
      trackId: trackEls[i].getAttribute('track-id'),
      releaseId: trackEls[i].getAttribute('release-id')
    })
  }
  var url   = endpoint + '/playlist/' + id + '?fields=name,public,tracks,userId'
  update('playlist', id, {tracks: trackSaves}, function (err, obj, xhr) {
    if (err) return toasty(err)
    cache(url, obj)
    simpleUpdate()
    toasty(strings.reorderedPlaylist)
  })
}

function playlistTrackOrderFocus(e, el) {
  el.closest('[role="playlist-track"]').setAttribute('draggable', 'false')
}

function playlistTrackOrderBlur(e, el) {
  el.closest('[role="playlist-track"]').setAttribute('draggable', 'true')
}

function playlistDragStart (e, trackId, releaseId) {
  e.dataTransfer.setData("trackId", trackId)
  e.dataTransfer.setData("releaseId", releaseId)
  e.dataTransfer.setData("childIndex", getChildIndex(e.target))
  e.target.closest('[role="playlist-track"]').classList.add('drag-dragging')
}

function getOffset( el ) {
  var _x = 0;
  var _y = 0;
  while( el && !isNaN( el.offsetLeft ) && !isNaN( el.offsetTop ) ) {
    _x += el.offsetLeft - el.scrollLeft;
    _y += el.offsetTop - el.scrollTop;
    el = el.offsetParent;
  }
  return { top: _y, left: _x };
}

function getEventVertHalf (e, el) {
  var offset = getOffset(el)
  var height = el.offsetHeight
  if(e.clientY < (offset.top + (height / 2))) {
    return 'top'
  }
  return 'bottom'
}

function playlistAllowDrop (e) {
  e.preventDefault();
  var targetTr = e.target.closest('[role="playlist-track"]')
  targetTr.classList.add('drag-active')
  var half = getEventVertHalf(e, targetTr)
  if(half == 'top') {
    targetTr.classList.add('drag-active-top')
    targetTr.classList.remove('drag-active-bottom')
  }
  else {
    targetTr.classList.add('drag-active-bottom')
    targetTr.classList.remove('drag-active-top')
  }
}

function playlistDragLeave (e) {
  e.target.closest('[role="playlist-track"]').classList.remove('drag-active', 'drag-active-top', 'drag-active-bottom')
}

function getChildIndex (child){
  var parent = child.parentNode;
  var children = parent.children;
  var i = children.length - 1;
  for (; i >= 0; i--){
    if (child == children[i]){
      return i
    }
  }
  return i
}

function playlistDrop (e) {
  var trackId = e.dataTransfer.getData('trackId')
  var releaseId = e.dataTransfer.getData('releaseId')
  var droppedTr = e.target.closest('[role="playlist-track"]')
  var draggedTr = document.querySelector('tr[role="playlist-track"][track-id="' + trackId + '"][release-id="' + releaseId + '"]')
  if(draggedTr == null) {
    return
  }
  draggedTr.classList.remove('drag-dragging')
  var draggedIndex = e.dataTransfer.getData('childIndex')
  var droppedIndex = getChildIndex(droppedTr)
  var half = getEventVertHalf(e, droppedTr)
  var insertBefore = half == 'top' ? droppedTr : droppedTr.nextSibling
  droppedTr.parentNode.insertBefore(draggedTr, insertBefore)
  droppedTr.classList.remove('drag-active', 'drag-active-bottom', 'drag-active-top')
  resetPlaylistInputs()
  savePlaylistOrder()
}
