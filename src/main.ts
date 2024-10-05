import { createApp } from "vue"
import { App } from "./app/App"
import { router } from "./app/router"
import "./miniML/markdown-style.scss"
import { Platform } from "./platform/Platform"
import { VitePlatform } from "./vitePlatform/VitePlatform"
import "./vue3gui/style.scss"
import { vue3gui } from "./vue3gui/vue3gui"

const app = createApp(App)

app.use(router)
app.use(vue3gui, {})

app.mount("#app")

if (import.meta.hot) {
    Platform.global = new VitePlatform()
}
