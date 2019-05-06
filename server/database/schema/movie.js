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