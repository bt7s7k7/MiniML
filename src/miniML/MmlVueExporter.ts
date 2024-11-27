import { isUpperCase } from "../comTypes/util"
import { MmlRenderer } from "./MmlHtmlRenderer"
import { SyntaxNode } from "./SyntaxNode"

export class MmlVueExporter extends MmlRenderer {
    public readonly allowedComponents = new Set<string>()

    public addAllowedComponent(...names: string[]) {
        for (const name of names) {
            this.allowedComponents.add(name)
        }

        return this
    }

    protected override _renderAttributes(attributes?: Map<string, string> | null): string {
        return attributes == null ? "{}" : JSON.stringify(Object.fromEntries(attributes))
    }

    protected override _renderText(node: string): string {
        return JSON.stringify(node)
    }

    protected override _renderElement(element: string, attributes: Map<string, string> | null, content: SyntaxNode[]): string {
        if (element == "") return content.length == 0 ? "[]" : content.length == 1 ? this._renderNode(content[0]) : "[" + this._renderContent(content).join(", ") + "]"

        if (isUpperCase(element, 0)) {
            if (this.allowedComponents.has(element)) {
                const contentString = content.length == 0 ? "null" : content.length == 1 ? this._renderNode(content[0]) : this._renderContent(content).join(", ")
                return `h(${element}, ${this._renderAttributes(attributes)}, () => ${contentString})`
            } else {
                element = "span"
            }
        }

        const contentString = content.length == 0 ? "" : ", " + this._renderContent(content).join(", ")
        return `h(${JSON.stringify(element)}, ${this._renderAttributes(attributes)}${contentString})`
    }

    protected override _renderElementRaw(element: string, attributes: Map<string, string> | null, content: any): string {
        if (element == "") return content

        if (isUpperCase(element, 0)) {
            if (this.allowedComponents.has(element)) {
                return `h(${element}, ${this._renderAttributes(attributes)}, ${content})`
            } else {
                element = "span"
            }
        }

        return `h(${JSON.stringify(element)}, ${this._renderAttributes(attributes)}, ${content})`
    }

    protected override _renderObject(node: SyntaxNode.Object): string {
        if (!node.type && node.value != null) {
            const isRelative = !node.value.match(/^[a-z]+:\/\//)
            if (isRelative) {
                return this._renderElement("RouterLink", this._normalizeAttributes(node, new Map([["to", node.value]])), node.content)
            }
        }
        return super._renderObject(node)
    }

    public override render(node: SyntaxNode): string {
        const env = ["h"]
        if (this.allowedComponents.size > 0) {
            env.push(...this.allowedComponents)
        }
        return `(({${[...env].join(", ")}}) => () => ${this._renderNode(node)})`
    }
}
