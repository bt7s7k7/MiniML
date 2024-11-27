import { mdiArrowRight } from "@mdi/js"
import "codemirror/mode/htmlmixed/htmlmixed.js"
import "codemirror/mode/javascript/javascript.js"
import "codemirror/mode/markdown/markdown.js"
import { defineComponent, watch } from "vue"
import { cloneWithout, escapeHTML, unreachable } from "../comTypes/util"
import { Editor } from "../editor/Editor"
import { EditorView } from "../editor/EditorView"
import { EditorState } from "../editor/useEditorState"
import { MmlHtmlRenderer } from "../miniML/MmlHtmlRenderer"
import { MmlParser } from "../miniML/MmlParser"
import { AbstractSyntaxNode } from "../miniML/SyntaxNode"
import { HtmlImporter } from "../mmlHtmlImporter/HtmlImporter"
import { LaTeXExporter } from "../mmlLaTeXExporter/LaTeXExporter"
import { DescriptionFormatter } from "../prettyPrint/DescriptionFormatter"
import { inspect } from "../prettyPrint/inspect"
import { LogMarker } from "../prettyPrint/ObjectDescription"
import { Icon } from "../vue3gui/Icon"
import { Tabs, useTabs } from "../vue3gui/Tabs"
// @ts-ignore
import { HtmlGenerator, parse } from "latex.js"
import { h } from "vue"
import { RouterLink } from "vue-router"
import { Optional } from "../comTypes/Optional"
import { MmlVueExporter } from "../miniML/MmlVueExporter"
import { Button } from "../vue3gui/Button"
import { MountNode } from "../vue3gui/MountNode"

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
    public preview: HTMLElement | (() => any) | string | null = null
    public output: string | null = null
    public ast: string | null = null
    public importType: "md" | "html" = "md"
    public exportType: "html" | "latex" | "vue" = "html"

    public getOutput(): EditorState.OutputTab[] {
        return [
            {
                label: "Preview", name: "output",
                content: () => this.preview != null ? (
                    typeof this.preview == "string" ? (
                        <div class="mml-document" innerHTML={this.preview}></div>
                    ) : typeof this.preview == "function" ? (
                        <div class="mml-document">{
                            Optional.pcall(() => h(this.preview as typeof this.preview & Function))
                                // eslint-disable-next-line no-console
                                .else(error => (console.error(error), null)).unwrap()
                        }</div>
                    ) : (
                        <MountNode node={this.preview} />
                    )
                ) : <div></div>
            },
            {
                label: "Output", name: "raw",
                content: () => <Editor
                    content={this.output ?? ""} config={{ readOnly: true }}
                    mode={this.exportType == "html" ? "htmlmixed" : this.exportType == "vue" ? "javascript" : undefined}
                    class="absolute-fill"
                />
            },
            {
                label: "AST", name: "ast",
                content: () => this.ast && <pre class="monospace pre-wrap m-0" innerHTML={this.ast}></pre>
            }
        ]
    }

    protected _compile(code: string): void {
        this.output = null
        this.preview = null
        this.ast = null

        let mlDocument

        if (this.importType == "md") {
            mlDocument = new MmlParser(code).parseDocument()
        } else if (this.importType == "html") {
            mlDocument = new HtmlImporter().importHtml(code)
        } else unreachable()

        this.ast = inspect(mlDocument, { color: DescriptionFormatter.htmlColor })
        if (this.exportType == "html") {
            const renderer = new MmlHtmlRenderer()
            this.preview = this.output = renderer.render(mlDocument)
        } else if (this.exportType == "vue") {
            const exporter = new MmlVueExporter()
            exporter.addAllowedComponent("RouterLink", "Button")
            const output = exporter.render(mlDocument)
            this.output = output

            try {
                this.preview = new Function("return " + output)()({ RouterLink, Button, h })
            } catch (err: any) {
                // eslint-disable-next-line no-console
                console.error(err)
                this.preview = `<div class="text-danger monospace">${escapeHTML(err.message)}</div>`
            }
        } else if (this.exportType == "latex") {
            const renderer = new LaTeXExporter()
            this.output = renderer.exportDocument(mlDocument)

            try {
                const preview = parse(this.output, { generator: new HtmlGenerator({ hyphenate: false }) })
                const previewContainer = document.createElement("div")
                previewContainer.appendChild(preview.domFragment())
                this.preview = previewContainer
            } catch (err: any) {
                // eslint-disable-next-line no-console
                console.error(err)
                this.preview = `<div class="text-danger monospace">${escapeHTML(err.message)}</div>`
            }
        }
        this.ready = true
    }
}

const LATEX_RESOURCES = `
    <link rel="stylesheet" type="text/css" href="/latex/css/katex.css">
    <link rel="stylesheet" type="text/css" href="/latex/css/article.css">
    <script src="/latex/js/base.js"></script>
`

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

        const exportType = useTabs({
            "html": "HTML",
            "latex": "LaTeX",
            "vue": "Vue",
        })

        state.exportType = exportType.selected = localStorage.getItem("mini-ml-editor:export-type") as null ?? "html"
        watch(() => exportType.selected, selected => {
            localStorage.setItem("mini-ml-editor:export-type", selected)
            state.exportType = selected
            state.compile(state.code.value)
        })

        return () => (
            <EditorView state={state} class="flex-fill" toolbarClass="center-cross" mode={importType.selected == "md" ? "markdown" : "htmlmixed"} localStorageId="mini-ml-editor" root>
                <Tabs tabs={importType} />
                <Icon icon={mdiArrowRight} class="mx-2" />
                <Tabs tabs={exportType} />
                {exportType.selected == "latex" && <div innerHTML={LATEX_RESOURCES}></div>}
            </EditorView>
        )
    }
}))
