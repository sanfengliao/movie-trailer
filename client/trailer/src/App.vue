<template>
  <div id="app">
    <keep-alive include="home">
      <router-view></router-view>
    </keep-alive>
  </div>
</template>

<script>


export default {
  name: 'app',
}
</script>

<style>

</style>
