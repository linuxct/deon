document.addEventListener("DOMContentLoaded", function (e) {
  window.addEventListener("popstate", function (e) {
    stateChange(location.pathname + location.search, e.state)
  })
  document.addEventListener("click", function (e) {
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
  })
  stateChange(location.pathname + location.search)
})

function go (url, state) {
  history.pushState(state || {}, "", url)
  stateChange(location.pathname + location.search, state)
}

function runAction (e, el) {
  var fn = window[el.getAttribute('action')]
  if (typeof fn != 'function') return
  fn(e, el)
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
  if (source) {
    source = source.replace(/\$(\d)/g, function (str, index) {
      return matches[index] || ""
    })
    container.innerHTML = loadSource(source, container, target.textContent)
  } else {
    container.innerHTML = target.textContent
  }
}

function request (opts, done) {
  var xhr = new XMLHttpRequest();
  xhr.onreadystatechange = function () {
    if (xhr.readyState != 4) return
    if (xhr.status >= 200 && xhr.status < 300) {
      return done(null, xhr.responseText, xhr)
    }
    done(Error(xhr.responseText), null, xhr)
  }
  xhr.open(opts.method || "GET", opts.url)
  for (var key in opts.headers) {
    xhr.setRequestHeader(key, opts.headers[key])
  }
  xhr.send(opts.data)
}

function loadSource(source, container, template, matches) {
  request({
    url: source
  }, function (err, body) {
    var obj = null
    try {
      obj = JSON.parse(body)
    } catch (e) {
      err = Error("There was an error reading data recieved from the server.")
    }
    container.innerHTML = Mustache.render(template, {
      error: err,
      data: obj,
      loading: false
    })
    loadSubSources(container)
  })
  return Mustache.render(template, {loading: true})
}

function loadSubSources (container) {
  var sources = container.querySelectorAll('[source]')
  for (var i = 0; i < sources.length; i++) {
    var el       = sources[i]
    var source   = el.getAttribute('source')
    var template = document.querySelector('[template-name="'+el.getAttribute('template')+'"]')
    if (!source || !template) continue
    loadSource(source, el, template.textContent)
  }
}

function getDataSet (el) {
  var target = el.getAttribute('data-set-target')
  var setel  = document.querySelector('[data-set="'+target+'"]')
  var els    = setel.querySelectorAll('[name]')
  var obj    = {}
  for (var i = 0; i < els.length; i++) {
    var kel = els[i]
    var key = kel.getAttribute('name')
    if (obj[key]) {
      if (!(obj[key] instanceof Array)) {
        obj[key] = [obj[key]]
      }
      obj[key].push(kel.value)
    } else {
      obj[key] = kel.value
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

function searchMusic (e, el) {
  go('/music?' + objToQueryString(getDataSet(el)))
}

