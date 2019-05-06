## Koa2 + Vue 实现预告片网站

### 爬取数据并保存到数据库中

#### 利用puppeteer来爬去和分析视频信息

puppeteer是一个Node.js库, 封装了大量的高级API来调用Chrome DevTools开放的接口来操作网页, 它操作Dom时完全在内存中进行而不打开浏览器, 所以我们可以使用puppeteer来爬取视频信息
npm安装: https://www.npmjs.com/package/puppeteer

我们爬取豆瓣最新上映的电影的信息: https://movie.douban.com/tag/#/?sort=R&range=0,10&tags=

`trailer-movie-list.js`

```javascript
const puppeteer = require('puppeteer')

// 最新上映电影的地址
const URL = 'https://movie.douban.com/tag/#/?sort=R&range=0,10&tags='
// 点击'加载更多'按钮的次数
const CLICK_COUNT = 2
const sleep = time => new Promise((resolve, reject) => setTimeout(resolve, time))

;(async () => {
    console.log("start craw data")
    // 打开无头浏览器
    const brower = await puppeteer.launch()
    // 打开一个新的页面
    const page = await brower.newPage()
    // 转到URL
    await page.goto(URL, {
        waitUntil: 'networkidle2'
    })
    // 等待'加载更多'按钮出现
    await page.waitForSelector('.more')
    for (var i = 0; i < CLICK_COUNT; ++i) {
        await page.click('.more')
    }

    // evaluate执行自己定义的js脚本, 获取视频相关信息
    const result = await page.evaluate(() => {
        // 获取页面的JQuery对象, 这样就可以使用$来操作dom了
        var $ = window.$
        var result = []
        if (typeof $ !== 'undefined') {
            var $items = $('.list-wp > .item')
            if ($items.length > 0) {
                $items.each((index, item) => {
                    // id
                    var id = $(item).find('div').data('id')
                    // 海报
                    var posterUrl = $(item).find('img').attr('src').replace('s_ratio', 'l_ratio') // 将小海报链接换成大海报的链接
                    // 电影名
                    var title = $(item).find('.title').text()
                    // 评分
                    var rate = $(item).find('.rate').text()
                    result.push({
                        id, 
                        posterUrl,
                        title,
                        rate
                    })
                })
            }
        }

        return result
    })
    // 关闭浏览器
    brower.close()
    console.log(result)
})()
```

#### 使用child_proccess fork子进程来运行爬虫任务

javascript是单线程的语言，但如今电脑的CPU都是多核的，为了充分利用CPU的资源，node提供了`child_proccess`模块来让我们创建子进程，这样可以充分的利用cpu的资源。

为了提高性能，我们可以将我们的爬虫模块运行到子进程中。

新建`movie-task.js`作为主进程，`trailer-movie-list.js`作为子进程来爬去视频信息

`movie-task.js`

```java
const cp = require('child_process')
const { resolve } = require('path')

;(async () => {

    const script = resolve(__dirname, '../crawler/trailer-movie-list.js')
    // 创建子进程
    const child = cp.fork(script, [])
    let invoke = false

    child.on('error', err => {
        if (invoke) return
        invoke = true
        console.log('error', err)
    })

    child.on('exit', code => {
        if (invoke) return

        invoke = true
        let err = code === 0 ? null : new Error(`exit code ${code}`)
        console.log(err)
    })

    // 监听子进程发送过来的数据
    child.on('message', data => {
        console.log(data.result)
    })
})()
```

在`trailer-movie-list.js`底部添加一下代码，使得子进程可以发送数据给父进程

```javascript
process.send({result})
process.exit(0)
```

#### 使用豆瓣API爬取电影的详细信息

我们使用`puppeteer`爬取的信息只是电影的简要信息，我们还需要获得电影的详细信息，借助豆瓣的API我们可以获得电影的详细信息

`api-task.js`

```javascript
const rp = require('request-promise-native')
const API_URL = 'http://api.douban.com/v2/movie/subject/'

async function fetchMovie(movie) {
    const res = await rp.get(API_URL + movie.id)
    let body = JSON.parse(res)
    console.log(body)
    return body
}

fetchMovie({id: 33405531})
```




