import { basename, dirname, join, relative } from "path"
import { Plugin } from "vite"
import { MmlParser } from "../miniML/MmlParser"
import { MmlVueExporter } from "../miniML/MmlVueExporter"

const markdownTest = /\.md$/

export function mmlPlugin(options?: mmlPlugin.Options): Plugin {
    const fileRegex = options?.transformPredicate ?? markdownTest

    return {
        name: "MiniML Loader",
        transform(src, id, fileOptions) {
            if (!fileRegex.test(id)) return


            const result: string[] = []

            const parser = new MmlParser(src, options)

            parser.widgets.register(MmlVueExporter.PropertyDeclarationWidget)
            parser.widgets.register(MmlVueExporter.PropertyWidget)

            const root = parser.parseDocument()
            const exporter = new MmlVueExporter()
            if (options?.allowedComponents) {
                for (const component of Object.keys(options.allowedComponents)) {
                    exporter.allowedComponents.add(component)
                }
            }
            const content = exporter.renderContent(root)

            for (const usedComponent of exporter.usedComponents) {
                let path = options!.allowedComponents![usedComponent]
                let name = usedComponent

                if (path.includes("@")) {
                    name = path.slice(path.indexOf("@") + 1)
                    path = path.slice(0, path.indexOf("@"))
                }

                const importPath = path.startsWith("./") ? (
                    "./" + join(relative(dirname(id), ""), path)
                ) : (
                    path
                )

                if (name == "default") {
                    result.push(`import ${usedComponent} from "${importPath}"`)
                } else {
                    result.push(`import { ${name == usedComponent ? name : `${name} as ${usedComponent}`} } from "${importPath}"`)
                }
            }

            result.push(`import { defineComponent, h } from "vue"`)

            result.push("")
            result.push("export default defineComponent({")
            result.push(`   name: "${basename(id)}",`)
            result.push(`   props: {`)
            for (const [prop, options] of exporter.manifest.properties) {
                result.push(`   ${JSON.stringify(prop)}: { type: String, required: ${options.required}, default: ${options.default} },`)
            }
            result.push(`   },`)
            result.push(`   setup(props) {`)
            result.push(`       return ${content}`)
            result.push(`   },`)
            result.push("})")

            return {
                code: result.join("\n") + "\n",
            }
        },
    }
}

export namespace mmlPlugin {
    export interface Options extends MmlParser.Options {
        allowedComponents?: Record<string, string>
        transformPredicate?: RegExp
    }
}
