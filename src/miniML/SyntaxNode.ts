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

    export class TextBlock extends Struct.define("TextBlock", {
        content: _SyntaxNode_t.base.as(Type.array)
    }) {
        public readonly kind = "text-block"
        declare public content: SyntaxNode[]
    }

    export class Segment extends Struct.define("Segment", {
        ..._FORMAT_PROPS,
        content: _SyntaxNode_t.base.as(Type.array)
    }) {
        public readonly kind = "segment"
        declare public content: SyntaxNode[]
    }
}

for (const element of Object.values(SyntaxNode)) {
    _SyntaxNode_t.register(element)
}

export type SyntaxNode = InstanceType<Values<typeof SyntaxNode>>
