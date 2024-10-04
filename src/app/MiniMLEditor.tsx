import "codemirror/mode/markdown/markdown.js"
import { defineComponent } from "vue"
import { EditorView } from "../editor/EditorView"
import { EditorState } from "../editor/useEditorState"
import { MmlParser } from "../miniML/MmlParser"
import { renderMmlToHtml } from "../miniML/renderMmlToHtml"
import { DescriptionFormatter } from "../prettyPrint/DescriptionFormatter"
import { inspect } from "../prettyPrint/inspect"

class _MmlEditorState extends EditorState {
    public output: string | null = null
    public ast: string | null = null

    public getOutput(): EditorState.OutputTab[] {
        return [
            {
                label: "Output", name: "output",
                content: () => this.output != null ? <div innerHTML={this.output}></div> : <div></div>
            },
            {
                label: "AST", name: "ast",
                content: () => this.ast && <pre class="monospace pre-wrap m-0" innerHTML={this.ast}></pre>
            }
        ]
    }

    protected _compile(code: string): void {
        this.output = null
        const document = new MmlParser(code).parseDocument()
        this.ast = inspect(document, { color: DescriptionFormatter.htmlColor })
        this.output = renderMmlToHtml(document)
        this.ready = true
        // eslint-disable-next-line no-console
        console.log(this.output)
    }

}

export const MiniMLEditor = (defineComponent({
    name: "MiniMLEditor",
    setup(props, ctx) {
        const state = new _MmlEditorState()

        return () => (
            <EditorView state={state} class="flex-fill" mode="markdown" localStorageId="mini-ml-editor" root />
        )
    }
}))
