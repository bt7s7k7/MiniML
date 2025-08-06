import { SyntaxNode } from "./SyntaxNode"

export class MmlMarkdownRenderer {
    public result: string[] = []
    public indent: string[] = []
    public ordered: boolean[] = []
    public skipNextIndent = true

    public emitIndent() {
        if (this.skipNextIndent) {
            this.skipNextIndent = false
            return
        }

        let indent = this.indent.join("")
        this.result.push(indent)
    }

    public pushIndent() {
        this.indent.push("  ")
    }

    public popIndent() {
        this.indent.pop()
    }

    public exportNodeContent(node: SyntaxNode.NodeWithChildren) {
        for (const child of node.content) {
            this.exportNode(child)
        }
    }

    public emitBlockElement(node: SyntaxNode.NodeWithChildren, { delim = null as string | null, indent = true as true | string } = {}) {
        this.emitIndent()
        if (delim != null) this.result.push(delim)
        this.result.push("\n")

        if (indent === true) {
            this.pushIndent()
        } else {
            this.indent.push(indent)
        }

        this.exportNodeContent(node)

        this.popIndent()

        this.emitIndent()
        if (delim != null) this.result.push(delim)
        this.result.push("\n")
    }

    public exportNode(node: SyntaxNode) {
        if (node.kind == "segment") {
            if (typeof node.type == "number") {
                this.emitIndent()
                this.result.push("#".repeat(node.type) + " ")
                this.skipNextIndent = true
                this.exportNodeContent(node)
                this.result.push("\n\n")
                return
            }

            if (node.type == "p") {
                this.emitIndent()
                this.exportNodeContent(node)
                if (this.ordered.length == 0) {
                    this.result.push("\n\n")
                }
                return
            }

            if (node.type == "ul") {
                this.ordered.push(false)
                this.emitBlockElement(node)
                this.ordered.pop()
                return
            }

            if (node.type == "quote") {
                this.emitBlockElement(node, { indent: "> " })
                return
            }

            if (node.type == "ol") {
                this.ordered.push(true)
                this.emitBlockElement(node)
                this.ordered.pop()
                return
            }

            if (node.type == "li") {
                this.emitIndent()
                if (this.ordered.at(-1)) {
                    this.result.push("1. ")
                } else {
                    this.result.push("- ")
                }
                this.exportNodeContent(node)
                this.result.push("\n")
                return
            }

            this.exportNodeContent(node)
            return
        }

        if (node.kind == "text") {
            this.result.push(node.value
                .replace(/\\/g, "\\\\")
                .replace(/\n/g, "\\\n")
            )
            return
        }

        if (node.kind == "raw") {
            this.result.push(node.value)
            return
        }

        if (node.kind == "span") {
            if (node.modifier == "code") {
                this.result.push("`")
                this.exportNodeContent(node)
                this.result.push("`")
                this.fixEndingToken()
                return
            }

            if (node.modifier == "bold") {
                this.result.push("**")
                this.exportNodeContent(node)
                this.result.push("**")
                this.fixEndingToken()
                return
            }

            if (node.modifier == "italics") {
                this.result.push("*")
                this.exportNodeContent(node)
                this.result.push("*")
                this.fixEndingToken()
                return
            }

            this.exportNodeContent(node)
            return
        }

        if (node.kind == "object" && node.type == "raw") {
            if (node.value && node.value.startsWith("<>")) {
                return
            }

            let name = node.value ?? "null"
            this.emitHtmlElement(node, name)

            return
        }

        if (node.kind == "table") {
            this.emitHtmlElement(node, "table")
            return
        }

        if (node.kind == "table-row") {
            this.emitHtmlElementStart(node, "tr")
            for (const column of node.content) {
                this.emitHtmlElement(new SyntaxNode.Segment({ content: [column] }), "td")
            }
            this.emitHtmlElementEnd(node, "tr")
            return
        }

        if (node.kind == "code-block") {
            this.emitIndent()
            this.result.push("```\n")
            this.result.push(node.content)
            this.emitIndent()
            this.result.push("```\n")
            return
        }

        this.result.push(`!?!${node.kind}`)
    }

    public fixEndingToken() {
        const index = this.result.length - 1
        const token = this.result[index]
        const ending = this.result[index - 1]
        const fixedEnding = ending.trimEnd()
        const spaces = ending.slice(fixedEnding.length)

        this.result[index - 1] = fixedEnding
        this.result[index] = token + spaces
    }

    public emitHtmlElement(node: SyntaxNode.NodeWithChildren, name: string) {
        this.emitHtmlElementStart(node, name)

        if (node.content.length > 0) {
            this.exportNodeContent(node)
        }

        this.emitHtmlElementEnd(node, name)
    }
    public emitHtmlElementStart(node: SyntaxNode.NodeWithChildren, name: string) {
        this.emitIndent()
        this.result.push(`<${name}`)

        if (node.attributes) {
            for (const [name, value] of node.attributes) {
                if (value == "") {
                    this.result.push(` ${name}`)
                } else {
                    this.result.push(` ${name}=${JSON.stringify(value)}`)
                }
            }
        }

        this.result.push(">\n")
    }

    public emitHtmlElementEnd(node: SyntaxNode.NodeWithChildren, name: string) {
        this.emitIndent()
        this.result.push(`</${name}>\n`)
    }


    public render(root: SyntaxNode) {
        this.exportNode(root)
        return this.result.join("")
    }
}
