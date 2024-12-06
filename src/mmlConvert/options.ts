import { HtmlImporter } from "../mmlHtmlImporter/HtmlImporter"
import { LaTeXMathWidget } from "../mmlLaTeXExporter/LaTeXMathWidget"

export const DEFAULT_OPTIONS: HtmlImporter.Options = {
    widgets: [LaTeXMathWidget],
    shortcuts: []
}

export function useHtmlCitation() {
    DEFAULT_OPTIONS.shortcuts!.push({
        start: "[[",
        end: "]]",
        object: "cite"
    })
}

export function useHtmlMath() {
    DEFAULT_OPTIONS.shortcuts!.push({
        start: "$$MATH{{",
        end: "}}$$",
        object: "Math"
    })

    DEFAULT_OPTIONS.shortcuts!.push({
        start: "$$MATH1{{",
        end: "}}$$",
        prefix: "<Math pragma-spc1>"
    })

    DEFAULT_OPTIONS.shortcuts!.push({
        start: "$$MATH0{{",
        end: "}}$$",
        prefix: "<Math pragma-spc>"
    })
}
