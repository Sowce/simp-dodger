import Vue from "vue";
import App from "./App.vue";

Vue.config.productionTip = false;

import { FontAwesomeIcon } from "@fortawesome/vue-fontawesome";
import { library } from "@fortawesome/fontawesome-svg-core";
import {
  faUserLock,
  faThumbsUp,
  faUserPlus,
  faCircleNotch,
  faTimes,
  faWindowMinimize,
  faQuestion,
} from "@fortawesome/free-solid-svg-icons";

library.add(
  faUserLock,
  faThumbsUp,
  faUserPlus,
  faCircleNotch,
  faWindowMinimize,
  faTimes,
  faQuestion
);

Vue.component("font-awesome-icon", FontAwesomeIcon);

new Vue({
  render: (h) => h(App),
}).$mount("#app");