#### puppeteer 深度爬取封面图和视频地址

```javascript
const puppeteer = require('puppeteer')

const BASE_URL = 'https://movie.douban.com/subject/'
const id = '26100958'

;(async () => {
    console.log('start crawl vedio')

    const browser = await puppeteer.launch({
        args: ['--no-sandbox'],
        dumpio: false
    })
    const page = await browser.newPage()
    await page.goto(BASE_URL + id, {
        waitUntil: 'networkidle2'
    })

    const result = await page.evaluate(() => {
        // 获取JQuery对象
        var $ = window.$
        var rpv = $('.related-pic-video')
        if (rpv && rpv.length > 0) {
            // 获取视频cover
            var link = rpv.attr('href')
            var style = rpv.attr('style')
            var cover = style.substring(style.indexOf('(') +1, style.indexOf(')'))
            return {
                link,
                cover
            }
        }
        return {}
    })
    let vedio
    if (result.link) {
        await page.goto(result.link, {
            waitUntil: 'networkidle2'
        })
        vedio = await page.evaluate(() => {
            var $ = window.$
            // 获取视频地址
            var source = $('source')
            if (source && source.length > 0) {
                return source.attr('src')
            }
            return ''
        })
    }
    const data = {
        vedio,
        id,
        cover: result.cover
    }

    browser.close()
    process.send(data)
    process.exit(0)
})()
```

#### 上传封面图和视频地址到七牛云

豆瓣图片的地址和视频的地址做了防盗链的限制，所以我们需要将豆瓣的图片和视频上传到自己的云服务上面，我们选择七牛云作为我们存取数据的服务器(因为免费)

七牛云的相关配置: `config/index.js`

```javascript
module.exports = {
    qiniu: {
        'bucket': '你的bucket',
        'url': '你的url',
        'AK': '你的accessKey',
        'SK': '你的secretKey'
    }
}
```

`task/qiniu-task.js`

```javascript
const movies = [{ 
    vedio: 'http://vt1.doubanio.com/201904251214/98b61813b34fac83710ce41df13d01b4/view/movie/M/402440458.mp4',
    id: '26100958',
    cover:'https://img3.doubanio.com/img/trailer/medium/2550759113.jpg?',
    poster: 'https://img3.doubanio.com/view/photo/l_ratio_poster/public/p2552058346.jpg'
}]

const qiniu = require('qiniu')
const nanoId = require('nanoid')

const config = require('../config')

const mac = new qiniu.auth.digest.Mac(config.qiniu.AK, config.qiniu.SK)
const cfg = new qiniu.conf.Config()
const client = new qiniu.rs.BucketManager(mac, cfg)

const uploadToQiniu = async (url, key) => {
    return new Promise((resolve, reject) => {
        client.fetch(url, config.qiniu.bucket, key, (err, res, info) => {
            if (err) {
                reject(err)
            } else {
                if (info.statusCode === 200) {
                    resolve({key})
                } else {
                    reject(info)
                }
            }
        })
    })
}

;(async () => {
    movies.map(async movie => {
        if (movie.vedio && !movie.key) {
            try {
                console.log("开始上传 vedio")
                let vedioData = await uploadToQiniu(movie.vedio, nanoId() + '.mp4')
                console.log("开始上传 cover")
                let coverData = await uploadToQiniu(movie.cover, nanoId() + '.png')
                console.log("开始上传 poster")
                let posterData = await uploadToQiniu(movie.poster, nanoId() + '.png')

                if (vedioData.key) {
                    movie.vedioKey = vedioData.key
                }
                if (coverData.key) {
                    movie.coverKey = coverData.key
                }
                if (posterData.key) {
                    movie.posterKey = posterData.key
                }

                console.log(movie)
            } catch (error) {
                
            }
        }
    })
})()

```

#### 将数据存储到mongodb数据库

接在来我们需要将爬去到的数据保存到mongodb数据库

* 定义schema

`MovieSchema`

