const puppeteer = require('puppeteer')

const BASE_URL = 'https://movie.douban.com/subject/'

const vedioCrawler = async (movies) => {
    console.log('start crawl vedio')
    const browser = await puppeteer.launch({args: ['--no-sandbox', '--disable-setuid-sandbox']})

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
                var cover = style.substring(style.indexOf('(') +1, style.indexOf('?'))
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
        item.vedio = vedio || ''
        item.cover = result.cover || ''
    }
    browser.close()
    return movies
}

module.exports =  vedioCrawler