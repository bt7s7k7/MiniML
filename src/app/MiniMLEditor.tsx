import "codemirror/mode/htmlmixed/htmlmixed.js"
import "codemirror/mode/markdown/markdown.js"
import { defineComponent, watch } from "vue"
import { cloneWithout, unreachable } from "../comTypes/util"
import { EditorView } from "../editor/EditorView"
import { EditorState } from "../editor/useEditorState"
import { MmlHtmlRenderer } from "../miniML/MmlHtmlRenderer"
import { MmlParser } from "../miniML/MmlParser"
import { AbstractSyntaxNode } from "../miniML/SyntaxNode"
import { HtmlImporter } from "../mmlHtmlImporter/HtmlImporter"
import { DescriptionFormatter } from "../prettyPrint/DescriptionFormatter"
import { inspect } from "../prettyPrint/inspect"
import { LogMarker } from "../prettyPrint/ObjectDescription"
import { Tabs, useTabs } from "../vue3gui/Tabs"

// @ts-ignore
AbstractSyntaxNode.prototype[LogMarker.CUSTOM] = function (this: any) {
    const result = cloneWithout(this, "kind")
    Object.defineProperty(result, LogMarker.CUSTOM, { value: function (this: any) { return this }, enumerable: false })
    for (const [key, value] of Object.entries(result)) {
        if (value == null) {
            delete result[key]
        }
    }
    return result
}


class _MmlEditorState extends EditorState {
    public output: string | null = null
    public ast: string | null = null
    public importType: "md" | "html" = "md"

    public getOutput(): EditorState.OutputTab[] {
        return [
            {
                label: "Output", name: "output",
                content: () => this.output != null ? <div class="mml-document" innerHTML={this.output}></div> : <div></div>
            },
            {
                label: "AST", name: "ast",
                content: () => this.ast && <pre class="monospace pre-wrap m-0" innerHTML={this.ast}></pre>
            }
        ]
    }

    protected _compile(code: string): void {
        this.output = null
        let document

        if (this.importType == "md") {
            document = new MmlParser(code).parseDocument()
        } else if (this.importType == "html") {
            document = new HtmlImporter().importHtml(code)
        } else unreachable()

        this.ast = inspect(document, { color: DescriptionFormatter.htmlColor })
        const renderer = new MmlHtmlRenderer()
        this.output = renderer.render(document)
        this.ready = true
        // eslint-disable-next-line no-console
        console.log(this.output)
    }
}

export const MiniMLEditor = (defineComponent({
    name: "MiniMLEditor",
    setup(props, ctx) {
        const state = new _MmlEditorState()

        const importType = useTabs({
            "md": "Markdown",
            "html": "HTML"
        })

        state.importType = importType.selected = localStorage.getItem("mini-ml-editor:import-type") as null ?? "md"
        watch(() => importType.selected, selected => {
            localStorage.setItem("mini-ml-editor:import-type", selected)
            state.importType = selected
            state.compile(state.code.value)
        })

        return () => (
            <EditorView state={state} class="flex-fill" mode={importType.selected == "md" ? "markdown" : "htmlmixed"} localStorageId="mini-ml-editor" root>
                <Tabs tabs={importType} />
            </EditorView>
        )
    }
}))