```javascript
const mongoose = require('mongoose')
const Schema = mongoose.Schema
const {Mixed, ObjectId} =Schema.Types

const movieSchema = new Schema({
  id: {
    type: String,
    unique: true
  },

  category: [{
    type: ObjectId,
    ref: 'Category'
  }], // 分类
  rate: Number, // 评分
  title: String, // 标题
  rawTitle: String,
  summary: String, // 简介
  vedio: String, // 预告片地址
  poster: String, // 海报图
  cover: String, // 视频封面

  vedioKey: String,
  posterKey: String,
  coverKey: String,

  movieTypes: [String],
  pubdate: [String],
  year: Number,
  tags: [Object],
  meta: {
    createAt: {
      type: Date,
      default: Date.now()
    },
    updateAt: {
      type: Date,
      default: Date.now()
    }
  }
})

movieSchema.pre('save', function(next) {
  if(this.isNew) {
    this.meta.createAt = Date.now()
  } else {
    this.meta.updateAt = Date.now()
  }
  next()
})

mongoose.model('Movie', movieSchema, 'movie')
```

`CategorySchema`

```javascript
const mongoose = require('mongoose')
const Schema = mongoose.Schema
const ObjectId = Schema.Types.ObjectId

const categorySchema = new Schema({
  
  name: {
    unique: true,
    type:String
  },

  movies: [{
    type: ObjectId,
    ref: 'Movie'
  }],

  meta: {
    createAt: {
      type: Date,
      default: Date.now()
    },
    updateAt: {
      type: Date,
      default: Date.now()
    }
  }
})

categorySchema.pre('save', function (next) {
  if(this.isNew) {
    this.meta.createAt = Date.now()
  } else {
    this.meta.updateAt = Date.now()
  }
  next()
})

mongoose.model('Category', categorySchema, 'category')
```

* 连接mongodb数据库

```javascript
const mongoose = require('mongoose')

mongoose.Promise = global.Promise

const db = 'mongodb://localhost:27017/douban-test'

exports.initSchema = () => {
  require('./schema/category')
  require('./schema/movie')
  console.log('Model 创建成功')
}

const connect = () => {
  let maxConnectTimes = 0

  return new Promise((resolve, reject) => {
    if (process.env.NODE_ENV !== 'production') {
      mongoose.set('debug', true)
    }

    mongoose.connect(db, {
      useNewUrlParser: true
    })

    mongoose.connection.on('disconnected', () => {
      maxConnectTimes++

      if (maxConnectTimes < 5) {
        mongoose.connect(db)
      } else {
        throw new Error('数据库挂了吧，快去修吧少年')
      }
    })

    mongoose.connection.on('error', err => {
      maxConnectTimes++

      if (maxConnectTimes < 5) {
        mongoose.connect(db)
      } else {
        throw new Error('数据库挂了吧，快去修吧少年')
      }
    })

    mongoose.connection.once('open', () => {
      resolve()
      console.log('MongoDB Connected successfully!')
    })
  })
}

exports.connect = connect

```

* 将爬取视频基础信息和爬取视频信息的任务放在一块

`crawerler/vedio-trailer.js`

```javascript
const puppeteer = require('puppeteer')

const BASE_URL = 'https://movie.douban.com/subject/'

const vedioCrawler = async (movies) => {
    console.log('start crawl vedio')
    const browser = await puppeteer.launch({
        args: ['--no-sandbox'],
        dumpio: false
    })

    const page = await browser.newPage()
    for (let i = 0, length = movies.length; i < length; ++i) {
        let item = movies[i]
        id = item.id

        await page.goto(BASE_URL + id, {
            waitUntil: 'networkidle2'
        })

        // 获取预告片播放地址以及视频封面图
        const result = await page.evaluate(() => {
            // 获取JQuery对象
            var $ = window.$
            var rpv = $('.related-pic-video')
            if (rpv && rpv.length > 0) {
                // 获取视频cover
                var link = rpv.attr('href')
                var style = rpv.attr('style')
                var cover = style.substring(style.indexOf('(') +1, style.indexOf(')'))
                return {
                    link,
                    cover
                }
            }
            return {}
        })
        let vedio
        // 获取视频连接
        if (result.link) {
            await page.goto(result.link, {
                waitUntil: 'networkidle2'
            })
            vedio = await page.evaluate(() => {
                var $ = window.$
                // 获取视频地址
                var source = $('source')
                if (source && source.length > 0) {
                    return source.attr('src')
                }
                return ''
            })
        }
        item.vedio = vedio
        item.cover = result.cover
        console.log(item)
    }
    browser.close()
    return movies
}

module.exports =  vedioCrawler
```

