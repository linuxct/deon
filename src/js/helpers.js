function flattenObject (obj, sep) {
  if (typeof obj != 'object') return
  var flat = {}
  for (var key in obj) {
    flattenObject.dive(flat, obj[key], key, sep)
  }
  return flat
}
flattenObject.dive = function (flat, val, chain, sep) {
  var path = chain ? chain + sep : ""
  if (val instanceof Array) {
    for (var i=0; i<val.length; i++) {
      flattenObject.dive(flat, val[i], path + i, sep)
    }
  }
  else if (typeof val == 'object') {
    for (var key in val) {
      flattenObject.dive(flat, val[key], path + key, sep)
    }
  }
  else {
    flat[chain] = val
  }
}

function filterNil (i) {
  return !!i
}

function mapStringTrim (str) {
  return str.trim()
}

function toArray (nl) {
  var arr = []
  for (var i = 0, ref = arr.length = nl.length; i < ref; i++) {
    arr[i] = nl[i]
  }
  return arr
}

function onlyUnique(value, index, self) { 
  return self.indexOf(value) === index;
}

function uniqueArray (arr) {
  return arr.filter(onlyUnique)
}

function toAtlas (arr, key) {
  var atlas = {}
  arr.forEach(function (item) {
    atlas[item[key]] = item
  })
  return atlas
}

function getAccountCountries (current) {
  if(!Countries) {
    return []
  }
  return Countries.map(function (item) {
    return {
      name: item.name,
      selected: item.name == current
    }
  })
}

function getLastPathnameComponent () {
  return location.pathname.substr(location.pathname.lastIndexOf('/') + 1)
}

function commaStringToObject (str) {
  var obj = {}
  var arr = (str || "").split(',')
  for (var i = 0; i < arr.length; i += 2) {
    obj[arr[i]] = arr[i+1]
  }
  return obj
}

function capitalizeFirstLetter(string) {
  return string.charAt(0).toUpperCase() + string.slice(1);
}

function requestSimple (method, what, obj, done) {
  requestJSON({
    url: endpoint + '/' + what,
    method: method,
    data: obj,
    withCredentials: true
  }, done)
}

function create (what, obj, done) {
  requestSimple("POST", what, obj, done)
}

function update (what, id, obj, done) {
  var path = id ? what + '/' + id : what
  requestSimple("PATCH", path, obj, done)
}

function destroy (what, id, done) {
  requestSimple("DELETE", what + '/' + id, null, done)
}

function addMetaElement (el, key, value) {
  var mel = document.createElement('meta')
  mel.setAttribute('property', key)
  mel.setAttribute('content', value)
  el.insertBefore(mel, el.firstElementChild)
}

function removeMetaElement (el, key) {
  var target = el.querySelector('[property="' + key + '"]')
  if (target)
    target.parentElement.removeChild(target)
}

function setMetaData (meta) {
  var head = document.querySelector('head')
  if (!head) return
  var tags = head.querySelectorAll('meta[property*="og:"],meta[property*="music:"]')
  for(var i = 0; i < tags.length; i++) {
    tags[i].parentElement.removeChild(tags[i])
  }
  meta['og:site_name'] = 'Monstercat'
  appendMetaData(meta)
}

function appendMetaData (meta) {
  var head = document.querySelector('head')
  for (var key in meta) {
    removeMetaElement(head, key)
    var vals = typeof(meta[key]) == 'object' ? meta[key] : [meta[key]]
    for(var i = 0; i < vals.length; i++) {
      if(vals[i] !== undefined) {
        addMetaElement(head, key, vals[i])
      }
    }
  }
}

function formatDuration (duration) {
  var mins    = Math.floor(duration / 60)
  var seconds = duration - (mins * 60)
  seconds = ("00" + seconds.toFixed()).slice(-2)
  if(seconds == "60") {
    seconds = "00";
    mins += 1;
  }
  return  mins + ':' + seconds
}

function formatDate (date) {
  if (!formatDate.months) {
    formatDate.months = [
      "January",
      "February",
      "March",
      "April",
      "May",
      "June",
      "July",
      "August",
      "September",
      "October",
      "November",
      "December"
    ]
  }
  if (!(date instanceof Date)) date = new Date(date)
  return formatDate.months[date.getMonth()] + ' ' +
    date.getDate() + ', ' +
    date.getFullYear()
}

