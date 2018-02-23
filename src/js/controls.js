var sel = {
  play: '[role="play"]',
  playPlaylist: '[role="play-playlist"]',
  playRelease: '[role="play-release"]',
  scrub: '[role="scrub-progress"]',
  link: '[role="track-link"]',
  title: '[role="track-title"]',
  volume: '[role="volumeControl"]',
  volumeI: '[role="volumeControl"] > i',
  volumeInnerSlider: '.volume-slider-inner',
  volumeOuterSlider: '.volume-slider-outer',
  volumeSliderContainer: '.volume-slider-container',
  controls: '.controls'
}

var playerEvents = {
  statechange: updateControls,
  play: onNewSong,
}

var playerAnalyticEvents = [
  'play',
  'stop',
  'pause',
  'next',
  'previous',
  'ended'
]

var player
document.addEventListener('DOMContentLoaded', function(e) {
  player = new MusicPlayer()
  var events = Object.keys(playerEvents)
  events.forEach(function (name) {
    player.addEventListener(name, playerEvents[name])
  })
  playerAnalyticEvents.forEach(function (name) {
    player.addEventListener(name, recordPlayerEvent)
  })
  player.addEventListener('error', recordPlayerError)
  player.addEventListener('play', recordPlayerPlayLegacy)
  requestAnimationFrame(updatePlayerProgress)
  var volume = getCookie('volume')
  if(!volume) {
    volume = 1
  }
  player.setStoredVolume(volume)
  player.setVolume(volume)
  bindVolumeEvents()
  setVolumeDisplay()
})

function recordPlayerEvent (e) {
  var opts = e.detail.item;
  opts.label = opts.title + ' by ' + opts.artistTitle;
  opts.category = 'Music Player';
  opts.releaseId = opts.releaseId;
  opts.trackId = opts.trackId;
  recordEvent('Deon AP ' + capitalizeFirstLetter(e.type), opts)
}

function recordPlayerError (e) {
  e.category = 'Music Player';
  recordEvent('Deon AP Error', e)
}

function recordPlayerPlayLegacy (e) {
  recordEvent('Audio Player Play Server Side', e.detail.item)
}

function togglePlay (e, el) {
  player.toggle()
  updateControls()
}

function next (e, el) {
  player.next()
  updateControls()
}

function previous (e, el) {
  player.previous()
  updateControls()
}

function toggleRepeat (e, el) {
  var options = ['none', 'one', 'all']
  var i = (options.indexOf(player.repeat) + 1) % options.length
  player.repeat = options[i]

  el.classList.toggle('repeat-one', player.repeat == 'one')
  el.classList.toggle('repeat-all', player.repeat == 'all')
}

function toggleShuffle (e, el) {
  player.shuffle = !player.shuffle
  el.classList.toggle('active', player.shuffle)
}

function playSong (e, el) {
  if(!el) {
    return
  }
  var index = el.hasAttribute('index') ? +el.getAttribute('index') : undefined
  if (index != undefined)
    loadAndPlayTracks(index)
}

function toggleVolume (e, el) {
  if(!elMatches(e.target, 'i,button')) {
    return
  }

  var volume = player.getVolume()
  if(volume > 0) {
    player.setStoredVolume(volume)
    player.setVolume(0)
  }
  else {
    player.setVolume(player.getStoredVolume())
  }
  setVolumeDisplay()
}

function bindVolumeEvents (){
  var container = document.querySelector(sel.volumeSliderContainer)
  var outer = document.querySelector(sel.volumeOuterSlider)

  // non-touch events
  container.addEventListener('mouseover', volumeSliderRemain)
  container.addEventListener('mouseleave', startVolumeSliderHide)
  outer.addEventListener('mousedown', startVolumeDrag)
  outer.addEventListener('mousemove', calculateVolumeDrag)

  // touch events
  container.addEventListener('touchstart', initVolumeMobile)
}

function initVolumeMobile(e){
  // if they're on touch devices, let's put the volume at 100%
  e.preventDefault();
  player.setVolume(1)
}

function startVolumeSliderShow (e) {
  clearTimeout(startVolumeSliderHide.timeout)
  var controls = document.querySelector(sel.controls)
  controls.classList.toggle('show-slider', true)
}

function volumeSliderRemain (e) {
  clearTimeout(startVolumeSliderHide.timeout)
}

function startVolumeSliderHide () {
  if(startVolumeDrag.dragging) {
    return false
  }
  startVolumeSliderHide.timeout = setTimeout(function () {
    volumeSliderHide()
  }, 500)
}
startVolumeSliderHide.timeout = null

function volumeSliderHide () {
  var controls = document.querySelector(sel.controls)
  controls.classList.toggle('show-slider', false)
}

function preventSelection(){
  var selection = {};
  if (window.getSelection) {
      selection = window.getSelection();
      if (selection.rangeCount) {
        selection.removeAllRanges();
        return;
      }
  } else if (document.selection) {
      selection = document.selection.createRange();
      if (selection.text > '') {
        document.selection.empty();
        return;
      }
  }  
}

function startVolumeDrag (e) {
  startVolumeDrag.dragging = true
  calculateVolumeDrag(e)
  window.addEventListener("mouseup", stopVolumeDrag)
  window.addEventListener("mousemove", preventSelection, false)
}
startVolumeDrag.dragging = false

