const movieTraierListCrawler = require('./trailer-movie-list')
const vedioCralwer = require('./vedio-crawl')

const crawler = async () => {
  let result = await movieTraierListCrawler()
  result = await vedioCralwer(result)
  process.send({result})
  process.exit(0)
}

// crawler()
setInterval(() => {
  crawler()
}, 1000 * 60 * 60 * 24);