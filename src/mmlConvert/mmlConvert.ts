import { unreachable } from "../comTypes/util"
import { MmlHtmlRenderer } from "../miniML/MmlHtmlRenderer"
import { MmlParser } from "../miniML/MmlParser"
import { HtmlImporter } from "../mmlHtmlImporter/HtmlImporter"
import { LaTeXExporter } from "../mmlLaTeXExporter/LaTeXExporter"

async function initDOM() {
    const { JSDOM } = await import("jsdom")
    const jsdom = new JSDOM()
    for (const key of ["document", "Text", "HTMLElement"]) {
        // @ts-ignore
        globalThis[key] = jsdom.window[key]
    }
}

export async function mmlConvert(inputText: string, input: "md" | "html", output: "html" | "latex") {
    const document = input == "md" ? (
        new MmlParser(inputText).parseDocument()
    ) : input == "html" ? (
        await initDOM(), new HtmlImporter().importHtml(inputText)
    ) : unreachable()

    const outputText = output == "html" ? (
        new MmlHtmlRenderer().render(document)
    ) : output == "latex" ? (
        new LaTeXExporter().exportDocument(document)
    ) : unreachable()

    return outputText
}