function calculateVolumeDrag (e) {
  if (!e.path) {
    addEventPath(e)
  }
  if(!startVolumeDrag.dragging || elMatches(e.path[0], '.volume-slider-handle')) {
    return
  }
  var outer = document.querySelector(sel.volumeOuterSlider)
  var style = window.getComputedStyle(outer)
  var height = parseInt(style.getPropertyValue('height'))
  var offset = e.offsetY
  var newVolume = offset / height

  //Dragging off the edge sometimes messes up, so we'll round for the user here
  //TODO: Change this to check to see if the mouse is outside the range of offsetY (past the slider container)
  if(height - offset <= 1) {
    newVolume = 1
  }

  player.setStoredVolume(newVolume)
  player.setVolume(newVolume)
  setCookie('volume', newVolume)
  setVolumeDisplay()
}

function stopVolumeDrag (e) {
  window.removeEventListener("mouseup", stopVolumeDrag)
  window.removeEventListener("mousemove", preventSelection, false)
  startVolumeDrag.dragging = false
}

function setVolumeDisplay () {
  var volume = player.getVolume()
  var icon = document.querySelector(sel.volumeI)
  var innerSlide = document.querySelector(sel.volumeInnerSlider)
  var height = volume * 100
  if(height < 2) {
    height = 2
  }
  icon.classList.toggle('fa-volume-off', volume == 0)
  icon.classList.toggle('fa-volume-down', volume < 0.75 && volume > 0)
  icon.classList.toggle('fa-volume-up', volume >= 0.75)
  innerSlide.style.height = parseInt(height) + '%';
}

function playSongDblC (e, el) {
  var button = el.querySelector('[role="play-song"]')
  playSong(e, button)
}

function loadAndPlayTracks (index) {
  var tracks = buildTracks()

  if (areTracksLoaded(tracks)) {
    player.toggle(index)
  }
  else {
    player.set(tracks)
    player.play(index)

    var el = document.querySelector(sel.link)
    if (el) el.setAttribute('href', window.location.pathname + window.location.search)
  }

  updateControls()
}

function buildTracks () {
  var els = Array.prototype.slice.call(document.querySelectorAll('[play-link]'));
  els = els.sort(function (el1, el2) {
    var idx1 = parseInt(el1.getAttribute('index'));
    var idx2 = parseInt(el2.getAttribute('index'));
    if(idx1 == idx2) {
      return 0;
    }
    return idx1 > idx2 ? 1 : -1;
  });
  return els.map(mapTrackElToPlayer)
}

function areTracksLoaded (tracks) {
  return tracks.every(function(track, index) {
    return player.items[index] && player.items[index].source == track.source
  })
}

function playSongs (e, el) {
  loadAndPlayTracks()
}

function onNewSong (e) {
  var el = document.querySelector(sel.title)
  var elContainer = document.querySelector(sel.link)
  var controls = document.querySelector(sel.controls)
  el.textContent = prepareTrackTitle(e.detail.item)
  elContainer.classList.add('playing-track')
  controls.classList.add('playing')
  if (typeof autoBrowseMore == 'function') autoBrowseMore()
}

function prepareTrackTitle(item){
  var artistNames = item.artist
  if (!artistNames) return item.title

  var trackTitle = "";
  artistNames = artistNames.split(", ").filter(function(n){ return n != "" })

  if (artistNames.length>2){
    trackTitle = "Various Artists";
  } else{
    trackTitle = artistNames.join(" & ")
  }
  trackTitle += " - " + item.title
  return trackTitle
}

function scrollTrackTitle(elementContainer){
  var scrollingElement = elementContainer.querySelector('.scroll-title')
  if (!elementContainer || !scrollingElement) return
  if (scrollingElement.offsetWidth>elementContainer.offsetWidth){
    var scrollDistance = scrollingElement.offsetWidth - elementContainer.offsetWidth + 1
    scrollingElement.style.textIndent = -scrollDistance + 'px';
  }
}
function removeScrollTrackTitle(elementContainer){
  var scrollingElement = elementContainer.querySelector('.scroll-title')
  if (!elementContainer || !scrollingElement) return
  scrollingElement.style.textIndent = '0px';
}

function updateControls () {
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
  var selector = '[role="play-song"][play-link="' + (item ? item.source : '') + '"]'

  var allMatches = document.querySelectorAll(selector)
  var el;
  if(item) {
    if(allMatches.length > 1) {
      //try to find one with a matching index first
      el = document.querySelector(selector+ '[index="' + player.index + '"]');
    }
    if(!el) {
      el = allMatches[0]
    }
  }

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

function isPlaylistLoaded (id) {
  return player.items.length && player.items[0].playlistId == id
}

function isReleaseLoaded (id) {
  return player.items.length && player.items[0].releaseId == id
}

function mapTrackElToPlayer (el) {
  return {
    source:     el.getAttribute('play-link'),
    skip:       isSignedIn() && !el.hasAttribute('licensable') && (session.settings || {}).hideNonLicensableTracks,
    title:      el.getAttribute('title'),
    index:      el.getAttribute('index'),
    artist:      el.getAttribute('artist'),
    artistTitle: el.getAttribute('artists-title'),
    trackId:    el.getAttribute('track-id'),
    playlistId: el.getAttribute('playlist-id'),
    releaseId:  el.getAttribute('release-id')
  }
}

function scrub (e, el) {
  var seekTo
  if (e.clientY>100){
    var margin = 0
    if (document.body) margin = document.body.clientWidth - el.offsetWidth || 0
    seekTo = (e.clientX - margin/2) / el.offsetWidth;
  } else{
    seekTo = e.clientX / el.offsetWidth;
  }
  player.seek(seekTo);
  //TODO: Add google analytics event to track from here
}

function updatePlayerProgress () {
  requestAnimationFrame(updatePlayerProgress)
  var scrubs = document.querySelectorAll(sel.scrub)
  if (scrubs) {
    for(var i = 0; i<scrubs.length; i++){
      scrubs[i].style.width = player.progress * 100 + '%'
    }
  }
}
