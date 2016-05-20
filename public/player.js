class MusicPlayer {
  constructor() {
    constructEmitter(this)

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

  add(item) {
    if (!item || !item.source)
      return -1

    var duplicate = this.items.findIndex(function(aitem) { return aitem.source == item.source })
    if (duplicate > -1)
      return duplicate

    this.items.push(item)
    return this.items.length - 1
  }

  removeAt(index) {
    if (index >= 0 && index < this.items.length)
      this.items.splice(index, 1)
  }

  addAndPlay(item) {
    var index = this.add(item)
    if (index > -1)
      this.play(index)
  }

  // If index is undefined, it will start first or resume currently playing song.
  play(index) {
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

  clear() {
    this.index = 0
    this.played = []
    this.items = []
  }

  set(items) {
    this.clear()
    this.items = items
  }

  restart() {
    this.seek(0)
    if (!this.playing) this.play()
  }

  pause() {
    this.audio.pause()
  }

  stop() {
    this.pause()
    this.seek(0)
  }

  toggle(index) {
    if (index == undefined || index == this.index) {
      return this.audio.paused ? this.play() : this.pause()
    }
    this.play(index)
  }

  seek(percent) {
    if (this.audio.error || !this.seekable)
      return

    percent = clamp(percent, 0, 1)
    this.audio.currentTime = percent * this.audio.duration
  }

  setVolume(percent) {
    percent = clamp(percent, 0, 1)
    this.audio.volume = percent
  }

  next() {
    this.advance(1)
  }

  previous() {
    this.advance(-1)
  }

  advance(amount) {
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

  get playable() {
    return this.audio.readyState >= 3
  }

  get playing() {
    return this.playable && !this.audio.paused
  }

  get loading() {
    return (this.audio.readyState >= 1 && this.audio.readyState <= 2) || this.audio.networkState == 2
  }

  get seekable() {
    return this.audio.readyState >= 1 && this.audio.seekable
  }

  get progress() {
    return this.audio.duration ? this.audio.currentTime / this.audio.duration : 0
  }

  get finished() {
    return this.repeat == 'none' && ((!this.shuffle && this.index >= this.items.length - 1) ||
            this.played.length >= this.items.length - 1)
  }

  get repeat() {
    return this.repeatMode
  }

  set repeat(value) {
    this.repeatMode = value
    this.audio.loop = value == 'one'
  }
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
