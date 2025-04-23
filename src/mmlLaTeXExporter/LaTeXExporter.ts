import { range, Reducers, unreachable } from "../comTypes/util"
import { SyntaxNode } from "../miniML/SyntaxNode"
import { LaTeXTableOptions } from "./LaTeXTableOptionsWidget"

export class LaTeXExporter {
    public result: string[] = []
    public indent = 0
    public skipNextIndent = true
    public tableOptions = LaTeXTableOptions.default()

    public emitIndent() {
        if (this.skipNextIndent) {
            this.skipNextIndent = false
            return
        }

        this.result.push("    ".repeat(this.indent))
    }

    public exportNodeContent(node: SyntaxNode.NodeWithChildren) {
        for (const child of node.content) {
            this.exportNode(child)
        }
    }

    public emitBlockElement(node: SyntaxNode.Segment, name: string) {
        this.emitIndent()
        this.result.push("\\begin{" + name + "}\n")
        this.indent++
        this.exportNodeContent(node)
        this.indent--
        this.emitIndent()
        this.result.push("\\end{" + name + "}\n")
    }

    public exportNode(node: SyntaxNode) {
        if (node.kind == "segment") {
            if (node.type == 1) {
                this.emitIndent()
                this.result.push("\\section{")
                this.skipNextIndent = true
                this.exportNodeContent(node)
                this.result.push("}\n\n")
                return
            }

            if (node.type == 2) {
                this.emitIndent()
                this.result.push("\\subsection{")
                this.skipNextIndent = true
                this.exportNodeContent(node)
                this.result.push("}\n\n")
                return
            }

            if (node.type == 3) {
                this.emitIndent()
                this.result.push("\\subsubsection{")
                this.skipNextIndent = true
                this.exportNodeContent(node)
                this.result.push("}\n\n")
                return
            }

            if (typeof node.type == "number") {
                this.emitIndent()
                this.result.push("\\paragraph{")
                this.skipNextIndent = true
                this.exportNodeContent(node)
                this.result.push("}\n")
                return
            }

            if (node.type == "p") {
                this.emitIndent()
                this.exportNodeContent(node)
                this.result.push("\n\n")
                return
            }

            if (node.type == "ul") {
                this.emitBlockElement(node, "itemize")
                return
            }

            if (node.type == "quote") {
                this.emitBlockElement(node, "quote")
                return
            }

            if (node.type == "ol") {
                this.emitBlockElement(node, "enumerate")
                return
            }

            if (node.type == "li") {
                this.emitIndent()
                this.result.push("\\item ")
                this.exportNodeContent(node)
                this.result.push("\n")
                return
            }

            this.exportNodeContent(node)
            return
        }

        if (node.kind == "text") {
            this.result.push(node.value
                .replace(/\\/g, "\\textbackslash")
                .replace(/_/g, "\\_")
            )
            return
        }

        if (node.kind == "raw") {
            this.result.push(node.value)
            return
        }

        if (node.kind == "span") {
            const gapStart = node.attributes?.get("pragma-spc") != null
            const gapEnd = node.attributes?.get("pragma-spc0") != null
            const gapBoth = node.attributes?.get("pragma-spc1") != null

            if (gapBoth || gapStart) {
                this.result.push(" ")
            }

            try {
                if (node.modifier == "code") {
                    this.result.push(" \\texttt{")
                    this.exportNodeContent(node)
                    this.result.push("} ")
                    return
                }

                if (node.modifier == "bold") {
                    this.result.push(" \\textbf{")
                    this.exportNodeContent(node)
                    this.result.push("} ")
                    return
                }

                if (node.modifier == "italics") {
                    this.result.push(" \\textit{")
                    this.exportNodeContent(node)
                    this.result.push("} ")
                    return
                }

                this.exportNodeContent(node)
                return
            } finally {
                if (gapBoth || gapEnd) {
                    this.result.push(" ")
                }
            }
        }

        if (node.kind == "object" && node.type == "raw") {
            if (node.value && node.value.startsWith("<>")) {
                if (node.value == LaTeXTableOptions.tagname) {
                    this.tableOptions = LaTeXTableOptions.ref().deserialize(JSON.parse(node.attributes!.get("value")!))
                    return
                }

                return
            }

            const block = node.attributes?.get("pragma-block") != null
            const star = node.attributes?.get("pragma-star") != null
            const gapStart = node.attributes?.get("pragma-spc") != null
            const gapEnd = node.attributes?.get("pragma-spc0") != null
            const gapBoth = node.attributes?.get("pragma-spc1") != null

            if (gapBoth || gapStart) {
                this.result.push(" ")
            }

            let name = node.value
            if (star) {
                name = name + "*"
            }

            if (block) {
                this.result.push(`\\begin{${name}}`)
            } else {
                this.result.push("\\" + name)
            }

            const attributes = node.attributes == null ? null : [...node.attributes].filter(([key, value]) => !key.startsWith("pragma-"))
            if (attributes && attributes.length > 0) {
                this.result.push(`[${attributes.map(([key, value]) => value == "" ? key : `${key}=${value}`).join(", ")}]`)
            }

            if (node.content.length > 0) {
                if (!block) this.result.push("{")
                this.exportNodeContent(node)
                if (!block) this.result.push("}")
            }

            if (block) {
                this.result.push(`\\end{${name}}`)
            }

            if (gapBoth || gapEnd) {
                this.result.push(" ")
            }

            return
        }

        if (node.kind == "table") {
            if (node.content.length == 0) return
            const sampleRow = node.content[0]
            if (sampleRow.kind != "table-row") return
            const columns = sampleRow.content

            const { compact, widths, types, naked, long } = this.tableOptions
            let remainingWidth = 1
            if (!compact) {
                for (const width of widths) {
                    remainingWidth -= width
                }
            }

            let flexibleRowCount = widths.map(v => v == 0 ? 1 : 0).reduce(Reducers.sum(), 0)
            if (widths.length < columns.length) {
                flexibleRowCount += columns.length - widths.length
            }

            const tableType = long ? "longtable" : "tabular"

            this.result.push(`\\begin{${tableType}}{ ${naked ? "" : "|"}${[...range(columns.length)].map((_, i) => {
                let type = i < types.length ? types[i] : "p"
                if (!compact) {
                    const width = i < widths.length ? widths[i] : remainingWidth / flexibleRowCount
                    type += `{\\dimexpr ${width}\\textwidth -2\\tabcolsep}`
                }
                return type + (naked ? "" : "|")
            }).join("")}}\n`)
            if (!naked) this.result.push("\\hline\n")

            for (let i = 0; i < node.content.length; i++) {
                const row = node.content[i]
                if (row.kind != "table-row") unreachable()

                for (let i = 0; i < row.content.length; i++) {
                    const column = row.content[i]

                    this.exportNode(column)

                    const last = i == row.content.length - 1
                    if (!last) this.result.push(" & ")
                }

                const last = i == node.content.length - 1
                if (!naked || !last) {
                    this.result.push("\\\\\n")
                }
                if (!naked) this.result.push("\\hline\n")
            }

            this.result.push(`\\end{${tableType}}`)
            return
        }

        this.result.push(`!?!${node.kind}`)
    }

    public exportDocument(root: SyntaxNode) {
        this.exportNode(root)
        return this.result.join("")
    }
}
