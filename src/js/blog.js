function transformPost(obj){
	if (obj.title) setPageTitle(obj.title)
	obj.date = formatDate(obj.date)
	obj.image = transformLegacyImages(obj.image)
	return obj
}
function completedMarkdownPost(){
  var redditEmbeds = document.querySelector('.reddit-embed');
  if (!redditEmbeds) return

  var redditJs = document.createElement('script');
  redditJs.src = 'https://www.redditstatic.com/comment-embed.js';
  document.getElementsByTagName('head')[0].appendChild(redditJs);
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
  	i.featured = (index == 0) ? true : false
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
  return aux.textContent || aux.innerText || "";
}
function transformLegacyImages(img){
	return (img.indexOf('http') == -1) ? img = 'https://www.monstercat.com' + img : img
}