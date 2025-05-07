import { mdiArrowRight, mdiCog } from "@mdi/js"
import "codemirror/mode/htmlmixed/htmlmixed.js"
import "codemirror/mode/javascript/javascript.js"
import "codemirror/mode/markdown/markdown.js"
import { defineComponent, h, reactive, watch } from "vue"
import { RouterLink } from "vue-router"
import { Optional } from "../comTypes/Optional"
import { cloneArray, cloneWithout, escapeHTML, shallowClone, unreachable } from "../comTypes/util"
import { Editor } from "../editor/Editor"
import { EditorView } from "../editor/EditorView"
import { EditorState } from "../editor/useEditorState"
import { MmlHtmlRenderer } from "../miniML/MmlHtmlRenderer"
import { MmlParser } from "../miniML/MmlParser"
import { MmlVueExporter } from "../miniML/MmlVueExporter"
import { AbstractSyntaxNode } from "../miniML/SyntaxNode"
import { DEFAULT_OPTIONS, HTML_CITATIONS, HTML_MATH } from "../mmlConvert/options"
import { HtmlImporter } from "../mmlHtmlImporter/HtmlImporter"
import { ListNormalizer } from "../mmlHtmlImporter/normalizeLists"
import { LaTeXExporter } from "../mmlLaTeXExporter/LaTeXExporter"
import { DescriptionFormatter } from "../prettyPrint/DescriptionFormatter"
import { inspect } from "../prettyPrint/inspect"
import { LogMarker } from "../prettyPrint/ObjectDescription"
import { Struct } from "../struct/Struct"
import { Type } from "../struct/Type"
import { Button } from "../vue3gui/Button"
import { useDynamicsEmitter } from "../vue3gui/DynamicsEmitter"
import { Icon } from "../vue3gui/Icon"
import { MountNode } from "../vue3gui/MountNode"
import { Tabs, useTabs } from "../vue3gui/Tabs"
import { ToggleButton } from "../vue3gui/ToggleButton"

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

export class _EditorConfig extends Struct.define("EditorConfig", {
    importType: Type.enum("md", "html"),
    exportType: Type.enum("html", "latex", "vue"),
    htmlCitations: Type.boolean.as(Type.withDefault, () => true),
    htmlMath: Type.boolean.as(Type.withDefault, () => true),
}, class { constructor() { return reactive(this) } }) { }

class _MmlEditorState extends EditorState {
    public preview: HTMLElement | (() => any) | string | null = null
    public output: string | null = null
    public ast: string | null = null

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
                    mode={this.config.exportType == "html" ? "htmlmixed" : this.config.exportType == "vue" ? "javascript" : undefined}
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

        const htmlOptions = shallowClone(DEFAULT_OPTIONS)
        htmlOptions.shortcuts = cloneArray(DEFAULT_OPTIONS.shortcuts!)

        if (this.config.htmlCitations) {
            htmlOptions.shortcuts.push(...HTML_CITATIONS)
        }

        if (this.config.htmlMath) {
            htmlOptions.shortcuts.push(...HTML_MATH)
        }

        if (this.config.importType == "md") {
            mlDocument = new MmlParser(code, htmlOptions).parseDocument()
        } else if (this.config.importType == "html") {
            mlDocument = new HtmlImporter(htmlOptions).importHtml(code)
            const normalizer = new ListNormalizer()
            mlDocument = normalizer.transform(mlDocument)
            if (normalizer.wasDropped) unreachable()
        } else unreachable()