`crawler/trailer-movie-list.js`

```javascript
const puppeteer = require('puppeteer')

const vedioCrawler = require('./vedio-crawl')
// 最新上映电影的地址
const URL = 'https://movie.douban.com/tag/#/?sort=R&range=0,10&tags='
// 点击'加载更多'按钮的次数
const CLICK_COUNT = 1
const sleep = time => new Promise((resolve, reject) => setTimeout(resolve, time))

const movieTraierListCrawler = async () => {
    console.log("start craw data")
    // 打开无头浏览器
    const brower = await puppeteer.launch()
    // 打开一个新的页面
    const page = await brower.newPage()
    // 转到URL
    await page.goto(URL, {
        waitUntil: 'networkidle2'
    })
    // 等待'加载更多'按钮出现
    await page.waitForSelector('.more')
    for (var i = 0; i < CLICK_COUNT; ++i) {
        await page.click('.more')
    }

    // evaluate执行自己定义的js脚本, 获取视频相关信息
    let result = await page.evaluate(() => {
        // 获取页面的JQuery对象, 这样就可以使用$来操作dom了
        var $ = window.$
        var result = []
        if (typeof $ !== 'undefined') {
            var $items = $('.list-wp > .item')
            if ($items.length > 0) {
                $items.each((index, item) => {
                    // id
                    var id = $(item).find('div').data('id')
                    // 海报
                    var posterUrl = $(item).find('img').attr('src').replace('s_ratio', 'l_ratio') // 将小海报链接换成大海报的链接
                    // 电影名
                    var title = $(item).find('.title').text()
                    // 评分
                    var rate = $(item).find('.rate').text()
                    result.push({
                        id, 
                        posterUrl,
                        title,
                        rate
                    })
                })
            }
        }

        return result
    })

    // 关闭浏览器
    brower.close()
    return result
}

module.exports = movieTraierListCrawler
```

`crawler/index.js`

```javascript
const movieTraierListCrawler = require('./trailer-movie-list')
const vedioCralwer = require('./vedio-crawl')

;(async () => {
  let result = await movieTraierListCrawler()
  result = await vedioCralwer(result)
  process.send({result})
  process.exit(0)
})
```

##### 保存数据到数据库

**保存基础信息和视频信息**

`task/movie-task.js`

```javascript
const cp = require('child_process')
const { resolve } = require('path')
const mongoose = require('mongoose')
const Movie = mongoose.model('Movie')

const saveMovie = async (item) => {
    let movie = await Movie.findOne({id: item.id})
    if (!movie) {
        movie = new Movie(item)
        await movie.save()
    }
}

;(async () => {

    const script = resolve(__dirname, '../crawler/index.js')
    // 创建子进程
    const child = cp.fork(script, [])
    let invoke = false

    child.on('error', err => {
        if (invoke) return
        invoke = true
        console.log('error', err)
    })

    child.on('exit', code => {
        if (invoke) return

        invoke = true
        let err = code === 0 ? null : new Error(`exit code ${code}`)
        console.log(err)
    })

    // 监听子进程发送过来的数据
    child.on('message', async data => {
        let movies = data.result
        for (let i = 0, len = movies.length; i < len; ++i) {
            await saveMovie(movies[i])
        }
    })
})()
```

**爬取并保存详细信息**

