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
 *  - Completed hook defaults to seting prerenderReady to true
 */

var mustacheTemplates = {}

function cache (source, obj) {
  var _ = cache._
  if (!_ || !arguments.length) {
    _ = {}
    cache._ = _
  }
  if (!arguments.length)
    return
  if (source && obj) {
    _[source] = obj
    return
  }
  return _[source]
}

function request (opts, done) {
  var xhr = new XMLHttpRequest();
  xhr.onreadystatechange = function () {
    if (xhr.readyState != 4) return
    if (xhr.status >= 200 && xhr.status < 400) {
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

function requestWithFormData (opts, done) {
  var fd = new FormData()
  opts.data = opts.data || {}
  for(var key in opts.data) {
    fd.append(key, opts.data[key])
  }
  opts.data = fd
  request(opts, done)
}

function requestDetect (opts, done, fallback) {
  var url    = opts.url
  var method = fallback || request
  var ext    = url.substring(url.lastIndexOf('.')+1, url.length)
  if (ext == 'md' || ext == 'markdown') {
    method = request
  }
  opts.withCredentials = false
  var list = requestDetect.credentialDomains
  for (var i=0; i<list.length; i++) {
    if (url.indexOf(list[i]) == 0) {
      opts.withCredentials = true
      break;
    }
  }
  method(opts, done)
}
requestDetect.credentialDomains = []

function requestJSON (opts, done) {
  function resolve (err, body, xhr) {
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
  }
  if (typeof opts.headers != 'object') opts.headers = {}
  opts.headers['Accept'] = 'application/json'
  if (opts.data) {
    opts.headers['Content-Type'] = 'application/json'
    opts.data = JSON.stringify(opts.data)
  }
  return request(opts, resolve)
}

function loadCache (source, done, reset, fallback) {
  var _ = loadCache._
  if (!_) {
    _ = {}
    loadCache._ = _
  }
  var cached = cache(source)
  if (!reset && cached) return done(null, cached)
  var callbacks = _[source]
  var doit = false
  if (!callbacks) {
    callbacks = []
    _[source] = callbacks
    doit = true
  }
  callbacks.push(done)
  if (doit == false) return
  requestDetect({
    url: source,
    withCredentials: true
  }, function (err, obj, xhr) {
    if (obj) cache(source, cloneObject(obj))
    callbacks.forEach(function (fn) {
      fn(err, obj)
    })
    delete _[source]
  }, fallback || requestJSON)
}

function elMatches (el, sel) {
  if(typeof(el.matchesSelector) == 'function') {
    return el.matchesSelector(sel);
  }
  if(typeof(el.matches) == 'function') {
    return el.matches(sel)
  }
  if(typeof(el.msMatchesSelector) == 'function') {
    return el.msMatchesSelector(sel)
  }
  return false;
}

function interceptKeyPress (e) {
  var which = e.which || e.keyCode
  var isAction = null
  if (!e.path) {
    addEventPath(e)
  }
  if(which == 13) {
    if(elMatches(e.path[0], 'input,button:not([action])')) {
      for(var i = 0; i < e.path.length; i++) {
        if(elMatches(e.path[i], '[trigger-target]')) {
          var target = document.querySelector('[trigger="' + e.path[i].getAttribute('trigger-target') + '"]')
          if(target) {
            e.preventDefault()
            return runAction(e, target)
          }
        }
      }
    }
    //Hitting enter on a button that has an action
    if(elMatches(e.path[0], 'button[action]')) {
      e.preventDefault()
      return runAction(e, e.path[0]);
    }
  }
}

function interceptClick (e) {
  var isAnchor = false
  var isAction = null
  var t = null
  if (e.metaKey) {
    return true
  }
  if (!e.path) {
    addEventPath(e)
  }
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
  if (!isAnchor || !t.hasAttribute('href')) return
  if(e.ctrlKey) return
  var url = t.getAttribute("href")
  if (url.indexOf('http') == 0)
    return
  e.preventDefault()
  go(url)
}

function interceptDoubleClick (e, el) {
  var isAction = null
  if (!e.path) {
    addEventPath(e)
  }
  for (var i = 0; i < e.path.length; i++) {
    var t = e.path[i]
    if (t.hasAttribute && t.hasAttribute('dblc-action')) {
      isAction = t
    }
  }
  if(isAction) {
    runDblCAction(e, isAction)
  }
  //TODO: Make exceptions for things people actually double click
  e.preventDefault()
  return
}

function addEventPath(e) {
  e.path = []
  var elem = e.target
  while (elem) {
    e.path.push(elem)
    elem = elem.parentElement
  }
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

function runDblCAction (e, el) {
  var fn = getMethod(el, 'dblc-action')
  if (fn) fn(e, el)
}

function applyFunctions (t, fns, args) {
  if (fns instanceof Array) {
    for(var i = 0; i < fns.length; i++) {
      if (typeof fns[i] == 'function')
        fns[i].apply(t, arguments)
    }
  }
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
    sourceType: target.getAttribute('source-type')
  }
  opts.completed = function () {
    var fn = getMethod(target, 'completed')
    if (fn) {
      fn.apply(fn, arguments)
    } else if (typeof pageIsReady == 'function') {
      pageIsReady()
    }
    applyFunctions(fn, openRoute.completed, arguments)
  }

  applyFunctions(null, openRoute.started, arguments)

  if (target.hasAttribute('page-title'))
    document.title = target.getAttribute('page-title')
  setMetaData({}) //This is declared in main.js but should probably be moved to this file
  if (source) {
    opts.source = source.replace(/\$(\d)/g, function (str, index) {
      return matches[index] || ""
    })
    loadSource(opts)
    return
  }
  renderTemplateOptions(opts)
}
openRoute.completed = []
openRoute.started = []

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
  }, reset, opts.sourceType == 'markdown' ? request : undefined)
}

