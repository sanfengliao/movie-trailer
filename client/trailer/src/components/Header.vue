<template>
  <div class="header">
    <h1 class="title">XYZ预告片</h1>
    <el-menu default-active="-1" class="nav-menu" mode="horizontal" background-color="#000" text-color="#fff" active-text-color="#ffd04b" @select="handleSelect">
      <el-menu-item index="-1">全部</el-menu-item>
      <el-menu-item :index="index + ''"  v-for="(item, index) in showCategories" :key="item._id">
        {{item.name}}
      </el-menu-item>
    </el-menu>
    <div class="show-more" @click="showMore = !showMore">{{showMore ? '收起' : '更多'}}</div>
  </div>
</template>

<script>
export default {
  data() {
    return {
      categories: [],
      showCategories: [],
      showMore: false
    }
  },
  created() {
    this.$axios.get('/api/categories').then(res => {
      if (res.data.error === 0) {
        this.categories = res.data.data
        this.showCategories = this.categories.slice(0, 10);
      }
    })
  },
  methods: {
    handleSelect(index) {
      if (index === '-1') {
       this.$emit('select', '')
      } else {
        this.$emit('select', this.categories[index]._id)
      }
    }
  },
  watch: {
    showMore(newVal) {
      if(newVal) {
        this.showCategories = this.categories
      } else {
        this.showCategories = this.categories.slice(0, 10)
      }
    }
  },
}
</script>

<style scoped>
.header {
  display: flex;
  background: #000;
  color: #fff;
}

.header .title {
  padding-right: 50px;
  width: 200px;
  height: 100%;
  font-size: 20px;
  font-weight: 600;
  line-height: 60px;
  text-align: center; 
}

.header .nav-menu {
  flex: 1;
}
.header .show-more {
  margin-left: 40px;
  padding-right: 100px;
  height: 100%;
  line-height: 60px;
  cursor: pointer;
}
</style>