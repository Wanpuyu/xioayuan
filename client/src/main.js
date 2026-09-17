import { createApp } from 'vue';
import { createPinia } from 'pinia';
import ElementPlus from 'element-plus';
import zhCn from 'element-plus/es/locale/lang/zh-cn';
import 'element-plus/dist/index.css';
import App from './App.vue';
import router from './router';
import { persistUserStore } from './stores/user';
import lazyDirective from './directives/lazy';
import './styles/global.css';

const app = createApp(App);

app.use(createPinia());
persistUserStore();
app.use(router);
app.use(ElementPlus, { locale: zhCn });

// 图片懒加载全局指令 v-lazy
app.directive('lazy', lazyDirective);

app.mount('#app');
