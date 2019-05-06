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
            movie.rate = movieData.rating.average || movieData.rating.max
            movie.rawTitle = movieData.alt_title || ''
            
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