var player = new MusicPlayer()

var sel = {
  play: '[role="play"]',
  playPlaylist: '[role="play-playlist"]',
  playRelease: '[role="play-release"]',
  scrub: '[role="scrub-progress"]',
  title: '[role="track-title"]'
}

var playerEvents = {
  statechange: updateControls,
  play: onNewSong
}

document.addEventListener('DOMContentLoaded', function(e) {
  var events = Object.keys(playerEvents)
  for (var i = 0; i < events.length; i++) {
    player.addEventListener(events[i], playerEvents[events[i]])
  }
  requestAnimationFrame(updatePlayerProgress)
})

function togglePlay(e, el) {
  player.toggle()
  updateControls()
}

function next(e, el) {
  player.next()
  updateControls()
}

function previous(e, el) {
  player.previous()
  updateControls()
}

function toggleRepeat(e, el) {
  player.loop = !player.loop
  el.classList.toggle('active', player.loop)
}

function toggleShuffle(e, el) {
  player.shuffle = !player.shuffle
  el.classList.toggle('active', player.shuffle)
}

function playSong(e, el) {
  var index = el.hasAttribute('index') ?  el.getAttribute('index') : undefined
  if (index != undefined)
    loadAndPlayTracks(index)
}

function loadAndPlayTracks(index) {
  var tracks = buildTracks()
  if (areTracksLoaded(tracks)) {
    player.toggle(index)
  }
  else {
    player.set(tracks)
    player.play(index)

    var el = document.querySelector(sel.title)
    if (el) el.setAttribute('href', window.location.pathname)
  }

  updateControls()
}

function buildTracks() {
  var els = Array.prototype.slice.call(document.querySelectorAll('[play-link]'))
  return els.map(mapTrackElToPlayer)
}

function areTracksLoaded(tracks) {
  return tracks.every(function(track, index) {
    return player.items[index] && player.items[index].source == track.source
  })
}

function playSongs(e, el) {
  loadAndPlayTracks()
}

function onNewSong(e) {
  document.querySelector(sel.title).textContent = e.detail.item.title
}

function updateControls() {
  var playEl = document.querySelector(sel.play)
  if (playEl) {
    playEl.classList.toggle('fa-play', !player.playing && !player.loading)
    playEl.classList.toggle('fa-pause', player.playing)
    playEl.classList.toggle('fa-spin', player.loading && !player.playing)
    playEl.classList.toggle('fa-refresh', player.loading && !player.playing)
  }

  var buttons = document.querySelectorAll('[role="play-song"]')
  for (var i = 0; i < buttons.length; i++) {
    buttons[i].classList.remove('active')
  }

  var playing = player.playing || player.loading
  var item = player.items[player.index]
  var el = item ? document.querySelector(`[role="play-song"][play-link="${item.source}"]`) : undefined
  if (el) {
    el.classList.toggle('active', playing)
  }

  var pel = document.querySelector(sel.playPlaylist)
  if (pel) {
    var playlistPlaying = playing && !isPlaylistLoaded(pel.getAttribute('playlist-id'))
    pel.classList.toggle('fa-pause', playlistPlaying)
    pel.classList.toggle('fa-play', !playlistPlaying)
  }

  var rel = document.querySelector(sel.playRelease)
  if (rel) {
    rel.classList.toggle('active', playing && isReleaseLoaded(rel.getAttribute('release-id')))
  }
}

function isPlaylistLoaded(id) {
  return player.items.length && player.items[0].playlistId == id
}

function isReleaseLoaded(id) {
  return player.items.length && player.items[0].releaseId == id
}

function mapTrackElToPlayer(el) {
  return {
    source: el.getAttribute('play-link'),
    title: el.getAttribute('title'),
    playlistId: el.getAttribute('playlist-id'),
    releaseId: el.getAttribute('release-id')
  }
}

function scrub(e, el) {
  player.seek(e.clientX / el.offsetWidth)
}

function updatePlayerProgress() {
  requestAnimationFrame(updatePlayerProgress)
  document.querySelector(sel.scrub).style.width = player.progress * 100 + '%'
}