```javascript
const rp = require('request-promise-native')
const mongoose = require('mongoose')

const Movie = mongoose.model('Movie')
const Category = mongoose.model('Category')

const API_URL = 'http://api.douban.com/v2/movie/'


async function fetchMovie(movie) {
    const res = await rp.get(API_URL + movie.id)
    let body = null
    try {
        body = JSON.parse(res)
    } catch (error) {
        return null
    }
    return body
}

const APICrawler = async () => {
    // 查找信息还未完善的电影信息
    let movies = await Movie.find({
        $or: [
            { summary: { $exists: false } },
            { summary: null },
            { year: { $exists: false } },
            { title: '' },
            { summary: '' }
        ]
    })
    // 完善电影信息
    for (let i = 0, length = movies.length; i < length; ++i) {
        let movie = movies[i]
        // 获取电影信息
        let movieData = await fetchMovie(movie)
        if (movieData) {

            movie.tags = movieData.tags || []
            movie.summary = movieData.summary || ''
            movie.title = movieData.alt_title || movieData.title || ''
            movie.rawTitle = movieData.title || ''
            
            if (movieData.attrs) {
                let attrs = movieData.attrs
                movie.movieTypes = attrs.movie_type || []
                movie.year = attrs.year[0] || 2000

                for (let i = 0; i < movie.movieTypes.length; ++i) {
                    let item = movie.movieTypes[i]
                    // 查询分类
                    let cat = await Category.findOne({
                        name: item
                    })
                    // 若没有该分类，则创建
                    if (!cat) {
                        cat = new Category({
                            name: item, 
                            movies: [movie._id]
                        })
                    } else {
                        // 在该分类下添加新的电影
                        if (cat.movies.indexOf(movie._id) === -1) {
                            cat.movies.push(movie._id)
                        }
                    }
                    await cat.save()

                    // 若电影还未归类
                    if (!movie.category.length) {
                        movie.category.push(cat._id)
                    } else {
                        // 给电影添加新的分类
                        if (movie.category.indexOf(cat._id) !== -1) {
                            movie.category.push(cat._id)
                        }
                    }

                }

                // 给电影添加上映时间和上映地点
                movie.pubdate = attrs.pubdate || ''
                await movie.save()
            }
        }
    }
}

module.exports = APICrawler
```

**上传七牛云并将数据保存到数据库**

```javascript
const qiniu = require('qiniu')
const nanoId = require('nanoid')
const mongoose = require('mongoose')


const config = require('../config')

const mac = new qiniu.auth.digest.Mac(config.qiniu.AK, config.qiniu.SK)
const cfg = new qiniu.conf.Config()
const client = new qiniu.rs.BucketManager(mac, cfg)
const Movie = mongoose.model('Movie')

// 上传视频到七牛
const uploadToQiniu = async (url, key) => {
    return new Promise((resolve, reject) => {
        client.fetch(url, config.qiniu.bucket, key, (err, res, info) => {
            if (err) {
                reject(err)
            } else {
                if (info.statusCode === 200) {
                    resolve({key})
                } else {
                    reject(info)
                }
            }
        })
    })
}

const qiniuTask = async () => {
    let movies = await Movie.find({
        $or: [
            { videoKey: { $exists: false } },
            { videoKey: null },
            { videoKey: '' }
        ]
    })
    movies.map(async movie => {
           
        try {
            let vedioData = null
            if(!!movie.vedio && !movie.vedioKey){
                console.log("开始上传 vedio")
                let subfix = movie.vedio.substring(movie.vedio.lastIndexOf('.'))
                vedioData = await uploadToQiniu(movie.vedio, nanoId() + subfix)
            }

            let coverData = null
            if(!!movie.cover && !movie.coverKey){
                console.log("开始上传 cover")
                let subfix = movie.cover.substring(movie.cover.lastIndexOf('.'))
                coverData = await uploadToQiniu(movie.cover, nanoId() + subfix)
            }

            let posterData = null
            if(!!movie.poster && !movie.posterKey){
                console.log("开始上传 poster")
                let subfix = movie.poster.substring(movie.poster.lastIndexOf('.'))
                posterData = await uploadToQiniu(movie.poster, nanoId() + subfix)
            }

            if (vedioData && vedioData.key) {
                movie.vedioKey = config.qiniu.url + vedioData.key
            }
            if (coverData && coverData.key) {
                movie.coverKey = config.qiniu.url + coverData.key
            }
            if (posterData && posterData.key) {
                movie.posterKey = config.qiniu.url + posterData.key
            }
            console.log(movie)
            await movie.save()
        } catch (err) {
            console.log(err)
        }
    })
}

module.exports = qiniuTask
```

