import { HtmlImporter } from "../mmlHtmlImporter/HtmlImporter"
import { LaTeXMathWidget } from "../mmlLaTeXExporter/LaTeXMathWidget"
import { LaTeXTableOptionsWidget } from "../mmlLaTeXExporter/LaTeXTableOptionsWidget"

export const DEFAULT_OPTIONS: HtmlImporter.Options = {
    widgets: [LaTeXMathWidget, LaTeXTableOptionsWidget],
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

    DEFAULT_OPTIONS.shortcuts!.push({
        start: /(?:\xa0|&nbsp;| )&lt;&lt;/,
        end: /&gt;&gt;(?:\xa0|&nbsp;| )/,
        prefix: "<Math pragma-spc1>"
    })

    DEFAULT_OPTIONS.shortcuts!.push({
        start: /(?:\xa0|&nbsp;| )&lt;&lt;/,
        end: "&gt;&gt;",
        prefix: "<Math pragma-spc>"
    })

    DEFAULT_OPTIONS.shortcuts!.push({
        start: "&lt;&lt;",
        end: /&gt;&gt;(?:\xa0|&nbsp;| )/,
        prefix: "<Math pragma-spc0>"
    })

    DEFAULT_OPTIONS.shortcuts!.push({
        start: "&lt;&lt;",
        end: "&gt;&gt;",
        prefix: "<Math>"
    })
}
