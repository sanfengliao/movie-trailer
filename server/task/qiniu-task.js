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
                movie.vedioKey =  vedioData.key
            }
            if (coverData && coverData.key) {
                movie.coverKey =  coverData.key
            }
            if (posterData && posterData.key) {
                movie.posterKey =  posterData.key
            }
            await movie.save()
        } catch (err) {
            console.log(err)
        }
    })
}

module.exports = qiniuTask
