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