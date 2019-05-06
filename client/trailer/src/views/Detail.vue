<template>
  <el-container class="container">
    <el-main class="detail-main">
      <div ref="vedioWrapper" v-show="hasTrailer">
      </div>
      <div v-show="!hasTrailer">暂无影片预告片信息</div>
    </el-main>
    <el-aside>
      <router-link to="/" style="text-align: center; font-size: 18px;">回到首页</router-link>        
      <el-tabs class="tabs" v-model="activeName" @tab-click="handleSelect">
        <el-tab-pane label="关于本片" name="1" class="movie-info">
          <div v-if="movie._id">
            <span class="movie-title">{{movie.title}}</span>
            <div class="movie-desc">
              <p class="desc-item movie-rate">豆瓣评分: <span class="gc">{{movie.rate}}</span>分</p>
              <p class="desc-item movie-types">电影分类: {{movie.movieTypes.join('、')}}</p>
              <p class="desc-item movie-pub-year">上映时间: {{movie.year}}年</p>
              <p class="desc-item movie-summary">详情: {{movie.summary}}</p>
            </div>
          </div>
        </el-tab-pane>
        <el-tab-pane label="同类电影" name="2">
          <div class="panel-content">
            <div class="list-wrapper" v-if="movieType && relativeMovies.length>0">
              <ul class="relative-movies" >
                <li class="relative-movie-item" v-for="item in relativeMovies" :key="item._id">
                  <div class="img-wrapper">
                    <img class="movie-pic" :src="site + item.posterKey" alt="">
                  </div>
                  <div class="movie-desc">
                    <router-link :to="`/detail/${item._id}`" class="movie-title">{{item.title}}</router-link>
                    <p class="movie-pub-date">{{item.year}}年</p>
                    <p class="movie-summary">{{handleUnd(item.summary)}}</p>
                  </div>
                </li>
              </ul>
              <el-button @click="loadMore" class="load-more" size="small">加载更多</el-button>
            </div>
            <span v-else>暂无同类电影</span>
          </div>
        </el-tab-pane>
      </el-tabs>
    </el-aside>
  </el-container>
</template>

<script>

import DPlayer from 'dplayer'
import 'dplayer/dist/DPlayer.min.css'

export default {
  data() {
    return {
      movie: {},
      site: 'http://pqk4moptv.bkt.clouddn.com/',
      activeName: '1',
      relativeMovies: [],
      isRequestRelatvie: false,
      pageCount: 10,
      page: 1,
      movieType: '',
      hasTrailer: true
    }
  },
  created() {
    this.__getMovieDetail((data) => {
      this.movie = data
      this.movieType = this.movie.movieTypes[0]
      if(this.movie.vedioKey) {
        this.hasTrailer = true
        this.$nextTick(() => {
          this.dplayer = new DPlayer({
            container: this.$refs.vedioWrapper,
            screenshot: true,
            autoplay: true,
            video: {
                url: this.site + this.movie.vedioKey,
            }
          })
        })
      } else {
        this.hasTrailer = false
      }
    })
  },
  mounted() {
    let h = window.innerHeight || document.documentElement.clientHeight
    this.$refs.vedioWrapper.style.height = h + 'px'
  },
  methods: {
    handleSelect() {
      if (this.activeName === '2' && !this.isRequestRelatvie) {
        this.__getRelativeMovie((data)=>{
          this.relativeMovies = data
        })
        this.isRequestRelatvie = true
      }
    },
    handleUnd(s) {
      return s === 'None' ? '暂无详细信息' : s
    },
    loadMore() {
      this.page += 1
      this.__getRelativeMovie(data => {
        this.relativeMovies.push(...data)
      })
    },
    __getRelativeMovie(cb) {
      let {movieType, page, pageCount} = this
      this.$axios.get('/api/movie/relative', {
        params: {
          type: movieType,
          page,
          pageCount,
        }
      }).then(res => {
        if (res.data.error === 0) {
          cb(res.data.data)
        }
      })
    },
    __getMovieDetail(cb) {
      let { id } = this.$route.params
      this.$axios.get(`/api/movie/${id}`).then(res => {
        if (res.data.error === 0) {
          cb(res.data.data)
        }
      })
    }
    
  },
  watch: {
    $route() {
      if(this.dplayer) {
        this.dplayer.pause()
      }
      this.activeName = '1'
      this.isRequestRelatvie = false
      this.relativeMovies = []
      this.page = 0
      this.__getMovieDetail(data => {
        this.movie = data
        this.movieType = this.movie.movieTypes[0]
        if(this.movie.vedioKey) {
          this.hasTrailer = true
          this.$nextTick(() => {
            if(!this.dplayer) {
              this.dplayer = new DPlayer({
                container: this.$refs.vedioWrapper,
                screenshot: true,
                autoplay: true,
                video: {
                    url: this.site + this.movie.vedioKey,
                }
              })
            }
            else {
              this.dplayer.switchVideo({
                url: this.site + this.movie.vedioKey
              })
            }
          })
        } else {
          this.hasTrailer = false
        }
        })
    }
  },
}
</script>

<style scoped>
.detail-main {
  padding: 0;
  text-align: center;
}

.container {
  height: 100%;
}

.tabs {
  padding: 0 20px;
}

.panel-content {
  overflow: auto;
  max-height: 600px;
}

.movie-info .movie-title {
  font-size: 20px;
  font-weight: bold;
}
.movie-info .movie-desc {
  margin-top: 20px;
}
.movie-info .movie-desc .desc-item {
  margin: 5px 0;
  line-height: 17px;
  font-size: 13px;
  color: #333;
}

.movie-info .movie-desc .movie-rate .gc {
  display: inline-block;
  width: 28px;
  text-align: center;
  color: #fff;
  background:#67C23A;
  border-radius: 50%;
}   

.list-wrapper .load-more {
  margin-top: 20px;
  width: 100%;
}

.relative-movies .relative-movie-item {
  display: flex;
}
.relative-movies .relative-movie-item .img-wrapper {
  width: 100px;
}

.relative-movies .relative-movie-item .movie-pic {
  width: 100%;
}

.relative-movies .relative-movie-item .movie-desc {
  flex: 1;
  margin-left: 15px;
}

.relative-movie-item .movie-desc .movie-title {
  color: #000;
  font-size: 20px;
  font-weight: 700;
}

.relative-movie-item .movie-desc .movie-title:hover {
  text-decoration: underline;
}

.relative-movie-item .movie-desc .movie-pub-date {
  color: #777;
  margin: 10px 0;
  font-size: 14px;
}

.relative-movie-item .movie-desc .movie-summary {
  color: #777;
  position: relative;
  overflow: hidden;
  padding: 0 5px;
  height: 60px;
  font-size: 12px;
}

.relative-movie-item .movie-desc .movie-summary::after {
  position: absolute;
  content: '...';
  top: 50px;
  right: 5px;
}

</style>