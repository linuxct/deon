var blackFridayStart = new Date("Thu Nov 23 2017 21:00:00 GMT-0800 (PST)");
var blackFridayEnd = new Date("Mon Nov 27 2017 21:00:00 GMT-0800 (PST)");
var blackFridayCountdownEnded = false;

//blackFridayStart = new Date(new Date().getTime() + (5 * 1000));

document.addEventListener('DOMContentLoaded', function() {
  renderBlackFriday();
});

function renderBlackFriday () {
  var now = new Date().getTime();
  var to;
  if(now > blackFridayStart.getTime()) {
    if(now < blackFridayEnd.getTime()) {
      to = blackFridayEnd;
      label = 'Ends In';
    }
    else {
      return hideBlackFriday();
    }
  }
  else {
    to = blackFridayStart;
    label = 'Starts In';
  }
  var countdown = document.querySelector('#black-friday [role=countdown]');
  countdown.setAttribute('to', to.toString());
  document.querySelector('#black-friday .label').innerHTML = label;
  startCountdownTicks(); //Always on for black friday
}

function hideBlackFriday () {
  document.getElementById('black-friday').styles.display = 'none';
  document.getElementById('black-friday').innerHTML = '';
}

function blackFridayCountdownEnd () {
  if(blackFridayCountdownEnded) {
    return
  }
  setTimeout(function () {
    renderBlackFriday();
    blackFridayCountdownEnded = true;
  }, 1000);
}