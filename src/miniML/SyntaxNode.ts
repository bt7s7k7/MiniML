import { Values } from "../comTypes/types"
import { Struct } from "../struct/Struct"
import { Deserializer, Type } from "../struct/Type"

export const COLOR_NAMES = [
    "white", "black", "primary", "secondary", "success", "danger", "warning"
] as const

export class _ColorModifierType extends Type.EnumType<typeof COLOR_NAMES[number] | `#${string}`> {
    protected _deserialize(handle: any, deserializer: Deserializer): "white" | "black" | "primary" | "secondary" | "success" | "danger" | "warning" | `#${string}` {
        const deserializedValue = deserializer.parsePrimitive(handle) as string

        if (deserializedValue.startsWith("#") && deserializedValue.length == 7) {
            return deserializedValue as `#${string}`
        }

        return super._deserialize(handle, deserializer)
    }

    constructor() {
        super(COLOR_NAMES)
    }
}

export const ColorModifier_t = new _ColorModifierType()

const _SyntaxNode_t = new Struct.PolymorphicSerializer("SyntaxNode")
export const SyntaxNode_t = _SyntaxNode_t.base as Type<SyntaxNode>

const _FORMAT_PROPS = {
    modifier: Type.enum("bold", "italics", "code").as(Type.nullable),
    color: ColorModifier_t.as(Type.nullable),
    classList: Type.string.as(Type.array).as(Type.nullable),
    attributes: Type.string.as(Type.map).as(Type.nullable),
}


export namespace SyntaxNode {
    export type Format = Type.ResolveObjectType<typeof _FORMAT_PROPS>

    export class Text extends Struct.define("Text", {
        value: Type.string
    }) {
        public readonly kind = "text"
    }

    export class Span extends Struct.define("Span", {
        ..._FORMAT_PROPS,
        content: _SyntaxNode_t.base.as(Type.array)
    }) {
        public readonly kind = "span"
        declare public content: SyntaxNode[]
    }

    export class Object extends Struct.define("Object", {
        ..._FORMAT_PROPS,
        content: _SyntaxNode_t.base.as(Type.array),
        url: Type.string.as(Type.nullable),
        media: Type.boolean.as(Type.nullable)
    }) {
        public readonly kind = "object"
        declare public content: SyntaxNode[]
    }

    export type Inline = Span | Object

    export class Segment extends Struct.define("Segment", {
        ..._FORMAT_PROPS,
        type: Type.enum("p", 1, 2, 3, 4, "ul", "ol", "li", "quote").as(Type.nullable),
        content: _SyntaxNode_t.base.as(Type.array)
    }) {
        public readonly kind = "segment"
        declare public content: SyntaxNode[]
    }

    export type SegmentType = Segment["type"]
}

for (const element of Object.values(SyntaxNode)) {
    _SyntaxNode_t.register(element)
}

export type SyntaxNode = InstanceType<Values<typeof SyntaxNode>>
