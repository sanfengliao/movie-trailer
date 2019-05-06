<template>
  <div>
    <my-header @select="handleSelect"></my-header>
    <el-container >
      <el-aside width="150px" class="trailer-aside">
        <my-aside @select-year="selectYear"></my-aside>
      </el-aside>
      <el-main class="main">
        <div class="movie-wrapper" v-if="movies.length>0">
          <el-row >
            <el-col :style="{marginBottom: '20px'}" :span="5" v-for="movie in movies" :key="movie._id" :offset="1" >
              <el-card class="movie-info" :body-style="{ padding: '0px' }">
                <img :src="site + movie.posterKey" class="movie-image" @click="playVedio(movie.vedioKey)">
                <div class="movie-desc" style="padding: 14px 14px 0 14px;">
                  <router-link class="movie-title" :to="`/detail/${movie._id}`" >
                    {{movie.title}}
                  </router-link>
                  <p class="movie-summary">{{handleUnd(movie.summary)}}</p>
                </div>
                <div class="movie-tip">
                  <span class="pub-year"><i class="el-icon-date" style="margin-right: 5px"></i>{{movie.year}}年</span>
                  <span class="rate"> <i class="el-icon-star-on"></i> {{movie.rate}}分</span>
                </div>       
              </el-card>
            </el-col>
          </el-row>
          <el-button class="load-more" @click="loadMore">加载更多</el-button>
        </div>
         <div v-else style="text-align:center">暂无相关影片信息</div> 
      </el-main>
    </el-container>
    <el-dialog
      :visible.sync="dialogVisible"
      :before-close="handleClose"
      class="dialog"
    >
      <div ref="vedioWrapper" v-show="hasTrailer"></div>
      <div v-show="!hasTrailer">暂无预告片信息</div>
    </el-dialog>
  </div>
</template>

<script>
import 'dplayer/dist/DPlayer.min.css'
import DPlayer from 'dplayer'

import MyHeader from '../components/Header.vue'
import MyAside from '../components/Aside.vue'

const site = 'http://pqk4moptv.bkt.clouddn.com/'

export default {
  data() {
    return {
      movies: [],
      conditions: {
        categoryId: '',
        year: '',
        page: 1,
        pageCount: 10
      },
      dialogVisible: false,
      hasTrailer: true,
      site,
    }
  },
  components: {
    MyHeader,
    MyAside
  },
  created() {
    this._getMovies((data) => this.movies = data)
  },
  methods: {
    handleSelect(id) {
      if (id === this.currentCategoryId) {
        return;
      }
      this.conditions.categoryId = id
      this.conditions.page = 1
      this._getMovies((data) => this.movies = data)
    },
    selectYear(year) {
      this.conditions.year = year
      this.conditions.page = 1
     this._getMovies((data) => this.movies = data)
    },
    loadMore() {
      this.conditions.page += 1
      this._getMovies(data => this.movies.push(...data))
    },
    handleUnd(s) {
      return s === 'None' ? '暂无详细信息' : s
    },
    playVedio(vedioKey) {
      this.dialogVisible = true
      if (vedioKey && vedioKey.length > 0) {
        this.hasTrailer = true
        this.$nextTick(() => {
          if (!this.dplayer) {
            this.dplayer = new DPlayer({
              container: this.$refs.vedioWrapper,
              screenshot: true,
              autoplay: true,
              video: {
                  url: site + vedioKey,
              }
            })
          }
          else {
            if (vedioKey !== this.dplayer.video.src) {
              this.dplayer.switchVideo({
                url: site + vedioKey
              })
            }
          }
        })
      }
      else {
        this.hasTrailer = false
      }
    },
    handleClose(done) {
      if(this.dplayer) {
        this.dplayer.pause()
      }
      done()
    },
    _getMovies(cb) {
      this.$axios.get(`/api/movies`,{ params: this.conditions }).then(res => {
        if (res.data.error === 0) {
          cb(res.data.data)
        }
      })
    }
  }
}
</script>

<style scoped>
.trailer-aside {
  border-right: 1px solid #eee;
}

.main {
  min-height: 500px;
}

.movie-info {
  text-align: center;
}

.movie-info  .movie-image {
  width: 80%;
  height: 270px;
  cursor: pointer;
}

.movie-info .movie-desc .movie-title {
  display: block;
  overflow: hidden;
  height: 20px;
  font-size: 20px;
  font-weight: bold;
  white-space: nowrap;
  color: #000;
}

.movie-info .movie-desc .movie-title:hover {
  text-decoration: underline;
}

.movie-info .movie-desc .movie-summary {
  position: relative;
  padding: 5px;
  height: 35px;
  font-size: 13px;
  overflow: hidden;
}

.movie-info .movie-desc .movie-summary::after {
  position: absolute;
  top: 30px;
  right: 0;
  content: '...';
  font-size: 13px;
}

.movie-info .movie-tip {
  padding: 14px;
}

.movie-info .movie-tip .pub-year {
  float: left;
  padding: 0 0 10px 5px;
}

.movie-info .movie-tip .rate {
  float: right;
  padding:0 5px 10px 0;
}

.movie-wrapper .load-more {
  display: block;
  margin: 0 auto;
  width: 85%;
}

.dialog .dplayer {
  height: 360px;
}

</style>