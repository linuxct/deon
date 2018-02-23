window.splittestlog = [];
window.testlogs = function () {
  console.log(' ');
  console.log('='.repeat(40));
  window.splittestlog.forEach(function (obj) {
    console.log(obj);
  });
  console.log('='.repeat(40));
}
function SplitTest (opts) {
  this.alts = []
  this.checkStarterTimeout = null
  this.started = false
  this.onStart = function () {

  }
  this.dontCheckStarter = false

  for(var i in opts) {
    this[i] = opts[i]
  }


  if(this.checkStart === false) {
    this.dontCheckStarter = true;
  }

  //This split test can take in an array of strings
  //In this case the alts aren't modifying any data, that's handle outsite
  //this object
  if (this.modifiers instanceof Array) {
    this.modifiers = this.modifiers.reduce(function (alts, key) {
      alts[key] = function () {
        return {}
      }
      return alts
    }, {})
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

  if(!this.hasOwnProperty('checkStart') && !this.dontCheckStarter) {
    throw new Error('Need a checkStart function to check when to start running the test')
  }

  //This is for test where a new SplitTest obj needs to be instantiated somewhere
  //  to call the convert() function. Like in multiple page tests.
  if(!this.dontCheckStarter) {
    this.checkStarter()
  }
}

//Fires every 50ms and starts the test if the
//custom checkStart function for this specific test
//returns true
SplitTest.prototype.checkStarter = function () {
  clearTimeout(this.checkStarterTimeout)
  if(this.checkStart()) {
    if(!this.started) {
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
  if(!this.started) {
    window.splittestlog.push('STARTING TEST: "' + this.name + '" for ' + sixPackSession.client_id)
  }
  this.started = true

  this.participate(function (err, res) {
    if (err) throw err;
    alt = res.alternative.name
    if(this.modifiers.hasOwnProperty(alt)) {
      window.splittestlog.push('Running alt "' + alt + '" for "' + this.name + '"')
      var altData = this.modifiers[alt].bind(this)(this);
      this.alt = alt
      this.onStarted(alt, altData)
    }
    else {
      throw new Error('No modifier found for alt "'  + alt + '"')
    }
  }.bind(this));
}

SplitTest.prototype.participate = function (done) {
  if(this.force) {
    window.splittestlog.push('Forcing ' + this.name + ' to use ' + this.force);
    sixPackSession.participate(this.name, this.alts, this.force, done);
  }
  else {
    sixPackSession.participate(this.name, this.alts, done);
  }
}

SplitTest.prototype.convert = function () {
  splitTestConvert(this.name)
}

SplitTest.prototype.convertKpi = function (kpi) {
  splitTestConvertKpi(this.name, kpi)
}

function splitTestConvert (name) {
  window.splittestlog.push('Convert for "' + name + '" for ' + sixPackSession.client_id)
  sixPackSession.convert(name, function (err, res) {
    if (err) throw err
    window.splittestlog.push('Response for converting "' + name + '"', res)
  })
}

function splitTestConvertKpi (name, kpi) {
  window.splittestlog.push('Convert for "' + name + '" with kpi "' + kpi + '"')
  sixPackSession.convert(name, kpi, function (err, res) {
    if (err) throw err
    window.splittestlog.push('Response for KPI converting "' + name + '" / "' + kpi + '"', res)
  })
}
