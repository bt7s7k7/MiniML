import { escapeHTML, unreachable } from "../comTypes/util"
import { SyntaxNode } from "./SyntaxNode"

function _renderContent(nodes: SyntaxNode[]) {
    return nodes.map(renderMmlToHtml).join("")
}

function _renderFormat(node: SyntaxNode.Format) {
    return node.color == null ? "" : node.color.startsWith("#") ? ` style="color:${node.color}"` : ` class="text-${node.color}"`
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
    } else if (node.kind == "text-block") {
        return ` <p>${_renderContent(node.content)}</p>`
    } else if (node.kind == "segment") {
        const format = _renderFormat(node)
        if (format != "") {
            return ` <span${_renderFormat(node)}>${_renderContent(node.content)}</span>`
        } else {
            return _renderContent(node.content)
        }
    } else unreachable()
}