function formatDateJSON (date){
  if (!(date instanceof Date)) date = new Date(date)
  d = date.toDateString().split(" ")
  return {
    'weekday': d[0],
    'month': d[1],
    'day': d[2],
    'year': d[3],
    'hours': date.getHours() < 10 ? '0'+ date.getHours() : date.getHours(),
    'minutes': date.getMinutes() < 10 ? '0'+ date.getMinutes() : date.getMinutes()
  }
}

function sortRelease (a, b) {
  var a = new Date(a.preReleaseDate || a.releaseDate)
  var b = new Date(b.preReleaseDate || b.releaseDate)
  if (a > b) return -1
  if (a < b) return 1
  return 0
}

function sortTracks (a, b) {
  if (a.trackNumber < b.trackNumber) return -1
  if (a.trackNumber > b.trackNumber) return 1
  return 0
}

function getTrackNumber (track, releaseId) {
  if (track.albums instanceof Array) {
    var arr = track.albums || []
    for (var i = 0; i < arr.length; i++) {
      if (arr[i].albumId == releaseId)
        return arr[i].trackNumber
    }
  } else if (track.albums && track.albums.trackNumber) {
    return track.albums.trackNumber
  }
  return 0
}

function setCookie(cname, cvalue, exdays) {
    var d = new Date();
    d.setTime(d.getTime() + (exdays*24*60*60*1000));
    var expires = "expires="+ d.toUTCString();
    document.cookie = cname + "=" + cvalue + "; " + expires;
}

function getCookie(cname) {
    var name = cname + "=";
    var ca = document.cookie.split(';');
    for(var i = 0; i <ca.length; i++) {
        var c = ca[i];
        while (c.charAt(0)==' ') {
            c = c.substring(1);
        }
        if (c.indexOf(name) == 0) {
            return c.substring(name.length,c.length);
        }
    }
    return "";
}

/**
 * Shuffles array in place.
 * @param {Array} a items An array containing the items.
 */
function shuffle(a) {
    var j, x, i;
    for (i = a.length - 1; i > 0; i--) {
        j = Math.floor(Math.random() * (i + 1));
        x = a[i];
        a[i] = a[j];
        a[j] = x;
    }
}

function randomChooser(n){
  return Math.floor(Math.random() * n+1);
}

function iframeHeight(){
  var iframe = document.querySelectorAll('iframe.fullpage-iframe')
  for (var i = 0; i<iframe.length; i++){
    iframe[i].addEventListener('load', resetHeightIframes, true)
  }
}
function resetHeightIframes(){
  this.nextElementSibling.style.display = 'none'
  this.style.height = this.contentWindow.document.body.scrollHeight + 'px'
}

function getMonths () {
  return ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']  
}

function commaAnd (list, and) {
  and = and || ' and ';
  if (list.length > 2) {
    var last = list.slice(list.length - 1, list.length);
    var start = list.slice(0, list.length - 1);
    return start.join(', ') + ',' + and + last;
  }
  else {
    return list.join(and)
  }
}

function slugify(text) {
  return text.toString().toLowerCase()
    .replace(/\s+/g, '-')           // Replace spaces with -
    .replace(/[^\w\-]+/g, '')       // Remove all non-word chars
    .replace(/\-\-+/g, '-')         // Replace multiple - with single -
    .replace(/^-+/, '')             // Trim - from start of text
    .replace(/-+$/, '');            // Trim - from end of text
}

/* Vendor Helpers */

function serviceUrlToChannelId (user) {
  user = user || ""
  var m = user.toString().match(/^\s*(?:(?:https?:\/\/)?(?:www\.|m\.)?(?:youtube|twitch|beam|mixer)?\.(?:com\/|tv\/|pro\/)?)?\/?(?:user\/|channel\/|c\/)?([^\/\?]+)/i);
  return m && m[1] || user;
}

function youTubeUserToChannelID (user, done) {
  var opts = {
    url: 'https://www.googleapis.com/youtube/v3/channels?key=AIzaSyAbhrDOydD1BML4ngEyLWn9gp0jlBKRr1U&forUsername=' + encodeURIComponent(user) + '&part=id',
    method: 'GET',
  }
  requestJSON(opts, function (err, res) {
    var channelId = user
    if(res.items[0]) {
      channelId = res.items[0].id
    }
    done(channelId)
  })
}

