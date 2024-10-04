import { escapeHTML, joinIterable, unreachable } from "../comTypes/util"
import { SyntaxNode } from "./SyntaxNode"

function _renderContent(nodes: SyntaxNode[]) {
    return nodes.map(renderMmlToHtml).join("")
}

function _renderFormat(node: SyntaxNode.Format, attributes: Map<string, string> | null = null) {
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

export function renderMmlToHtml(node: SyntaxNode): string {
    if (node.kind == "text") {
        return " " + escapeHTML(node.value)
    } else if (node.kind == "span") {
        const element = node.modifier == "bold" ? (
            "strong"
        ) : node.modifier == "italics" ? (
            "em"
        ) : node.modifier == "code" ? (
            "code"
        ) : "span"

        return ` <${element}${_renderFormat(node)}>${_renderContent(node.content)}</${element}>`
    } else if (node.kind == "object") {
        const element = node.media ? "img" : "a"
        const attr = node.media ? "src" : "href"

        return ` <${element}${_renderFormat(node, new Map([[attr, node.url!]]))}>${_renderContent(node.content)}</${element}>`
    } else if (node.kind == "text-block") {
        const element = node.heading == 4 ? (
            "h4"
        ) : node.heading == 3 ? (
            "h3"
        ) : node.heading == 2 ? (
            "h2"
        ) : node.heading == 1 ? (
            "h1"
        ) : "p"

        return ` <${element}>${_renderContent(node.content)}</${element}>`
    } else if (node.kind == "segment") {
        const format = _renderFormat(node)
        if (format != "") {
            return ` <span${_renderFormat(node)}>${_renderContent(node.content)}</span>`
        } else {
            return _renderContent(node.content)
        }
    } else unreachable()
}