总任务

```javascript
const cp = require('child_process')
const { resolve } = require('path')
const mongoose = require('mongoose')

const APICralwer = require('./api-task')
const qiniuTask = require('./qiniu-task')

const Movie = mongoose.model('Movie')

const saveMovie = async (item) => {
    let movie = await Movie.findOne({id: item.id})
    if (!movie) {
        movie = new Movie(item)
        await movie.save()
    }
}

;(async () => {

    const script = resolve(__dirname, '../crawler/index.js')
    // 创建子进程
    const child = cp.fork(script, [])
    let invoke = false

    child.on('error', err => {
        if (invoke) return
        invoke = true
        console.log('error', err)
    })

    child.on('exit', code => {
        if (invoke) return

        invoke = true
        let err = code === 0 ? null : new Error(`exit code ${code}`)
        console.log(err)
    })

    // 监听子进程发送过来的数据
    child.on('message', async data => {
        let movies = data.result
        for (let i = 0, len = movies.length; i < len; ++i) {
            await saveMovie(movies[i])
        }
        await APICralwer()
        await qiniuTask()
    })
})()
```

至此爬取数据并保存的数据库的工作已经完成了



### 使用Koa2搭建网站服务器

#### 搭建路由

```javascript
// router/movie.js
const Router = require('koa-router')
const mongoose = require('mongoose')

const Movie = mongoose.model('Movie')

const router = new Router({
  prefix: '/api'
})

// 根据类别查询电影
router.get('/movies', async (ctx, next) => {
  try { 
    let { categoryId, year, page, pageCount } = ctx.query
    let condition = {}
    if (!!categoryId) {
      condition.category = {$elemMatch: { $eq: categoryId }}
    }
    if (!!year) {
      condition.year = year
    }
    page = parseInt(page) || 1
    pageCount = parseInt(pageCount) || 20
    const movies = await Movie.find(condition).limit(parseInt(pageCount)).skip((page - 1) * pageCount).sort({
      'meta.createAt': 1
    })
    ctx.body = {
      error: 0,
      data: movies
    }
  } catch (error) {
    console.log(error)
    ctx.body = {
      error: 1,
      data: '服务器出错了'
    }
  }
})

// 查询相关的电影信息
router.get('/movie/relative', async (ctx, next) => {
  try {
    let { type, page, pageCount } = ctx.query
    let condition = {}
    if (!!type) {
      condition.movieTypes = {$elemMatch: { $eq: type }}
    }
    page = parseInt(page) || 1
    pageCount = parseInt(pageCount) || 20
    const movies = await Movie.find(condition).limit(parseInt(pageCount)).skip((page - 1) * pageCount).sort({
      'meta.createAt': 1
    })
    ctx.body = {
      error: 0,
      data: movies
    }
  } catch (error) {
    
  }
})

// 获取电影详情
router.get('/movie/:id', async (ctx, next) => {
  try { 
    const movie = await Movie.findOne({
      _id: ctx.params.id
    })
    ctx.body = {
      error: 0,
      data: movie
    }
  } catch (error) {
    ctx.body = {
      error: 1,
      data: '服务器出错了'
    }
  }
})



module.exports = router
```

```javascript
// router/category.js
const Router = require('koa-router')
const mongoose = require('mongoose')

const Category = mongoose.model('Category')

const router = new Router({
  prefix: '/api'
})

// 获取所有分类
router.get('/categories', async (ctx, next) => {
  try {
    let categories = await Category.find({})
    ctx.body = {
      error: 0,
      data: categories
    }
  } catch (error) {
    ctx.body = {
      error: 1,
      error
    }
  }
})

module.exports = router
```

#### Index.js

```javascript
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

app.listen(3000, function() {
  console.log('server listen in 3000')
})

```

### 使用Vue搭建前端页面

去client目录看吧，不知道该如何叙述

### 预览地址

[预览地址](http://47.100.108.131:4000)

