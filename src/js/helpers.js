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
  return  mins + ':' + ("00" + seconds.toFixed()).slice(-2)
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

var requestAnimFrame = (function(){return window.requestAnimationFrame||window.webkitRequestAnimationFrame||window.mozRequestAnimationFrame||function(callback){window.setTimeout(callback,1000/60);};})();

var easeInOutQuad = function (t, b, c, d) {
    t /= d/2;
    if (t < 1) return c/2*t*t + b;
    t--;
    return -c/2 * (t*(t-2) - 1) + b;
};

var animatedScrollTo = function (element, to, duration, callback) {
    var start = element.scrollTop,
    change = to - start,
    animationStart = +new Date();
    var animating = true;
    var lastpos = null;

    var animateScroll = function() {
        if (!animating) {
            return;
        }
        requestAnimFrame(animateScroll);
        var now = +new Date();
        var val = Math.floor(easeInOutQuad(now - animationStart, start, change, duration));
        if (lastpos) {
            if (lastpos === element.scrollTop) {
                lastpos = val;
                element.scrollTop = val;
            } else {
                animating = false;
            }
        } else {
            lastpos = val;
            element.scrollTop = val;
        }
        if (now > animationStart + duration) {
            element.scrollTop = to;
            animating = false;
            if (callback) { callback(); }
        }
    };
    requestAnimFrame(animateScroll);
};

function randomChooser(n){
  return Math.floor(Math.random() * n+1);
}

function getMonths () {
  return ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']  
}

/* Vendor Helpers */

function serviceUrlToChannelId (user) {
  var m = user.match(/^\s*(?:(?:https?:\/\/)?(?:www\.|m\.)?(?:youtube|twitch|beam)?\.(?:com\/|tv\/|pro\/)?)?\/?(?:user\/|channel\/|c\/)?([^\/\?]+)/i);
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