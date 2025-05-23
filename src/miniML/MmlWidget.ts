import { MmlParser } from "./MmlParser"
import { SyntaxNode } from "./SyntaxNode"

export class WidgetNotSupported extends Error {
    public override name = "WidgetNotSupported"
}

export abstract class MmlWidget {
    public abstract getValue(parser: MmlParser, content: SyntaxNode[]): SyntaxNode.Inline | null
    public parseVerbatimContent(content: string): SyntaxNode[] {
        return [new SyntaxNode.Raw({ value: content })]
    }
}

export class WidgetVerbatimAttribute { }
