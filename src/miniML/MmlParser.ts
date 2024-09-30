import { GenericParser } from "../comTypes/GenericParser"
import { SyntaxNode } from "./SyntaxNode"

function _isSpecialChar(v: string, i: number) {
    const c = v[i]
    return c == "*" || c == "_" || c == "\\" || c == "`"
}

export class MmlParser extends GenericParser {
    public parseFragment(term: string | null, result: SyntaxNode[] = []) {
        while (!this.isDone()) {
            const text = this.readUntil(_isSpecialChar)
            if (text.trim() != "") {
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

                const prev = result.at(-1)
                if (prev && prev.kind == "text") {
                    prev.value += char
                } else {
                    result.push(new SyntaxNode.Text({ value: char }))
                }

                continue
            }

            let newTerm: string | null = null
            if ((newTerm = this.consume(["**", "__"]))) {
                const content = this.parseFragment(newTerm)
                result.push(new SyntaxNode.Span({ content, modifier: "bold" }))
                continue
            }

            if ((newTerm = this.consume(["*", "_"]))) {
                const content = this.parseFragment(newTerm)
                result.push(new SyntaxNode.Span({ content, modifier: "italics" }))
                continue
            }

            if (this.consume("`")) {
                const content = this.parseFragment("`")
                result.push(new SyntaxNode.Span({ content, modifier: "code" }))
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

    public parseTextBlock() {
        const content: SyntaxNode[] = []

        while (!this.isDone()) {
            this.parseFragment("\n", content)
            if (this.consume("\n")) break
        }

        if (content.length == 0) return null

        return new SyntaxNode.TextBlock({ content })
    }

    public parseDocument() {
        const content: SyntaxNode[] = []

        while (!this.isDone()) {
            const block = this.parseTextBlock()
            if (block) content.push(block)
        }

        return new SyntaxNode.Segment({ content })
    }
}
