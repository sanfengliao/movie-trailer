const Router = require('koa-router')
const mongoose = require('mongoose')

const Category = mongoose.model('Category')

const router = new Router({
  prefix: '/api'
})

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