        this.ast = inspect(mlDocument, { color: DescriptionFormatter.htmlColor })
        if (this.config.exportType == "html") {
            const renderer = new MmlHtmlRenderer()
            this.preview = this.output = renderer.render(mlDocument)
        } else if (this.config.exportType == "vue") {
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
        } else if (this.config.exportType == "latex") {
            const renderer = new LaTeXExporter()
            this.output = renderer.exportDocument(mlDocument)

            try {
                const previewContainer = (async () => {
                    // @ts-ignore
                    const { HtmlGenerator, parse } = await import("latex.js")
                    const preview = parse(this.output, { generator: new HtmlGenerator({ hyphenate: false }) })
                    const previewContainer = document.createElement("div")
                    previewContainer.appendChild(preview.domFragment())
                    return previewContainer
                })()

                previewContainer.catch(error => {
                    this.preview = `<div class="text-danger monospace">${escapeHTML(error.message)}</div>`
                })

                const iframe = document.createElement("iframe")
                iframe.addEventListener("load", () => {
                    iframe.contentDocument!.head.innerHTML = LATEX_RESOURCES
                    previewContainer.then(previewContainer => {
                        iframe.contentDocument!.body.innerHTML = previewContainer.innerHTML
                    })
                })
                iframe.contentDocument
                iframe.setAttribute("class", "border-none absolute-fill")

                this.preview = iframe
            } catch (err: any) {
                // eslint-disable-next-line no-console
                console.error(err)
                this.preview = `<div class="text-danger monospace">${escapeHTML(err.message)}</div>`
            }
        }
        this.ready = true
    }

    constructor(
        public readonly config: _EditorConfig
    ) {
        super()
    }
}

const LATEX_RESOURCES = `
    <link rel="stylesheet" type="text/css" href="/latex/css/katex.css">
    <link rel="stylesheet" type="text/css" href="/latex/css/article.css">
    <script src="/latex/js/base.js"></script>
    <style>
        body { display: initial; }
        .body { padding: 2rem; }
    </style>
`

export const MiniMLEditor = (defineComponent({
    name: "MiniMLEditor",
    setup(props, ctx) {
        const emitter = useDynamicsEmitter()

        const config = Optional
            .value(localStorage.getItem("mini-ml-editor:editor-config"))
            .filterType("string")
            .do(source => _EditorConfig.deserialize(JSON.parse(source)))
            // eslint-disable-next-line no-console
            .else((error) => (console.error(error), _EditorConfig.default()))
            .unwrap()
        const state = new _MmlEditorState(config)

        const importType = useTabs({
            "md": "Markdown",
            "html": "HTML"
        })

        function saveConfig() {
            localStorage.setItem("mini-ml-editor:editor-config", JSON.stringify(config.serialize()))
            state.compile(state.code.value)
        }

        importType.selected = config.importType
        watch(() => importType.selected, selected => {
            config.importType = selected
            saveConfig()
        })

        const exportType = useTabs({
            "html": "HTML",
            "latex": "LaTeX",
            "vue": "Vue",
        })

        exportType.selected = config.exportType
        watch(() => exportType.selected, selected => {
            config.exportType = selected
            saveConfig()
        })

        function openConfig() {
            emitter.modal(() => (
                <div class="flex column gap-1">
                    <h3 class="m-0">Config</h3>
                    <ToggleButton clear class="mt-2" label="HTML Citations" vModel={config.htmlCitations} onChange={saveConfig} />
                    <small>Enables creating a cite element by surrounding text with <code>[[</code> and <code>]]</code></small>
                    <ToggleButton clear class="mt-2" label="HTML Math" vModel={config.htmlMath} onChange={saveConfig} />
                    <small>Enables creating a Math element by surrounding text with <code>{"<<"}</code> and <code>{">>"}</code></small>
                </div>
            ), { props: { cancelButton: "Close" } })
        }

        return () => (
            <EditorView state={state} class="flex-fill" toolbarClass="center-cross" mode={importType.selected == "md" ? "markdown" : "htmlmixed"} localStorageId="mini-ml-editor" root>
                <Tabs tabs={importType} />
                <Icon icon={mdiArrowRight} class="mx-2" />
                <Tabs tabs={exportType} />
                <Button clear icon={mdiCog} onClick={openConfig} v-label="Config" />
            </EditorView>
        )
    }
}))
