import { NOOP } from "../comTypes/const"
import { escapeHTML, joinIterable, unreachable } from "../comTypes/util"
import { SyntaxNode } from "./SyntaxNode"

function _toPx(v: number) {
    if (v == 0) return v + ""
    return v + "px"
}

export abstract class MmlRenderer {
    protected _renderContent(nodes: SyntaxNode[]) {
        return nodes.map((node) => this._renderNode(node))
    }

    protected _normalizeAttributes(node: SyntaxNode.NodeWithFormat, attributes: Map<string, string> | null = null) {
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
                attributes.set("style", (attributes.get("style") ?? "") + `;color:${node.color}`)
            } else {
                const existingClass = attributes.get("class")
                attributes.set("class", existingClass ? existingClass + " " + node.color : node.color)
            }
        }

        for (const [type, prop, format] of [
            ["align", "text-align", NOOP],
            ["width", "width", _toPx],
            ["height", "height", _toPx],
        ] as [keyof SyntaxNode.NodeWithFormat, string, (v: any) => any][]) {
            if (node[type] != null) {
                attributes ??= new Map()
                attributes.set("style", (attributes.get("style") ?? "") + `;${prop}:${format(node[type])}`)
            }
        }

        return attributes
    }

    protected abstract _renderAttributes(attributes?: Map<string, string> | null): string

    protected abstract _renderText(node: string): string

    protected abstract _renderElement(element: string, attributes: Map<string, string> | null, content: SyntaxNode[]): string

    protected abstract _renderElementRaw(element: string, attributes: Map<string, string> | null, content: any): string

    protected _renderSpan(node: SyntaxNode.Span) {
        const element = node.modifier == "bold" ? (
            "strong"
        ) : node.modifier == "italics" ? (
            "em"
        ) : node.modifier == "code" ? (
            "code"
        ) : "span"

        return this._renderElement(element, this._normalizeAttributes(node), node.content)
    }

    protected _renderObject(node: SyntaxNode.Object) {
        const element = node.media ? "img" : "a"

        let attrs: Map<string, string> | null = null
        if (node.url != null) {
            if (node.media) {
                attrs = new Map()
                attrs.set("src", node.url)
            } else {
                attrs = new Map()
                attrs.set("href", node.url)
            }
        }

        return this._renderElement(element, this._normalizeAttributes(node, attrs), node.content)
    }

    protected _renderSegment(node: SyntaxNode.Segment) {
        const format = this._normalizeAttributes(node)
        if (format != null || node.type != null) {
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

            return this._renderElement(element, format, node.content)
        } else {
            return this._renderElement("", null, node.content)
        }
    }

    protected _renderCodeBlock(node: SyntaxNode.CodeBlock) {
        return this._renderElementRaw("pre", null, this._renderElementRaw("code", node.lang != null ? new Map([["class", "language-" + node.lang]]) : null, this._renderText(node.content)))
    }

    protected _renderNode(node: SyntaxNode): string {
        if (node.kind == "text") {
            return this._renderText(node.value)
        } else if (node.kind == "span") {
            return this._renderSpan(node)
        } else if (node.kind == "object") {
            return this._renderObject(node)
        } else if (node.kind == "segment") {
            return this._renderSegment(node)
        } else if (node.kind == "code-block") {
            return this._renderCodeBlock(node)
        } else unreachable()
    }


    public render(node: SyntaxNode) {
        return this._renderNode(node)
    }
}

export class MmlHtmlRenderer extends MmlRenderer {
    protected override _renderAttributes(attributes: Map<string, string> | null = null) {
        return attributes == null || attributes.size == 0 ? "" : " " + [...attributes].map(v => `${v[0]}="${v[1]}"`).join(" ")
    }

    protected override _renderText(text: string) {
        return " " + escapeHTML(text).replace(/\n/g, "<br>")
    }

    protected override _renderElement(element: string, attributes: Map<string, string> | null, content: SyntaxNode[]): any {
        if (element == "") return this._renderContent(content).join("")
        return ` <${element}${this._renderAttributes(attributes)}>${this._renderContent(content).join("")}</${element}>`
    }

    protected override _renderElementRaw(element: string, attributes: Map<string, string> | null, content: any) {
        return ` <${element}${this._renderAttributes(attributes)}>${content}</${element}>`
    }
}
