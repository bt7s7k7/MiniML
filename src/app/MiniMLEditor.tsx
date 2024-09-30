import { defineComponent } from "vue"
import { EditorView } from "../editor/EditorView"
import { EditorState } from "../editor/useEditorState"
import { MmlParser } from "../miniML/MmlParser"
import { renderMmlToHtml } from "../miniML/renderMmlToHtml"

class _MmlEditorState extends EditorState {
    public output: string | null = null

    public getOutput(): EditorState.OutputTab[] {
        return [
            {
                label: "Output", name: "output",
                content: () => this.output != null ? <div innerHTML={this.output}></div> : <div></div>
            }
        ]
    }

    protected _compile(code: string): void {
        this.output = null
        const document = new MmlParser(code).parseDocument()
        // eslint-disable-next-line no-console
        console.log(document)
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
            <EditorView state={state} class="flex-fill" localStorageId="mini-ml-editor" root />
        )
    }
}))
