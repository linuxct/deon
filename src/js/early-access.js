function zeroPad (num, size) {
  var str = num.toString()
  return '0'.repeat(size).substr(0,size - str.length)+str
}

function dateToCountdownString (date) {
  var end = new Date(date)
  var diff = dateToRemainingTime(date)
  var cd = new Date(diff)
  var parts = []
  var days = cd.getUTCDate() - 1
  var hours = cd.getUTCHours()
  var minutes = cd.getUTCMinutes()
  var seconds = cd.getUTCSeconds()
  if(days > 0) {
    hours += days * 24
  }
  if(hours > 0) {
    parts.push(hours + 'h')
  }
  parts.push(zeroPad(minutes, 2) + 'm')
  parts.push(zeroPad(seconds, 2) + 's')
  parts=parts.map(function (p) {
    return '<span class="unit ' + p.substr(-1,1) + '">' + p + '</span>'
  })
  if(parts.length > 0) {
    return parts.join(" ")
  }
  return "0s"
}

function dateToTimeOffset (date, utcOffsetHours, dayOffset, hourOfDay) {
  return new Date(Date.UTC(date.getFullYear(),
      date.getMonth(),
      date.getDate() + dayOffset,
      -utcOffsetHours + hourOfDay,
      0,
      0))
}

function dateToMidnightWestCoast (date) {
  var westCoastUTCOffset = -8
  var mwc = dateToMidnight(date, westCoastUTCOffset)
  return mwc
}

function dateToMidnight (date, utcOffsetHours) {
  return dateToTimeOffset(date, utcOffsetHours, 0, 0)
}

function startCountdownTicks () {
  clearTimeout(startCountdownTicks.timeout)
  function tick () {
    updateCountdownEls()
    startCountdownTicks.timeout = setTimeout(tick, 250)
  }
  tick()
}
startCountdownTicks.timeout = null

function stopCountdownTicks () {
  clearTimeout(startCountdownTicks.timeout)
}

function dateToRemainingTime (date) {
  var now = new Date()
  var diff = date.getTime() - now.getTime()
  if(diff < 0) {
    diff = 0
  }
  return diff
}

function updateCountdownEls () {
  var els = document.querySelectorAll('[role=countdown]')
  for(var i = 0; i < els.length; i++) {
    var el = els[i]
    var date = new Date(el.getAttribute('to'))
    var time = dateToRemainingTime(date)
    if(time <= 0 && el.getAttribute('completed-called') != 'true') {
      var fn = getMethod(el, 'completed')
      if(fn) {
        fn.apply(fn, [el, date, time])
        el.setAttribute('completed-called', 'true')
      }
    }
    el.innerHTML = dateToCountdownString(date)
  }
}
