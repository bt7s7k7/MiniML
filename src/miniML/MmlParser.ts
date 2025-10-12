import { GenericParser } from "../comTypes/GenericParser"
import { Constructor } from "../comTypes/types"
import { isNumber, isWhitespace, isWord, mapConcat, unreachable } from "../comTypes/util"
import { Struct } from "../struct/Struct"
import { DeserializationError, Type } from "../struct/Type"
import { MmlWidget, WidgetVerbatimAttribute } from "./MmlWidget"
import { SyntaxNode } from "./SyntaxNode"

function _isSpecialChar(v: string, i: number) {
    const c = v[i]
    return c == "*" || c == "_" || c == "\\" || c == "`" || c == "\n" || c == "!" || c == "[" || c == "]" || c == "}" || c == "<"
}

function _isAttrTerminator(v: string, i: number) {
    return v[i] == "}" || isWhitespace(v, i) || v[i] == ">" || v[i] == "/"
}

function _isAttrNameTerminator(v: string, i: number) {
    return v[i] == "=" || _isAttrTerminator(v, i)
}

function _isIndent(v: string, i: number) {
    return v[i] == " " || v[i] == "\t"
}

function _isStyleFiller(v: string, i: number) {
    return v[i] == ";" || isWhitespace(v, i)
}

function _isHtmlElementName(v: string, i: number) {
    return v[i] == "-" || isWord(v, i) || v[i] == ":"
}

export interface SegmentHistory {
    indent: number
    kind: SyntaxNode.SegmentType
}

export class MmlParser extends GenericParser {
    public path: string | null = null
    public widgets = new Struct.PolymorphicSerializer<MmlWidget>("MmlWidget")

    protected _parseInlineCssProperty(name: string, value: string, container: SyntaxNode.NodeWithStyle | null): SyntaxNode.NodeWithStyle | null {
        if (name == "color") {
            if (value.startsWith("#")) {
                container ??= new SyntaxNode.Span({ content: [] })
                container.color = value as typeof container.color
                return container
            }
        }

        if (name == "text-align") {
            try {
                const alignValue = SyntaxNode.Span.baseType.props.align.verify(value)
                container ??= new SyntaxNode.Span({ content: [] })
                container.align = alignValue
                return container
            } catch (err) {
                if (err instanceof DeserializationError) return container
                throw err
            }
        }

        if (name == "width" || name == "height") {
            const number = parseInt(value)
            if (!isNaN(number)) {
                container ??= new SyntaxNode.Span({ content: [] })
                container[name] = number
                return container
            }
        }

        if (name == "font-weight") {
            if (value.startsWith("700")) {
                container ??= new SyntaxNode.Span({ content: [] })
                container.modifier = "bold"
                return container
            }
        }

        return container
    }

    public parseInlineCss<T extends SyntaxNode.NodeWithStyle>(container: T | null) {
        while (!this.isDone()) {
            if (this.consume("\"")) {
                return container
            }

            this.skipWhile(_isStyleFiller)
            const propName = this.readUntil(":")
            this.index++
            if (this.isDone()) break
            const propValue = this.readUntil(";").trim()

            container = this._parseInlineCssProperty(propName, propValue, container) as typeof container
        }

        return container
    }

