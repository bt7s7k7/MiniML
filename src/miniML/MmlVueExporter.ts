import { ensureKey, isUpperCase } from "../comTypes/util"
import { Struct } from "../struct/Struct"
import { Type } from "../struct/Type"
import { MmlRenderer } from "./MmlHtmlRenderer"
import { MmlParser } from "./MmlParser"
import { MmlWidget } from "./MmlWidget"
import { SyntaxNode } from "./SyntaxNode"

export class MmlVueExporter extends MmlRenderer {
    public readonly allowedComponents = new Set<string>()
    public readonly usedComponents = new Set<string>()
    public allowProperties = false

    protected _manifest: MmlVueExporter.PropertyManifest | null = null
    public get manifest() { return this._manifest ??= new MmlVueExporter.PropertyManifest() }

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

    protected override _renderRaw(node: string): string {
        return JSON.stringify(node)
    }

    protected override _renderElement(element: string, attributes: Map<string, string> | null, content: SyntaxNode[]): string {
        if (element == "") return content.length == 0 ? "[]" : content.length == 1 ? this._renderNode(content[0]) : "[" + this._renderContent(content).join(", ") + "]"

        if (element == "<>vue-prop") {
            if (!this.allowProperties) {
                return JSON.stringify("Usage of Vue properties is disabled")
            }

            const name = attributes?.get("name")
            if (name == undefined) {
                return JSON.stringify("Vue property name not provided")
            }

            const renderer = attributes?.get("use")

            this.manifest.ensureProperty(name)

            const contentString = `[${this._renderContent(content).join(", ")}]`
            if (renderer != undefined) {
                this.manifest.renderers.add(renderer)
                return `props.${name} ? ${renderer}(props.${name}) : ${contentString}`
            } else {
                return `props.${name} ? props.${name} : ${contentString}`
            }
        }

        if (element == "<>vue-decl") {
            if (!this.allowProperties) {
                return JSON.stringify("Usage of Vue properties is disabled")
            }

            const name = attributes?.get("name")
            if (name == undefined) {
                return JSON.stringify("Vue property name not provided")
            }

            const required = attributes?.get("required")

            const property = this.manifest.ensureProperty(name)
            if (required) {
                property.required = true
            }

            if (content.length > 0) {
                property.default = `() => [${this._renderContent(content).join(", ")}]`
            }

            return "[]"
        }

        const isComponent = this.allowedComponents.has(element)
        if (isUpperCase(element, 0) || isComponent) {
            if (isComponent) {
                this.usedComponents.add(element)
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

        const isComponent = this.allowedComponents.has(element)
        if (isUpperCase(element, 0) || isComponent) {
            if (isComponent) {
                this.usedComponents.add(element)
                return `h(${element}, ${this._renderAttributes(attributes)}, () => ${content})`
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
        const content = this.renderContent(node)
        if (this.usedComponents.size > 0) {
            env.push(...this.usedComponents)
        }
        return `(({${[...env].join(", ")}}) => ${content})`
    }

    public renderContent(node: SyntaxNode) {
        return `() => ${this._renderNode(node)}`
    }
}

export namespace MmlVueExporter {
    export class PropertyWidget extends Struct.define("Prop", {
        name: Type.string,
        use: Type.string.as(Type.nullable)
    }, MmlWidget) {
        public override getValue(parser: MmlParser, content: SyntaxNode[]): SyntaxNode.Inline | null {
            const attributes = new Map([
                ["name", this.name],
            ])

            if (this.use) {
                attributes.set("use", this.use)
            }

            return new SyntaxNode.Object({
                type: "raw", value: "<>vue-prop", content, attributes,
            })
        }
    }

    export class PropertyDeclarationWidget extends Struct.define("Declare", {
        name: Type.string,
        required: Type.boolean.as(Type.nullable)
    }, MmlWidget) {
        public override getValue(parser: MmlParser, content: SyntaxNode[]): SyntaxNode.Inline | null {
            const attributes = new Map([
                ["name", this.name],
            ])

            if (this.required) {
                attributes.set("required", "")
            }

            return new SyntaxNode.Object({
                type: "raw", value: "<>vue-decl", content, attributes,
            })
        }
    }

    export class PropertyManifest {
        public readonly properties = new Map<string, { required: boolean, default: string | null }>()
        public readonly renderers = new Set<string>()

        public ensureProperty(name: string) {
            return ensureKey(this.properties, name, () => ({ default: null, required: false }))
        }
    }
}
