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
    const brower = await puppeteer.launch({
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    })
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
                    var poster = $(item).find('img').attr('src') // 将小海报链接换成大海报的链接
                    // 电影名
                    var title = $(item).find('.title').text()
                    // 评分
                    var rate = $(item).find('.rate').text()
                    result.push({
                        id, 
                        poster,
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