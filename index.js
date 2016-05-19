var express = require('express')
var path    = require('path')

var dir = process.env.PUBLIC_DIR || process.cwd() + '/public'
if (!path.isAbsolute(dir)) dir = path.resolve(process.cwd(), dir)
var app = express()
app.use(express.static(dir))
app.use((req, res, next)=>{
  res.sendFile(dir + '/index.html')
})
app.listen(process.env.PORT || 8080)
