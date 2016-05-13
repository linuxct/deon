/* Declare Library
 * Author:  Thomas Mathews
 * Version: Alpha
 * Date:    May 10, 2016
 *
 * A simple declarative library of methods for building apps.
 *
 * Assumptions:
 *  - Mustache template system.
 *  - Use JSON as transit format.
 *  - You want to use CORS.
 *  - Your main content lies under [role="content"].
 *  - Uses Maps
 */

function request (opts, done) {
  var xhr = new XMLHttpRequest();
  xhr.onreadystatechange = function () {
    if (xhr.readyState != 4) return
    if (xhr.status >= 200 && xhr.status < 300) {
      return done(null, xhr.responseText, xhr)
    }
    var msg = xhr.responseText || "An error occured."
    done(Error(msg), null, xhr)
  }
  xhr.open(opts.method || "GET", opts.url)
  for (var key in opts.headers) {
    xhr.setRequestHeader(key, opts.headers[key])
  }
  xhr.withCredentials = !!opts.withCredentials
  xhr.send(opts.data)
  return xhr
}

function requestJSON (opts, done) {
  if (typeof opts.headers != 'object') opts.headers = {}
  opts.headers['Accept'] = 'application/json'
  if (opts.data) {
    opts.headers['Content-Type'] = 'application/json'
    opts.data = JSON.stringify(opts.data)
  }
  return request(opts, function (err, body, xhr) {
    var obj
    var parseErr
    if (xhr.responseText) {
      try {
        obj = JSON.parse(xhr.responseText)
      } catch (e) {
        parseErr = e
        obj = undefined
      }
    }
    if (err && obj) {
      err = Error()
      for (var key in obj) {
        err[key] = obj[key]
      }
      obj = undefined
    } else if (!err && parseErr) {
      err = parseErr
    }
    done(err, obj, xhr)
  })
}

function interceptClick (e) {
  var isAnchor = false
  var isAction = null
  var t = null
  for (var i = 0; i < e.path.length; i++) {
    t = e.path[i]
    if (t.tagName == "A") {
      isAnchor = true
      break
    }
    if (t.hasAttribute && t.hasAttribute('action')) {
      isAction = t
    }
  }
  if (isAction) {
    runAction(e, isAction)
  }
  if (!isAnchor) return
  var url = t.getAttribute("href")
  if (url.indexOf('http') == 0)
    return
  e.preventDefault()
  go(url)
}

function go (url, state) {
  history.pushState(state || {}, "", url)
  stateChange(location.pathname + location.search, state)
}

function getMethod(el, attr) {
  var fn = window[el.getAttribute(attr)]
  if (typeof fn != 'function') return
  return fn
}

function runAction (e, el) {
  var fn = getMethod(el, 'action')
  if (fn) fn(e, el)
}

function stateChange (url, state) {
  cache()
  var str = url.substr(1)
  var els = document.querySelectorAll("script[route]")
  var target = null
  var matches = null
  for (var i = 0; i < els.length; i++) {
    var el = els[i]
    var route = el.getAttribute('route')
    var rex = new RegExp(route)
    if (!rex.test(str)) continue
    matches = str.match(rex)
    if (!matches) continue
    target = el
    break
  }
  if (!target) return
  var container = document.querySelector('[role="content"]')
  var source = target.getAttribute('source')
  var transform = getMethod(target, 'transform')
  if (source) {
    source = source.replace(/\$(\d)/g, function (str, index) {
      return matches[index] || ""
    })
    loadSource(source, container, target.textContent, transform)
    return
  }
  render(container, target.textContent, (transform ? transform() : {}))
}

function render (container, template, scope) {
  container.innerHTML = Mustache.render(template, scope)
  loadSubSources(container)
}

function cache (source, obj) {
  var _ = cache._
  if (!_) {
    _ = new Map()
    cache._ = _
  }
  if (!arguments.length) {
    _.clear()
    return
  }
  if (source && obj) {
    _.set(source, obj)
    return
  }
  return _.get(source)
}

function loadCache (source, done, reset) {
  var _ = loadCache._
  if (!_) {
    _ = new Map()
    loadCache._ = _
  }
  var cached = cache(source)
  if (!reset && cached) return done(null, cached)
  var callbacks = _.get(source)
  if (!callbacks) {
    callbacks = []
    _.set(source, callbacks)
  }
  callbacks.push(done)
  requestJSON({
    url: source,
    withCredentials: true
  }, function (err, obj, xhr) {
    if (obj) cache(source, obj)
    callbacks.forEach(function (fn) {
      fn(err, obj)
    })
    _.delete(source)
  })
}

function loadSource (source, container, template, transform, reset) {
  render(container, template, {loading: true})
  loadCache(source, function (err, obj) {
    if (obj && transform) {
      obj = transform(obj, function (err, obj) {
        render(container, template, {
          error: err,
          data: obj
        })
      })
      if (!obj) return
    }
    render(container, template, {
      error: err,
      data: obj
    })
  }, reset)
}

function loadSubSources (container, reset) {
  var sources = container.querySelectorAll('[source]')
  for (var i = 0; i < sources.length; i++) {
    var el       = sources[i]
    var source   = el.getAttribute('source')
    var template = document.querySelector('[template-name="' +
                                          el.getAttribute('template') +
                                          '"]')
    if (!source || !template) continue
    loadSource(source,
               el,
               template.textContent,
               getMethod(template, 'transform'),
               reset)
  }
}

function getElementValue (el, value) {
  if (value == undefined) return getElementValue(el, el.value)
  // var tag  = el.tagName.toLowerCase()
  var type = el.getAttribute('type')
  if (type == 'checkbox') {
    return value == 'on' ? true : false
  }
  return value
}

function getDataSet (el, checkInitial) {
  var obj
  var target = el.getAttribute('data-set-target')
  var setel  = document.querySelector('[data-set="'+target+'"]')
  var els    = setel.querySelectorAll('[name]')
  for (var i = 0; i < els.length; i++) {
    var kel = els[i]
    var key  = kel.getAttribute('name')
    var ival = getElementValue(kel, kel.getAttribute('initial-value'))
    var val  = getElementValue(kel)
    // TODO handle radio scenario
    if (obj && obj[key]) {
      if (!(obj[key] instanceof Array)) {
        obj[key] = [obj[key]]
      }
      obj[key].push(val)
    } else if (!checkInitial || (checkInitial && val != ival)) {
      if (!obj) obj = {}
      obj[key] = val
    }
  }
  return obj
}

function cloneObject (obj) {
  var type = typeof obj
  if (!obj || type == 'function' || type == 'string' || type == 'number') return obj
  if (obj instanceof Date) return new Date(obj)
  if (obj instanceof RegExp) return new RegExp(obj)
  if (obj instanceof Array) return obj.slice()
  var nobj = {}
  for (var key in obj) {
    nobj[key] = cloneObject(obj[key])
  }
  return nobj
}

function objectToQueryString (obj) {
  return Object.keys(obj).map(function (key) {
    return encodeURIComponent(key) + '=' + encodeURIComponent(obj[key])
  }).join("&")
}

function queryStringToObject (str) {
  var obj = {}
  if (!str) return obj
  if (str[0] == "?") str = str.substr(1)
  var arr = str.split("&")
  arr.forEach(function (el) {
    var a = el.split("=")
    obj[decodeURIComponent(a[0])] = decodeURIComponent(a[1])
  })
  return obj
}
