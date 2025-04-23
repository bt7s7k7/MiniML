import { MmlParser } from "../miniML/MmlParser"
import { MmlWidget } from "../miniML/MmlWidget"
import { SyntaxNode } from "../miniML/SyntaxNode"
import { Struct } from "../struct/Struct"
import { Type } from "../struct/Type"

export class LaTeXTableOptions extends Struct.define("LaTeXTableOptions", {
    widths: Type.number.as(Type.array),
    types: Type.string.as(Type.array),
    compact: Type.boolean,
    naked: Type.boolean,
    long: Type.boolean,
}) {
    public static readonly tagname = "<>latex-table-options"
}

export class LaTeXTableOptionsWidget extends Struct.define("TableOptions", {
    widths: Type.string.as(Type.nullable),
    types: Type.string.as(Type.nullable),
    compact: Type.boolean.as(Type.nullable),
    naked: Type.boolean.as(Type.nullable),
    long: Type.boolean.as(Type.nullable),
}, MmlWidget) {
    public getValue(parser: MmlParser, content: SyntaxNode[]): SyntaxNode.Inline | null {
        const options = LaTeXTableOptions.default()

        if (this.widths) {
            const widths = this.widths.split("|").map(v => parseFloat(v))
            if (!widths.some(isNaN)) {
                options.widths = widths
            }
        }

        if (this.types) {
            options.types = this.types.split("")
        }

        if (this.compact) options.compact = true
        if (this.naked) options.naked = true
        if (this.long) options.long = true

        const node = new SyntaxNode.Object({
            type: "raw",
            value: LaTeXTableOptions.tagname,
            content: [],
            attributes: new Map([["value", JSON.stringify(options.serialize())]])
        })

        return node
    }
}
