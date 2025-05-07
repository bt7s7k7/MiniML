import vue from "@vitejs/plugin-vue"
import vueJsx from "@vitejs/plugin-vue-jsx"
import * as dotenv from "dotenv"
import { rm, symlink } from "fs/promises"
import { join, resolve } from "path"
import { defineConfig, Plugin } from "vite"
import { mmlPlugin } from "./src/mmlVite/MmlVitePlugin"

const _LATEX_ASSETS: Plugin = {
    name: "latex-assets",
    async buildStart(options) {
        await rm("./public/latex", { recursive: true, force: true })
        await symlink(resolve("./node_modules/latex.js/dist"), "./public/latex", "junction")
    },
}

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
    dotenv.config({ path: join(__dirname, ".env.local") })
    dotenv.config({ path: join(__dirname, ".env") })

    return {
        plugins: [vue(), vueJsx(), _LATEX_ASSETS, mmlPlugin({
            allowedComponents: {
                "XButton": "./src/vue3gui/Button@Button",
                "pre": "./src/app/CodePreview@CodePreview"
            }
        })],
        resolve: {
            preserveSymlinks: true
        },
        server: {
            port: +(process.env.PORT ?? 8080),
            /* proxy: {
                "^/api": { target: process.env.BACKEND_URL, changeOrigin: true },
            } */
        },
        base: mode == "development" ? "/" : process.env.BASE_URL
    }
})
