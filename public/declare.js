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
 *  - Useing ES6 tech (Maps, etc.)
 */

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

function requestDetect (opts, done, fallback) {
  var url    = opts.url
  var method = fallback || request
  var ext    = url.substring(url.lastIndexOf('.')+1, url.length)
  if (ext == 'md' || ext == 'markdown') {
    method = request
    opts.withCredentials = false // TODO Remove hack
  }
  method(opts, done)
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
  requestDetect({
    url: source,
    withCredentials: true
  }, function (err, obj, xhr) {
    if (obj) cache(source, obj)
    callbacks.forEach(function (fn) {
      fn(err, obj)
    })
    _.delete(source)
  }, requestJSON)
}

function interceptClick (e) {
  var isAnchor = false
  var isAction = null
  var t = null
  for (var i = 0; i < e.path.length; i++) {
    t = e.path[i]
    if (t.hasAttribute && t.hasAttribute('action'))
      isAction = t
    if (t.tagName == "A") {
      isAnchor = true
      break
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
  if (!target) target = getTemplateEl('404')
  if (!target) return
  var container = document.querySelector('[role="content"]')
  openRoute(target, container, matches)
}

function openRoute (target, container, matches) {
  var source = target.getAttribute('source')
  var opts = {
    container: container,
    transform: getMethod(target, 'transform'),
    template:  target.textContent,
    completed: getMethod(target, 'completed')
  }
  if (source) {
    opts.source = source.replace(/\$(\d)/g, function (str, index) {
      return matches[index] || ""
    })
    loadSource(opts)
    return
  }
  renderTemplateOptions(opts)
}

function loadSource (opts) {
  var source    = opts.source
  var container = opts.container
  var template  = opts.template
  var reset     = opts.reset

  // Allow using global vars in source.
  // TODO use a dot lens
  source = source.replace(/\$(\w+)/g, function (str, name) {
    return window[name] ? window[name].toString() : name
  })

  if (!opts.disableLoadingRender)
    render(container, template, {loading: true})
  loadCache(source, function (err, obj) {
    var fn = function (err, obj) {
      delete opts.transform
      opts.data = {
        error: err,
        data: obj
      }
      renderTemplateOptions(opts)
    }
    if (err) return fn(err, obj)
    applyTransform(opts.transform, obj, fn)
  }, reset)
}

function loadSubSources (container, reset, disableLoadingRender) {
  var sources = container.querySelectorAll('[source]')
  for (var i = 0; i < sources.length; i++) {
    var opts = getElementSourceOptions(sources[i])
    opts.reset = reset
    opts.disableLoadingRender = disableLoadingRender
    loadSource(opts)
  }
}

function getElementSourceOptions (el) {
  var tel = getTemplateEl(el.getAttribute('template')) || el;
  return {
    source:    el.getAttribute('source'),
    container: el,
    template:  tel.textContent,
    transform: getMethod(tel, 'transform'),
    completed: getMethod(tel, 'completed'),
  }
}

function applyTransform (transform, data, done) {
  if (typeof transform == 'function') {
    data = transform(data, done)
    if (!data) return
  }
  done(null, data)
}

function renderTemplateOptions (opts) {
  var container = opts.container
  var template  = opts.template
  var transform = opts.transform
  var completed = opts.completed
  var data      = opts.data

  var fa = function (data) {
    render(container, template, data)
    if (typeof completed == 'function')
      completed(opts.source, data)
  }
  var fn = function (err, obj) {
    fa({
      error: err,
      data: obj
    })
  }
  if (transform)
    return applyTransform(transform, data, fn)
  render(container, template, data)
  if (typeof completed == 'function')
    completed(opts.source, data)
}

function render (container, template, scope) {
  container.innerHTML = Mustache.render(template, scope)
  loadSubSources(container)
}

function getTemplateEl(name) {
  return document.querySelector('[template-name="' + name + '"]');
}

function getElementValue (el) {
  var type = el.getAttribute('type')
  if (type == 'checkbox')
    return el.checked
  return parseElementValue(el, el.value)
}

function getElementInitialValue (el) {
  if (!el.hasAttribute('initial-value')) return
  return parseElementValue(el, el.getAttribute('initial-value'))
}

function parseElementValue (el, value) {
  var type  = (el.getAttribute('type') || "").toLowerCase()
  if (type == 'checkbox') {
    return value == 'on' || value == 'true' || value === true ? true : false
  }
  if (typeof value == 'string' && value && !isNaN(value)) {
    return Number(value)
  }
  return value
}

function getDataSet (el, checkInitial, ignoreEmpty) {
  var obj
  var els = el.querySelectorAll('[name]')
  for (var i = 0; i < els.length; i++) {
    var kel = els[i]
    var key  = kel.getAttribute('name')
    var ival = getElementInitialValue(kel)
    var val  = getElementValue(kel)
    // TODO handle radio
    if (ignoreEmpty && val == "") {
      continue
    } else if (obj && obj[key]) {
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

function getTargetDataSet (el, checkInitial, ignoreEmpty) {
  var target = getDataSetTargetElement(el)
  if (!target) return
  return getDataSet(target, checkInitial, ignoreEmpty)
}

function getDataSetTargetElement (el) {
  var target = el.getAttribute('data-set-target')
  return document.querySelector('[data-set="' + target + '"]')
}

function resetTargetInitialValues (el, obj) {
  var target = getDataSetTargetElement(el)
  if (!target) return
  resetInitialValues(target, obj)
}

function resetInitialValues (el, obj) {
  els = el.querySelectorAll('[initial-value]')
  for (var i = 0; i < els.length; i++) {
    var el    = els[i]
    var value = obj[el.getAttribute('name')]
    // TODO handle radio
    if (value == undefined || value == null)
      value = ""
    el.setAttribute('initial-value', value)
  }
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
