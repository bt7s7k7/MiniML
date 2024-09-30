import { h } from "vue"
import { createRouter, createWebHistory, RouteRecordRaw } from "vue-router"
import { MiniMLEditor } from "./MiniMLEditor"

const routes: RouteRecordRaw[] = [
    {
        name: "Home",
        path: "/",
        component: MiniMLEditor
    },
    {
        name: "404",
        component: { setup: () => () => h("pre", { class: "m-4" }, "Page not found") },
        path: "/:page(.*)*"
    }
]

export const router = createRouter({
    history: createWebHistory(),
    routes
})
