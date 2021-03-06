function transformPost(obj){
	obj.date = formatDate(obj.date)
	obj.image = transformLegacyImages(obj.image)
  obj.url = window.location.href
	return obj
}
function openShare(e, el){
  var options = 'menubar=no,toolbar=no,resizable=yes,scrollbars=yes,';
  var networks = {
    facebook : { width : 600, height : 300 },
    twitter  : { width : 600, height : 254 }
  }
  var network = el.dataset.share;
  if (network) window.open(el.dataset.href, '', options+'height='+networks[network].height+',width='+networks[network].width);
  e.preventDefault
  return false
}
function completedPost(source, obj){
  setPageTitle(obj.data.title)
  var meta = {
    'og:title': obj.data.title,
    'og:description': transformExcerptToText(obj.data.excerpt),
    'og:type': 'article',
    'og:url': location.toString(),
    'og:image': obj.data.image
  }
  setMetaData(meta)
  pageIsReady()
}
function completedMarkdownPost(){
  var twitterEmbeds = document.querySelector('.twitter-tweet');
  var redditEmbeds = document.querySelector('.reddit-embed');
  if (twitterEmbeds){
    var twitterJs = document.createElement('script');
    twitterJs.src = 'https://platform.twitter.com/widgets.js';
    document.getElementsByTagName('head')[0].appendChild(twitterJs);
  }
  if (redditEmbeds){
    var redditJs = document.createElement('script');
    redditJs.src = 'https://www.redditstatic.com/comment-embed.js';
    document.getElementsByTagName('head')[0].appendChild(redditJs);
  }
}
function transformBlogPagination(obj){
  var q = queryStringToObject(window.location.search)
  q.page = parseInt(q.page) || 1
  obj.page = q.page
  return obj
}
function transformBlog(obj){
  if (obj.total > 1) obj.showPagination = true
  setPagination(obj, obj.limit)

  var maxExcerpt = 200

  obj.results.forEach(function (i, index, arr) {
  	i.featured = (index == 0 && !obj.tag) ? true : false
    i.date = formatDate(i.date)
    i.isOdd = !(index % 2 == 0)
    i.excerpt = transformExcerptToText(i.excerpt)
    i.excerpt = (i.excerpt.length > maxExcerpt) ? i.excerpt.substr(0,maxExcerpt)+'...' : i.excerpt
    i.image = transformLegacyImages(i.image)
    i.url = i.path.split('/')[1].slice(0, -3) // remove 'posts/' and '.md'
  })
  return obj
}
function transformExcerptToText(htmlExcerpt){
  var aux = document.createElement('div')
  aux.innerHTML = htmlExcerpt
  return aux.textContent || aux.innerText || "";
}
function transformLegacyImages(img){
	return (img.indexOf('http') == -1) ? img = 'https://www.monstercat.com' + img : img
}
