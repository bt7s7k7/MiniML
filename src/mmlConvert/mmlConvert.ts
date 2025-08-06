import { unreachable } from "../comTypes/util"
import { MmlHtmlRenderer } from "../miniML/MmlHtmlRenderer"
import { MmlMarkdownRenderer } from "../miniML/MmlMarkdownRenderer"
import { MmlParser } from "../miniML/MmlParser"
import { SyntaxNode_t } from "../miniML/SyntaxNode"
import { HtmlImporter } from "../mmlHtmlImporter/HtmlImporter"
import { ListNormalizer } from "../mmlHtmlImporter/normalizeLists"
import { LaTeXExporter } from "../mmlLaTeXExporter/LaTeXExporter"
import { Type } from "../struct/Type"
import { DEFAULT_OPTIONS, useHtmlCitation, useHtmlMath } from "./options"

export const CONVERT_OPTIONS = {
    htmlSelector: Type.string.as(Type.nullable),
    htmlMath: Type.boolean.as(Type.nullable),
    htmlCite: Type.boolean.as(Type.nullable),
    htmlNormalizeLists: Type.boolean.as(Type.nullable)
}

export type ConvertOptions = Type.Extract<Type.TypedObjectType<typeof CONVERT_OPTIONS>>

async function loadHtml(input: string, options: ConvertOptions) {
    const { JSDOM } = await import("jsdom")
    const jsdom = new JSDOM()
    for (const key of ["document", "Text", "HTMLElement", "Comment", "DocumentFragment"]) {
        // @ts-ignore
        globalThis[key] = jsdom.window[key]
    }

    if (options.htmlMath) {
        useHtmlMath()
    }

    if (options.htmlCite) {
        useHtmlCitation()
    }

    const importer = new HtmlImporter(DEFAULT_OPTIONS)

    if (options.htmlSelector) {
        const _1 = importer.importDocument
        importer.importDocument = function (element) {
            const found = element.querySelector<HTMLElement>(options.htmlSelector!)
            if (found == null) throw new Error(`Cannot find element with selector "${options.htmlSelector}"`)
            element = found
            return _1.call(this, element)
        }
    }

    const root = importer.importHtml(input)
    if (options.htmlNormalizeLists) {
        const normalizer = new ListNormalizer()
        const result = normalizer.transform(root)
        if (normalizer.wasModified) return result
    }
    return root
}

export async function mmlConvert(inputText: string, input: "md" | "html", output: "html" | "latex" | "dump" | "md", options: ConvertOptions) {
    const document = input == "md" ? (
        new MmlParser(inputText, DEFAULT_OPTIONS).parseDocument()
    ) : input == "html" ? (
        await loadHtml(inputText, options)
    ) : unreachable()

    const outputText = output == "html" ? (
        new MmlHtmlRenderer().render(document)
    ) : output == "latex" ? (
        new LaTeXExporter().exportDocument(document)
    ) : output == "dump" ? (
        JSON.stringify(SyntaxNode_t.serialize(document), null, 4)
    ) : output == "md" ? (
        new MmlMarkdownRenderer().render(document)
    ) : unreachable()

    return outputText
}
