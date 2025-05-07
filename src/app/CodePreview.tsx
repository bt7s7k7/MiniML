import "codemirror/mode/javascript/javascript.js"
import "codemirror/mode/markdown/markdown.js"
import { defineComponent, renderSlot, VNode } from "vue"
import { CodeHighlight } from "../editor/CodeHighlight"
import { normalizeVNodeChildren } from "../vue3gui/util"

export const CodePreview = (defineComponent({
    name: "CodePreview",
    setup(props, ctx) {
        return () => {
            const input = renderSlot(ctx.slots, "default")
            const code = normalizeVNodeChildren(input)[0] as VNode
            const content = code.children as string
            const language = (code.props!.class as string)?.replace("language-", "") ?? "txt"

            return <CodeHighlight content={content} mode={language == "ts" ? "javascript" : language == "md" ? "markdown" : "plain"} />
        }
    }
}))


