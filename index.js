var express 	= require('express')
var path    	= require('path')
var fs 			= require('fs')
var dir = process.env.PUBLIC_DIR || process.cwd() + '/public'
if (!path.isAbsolute(dir)) dir = path.resolve(process.cwd(), dir)
var indexPath	= path.resolve(dir, 'cache', 'index.html')
var templatesDir = path.resolve(dir, 'templates')
var files = fs.readdirSync(templatesDir)
var templatesHTML = ''
files.forEach(function (file) {
	if (file.substr(0, 1) != '_') {
		templatesHTML += "<!-- START:" + file + " -->\n" 
			+ fs.readFileSync(path.resolve(templatesDir, file), 'utf8')
			+ "<!-- END:" + file + " -->\n" 
	}
})
var html = fs.readFileSync(path.resolve(templatesDir, '_header.html')) 
	+ templatesHTML 
	+ fs.readFileSync(path.resolve(templatesDir, '_footer.html'))
fs.writeFile(indexPath, html)
var app = express()
app.use(express.static(dir))
app.use((req, res, next)=>{
  res.sendFile(indexPath)
})
app.listen(process.env.PORT || 8080)
