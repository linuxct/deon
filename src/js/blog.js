function transformPost(obj){
	if (obj.title) setPageTitle(obj.title)
	obj.date = formatDate(obj.date)
	obj.image = transformLegacyImages(obj.image)
	return obj
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

  obj.results.forEach(function (i, index, arr) {
  	i.featured = (index == 0) ? true : false
    i.date = formatDate(i.date)
    i.isOdd = !(index % 2 == 0)
    i.image = transformLegacyImages(i.image)
    i.url = i.path.split('/')[1].slice(0, -3) // remove 'posts/' and '.md'
  })
  return obj
}
function transformLegacyImages(img){
	return (img.indexOf('http') == -1) ? img = 'https://www.monstercat.com' + img : img
}