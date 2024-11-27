/// <reference path="./.vscode/config.d.ts" />

const { rm } = require("fs/promises")
const { join } = require("path")
const { project, github, constants, run } = require("ucpem")

project.prefix("src").use(
    github("bt7s7k7/Vue3GUI").res("vue3gui"),
    github("bt7s7k7/Apsides").res("editor"),
    github("bt7s7k7/LogLib").res("prettyPrint"),
)

project.prefix("src").res("miniML",
    github("bt7s7k7/CommonTypes").res("comTypes"),
)

project.prefix("src").res("mmlHtmlImporter",
    project.ref("miniML")
)

project.prefix("src").res("mmlLaTeXExporter",
    project.ref("miniML")
)

project.prefix("src").res("mmlConvert",
    project.ref("mmlLaTeXExporter"),
    project.ref("mmlHtmlImporter"),
    github("bt7s7k7/Struct").res("struct"),
)

project.prefix("src").res("cli",
    github("bt7s7k7/Struct").res("struct"),
    github("bt7s7k7/CommonTypes").res("comTypes"),
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

project.script("cli", async (args) => {
    await run("ucpem run build")
    process.argv = [...process.argv.slice(0, 2), ...args]
    await import(join(constants.projectPath, "./dist/index.mjs"))
}, { desc: "Builds and runs the cli with the specified arguments", argc: NaN })
