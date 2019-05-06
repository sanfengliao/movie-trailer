const Router = require('koa-router')
const mongoose = require('mongoose')

const Movie = mongoose.model('Movie')

const router = new Router({
  prefix: '/api'
})

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