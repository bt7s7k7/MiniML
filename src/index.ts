import { readFile, writeFile } from "fs/promises"
import { basename, dirname, extname, join } from "path"
import { Cli } from "./cli/Cli"
import { asError } from "./comTypes/util"
import { CONVERT_OPTIONS, mmlConvert } from "./mmlConvert/mmlConvert"
import { Type } from "./struct/Type"

const cli = new Cli("mini-ml")
    .addOption({
        name: "version", desc: "Prints current version",
        async callback() {
            // eslint-disable-next-line no-console
            console.log(import.meta.env.VERSION)
        },
    })
    .addOption({
        name: "build", desc: "Converts an input file into an output file",
        params: [
            ["source", Type.string],
            ["dest", Type.string.as(Type.nullable)]
        ],
        options: {
            input: Type.enum("md", "html").as(Type.nullable),
            output: Type.enum("html", "latex").as(Type.nullable),
            ...CONVERT_OPTIONS
        },
        async callback(source, dest, { input, output, ...convertOptions }) {
            const outputFileExt = dest != null ? extname(dest) : output == "html" ? ".html" : output == "latex" ? ".tex" : ".html"
            const inputFileExt = extname(source)
            input ??= inputFileExt == ".md" ? "md" : inputFileExt == ".html" || inputFileExt == ".htm" ? "html" : "md"
            output ??= outputFileExt == ".html" ? "html" : outputFileExt == ".tex" ? "latex" : "html"

            const destPath = dest ?? join(dirname(source), basename(source, inputFileExt) + outputFileExt)
            cli.printOutput(`Converting ${source} to ${destPath}...`)

            const inputText = await readFile(source, "utf-8").catch(asError)
            if (inputText instanceof Error) {
                if ("code" in inputText && inputText.code == "ENOENT") {
                    cli.printOutput("File not found: " + source)
                    return
                }
                throw inputText
            }

            const outputText = await mmlConvert(inputText, input, output, convertOptions)

            await writeFile(destPath, outputText)
        },
    })

process.exitCode = await cli.execute(process.argv.slice(2))
