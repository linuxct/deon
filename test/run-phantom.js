const page = require('webpage').create()
const TIME_OUT = 5000

page.onError = function onError (msg, trace) {
  if (trace && trace.length) {
    console.log('\033[31m', msg, trace[0].file, trace[0].function, trace[0].line)
    phantom.exit(1)
  }
}

page.onConsoleMessage = function onConsoleMessage (msg, lineNum, sourceId) {
  console.log('CONSOLE: ' + msg + ' (from line #' + lineNum + ' in "' + sourceId + '")')
}

page.open('http://localhost:8080', function onPageOpen (status) {
  if (status !== 'success') {
    console.log('\033[31mPhantomJS page error:', status)
    phantom.exit(1)
  }
  // Wait for ajax calls to finish
  setTimeout(function onTimeOut () {
    phantom.exit()
  }, TIME_OUT)
})
