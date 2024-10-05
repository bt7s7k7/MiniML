import { escapeHTML, joinIterable, unreachable } from "../comTypes/util"
import { SyntaxNode } from "./SyntaxNode"

export class MmlHtmlRenderer {
    protected _renderContent(nodes: SyntaxNode[]) {
        return nodes.map((node) => this.render(node)).join("")
    }

    protected _renderFormat(node: SyntaxNode.Format, attributes: Map<string, string> | null = null) {
        if (node.attributes) {
            if (attributes != null) {
                attributes = new Map(joinIterable(node.attributes, attributes))
            } else {
                attributes = node.attributes
            }
        }

        if (node.classList != null) {
            if (attributes != null && node.attributes == attributes) {
                // If we are using the node's attribute map, we have to make a copy, since we are going to modify it.
                attributes = new Map(attributes)
            }

            attributes ??= new Map()
            const existingClass = attributes.get("class")
            attributes.set("class", existingClass ? existingClass + " " + node.classList.join(" ") : node.classList.join(" "))
        }

        if (node.color != null) {
            if (attributes != null && node.attributes == attributes) {
                // If we are using the node's attribute map, we have to make a copy, since we are going to modify it.
                attributes = new Map(attributes)
            }

            attributes ??= new Map()
            if (node.color.startsWith("#")) {
                attributes.set("style", `color:${node.color}`)
            } else {
                const existingClass = attributes.get("class")
                attributes.set("class", existingClass ? existingClass + " " + node.color : node.color)
            }
        }

        return attributes == null || attributes.size == 0 ? "" : " " + [...attributes].map(v => `${v[0]}="${v[1]}"`).join(" ")
    }

    protected _renderText(node: SyntaxNode.Text) {
        return " " + escapeHTML(node.value).replace(/\n/g, "<br>")
    }

    protected _renderSpan(node: SyntaxNode.Span) {
        const element = node.modifier == "bold" ? (
            "strong"
        ) : node.modifier == "italics" ? (
            "em"
        ) : node.modifier == "code" ? (
            "code"
        ) : "span"

        return ` <${element}${this._renderFormat(node)}>${this._renderContent(node.content)}</${element}>`
    }

    protected _renderObject(node: SyntaxNode.Object) {
        const element = node.media ? "img" : "a"
        const attr = node.media ? "src" : "href"

        return ` <${element}${this._renderFormat(node, new Map([[attr, node.url!]]))}>${this._renderContent(node.content)}</${element}>`
    }

    protected _renderSegment(node: SyntaxNode.Segment) {
        const format = this._renderFormat(node)
        if (format != "" || node.type != null) {
            const element = node.type == "ol" ? (
                "ol"
            ) : node.type == "ul" ? (
                "ul"
            ) : node.type == "li" ? (
                "li"
            ) : node.type == "quote" ? (
                "blockquote"
            ) : node.type == "p" ? (
                "p"
            ) : node.type == 4 ? (
                "h4"
            ) : node.type == 3 ? (
                "h3"
            ) : node.type == 2 ? (
                "h2"
            ) : node.type == 1 ? (
                "h1"
            ) : unreachable()

            return ` <${element}${this._renderFormat(node)}>${this._renderContent(node.content)}</${element}>`
        } else {
            return this._renderContent(node.content)
        }
    }

    public render(node: SyntaxNode): string {
        if (node.kind == "text") {
            return this._renderText(node)
        } else if (node.kind == "span") {
            return this._renderSpan(node)
        } else if (node.kind == "object") {
            return this._renderObject(node)
        } else if (node.kind == "segment") {
            return this._renderSegment(node)
        } else unreachable()
    }
}
