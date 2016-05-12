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

function loadSource (source, container, template, transform) {
  render(container, template, {loading: true})
  requestJSON({
    url: source,
    withCredentials: true
  }, function (err, obj, xhr) {
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
  })
}

function loadSubSources (container) {
  var sources = container.querySelectorAll('[source]')
  for (var i = 0; i < sources.length; i++) {
    var el       = sources[i]
    var source   = el.getAttribute('source')
    var template = document.querySelector('[template-name="' +
                                          el.getAttribute('template') +
                                          '"]')
    if (!source || !template) continue
    loadSource(source, el, template.textContent, getMethod(template, 'transform'))
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

function objToQueryString (obj) {
  return Object.keys(obj).map(function (key) {
    return encodeURIComponent(key) + '=' + encodeURIComponent(obj[key])
  }).join("&")
}

function queryStringToObject (str) {
  var obj = {}
  if (!str) return obj
  var arr = str.substr(1).split("&")
  arr.forEach(function (el) {
    var a = el.split("=")
    obj[a[0]] = a[1]
  })
  return obj
}
