/// <reference path="./.vscode/config.d.ts" />

const { rm } = require("fs/promises")
const { join } = require("path")
const { project, github, constants } = require("ucpem")

project.prefix("src").res("miniML",
    github("bt7s7k7/Vue3GUI").res("vue3gui"),
    github("bt7s7k7/Struct").res("struct"),
    github("bt7s7k7/CommonTypes").res("comTypes"),
    github("bt7s7k7/Apsides").res("editor"),
    github("bt7s7k7/LogLib").res("prettyPrint"),
)

project.script("build", async () => {
    const { build } = require("esbuild")

    await rm(join(constants.projectPath, "dist"), { force: true, recursive: true })

    await build({
        bundle: true,
        format: "esm",
        entryPoints: ["./src/index.ts"],
        outfile: "dist/index.mjs",
        sourcemap: true,
        logLevel: "info",
        platform: "node",
        preserveSymlinks: true,
        packages: "external",
        define: {
            "import.meta.env.VERSION": JSON.stringify(new Date().toISOString().slice(0, -5).replace(/[^\d]/g, "."))
        }
    })
}, { desc: "Builds CLI form of the project" })
