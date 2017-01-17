function getFeaturedToggleEl () {
  return document.querySelector('[role="upcoming-toggle"]')
}

function transformEventPage (obj){
  obj = transformEvent(obj)
  obj.view = false
  obj.single = true
  obj.isSignedIn = isSignedIn()
  return obj
}

function openGalleryModal (e, el) {
  openModal('gallery-modal', {
    src: el.getAttribute('big-src')
  })
}

function transformEvents (results) {
  results = results.map(function (r) {
    return transformEvent(r)
  })
  return results  
}

function transformEvent (i) {
  i.upcoming = new Date(i.startDate) > new Date()
  i.dateString = formatDate(i.startDate)
  i.date = formatDateJSON(i.startDate)
  i.icalDownloadLink = endpoint + '/events/addtocalendar/' + i._id
  if(i.featured) {
    i.url = '/event/' + i.vanityUri
    i.externalUrl = false
  }
  else {
    i.externalUrl = true
    i.url = 'http://www.bandsintown.com/event/' + i.bandsInTownId + '/buy_tickets'
  }
  if(i.description && i.description.length > 0) {
    i.descriptionHtml = marked(i.description)
  }
  else {
    i.descriptionHtml = ''
  }
  i.showCtaButton = i.ctaUri && i.upcoming
  if(i.artistDetails) {
    i.artistDetails = i.artistDetails.map(function (detail) {
      detail.image = datapoint + '/blobs/' + detail.profileImageBlobId
      return detail
    })
  }
  else {
    i.artistDetails = []
  }
  if(i.coverImageUri) {
    i.coverImageLarge = i.coverImageUri + '?image_width=2048'
    i.coverImageSmall = i.coverImageUri + '?image_width=512'
  }
  return i  
}

function transformHeaderEvent (obj) {
  if(obj.results.length == 0) {
    return false;
  }
  var header = obj.results[0]
  return transformEvent(header)
}

function transformUpcomingEvents (obj) {
  obj.results = transformEvents(obj.results)
  return obj
}

function transformPastEvents (obj){
  obj.results = transformEvents(obj.results)
  obj.results = obj.results.filter(function(el){
    return !el.upcoming
  })
  obj.results = obj.results.sort(function (a, b) {
    if(a.startDate == b.startDate) {
      return 0
    }
    return a.startDate > b.startDate ? -1 : 1
  })
  return obj
}

function transformEventsPage (obj) {
  obj = obj || {}
  obj.page = 1
  obj.isSignedIn = isSignedIn()
  return obj
}

function transformEventsEmailOptin (obj) {
  obj.isSignedIn = isSignedIn()
  if (obj.isSignedIn) {
    obj.emailOptIns = transformEmailOptins(obj.emailOptIns)
    obj.fullyOptedIn = obj.emailOptIns.eventsNearMe && !isLegacyLocation()

    //Legacy Location
    //delete obj.googleMapsPlaceId
    //obj.location = "Canada"

    //New Location
    //obj.location = "Canada"
    //obj.googleMapsPlaceId = "ChIJs0-pQ_FzhlQRi_OBm-qWkbs"
    //obj.placeName = "Vancouver"
    //obj.placeNameFull = "Vancouver, BC, Canada"

    //Has Opted In
    //obj.emailOptIns = {eventsNearMe: true}

    //Has Opted Out
    //obj.emailOptIns = {eventsNearMe: false}

    //Hasn't opted in or out
    //obj.emailOptIns = {}
  }
  return obj
}

function subscribeEventsEmailOptIn (e, el) {
  var data = getTargetDataSet(el, true, true)
  if(!data.googleMapsPlaceId) {
    alert('Please enter your location')
    return
  }
  data['emailOptIns[eventsNearMe]'] = true
  update('self', null, data, function (err, obj) {
    if (err) return window.alert(err.message)
    toasty('You are now subscribed to hear about Monstercat events near you')

    resetTargetInitialValues(el, obj)
    loadSession(function (err, obj) {
      loadSubSources(document.querySelector('[role=events-email-optin]'), true, true)
    })
  })
}

function signUpForEventEmail (e, el) {
  var data = getTargetDataSet(el, true, true)
  var qs = {}
  if(data.placeNameFull && data.placeNameFull.length > 0) {
    qs.location = data.placeNameFull
  }
  if(data.email && data.email.length > 0) {
    qs.email = data.email
  }
  return go('/sign-up?' + objectToQueryString(qs))
}

function getUpcomingEventsQueryObject (options) {
  var page = Math.max(1, parseInt(options.page) || 1)
  var limit = 10
  var qo = {
    limit: limit,
    skip: (page - 1) * limit,
    page: page
  }
  if(search.featured) {
    qo.featured = 1
  }
  return qo
}

function getUpcomingEventsQueryString (options) {
  return objectToQueryString(getUpcomingEventsQueryObject(options))
}

function loadUpcomingEvents (options) {
  //Append a new table of upcoming events with source being the next limit/skip the elements
  var div = document.createElement('div')
  var tel = getTemplateEl('events-table-container')
  var upcomingQS = getUpcomingEventsQueryString(options)
  render(div, tel.textContent, {
    upcomingQueryString: upcomingQS
  })
  var container = document.querySelector('[role="events-tables"]')
  container.appendChild(div)
  loadSubSources(div)
}

function loadMoreUpcomingEvents (e, el) {
  var button = document.querySelector('[action=loadMoreUpcomingEvents]')
  var att = button.getAttribute('current-page')
  var page = parseInt(att) + 1
  loadUpcomingEvents({page: page})
  button.setAttribute('current-page', page)
}

function toggleUpcoming (){
  var el = getFeaturedToggleEl()
  document.querySelector('[role=events-tables]').classList.toggle('events--filtered', el.checked)
  checkNoFeaturedMessage()
}

function completedEventsEmailOptin () {
  initLocationAutoComplete()
}

function completedUpcomingEvents (source, obj) {
  var button = document.querySelector('[action=loadMoreUpcomingEvents]')
  var shown = (obj.data.skip) + (obj.data.results.length)
  button.classList.toggle('hide', shown >= obj.data.total)
  checkNoFeaturedMessage()
}

function completedEventPage (source, obj) {
  var title = obj.data.name + ' in ' + obj.data.location + ' @ ' + obj.data.venue
  setPageTitle(title)
  var meta = {
    'og:title': title,
    'og:description': '',
    'og:type': 'profile',
    'og:url': location.toString(),
    'og:image': obj.data.posterImageUri
  }
  setMetaData(meta)
  pageIsReady()
  initLocationAutoComplete()
}

function completedEventsPage (source, obj) {
  var qo = getUpcomingEventsQueryObject(window.location.search)
  var title = 'Events'
  setPageTitle(title)
  loadUpcomingEvents(window.location.search)
  initLocationAutoComplete()
}

function checkNoFeaturedMessage () {
  var numFeatured = document.querySelectorAll('[role=events-tables] tr.featured').length
  var hide = numFeatured > 0 || !getFeaturedToggleEl().checked
  document.querySelector('.events-no-featured-message').classList.toggle('hide', hide)
  document.querySelector('[role=events-tables]').classList.toggle('events--filtered-empty', !hide)
}
