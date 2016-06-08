function MusicPlayer () {
  constructEmitter(this)
  MusicPlayer.define(this)
  this.audio = new Audio()
  this.audio.addEventListener('error', onError.bind(this))
  this.audio.addEventListener('stalled', onStalled.bind(this))
  this.audio.addEventListener('ended', onEnded.bind(this))
  this.audio.addEventListener('timeupdate', onTimeUpdate.bind(this))
  this.audio.addEventListener('loadedmetadata', onStateChange.bind(this))
  this.audio.addEventListener('loadeddata', onStateChange.bind(this))
  this.audio.addEventListener('loadstart', onStateChange.bind(this))
  this.audio.addEventListener('canplay', onStateChange.bind(this))
  this.audio.addEventListener('canplaythrough', onStateChange.bind(this))
  this.audio.addEventListener('progress', onStateChange.bind(this))
  this.audio.addEventListener('pause', onStateChange.bind(this))
  this.repeatMode = 'none'
  this.shuffle = false
  this.clear()
}

MusicPlayer.prototype.add = function (item) {
  if (!item || !item.source)
    return -1

  var duplicate = this.items.findIndex(function(aitem) { return aitem.source == item.source })
  if (duplicate > -1)
    return duplicate

  this.items.push(item)
  return this.items.length - 1
}

MusicPlayer.prototype.removeAt = function (index) {
  if (index >= 0 && index < this.items.length)
    this.items.splice(index, 1)
}

MusicPlayer.prototype.addAndPlay = function (item) {
  var index = this.add(item)
  if (index > -1)
    this.play(index)
}

// If index is undefined, it will start first or resume currently playing song.
MusicPlayer.prototype.play = function (index) {
  if (!this.items || !this.items.length || ((index != null) && (!this.items[index] || !this.items[index].source)))
    return

  index = index == undefined ? +this.index : +index
  this.index = index
  if (this.audio.src != this.items[index].source) {
    this.audio.src = this.items[index].source
  }
  this.audio.autoplay = true
  this.audio.play()
  this.index = index

  this.dispatchEvent(new CustomEvent('play', {detail: {item: this.items[this.index]}}))
}

MusicPlayer.prototype.clear = function () {
  this.index = 0
  this.played = []
  this.items = []
}

MusicPlayer.prototype.set = function (items) {
  this.clear()
  this.items = items
}

MusicPlayer.prototype.restart = function () {
  this.seek(0)
  if (!this.playing) this.play()
}

MusicPlayer.prototype.pause = function () {
  this.audio.pause()
}

MusicPlayer.prototype.stop = function () {
  this.pause()
  this.seek(0)
}

MusicPlayer.prototype.toggle = function (index) {
  if (index == undefined || index == this.index) {
    return this.audio.paused ? this.play() : this.pause()
  }
  this.play(index)
}

MusicPlayer.prototype.seek = function (percent) {
  if (this.audio.error || !this.seekable)
    return

  percent = clamp(percent, 0, 1)
  this.audio.currentTime = percent * this.audio.duration
}

MusicPlayer.prototype.setVolume = function (percent) {
  percent = clamp(percent, 0, 1)
  this.audio.volume = percent
}

MusicPlayer.prototype.next = function () {
  this.advance(1)
}

MusicPlayer.prototype.previous = function () {
  this.advance(-1)
}

MusicPlayer.prototype.advance = function (amount) {
  var items = this.items
  if (!items || !items.length)
    return

  if (this.shuffle) {
    // Handle case where already played song and now shuffling
    if (this.playable && !this.played.length) {
      this.played.push(this.index)
    }

    var playedIndex = this.played.length - 1 + amount
      , exhausted = playedIndex >= items.length || playedIndex < 0

    if (exhausted) {
      this.played = []
    }

    if (playedIndex >= 0 && playedIndex < this.played.length) {
      this.index = playedIndex
    }
    else {
      while (this.played.indexOf(this.index) > -1) {
        this.index = Math.floor(Math.random() * items.length)
      }
    }

    this.played.push(this.index)
  }
  else {
    this.played = []
    this.index = (this.index + amount) % items.length
    if (this.index < 0)
      this.index += this.items.length
  }

  this.play(this.index)
}

MusicPlayer.define = function (obj) {
  Object.defineProperty(obj, 'playable', {
    get: function () {
      return this.audio.readyState >= 3
    }
  })

  Object.defineProperty(obj, 'playing', {
    get: function () {
      return this.playable && !this.audio.paused
    }
  })

  Object.defineProperty(obj, 'loading', {
    get: function () {
      return (this.audio.readyState >= 1 && this.audio.readyState <= 2) || this.audio.networkState == 2
    }
  })

  Object.defineProperty(obj, 'seekable', {
    get: function () {
      return this.audio.readyState >= 1 && this.audio.seekable
    }
  })

  Object.defineProperty(obj, 'progress', {
    get: function () {
      return this.audio.duration ? this.audio.currentTime / this.audio.duration : 0
    }
  })

  Object.defineProperty(obj, 'finished', {
    get: function () {
      return this.repeat == 'none' && ((!this.shuffle && this.index >= this.items.length - 1) ||
                                      this.played.length >= this.items.length - 1)
    }
  })

  Object.defineProperty(obj, 'repeat', {
    get: function () {
      return this.repeatMode
    },
    set: function (value) {
      this.repeatMode = value
      this.audio.loop = value == 'one'
    }
  })
}

function onError(e) {
  cloneAndDispatch.call(this, e)
  if (this.items.length > 1)
    setTimeout(this.next.bind(this), 250)
}

function onStalled(e) {
  cloneAndDispatch.call(this, e)
}

function onEnded(e) {
  cloneAndDispatch.call(this, e)
  if (this.finished)
    return
  if (this.repeat == 'one')
    return this.play()
  this.next()
}

function cloneAndDispatch(e) {
  this.dispatchEvent(new e.constructor(e.type, e))
}

function clamp(a, min, max) {
  return Math.max(Math.min(a, max), min)
}

function onStateChange(e) {
  this.dispatchEvent(new CustomEvent('statechange'), {details: { player: this }})
}

function onTimeUpdate(e) {
  cloneAndDispatch.call(this, e)
}

function constructEmitter(obj) {
  obj.target = document.createDocumentFragment();

  ['addEventListener', 'dispatchEvent', 'removeEventListener']
  .forEach(function(method) {
    obj[method] = obj.target[method].bind(obj.target)
  })
}
