import { HtmlImporter, HtmlInputShortcut } from "../mmlHtmlImporter/HtmlImporter"
import { LaTeXMathWidget } from "../mmlLaTeXExporter/LaTeXMathWidget"
import { LaTeXTableOptionsWidget } from "../mmlLaTeXExporter/LaTeXTableOptionsWidget"

export const DEFAULT_OPTIONS: HtmlImporter.Options = {
    widgets: [LaTeXMathWidget, LaTeXTableOptionsWidget],
    shortcuts: []
}

export const HTML_CITATIONS: HtmlInputShortcut[] = [
    {
        start: "[[",
        end: "]]",
        object: "cite"
    },
]
export function useHtmlCitation() {
    DEFAULT_OPTIONS.shortcuts!.push(...HTML_CITATIONS)
}

export const HTML_MATH: HtmlInputShortcut[] = [
    {
        start: "$$MATH{{",
        end: "}}$$",
        object: "Math"
    },
    {
        start: "$$MATH1{{",
        end: "}}$$",
        prefix: "<Math pragma-spc1>"
    },
    {
        start: "$$MATH0{{",
        end: "}}$$",
        prefix: "<Math pragma-spc>"
    },
    {
        start: "&lt;&lt;",
        end: "&gt;&gt;",
        prefix: "<Math>"
    },
]
export function useHtmlMath() {
    DEFAULT_OPTIONS.shortcuts!.push(...HTML_MATH)
}
