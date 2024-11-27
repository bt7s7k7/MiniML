import { SyntaxNode } from "../miniML/SyntaxNode"

export class LaTeXExporter {
    public result: string[] = []
    public indent = 0
    public skipNextIndent = true

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
                this.emitIndent()
                this.result.push("\\begin{itemize}\n")
                this.indent++
                this.exportNodeContent(node)
                this.indent--
                this.emitIndent()
                this.result.push("\\end{itemize}\n")
                return
            }

            if (node.type == "quote") {
                this.emitIndent()
                this.result.push("\\begin{quote}\n")
                this.indent++
                this.exportNodeContent(node)
                this.indent--
                this.emitIndent()
                this.result.push("\\end{quote}\n")
                return
            }

            if (node.type == "ol") {
                this.emitIndent()
                this.result.push("\\begin{enumerate}\n")
                this.indent++
                this.exportNodeContent(node)
                this.indent--
                this.emitIndent()
                this.result.push("\\end{enumerate}\n")
                return
            }

            if (node.type == "li") {
                this.emitIndent()
                this.result.push("\\item ")
                this.skipNextIndent = true
                this.exportNodeContent(node)
                return
            }

            this.exportNodeContent(node)
            return
        }

        if (node.kind == "text") {
            this.result.push(node.value.replace(/\\/g, "\\textbackslash"))
            return
        }

        if (node.kind == "span") {
            if (node.modifier == "code") {
                this.result.push("\\texttt{")
                this.exportNodeContent(node)
                this.result.push("}")
                return
            }

            this.exportNodeContent(node)
            return
        }

        if (node.kind == "object" && node.type == "raw") {
            const block = node.attributes?.get("pragma-block") != null
            if (block) {
                this.result.push(`\\begin{${node.value}}`)
            } else {
                this.result.push("\\" + node.value)
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
                this.result.push(`\\end{${node.value}}`)
            }
            return
        }

        this.result.push(`!?!${node.kind}`)
    }

    public exportDocument(root: SyntaxNode) {
        this.exportNode(root)
        return this.result.join("")
    }
}
