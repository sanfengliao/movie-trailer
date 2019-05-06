<template>
  <div>
    <el-menu default-active="0" class="year-list" mode="horizontal" background-color="#fff" text-color="#444" active-text-color="#000" @select="handleSelect">
      <el-menu-item class="year-item" :index="index+''" v-for="(year, index) in years" :key="year">
        {{`${year}年上映`}}
      </el-menu-item>
    </el-menu>
  </div>
</template>

<script>
export default {
  data() {
    return {
      years: []
    }
  },
  created() {
    let date = new Date()
    let year = date.getFullYear()
    this.years.push(year-1)
    for (let i = 0; i < 5; ++i) {
      this.years.push(year)
      year+=1;
    }
  },
  methods: {
    handleSelect(key) {
      this.$emit('select-year', this.years[key])
    }
  }
}
</script>

<style scoped>
  .year-list {
    border: none;
  }
  .year-item {
    width: 100%;
    text-align: center;
  }
</style>