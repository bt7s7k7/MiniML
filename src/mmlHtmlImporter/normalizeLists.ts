import { Transformer } from "../comTypes/Transformer"
import { cloneWith, joinIterableParallel, unreachable } from "../comTypes/util"
import { SyntaxNode } from "../miniML/SyntaxNode"
import { Type } from "../struct/Type"
import { HtmlImporter } from "./HtmlImporter"

const _ListType = Type.enum("ol", "ul", "none")
type _Type = Type.Extract<typeof _ListType>

class _Frame {
    public items: SyntaxNode.Segment[] = []
    public depths: number[] = []
    public margin: number = 0
    public types: _Type[] = []

    constructor(
        public type: _Type,
    ) { }
}

export class ListNormalizer extends Transformer<SyntaxNode> {
    public _getChildren(): SyntaxNode[] | null {
        if ("content" in this._value && typeof this._value.content != "string") return this._value.content
        return null
    }

    public applyChildren(children: SyntaxNode[]): void {
        this.replace(cloneWith(this._value, { content: children }))
    }

    public inheritedFrame: _Frame | null = null
    public currentFrame: _Frame | null = null

    public override process() {
        this.currentFrame = this.inheritedFrame
        super.process()
    }

    public override processElement(): void {
        if (this._value.kind == "segment") {
            if (_ListType.matches(this._value.type)) {

                if (this.currentFrame == null) {
                    this.currentFrame = new _Frame("none")
                }
                const margin = this._value.getMetadata(HtmlImporter.META_MARGIN_LEFT)
                this.processChildren<ListNormalizer>({
                    inheritedFrame: cloneWith(this.currentFrame, {
                        type: this._value.type,
                        margin: this.currentFrame.margin + (margin ?? 0) + 1
                    })
                })

                if (!this.isDone()) {
                    const peek = this.peek()
                    if (peek.kind == "segment" && _ListType.matches(peek.type)) {
                        this.drop()
                        return
                    }
                }

                if (this.inheritedFrame != null) {
                    this.drop()
                    return
                }

                const elements: SyntaxNode.Segment[] = []
                const types: _Type[] = []
                const depths: number[] = []

                const results: SyntaxNode.Segment[] = []

                for (const [item, depth, type] of joinIterableParallel("until-first", this.currentFrame.items, this.currentFrame.depths, this.currentFrame.types)) {
                    let container!: SyntaxNode.Segment
                    if (type == "none") unreachable()

                    const pushContainer = () => {
                        container = new SyntaxNode.Segment({ type, content: [] })
                        if (elements.length == 0) {
                            results.push(container)
                        } else {
                            elements.at(-1)!.content.push(container)
                        }
                        elements.push(container)
                        types.push(type)
                        depths.push(depth)
                    }

                    if (elements.length == 0 || depth > depths.at(-1)!) {
                        pushContainer()
                    } else if (depth == depths.at(-1)!) {
                        if (type != types.at(-1)!) {
                            elements.pop()
                            types.pop()
                            depths.pop()
                            pushContainer()
                        } else {
                            container = elements.at(-1)!
                        }
                    } else {
                        while (elements.length > 0 && depth < depths.at(-1)!) {
                            elements.pop()
                            types.pop()
                            depths.pop()
                        }

                        if (elements.length == 0 || depth > depths.at(-1)!) {
                            pushContainer()
                        } else if (type != types.at(-1)!) {
                            elements.pop()
                            types.pop()
                            depths.pop()
                            pushContainer()
                        } else {
                            container = elements.at(-1)!
                        }
                    }

                    container.content.push(item)
                }

                if (results.length == 1) {
                    this.replace(results[0])
                } else if (results.length == 0) {
                    this.drop()
                } else {
                    this.replace(new SyntaxNode.Segment({ content: results }))
                }

                this.currentFrame = null
                return
            }

            if (this._value.type == "li" && this.inheritedFrame != null) {
                const index = this.inheritedFrame.items.length
                this.processChildren()
                const margin = this._value.getMetadata(HtmlImporter.META_MARGIN_LEFT)
                this.inheritedFrame.items.splice(index, 0, this._value)
                this.inheritedFrame.depths.splice(index, 0, (margin ?? 0) + this.inheritedFrame.margin)
                this.inheritedFrame.types.splice(index, 0, this.inheritedFrame.type)
                this.drop()
                return
            }
        }

        super.processElement()
    }
}
