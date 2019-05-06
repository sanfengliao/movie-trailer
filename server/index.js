const Koa = require('koa')
const {connect, initSchema} = require('./database/init')



initSchema()
;(async () => {
  // console.log("初始化数据")
  await connect()
  // 爬取数据
  require('./task/movie-task')
})()
  
const movieRouter = require('./router/movie')
const categoryRouter = require('./router/category')
const app = new Koa()

app.use(movieRouter.routes()).use(movieRouter.allowedMethods())
app.use(categoryRouter.routes()).use(categoryRouter.allowedMethods())

app.listen(4001, function() {
  console.log('server listen in 3000')
})
