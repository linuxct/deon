function toast (opts) {
  var container = document.querySelector('[role="toasts"]')
  if (!container) return
  var div = document.createElement('div')
  var template = document.querySelector('[template-name="toast"]')
  if (!template) return
  render(div, template.textContent, opts)
  var el = div.firstElementChild
  container.appendChild(el)
  setTimeout(function () {
    container.removeChild(el)
  }, opts.time || 3000)
}

function toasty (obj, time) {
  if (obj instanceof Error) {
    return toast({
      error: true,
      message: obj.message,
      time: time || 5000
    })
  }
  if (typeof obj == 'string') {
    return toast({
      message: obj,
      time: time
    })
  }
  toast(obj)
}

function openModal (name, data) {
  var el         = getTemplateEl(name)
  var opts       = getElementSourceOptions(el)
  var container  = document.querySelector('[role="modals"]')
  opts.container = container.querySelector('[role="container"]')
  opts.data      = data
  if (opts.source) {
    loadSource(opts)
  }
  else {
    renderTemplateOptions(opts)
  }
  container.classList.add('open')
}

function closeModal () {
  var container = document.querySelector('[role="modals"]')
  if(container != null) {
    container.classList.remove('open')
    var x = container.querySelector('[role="container"]').firstElementChild
    if(x != null) {
      x.parentElement.removeChild(x)
    }
  }
}

function togglePassword (e, el) {
  var target = 'input[name="' + el.getAttribute('toggle-target') + '"]'
  var tel    = document.querySelector(target)
  if (!tel) return
  var type   = tel.getAttribute('type') == 'password' ? 'text' : 'password'
  var cls    = type == 'password' ? 'eye-slash' : 'eye'
  tel.setAttribute('type', type)
  var iel    = el.firstElementChild
  if (!iel) return
  iel.classList.remove('fa-eye')
  iel.classList.remove('fa-eye-slash')
  iel.classList.add('fa-' + cls)
}

function simpleUpdate (err, obj, xhr) {
  if (err) return window.alert(err.message)
  loadSubSources(document.querySelector('[role="content"]'), true, true)
}

function reloadPage () {
  stateChange(location.pathname + location.search)
}

function toggleNav(){
  document.querySelector("[role='nav']").classList.toggle('open')
  document.querySelector("[role='nav-button']").classList.toggle('active')
}

function closeNav(){
  document.querySelector("[role='nav']").classList.remove('open')
  document.querySelector("[role='nav-button']").classList.remove('active')
}

function stickyPlayer(){
  var threshold = 150
  var el = document.querySelector("[role='fixed']")
  window.addEventListener('scroll', function(){
    if(window.scrollY >= threshold) {
      el.classList.add('fixed');
    }
    else {
      el.classList.remove('fixed')
    }
  })
}