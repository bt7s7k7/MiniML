import { partitionSequence, shallowClone, unreachable } from "../comTypes/util"
import { SyntaxNode } from "../miniML/SyntaxNode"

const _PROPERTY_ATTRIBUTE = "_prop"

function _cloneObjectWithoutAttribute(object: SyntaxNode.Object, attribute: string) {
    const objectWithout = shallowClone(object)

    objectWithout.attributes = object.attributes!
    objectWithout.attributes.delete(attribute)

    if (objectWithout.attributes.size == 0) {
        objectWithout.attributes = null
    }

    return objectWithout
}

export class TypstExporter {
    public result: string[] = []
    public indent = 0
    public skipNextIndent = true
    public listTypes: ("ordered" | "unordered")[] = []
    public scriptActive: boolean[] = []

    public getListType() {
        return this.listTypes.at(-1) ?? "unordered"
    }

    public isScriptActive() {
        return this.scriptActive.at(-1) ?? false
    }

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
            if (typeof node.type == "number") {
                this.emitIndent()
                this.result.push("=".repeat(node.type) + " ")
                this.skipNextIndent = true
                this.exportNodeContent(node)
                this.result.push("\n\n")
                return
            }

            if (node.type == "p") {
                this.emitIndent()
                this.exportNodeContent(node)

                if (this.listTypes.length == 0) {
                    this.result.push("\n\n")
                }

                return
            }

            if (node.type == "ul") {
                this.indent++
                this.listTypes.push("unordered")
                this.exportNodeContent(node)
                this.listTypes.pop()
                this.indent--
                return
            }

            if (node.type == "ol") {
                this.indent++
                this.listTypes.push("ordered")
                this.exportNodeContent(node)
                this.listTypes.pop()
                this.indent--
                return
            }

            if (node.type == "li") {
                this.emitIndent()
                this.result.push(this.getListType() == "ordered" ? "+ " : "- ")
                this.exportNodeContent(node)
                this.result.push("\n")
                return
            }

            this.exportNodeContent(node)
            return
        }

        if (node.kind == "text") {
            this.result.push(node.value
                .replace(/([*_$@`#])/, "\\$1"),
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
                return
            }

            if (node.modifier == "bold") {
                this.result.push("*")
                this.exportNodeContent(node)
                this.result.push("*")
                return
            }

            if (node.modifier == "italics") {
                this.result.push("_")
                this.exportNodeContent(node)
                this.result.push("_")
                return
            }

            this.exportNodeContent(node)
            return
        }

        if (node.kind == "object" && node.type == "link") {
            if (node.value != null) {
                this.result.push("@" + node.value)
            } else {
                const id = node.attributes?.get("id")
                if (id != null) {
                    this.result.push("<" + id + ">")
                }
            }

            if (node.content.length > 0) {
                this.result.push("[")
                this.exportNodeContent(node)
                this.result.push("]")
            }

            return
        }

        if (node.kind == "table") {
            if (node.content.length == 0) return
            const sampleRow = node.content[0]
            if (sampleRow.kind != "table-row") return
            const columns = sampleRow.content

            this.result.push("#pillar.table(\n")
            this.indent++
            this.emitIndent()
            this.result.push(`cols: "|${"l|".repeat(columns.length)}",\n`)

            this.emitIndent()
            this.result.push("table.hline(),\n")

            for (let i = 0; i < node.content.length; i++) {
                const row = node.content[i]
                if (row.kind != "table-row") unreachable()

                this.emitIndent()

                for (let i = 0; i < row.content.length; i++) {
                    const column = row.content[i]

                    this.result.push("[")
                    this.skipNextIndent = true
                    this.exportNode(column)
                    this.result.push("],")
                }

                this.result.push("\n")
                this.emitIndent()
                this.result.push("table.hline(),\n")
            }

            this.indent--
            this.emitIndent()
            this.result.push(")")
            return
        }

        if (node.kind == "object" && node.type == "raw") {
            if (node.value == "cite") {
                this.result.push("@")
                this.exportNodeContent(node)
                return
            }

            const isScriptActive = this.isScriptActive()
            if (!isScriptActive) {
                this.result.push("#")
                this.scriptActive.push(true)
            }

            if (node.value != null) {
                this.result.push(node.value)
            }

            const [content, propertyNodes] = partitionSequence(node.content, v => (
                v.kind == "object" && v.type == "raw"
                && v.attributes?.has(_PROPERTY_ATTRIBUTE) != null
            ))

            let printContentToPositionalArgument = false

            if (node.attributes || propertyNodes.length > 0) {
                this.result.push("(")


                let first = true

                if (node.attributes) {
                    for (const [key, value] of node.attributes) {
                        if (key == "_pos") {
                            printContentToPositionalArgument = true
                            continue
                        }

                        if (first) {
                            first = false
                        } else {
                            this.result.push(", ")
                        }

                        let name = key
                        let encodedValue = value
                        if (name.endsWith(":")) {
                            name = name.slice(0, -1)
                        } else {
                            encodedValue = JSON.stringify(value)
                        }

                        if (name == "value") {
                            this.result.push(encodedValue)
                        } else {
                            this.result.push(`${name}: ${encodedValue}`)
                        }
                    }
                }

                for (const property of propertyNodes) {
                    if (property.kind != "object" || property.type != "raw") unreachable()

                    if (first) {
                        first = false
                    } else {
                        this.result.push(", ")
                    }

                    const key = property.attributes!.get(_PROPERTY_ATTRIBUTE)!
                    if (key == "main") {
                        this.exportNode(_cloneObjectWithoutAttribute(property, _PROPERTY_ATTRIBUTE))
                    } else if (key == "") {
                        this.result.push(property.value + ": ")
                        this.result.push("[")
                        this.scriptActive.push(false)
                        this.exportNodeContent(property)
                        this.scriptActive.pop()
                        this.result.push("]")
                    } else {
                        this.result.push(key + ": ")
                        this.exportNode(_cloneObjectWithoutAttribute(property, _PROPERTY_ATTRIBUTE))
                    }
                }

                if (printContentToPositionalArgument) {
                    if (!first) {
                        this.result.push(", ")
                    }

                    this.result.push("[")
                    this.scriptActive.push(false)

                    for (const child of content) {
                        this.exportNode(child)
                    }

                    this.scriptActive.pop()
                    this.result.push("]")
                }

                this.result.push(")")
            }

            if (!printContentToPositionalArgument) {
                this.result.push("[")
                this.scriptActive.push(false)

                for (const child of content) {
                    this.exportNode(child)
                }

                this.scriptActive.pop()
                this.result.push("]")
            }


            if (!isScriptActive) {
                this.scriptActive.pop()
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