    public parseFragment(term: string | null, result: SyntaxNode[] = []) {
        while (!this.isDone()) {
            const text = this.readUntil(_isSpecialChar)
            if (result.length > 0 || text.trim() != "") {
                const prev = result.at(-1)
                if (prev && prev.kind == "text") {
                    prev.value += text
                } else {
                    result.push(new SyntaxNode.Text({ value: text }))
                }
            }

            if (this.isDone()) break

            if (term != null && this.consume(term)) {
                break
            }

            if (this.consume("\\")) {
                const char = this.getCurrent()
                this.index++

                if (char == "\n") {
                    result.push(new SyntaxNode.Newline())
                    continue
                }

                const prev = result.at(-1)
                if (prev && prev.kind == "text") {
                    prev.value += char
                } else {
                    result.push(new SyntaxNode.Text({ value: char }))
                }

                continue
            }

            let object: SyntaxNode.Inline | null = null

            const wasSpace = this.index == 0 || isWhitespace(this.at(-1), 0)

            let newTerm: string | null = null
            if (wasSpace && (newTerm = this.consume(["**", "__"]))) {
                const content = this.parseFragment(newTerm)
                object = new SyntaxNode.Span({ content, modifier: "bold" })
            } else if (wasSpace && (newTerm = this.consume(["*", "_"]))) {
                const content = this.parseFragment(newTerm)
                object = new SyntaxNode.Span({ content, modifier: "italics" })
            } else if (wasSpace && this.consume("`")) {
                const content = this.parseFragment("`")
                object = new SyntaxNode.Span({ content, modifier: "code" })
            } else if (this.consume("[")) {
                const content = this.parseFragment("]")
                object = new SyntaxNode.Object({ content, type: "link" })

                if (this.consume("(")) {
                    const url = this.readUntil(")")
                    object.value = url
                    this.index++
                }
            } else if (this.consume("![")) {
                const content = this.readUntil("]")
                this.index++

                object = new SyntaxNode.Object({ content: [], type: "media", attributes: new Map([["alt", content]]) })

                if (this.consume("(")) {
                    const url = this.readUntil(")")
                    object.value = url
                    this.index++
                }
            } else if (this.consume("<")) {
                const name = this.readWhile(_isHtmlElementName)
                const widget = this.widgets.getTypes().get(name)
                const verbatim = widget?.getMetadata().get(WidgetVerbatimAttribute) != null
                object = new SyntaxNode.Object({ content: [], type: "raw", value: name })
                let selfClosing = false

                while (!this.isDone()) {
                    this.skipWhile(isWhitespace)
                    if (this.consume(">")) {
                        break
                    }

                    if (this.consume("/>")) {
                        selfClosing = true
                        break
                    }

                    const start = this.index
                    this.parseAttribute(object)
                    if (this.index == start) {
                        this.index++
                    }
                }

                if (!selfClosing) {
                    const term = `</${name}>`
                    if (verbatim) {
                        object.content = [new SyntaxNode.Raw({ value: this.readUntil(term) })]
                        this.index += term.length
                    } else {
                        object.content = this.parseFragment(term)
                    }
                } else {
                    if (verbatim) {
                        object.content = [new SyntaxNode.Raw({ value: "" })]
                    }
                }


                const widgetType = this.widgets.getTypes().get(name)
                if (widgetType != null) {
                    const widgetData = object.attributes ? Object.fromEntries([...object.attributes].map(([key, value]) => value == "" ? [key, true] : [key, value])) : {}
                    widgetData["!type"] = name
                    const widget = this.widgets.base.deserialize(widgetData)
                    const inheritedAttributes = object.attributes ? new Map(object.attributes) : null

                    object = widget.getValue(this, object.content)

                    if (object && inheritedAttributes) {
                        if (!Type.isObject(widgetType)) unreachable()
                        for (const [key] of widgetType.propList) {
                            inheritedAttributes.delete(key)
                        }

                        if (object.attributes) {
                            object.attributes = mapConcat(inheritedAttributes, object.attributes)
                        } else {
                            object.attributes = inheritedAttributes
                        }
                    }
                }
            }

            if (object != null) {
                result.push(object)

                if (this.consume("{")) {
                    while (!this.isDone()) {
                        this.skipWhile(isWhitespace)

                        if (this.consume("}")) {
                            break
                        }

                        const start = this.index
                        this.parseAttribute(object)
                        if (this.index == start) {
                            this.index++
                        }
                    }
                }

                continue
            }

            const reject = this.getCurrent()
            const prev = result.at(-1)
            if (prev && prev.kind == "text") {
                prev.value += reject
            } else {
                result.push(new SyntaxNode.Text({ value: reject }))
            }

            this.index++
        }

        return result
    }

    public parseAttribute(object: SyntaxNode.Inline) {
        if (this.consume(".")) {
            const className = this.readUntil(_isAttrTerminator)
            object.classList ??= []
            object.classList.push(className)
            return
        }

        const attrName = this.readUntil(_isAttrNameTerminator)
        let attrValue: string | null = null

        if (attrName == "") return

        if (this.consume("=")) {
            if (this.consume("\"")) {
                attrValue = this.readUntil("\"")
                this.index++
            } else {
                attrValue = this.readUntil(_isAttrTerminator)
            }
        }

        object.attributes ??= new Map()
        object.attributes.set(attrName, attrValue ?? "")
    }

    public parseIndent() {
        const currIndentString = this.readWhile(_isIndent)
        const currIndent = currIndentString.length
        return currIndent
    }

