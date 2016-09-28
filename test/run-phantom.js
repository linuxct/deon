var page = require('webpage').create()

page.onError = function(msg, trace) {
  if (trace && trace.length) {
    console.log('\033[31mPhantomJS console error:', trace[0].file, trace[0].function, trace[0].line)
    phantom.exit(1)
  }
}

page.onConsoleMessage = function(msg, lineNum, sourceId) {
  console.log('CONSOLE: ' + msg + ' (from line #' + lineNum + ' in "' + sourceId + '")');
};

page.open('http://localhost:8080', function(status){
  if (status !== 'success') {
    console.log('\033[31mPhantomJS page error:', status)
    phantom.exit(1)
  }
  // Wait for ajax calls to finish
  setTimeout(function() {
    phantom.exit()
  }, 5000)
})
