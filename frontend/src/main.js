import { createApp } from "vue";
import App from "./App.vue";
import store from "./store";
import "./style.css";
import 'remixicon/fonts/remixicon.css';

createApp(App).use(store).mount("#app");