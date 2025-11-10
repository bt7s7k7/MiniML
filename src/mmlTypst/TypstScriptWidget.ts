import { unreachable } from "../comTypes/util"
import { MmlParser } from "../miniML/MmlParser"
import { MmlWidget, WidgetVerbatimAttribute } from "../miniML/MmlWidget"
import { SyntaxNode } from "../miniML/SyntaxNode"
import { Struct } from "../struct/Struct"

export class TypstScriptWidget extends Struct.define("Script", {}, MmlWidget, {
    baseTypeDecorator: type => type.annotate(new WidgetVerbatimAttribute()),
}) {
    public getValue(parser: MmlParser, content: SyntaxNode[]): SyntaxNode.Inline | null {
        const node = content[0]
        if (!(node instanceof SyntaxNode.Raw)) unreachable()
        return new SyntaxNode.Span({ content: [node] })
    }
}
