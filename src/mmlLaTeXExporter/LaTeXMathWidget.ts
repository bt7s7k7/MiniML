import { unreachable } from "../comTypes/util"
import { MmlParser } from "../miniML/MmlParser"
import { MmlWidget, WidgetVerbatimAttribute } from "../miniML/MmlWidget"
import { SyntaxNode } from "../miniML/SyntaxNode"
import { Struct } from "../struct/Struct"
import { Type } from "../struct/Type"

export class LaTeXMathWidget extends Struct.define("Math", {
    equation: Type.boolean.as(Type.nullable),
    full: Type.boolean.as(Type.nullable),
}, MmlWidget, {
    baseTypeDecorator(type) {
        return type.annotate(new WidgetVerbatimAttribute())
    },
}) {
    public override getValue(parser: MmlParser, content: SyntaxNode[]): SyntaxNode.Inline | null {
        const node = content[0]
        if (!(node instanceof SyntaxNode.Raw)) unreachable()
        let math = node.value
        if (this.full) {
            math = "\\displaystyle" + math
        }
        return new SyntaxNode.Span({
            content: [new SyntaxNode.Raw({
                value: this.equation ? (
                    "\\[" + math + "\\]"
                ) : (
                    "$" + math + "$"
                )
            })]
        })
    }
}
