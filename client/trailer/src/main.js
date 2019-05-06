import Vue from 'vue'
import axios from 'axios'
import App from './App.vue'
import router from './router'
import './plugins/element.js'
import './assets/css/reset.css'
Vue.config.productionTip = false

Vue.prototype.$axios = axios

new Vue({
  router,
  render: h => h(App)
}).$mount('#app')
