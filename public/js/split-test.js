function SplitTest (opts) {
  //console.log('opts', opts)
  this.alts = []
  this.checkStarterTimeout = null
  this.started = false
  this.onStart = function () {

  }

  for(var i in opts) {
    this[i] = opts[i]
  }

  for(var key in this.modifiers) {
    this.alts.push(key)
  }

  if(this.alts.length <= 1) {
    throw new Error('Need at least two modifiers to become alts')
  }

  if(!this.name) {
    throw new Error('Need a test name')
  }

  if(!this.hasOwnProperty('checkStart')) {
    throw new Error('Need a checkStart function to check when to start running the test')
  }

  this.checkStarter()
}
SplitTest.log = []

//Fires every 50ms and starts the test if the
//custom checkStart function for this specific test
//returns true
SplitTest.prototype.checkStarter = function () {
  clearTimeout(this.checkStarterTimeout)
  if(this.checkStart()) {
    if(!this.started) {
      SplitTest.log.push('STARTING TEST: ' + this.name)
      this.start()
    }
  }
  else {
    this.started = false
  }
  setTimeout(function () {
    this.checkStarter()
  }.bind(this), 50)
}

SplitTest.prototype.start = function () {
  this.started = true
  sixPackSession.participate(this.name, this.alts, function (err, res) {
    if (err) throw err;
    alt = res.alternative.name
    if(this.modifiers.hasOwnProperty(alt)) {
      SplitTest.log.push('Running alt ' + alt + ' for ' + this.name)
      this.modifiers[alt](this)
      this.onStarted(alt)
    }
    else {
      throw new Error("No modifier found for alt '" + alt + "'")
    }
  }.bind(this));
}

SplitTest.prototype.convert = function () {
  SplitTest.log.push('Convert for ' + this.name)
  sixPackSession.convert(this.name, function (err, res) {
    if (err) throw err
    SplitTest.log.push('Convert res', res)
  })
}