import { FilterBy, Values } from "../comTypes/types"
import { LogMarker } from "../prettyPrint/ObjectDescription"
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
    modifier: Type.enum("bold", "italics", "code").as(Type.nullable, { skipNullSerialize: true }),
    color: ColorModifier_t.as(Type.nullable, { skipNullSerialize: true }),
    classList: Type.string.as(Type.array).as(Type.nullable, { skipNullSerialize: true }),
    attributes: Type.string.as(Type.map).as(Type.nullable, { skipNullSerialize: true }),
    align: Type.enum("left", "center", "right").as(Type.nullable, { skipNullSerialize: true }),
    width: Type.number.as(Type.nullable, { skipNullSerialize: true }),
    height: Type.number.as(Type.nullable, { skipNullSerialize: true }),
}

export abstract class AbstractSyntaxNode {
    protected _metadata: Map<string, any> | null = null

    public setMetadata<T>(name: SyntaxNode.Metadata<T>, value: T) {
        (this._metadata ??= new Map()).set(name, value)
    }

    public getMetadata<T>(name: SyntaxNode.Metadata<T>): T | null {
        if (this._metadata == null) return null
        return this._metadata.get(name) ?? null
    }

    public static get [LogMarker.CUSTOM_NAME]() {
        return (this as any as Struct.StructStatics).baseType.name
    }
}

export namespace SyntaxNode {
    declare const _METADATA: unique symbol
    export type Metadata<T> = string & { [_METADATA]: T }

    export type NodeWithFormat = Type.ResolveObjectType<typeof _FORMAT_PROPS>

    export class Text extends Struct.define("Text", {
        value: Type.string
    }, AbstractSyntaxNode) {
        public readonly kind = "text"
    }

    export class Newline extends Struct.define("Newline", {}, AbstractSyntaxNode) {
        public readonly kind = "newline"
    }

    export class Raw extends Struct.define("Raw", {
        value: Type.string
    }, AbstractSyntaxNode) {
        public readonly kind = "raw"
    }

    export class Span extends Struct.define("Span", {
        ..._FORMAT_PROPS,
        content: _SyntaxNode_t.base.as(Type.array)
    }, AbstractSyntaxNode) {
        public readonly kind = "span"
        declare public content: SyntaxNode[]
    }

    export class CodeBlock extends Struct.define("CodeBlock", {
        lang: Type.string.as(Type.nullable),
        content: Type.string
    }, AbstractSyntaxNode) {
        public readonly kind = "code-block"
    }

    export class Object extends Struct.define("Object", {
        ..._FORMAT_PROPS,
        content: _SyntaxNode_t.base.as(Type.array),
        value: Type.string.as(Type.nullable),
        type: Type.enum("link", "media", "raw")
    }, AbstractSyntaxNode) {
        public readonly kind = "object"
        declare public content: SyntaxNode[]
    }

    export class Table extends Struct.define("Table", {
        ..._FORMAT_PROPS,
        content: _SyntaxNode_t.base.as(Type.array),
    }, AbstractSyntaxNode) {
        public readonly kind = "table"
        declare public content: SyntaxNode[]
    }

    export class TableRow extends Struct.define("TableRow", {
        ..._FORMAT_PROPS,
        content: _SyntaxNode_t.base.as(Type.array),
        header: Type.boolean,
    }, AbstractSyntaxNode) {
        public readonly kind = "table-row"
        declare public content: SyntaxNode[]
    }

    export type Inline = Span | Object

    export class Segment extends Struct.define("Segment", {
        ..._FORMAT_PROPS,
        type: Type.enum("p", 1, 2, 3, 4, "ul", "ol", "li", "quote").as(Type.nullable),
        content: _SyntaxNode_t.base.as(Type.array)
    }, AbstractSyntaxNode) {
        public readonly kind = "segment"
        declare public content: SyntaxNode[]
    }

    export type SegmentType = Segment["type"]

    export type NodeWithChildren = FilterBy<SyntaxNode, "content", SyntaxNode[]>
    export type NodeWithStyle = SyntaxNode.Span | SyntaxNode.Object | SyntaxNode.Object | SyntaxNode.Segment
}

for (const element of Object.values(SyntaxNode)) {
    _SyntaxNode_t.register(element)
}

export type SyntaxNode = InstanceType<Values<typeof SyntaxNode>>