function loadSubSources (container, reset, disableLoadingRender) {
  if(!container) {
    return
  }
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
    sourceType:    el.getAttribute('source-type'),
    container: el,
    template:  tel.textContent,
    transform: getMethod(tel, 'transform'),
    completed: getMethod(tel, 'completed'),
  }
}

function applyTransform (transform, data, done) {
  if (typeof transform == 'function') {
    data = transform(data, done)
    if (!data) {
      return
    }
  }
  done(null, data)
}

function renderTemplateOptions (opts) {
  var container = opts.container
  var template  = opts.template
  var transform = opts.transform
  var completed = typeof opts.completed == 'function' ? opts.completed : function () {}
  var data      = opts.data

  var fa = function (data) {
    render(container, template, data)
    completed(opts.source, data)
  }
  var fn = function (err, obj) {
    fa({
      error: err,
      data: obj
    })
  }
  if (transform) return applyTransform(transform, data, fn)
  render(container, template, data)
  completed(opts.source, data)
}

function render (container, template, scope) {
  if(!container) {
    return
  }
  container.innerHTML = Mustache.render(template, scope, mustacheTemplates)
  loadSubSources(container)
}

function getTemplateEl(name) {
  return document.querySelector('[template-name="' + name + '"]');
}

function getElementValue (el) {
  var type = el.getAttribute('type')
  return parseElementValue(el, el.value)
}

function getElementInitialValue (el) {
  if (!el.hasAttribute('initial-value')) return
  return parseElementValue(el, el.getAttribute('initial-value'))
}

function isNumberString (str) {
  if (!isNumberString.test) isNumberString.regexp = /^\d+(\.\d+)?$/g
  return isNumberString.regexp.test(str.trim())
}

function parseElementValue (el, value) {
  var type  = (el.getAttribute('type') || "").toLowerCase()
  if (type == 'radio') {
    if (el.checked) return value
    return ''
  }
  if (type == 'checkbox') {
    if (el.checked) {
      if (el.value == '1')
        return true
      return el.value
    }
    else {
      return false
    }
  }
  if (typeof value == 'string' && isNumberString(value)) {
    return Number(value)
  }
  return value
}

function getDataSet (el, checkInitial, ignoreEmpty) {
  var obj
  var els = el.querySelectorAll('[name]')
  for (var i = 0; i < els.length; i++) {
    var kel     = els[i]
    var key     = kel.getAttribute('name')
    var ival    = getElementInitialValue(kel)
    var val     = getElementValue(kel)
    var isRadio = kel.getAttribute('type') == 'radio'
    var isCheckboxList = el.querySelector('[name="' + key + '"]').length > 0

    if (ignoreEmpty && val === '') {
      continue
    } else if (obj && obj[key] && !isRadio) {
      if (!(obj[key] instanceof Array)) {
        obj[key] = [obj[key]]
      }
      if(!isCheckboxList)
        obj[key].push(val)
      else {
        if (val !== false) {
          obj[key].push(val)
        }
      }
    } else if (!checkInitial || (checkInitial && val != ival)) {
      if (!obj) obj = {}
      if (obj[key] && isRadio) continue
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
  if(!el) {
    return null
  }
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
  if (obj instanceof Array) return obj.map(cloneObject)
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

function searchStringToObject () {
  return queryStringToObject(window.location.search)
}

//Loads templates to be used with the {{>partial}} mustache feature
document.addEventListener("DOMContentLoaded", function (e) {
  var mTemplateEls = document.querySelectorAll('script[mustache-name]')
  for(var i = 0; i < mTemplateEls.length; i++) {
    var el = mTemplateEls[i]
    mustacheTemplates[el.getAttribute('mustache-name')] = el.innerHTML
  }
})