function copyToClipboard (e) {
  var parent = findParentWith(e.target, 'div');
  var input = parent.querySelector('textarea,input[type=text]');
  var error = false;
  if(!input) {
    toasty(new Error("Can't find textbox to copy."));
    return
  }
  input.select();
  try {
    var successful = document.execCommand('copy');
    if(successful) {
      if (document.selection) {
        document.selection.empty();
      }
      else if (window.getSelection) {
        window.getSelection().removeAllRanges();
      }
      return toasty('Copied!')
    }
    else{
      error = true;
    }
  }
  catch (ex) {
    error = true;
  }

  if(error) {
    toasty(new Error('Unable to copy automatically. Try ctrl+c or cmd+c'));
  }
}

function hookValueSelects (selects) {
  selects = selects || document.querySelectorAll('select[value]')
  selects.forEach(function (el) {
    var selected = el.querySelector('option[value="' + el.getAttribute('value') + '"]')
    if(selected) {
      selected.setAttribute('selected', true)
    }
  })
}

var actionier = {
  on: function (el) {
    el.disabled = true
    el.classList.toggle('on', true)
  },
  off: function (el) {
    el.disabled = true
    el.classList.toggle('on', false)
  },
  isOn: function (el) {
    return el.disabled
  }
}

function getTextWidth(text, font) {
  // re-use canvas object for better performance
  var canvas = getTextWidth.canvas || (getTextWidth.canvas = document.createElement("canvas"));
  var context = canvas.getContext("2d");
  context.font = font;
  var metrics = context.measureText(text);
  return metrics.width;
}

/**
 *
 * Created by Borbás Geri on 12/17/13
 * Copyright (c) 2013 eppz! development, LLC.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:
 * The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 *
 */



/*
Created by Borbás Geri on 12/17/13
Modified by Colin "Vindexus" Kierans 2018/02/16
*/
var EPPZScrollTo =
{
  /**
   * Helpers.
   */
  documentVerticalScrollPosition: function()
  {
    if (self.pageYOffset) {
      return self.pageYOffset; // Firefox, Chrome, Opera, Safari.
    }
    if (document.documentElement && document.documentElement.scrollTop) {
      return document.documentElement.scrollTop; // Internet Explorer 6 (standards mode).
    }
    if (document.body.scrollTop) {
      return document.body.scrollTop; // Internet Explorer 6, 7 and 8.
    }
    return 0;
  },

  viewportHeight: function () {
    return (document.compatMode === "CSS1Compat") ? document.documentElement.clientHeight : document.body.clientHeight;
  },
  documentHeight: function () {
    return (document.height !== undefined) ? document.height : document.body.offsetHeight;
  },
  documentMaximumScrollPosition: function () {
    return this.documentHeight() - this.viewportHeight();
  },
  elementVerticalClientPosition: function (element) {
    var rectangle = element.getBoundingClientRect();
    return rectangle.top;
  },
  /**
   * Animation tick.
   */
  scrollVerticalTickToPosition: function (currentPosition, targetPosition, duration) {
    duration = duration || 1000
    var filter = 0.2;
    var fps = 60;
    var difference = parseFloat(targetPosition) - parseFloat(currentPosition);

    // Snap, then stop if arrived.
    var arrived = (Math.abs(difference) <= 0.5);
    if (arrived) {
      scrollTo(0.0, targetPosition);
      return;
    }

    // Filtered position.
    currentPosition = (parseFloat(currentPosition) * (1.0 - filter)) + (parseFloat(targetPosition) * filter);

    // Apply target.
    scrollTo(0.0, Math.round(currentPosition));

    // Schedule next tick.
    setTimeout(function () {
      EPPZScrollTo.scrollVerticalTickToPosition(currentPosition, targetPosition, duration)
    }, (duration / fps));
  },

  /**
   * For public use.
   *
   * @param id The id of the element to scroll to.
   * @param padding Top padding to apply above element.
   * @param duration How long to scroll for
   */
  scrollTo: function(element, padding, duration)
  {
    padding = padding || 0
    if (element == null) {
      console.warn('Cannot find element with id \''+id+'\'.');
      return;
    }

    var targetPosition = this.documentVerticalScrollPosition() + this.elementVerticalClientPosition(element) - padding;
    var currentPosition = this.documentVerticalScrollPosition();

    // Clamp.
    var maximumScrollPosition = this.documentMaximumScrollPosition();
    if (targetPosition > maximumScrollPosition) {
      targetPosition = maximumScrollPosition;
    }

    // Start animation.
    this.scrollVerticalTickToPosition(currentPosition, targetPosition, duration);
  }
};
