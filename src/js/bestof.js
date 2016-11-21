function transformBestOf(obj){
  obj = obj || {}
  obj.user = isSignedIn() ? session.user._id : 0
  return obj
}

function transformPollChoices(obj){
  var choices = []
  for (var i = 0; i<obj.choices.length; i++){
    choices.push({
      'index': i, 
      'choice': obj.choices[i]
    })
  }
  obj.choices = choices
  return obj
}

function initializeSearchFilter(){
  var search = document.querySelector(".visible [role='filter-search']")
  if (!search) return
  search.addEventListener("keyup", function(e){
    var items = this.nextElementSibling.children
    var value = this.value.toLowerCase()
    for (var i = 0; i<items.length; i++){
      var el = items[i]
      el.classList.remove('hidden')
      if (this.value && el.children[1] && el.children[1].textContent.toLowerCase().indexOf(value) == -1){
        el.classList.add('hidden')
      }
    }
  }, false)
}

function previousTab(){
  var tabsNav = document.querySelector('[role=tabs-nav]').children
  var n = (getCurrentTab() || 0)
  tabsNav[n].classList.remove('already-voted')
  n = (n-1) > 0 ? n-1 : 0
  hideAllTabs()
  showTab(n)
}

function nextTab(e, el){
  var tabsNav = document.querySelector('[role=tabs-nav]').children
  var n = (getCurrentTab() || 0)
  if (validateStep(e, el) == -1) {
    tabsNav[n].classList.remove('already-voted')
    return
  } else{
    tabsNav[n].classList.add('already-voted')
    n = n + 1
    hideAllTabs()
    showTab(n)
  }
}

function hideAllTabs(){
  var tabsNav = document.querySelector('[role=tabs-nav]').children
  var tabsContent = document.querySelector('[role=tabs-content]').children
  for (var i = 0; i<tabsNav.length; i++){
    var itemNav = tabsNav[i]
    var itemContent = tabsContent[i]
    
    itemNav.classList.remove("active")
    itemContent.classList.remove("visible")
    itemContent.classList.add("hidden")
  }
}

function showTab(n){
  var tabsNav = document.querySelector('[role=tabs-nav]').children
  var tabsContent = document.querySelector('[role=tabs-content]').children
  var normalizedIndex = n%tabsNav.length
  tabsNav[normalizedIndex].classList.add("active")
  tabsContent[normalizedIndex].classList.remove("hidden")
  tabsContent[normalizedIndex].classList.add("visible")
  initializeSearchFilter()
}

function getCurrentTab(){
  var tabsNav = document.querySelector('[role=tabs-nav]').children
  var n = 0
  for (var i = 0; i<tabsNav.length; i++){
    var item = tabsNav[i]
    if (item.classList.contains("active")) {
      n = i
      break
    }
  }
  return n
}

function validateStep(e, el){
  if (!isSignedIn()){ 
    toasty(Error('You need to <a href="/signin?redirect=bestOf2016">sign in</a> to vote (it\'s free).'), 3000)
    return -1
  }
  var data = getTargetDataSet(el)
  
  choices = []
  for (var i = 0; i<data["choices[]"].length; i++){
    var value = data["choices[]"][i]
    if (value) {
      var index = value.replace('choice-', '')
      choices.push(index)
    }
  }
  var maxChoices = parseInt(data.maxChoices);
  var minChoices = parseInt(data.minChoices);
  if (choices.length > maxChoices){
    toasty(Error('You may only select up to ' + maxChoices + ' choices.'))
    return -1
  }

  if(choices.length < minChoices){
    toasty(Error('You need to select at least ' + minChoices + ' choices.'))
    return -1
  }
}

function submitBestOf(e, el){
  var data = getTargetDataSet(el)
  /* TODO: add validation if required */

  /* post questions to SUBMIT API */
  var formData = new FormData()
  formData.append("type", "bestof2016-testing")
  formData.append("date", new Date());
  for (var key in data){
    formData.append(key, data[key])
  }
  if (localStorage.getItem("bestOf2016")) return toasty("You've already voted.")
  requestJSON({
    url: 'https://submit.monstercat.com', 
    method: 'POST', 
    data: formData
  }, function (err, obj, xhr) {
    if (err) return toasty(Error(err.message))
    else {
      submitVotesBestOf()
      localStorage.setItem("bestOf2016", "true")
    }
  })
}

function submitVotesBestOf(){
  /* post all polls to their endpoint */
  var polls = document.querySelectorAll('[role="multistep-poll"]')
  for (var p = 0; p<polls.length; p++){
    var pollData = getDataSet(polls[p], true, true)
    var data = transformChoices(pollData)

    /* create single vote for one poll */
    createPartialVote(data)
  }
}

function createPartialVote(data){
  requestJSON({
    url: endpoint + '/vote', 
    method: 'POST', 
    data: data,
    withCredentials: true
  }, function (err, obj, xhr) {
    if (err) return toasty(Error(err.message))
    else console.log(data.pollId)
  })
}

function transformChoices(data){
  choices = []
  for (var i = 0; i<data["choices[]"].length; i++){
    var value = data["choices[]"][i]
    if (value) {
      var index = value.replace('choice-', '')
      choices.push(index)
    }
  }
  return {
    'pollId': data.pollId,
    'choices': choices
  }
}