    public parseSegmentType() {
        const start = this.index

        let type: SyntaxNode.SegmentType = null

        if (this.readWhile(isNumber) && this.consume([".", ")"])) {
            type = "ol"
        } else {
            this.index = start

            if (this.consume(["- ", "+ ", "* "])) {
                type = "ul"
            }
        }

        return type
    }

    public parseTextBlock() {
        const textBlock = new SyntaxNode.Segment({ type: "p", content: this.parseFragment("\n") })
        return textBlock
    }

    public parseSegment(indent: number, segment: SyntaxNode.Segment) {
        let lastElement: SyntaxNode | null = null

        while (!this.isDone()) {
            const start = this.index
            const currIndent = this.parseIndent()
            if (currIndent < indent) {
                this.index = start
                return
            }

            if (this.consume("```")) {
                const type = this.readUntil("\n").trim()
                this.index++
                const content = this.readUntil("```")
                this.index += 3
                const codeBlock = new SyntaxNode.CodeBlock({ lang: type != "" ? type : null, content })
                lastElement = null
                segment.content.push(codeBlock)
                continue
            }


            let heading: SyntaxNode.Segment["type"] = null

            if (this.consume("####")) {
                heading = 4
            } else if (this.consume("###")) {
                heading = 3
            } else if (this.consume("##")) {
                heading = 2
            } else if (this.consume("#")) {
                heading = 1
            }

            if (heading != null) {
                const textBlock = this.parseTextBlock()
                textBlock.type = heading
                lastElement = null
                segment.content.push(textBlock)
                continue
            }

            if (this.consume(">")) {
                let quote: SyntaxNode.Segment
                if (lastElement?.kind == "segment" && lastElement.type == "quote") {
                    quote = lastElement
                } else {
                    quote = new SyntaxNode.Segment({ type: "quote", content: [] })
                    segment.content.push(quote)
                }

                const textBlock = this.parseTextBlock()
                quote.content.push(textBlock)

                lastElement = quote
                this.parseSegment(currIndent + 1, quote)
                continue
            }

            if (this.consume(["- ", "+ ", "* "])) {
                let ul: SyntaxNode.Segment
                if (lastElement?.kind == "segment" && lastElement.type == "ul") {
                    ul = lastElement
                } else {
                    ul = new SyntaxNode.Segment({ type: "ul", content: [] })
                    segment.content.push(ul)
                }

                const li = new SyntaxNode.Segment({ type: "li", content: [] })
                ul.content.push(li)

                const textBlock = this.parseTextBlock()
                li.content.push(textBlock)

                lastElement = ul
                this.parseSegment(currIndent + 1, li)
                continue
            }

            const olBacktrack = this.index
            if (this.readWhile(isNumber) && this.consume([".", ")"])) {
                let ol: SyntaxNode.Segment
                if (lastElement?.kind == "segment" && lastElement.type == "ol") {
                    ol = lastElement
                } else {
                    ol = new SyntaxNode.Segment({ type: "ol", content: [] })
                    segment.content.push(ol)
                }

                const li = new SyntaxNode.Segment({ type: "li", content: [] })
                ol.content.push(li)

                const textBlock = this.parseTextBlock()
                li.content.push(textBlock)

                lastElement = ol
                this.parseSegment(currIndent + 1, li)
                continue
            } else {
                this.index = olBacktrack
            }

            const textBlock = this.parseTextBlock()

            if (textBlock.content.length == 0) {
                lastElement = null
                continue
            }

            if (lastElement && lastElement.kind == "segment") {
                const lastContent = lastElement.content.at(-1)
                if (lastContent && lastContent.kind == "segment" && lastContent.type == "li") {
                    lastContent.content.push(new SyntaxNode.Text({ value: " " }), ...textBlock.content)
                } else {
                    lastElement.content.push(new SyntaxNode.Text({ value: " " }), ...textBlock.content)
                }
            } else {
                segment.content.push(textBlock)
                lastElement = textBlock
            }
        }

        return
    }

    public parseDocument() {
        const rootSegment = new SyntaxNode.Segment({ content: [] })

        this.parseSegment(0, rootSegment)

        return rootSegment
    }

    constructor(
        input: string,
        options?: MmlParser.Options,
    ) {
        super(input)
        if (options?.widgets) {
            for (const widget of options.widgets) {
                this.widgets.register(widget)
            }
        }

        this.path = options?.path ?? null
    }
}

export namespace MmlParser {
    export interface Options {
        widgets?: Constructor<MmlWidget>[],
        path?: string | null,
    }
}
