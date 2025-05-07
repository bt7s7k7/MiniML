# MiniML

Minimal, spec-noncompliant markdown parser and renderer. Allows for rendering into HTML, Vue components and LaTeX. You can get the [source code here](https://github.com/bt7s7k7/MiniML).

<XButton label="Try it!" to="/editor" variant="success"></XButton>

Features:

  - Faculties for parsing and rendering are fully separated, the intermediate representation can be serialized to JSON
  - Allow for creating widgets that act as scriptable macros for use in your code
  - Partial support for ingesting raw HTML code, currently tested for parsing Google Docs files
  - Fully featured command line interface
  - Allows usage as a Vite plugin, allowing you to load `.md` files

## CLI

Using the CLI script you can use this library on files.

```
Usage: mini-ml
  version - Prints current version
  build   - Converts an input file into an output file
    <source>: string, <dest>: string | null, --input: md | html | null, --output: html | latex | dump | null, --htmlSelector: string | null, --htmlMath: boolean | null, --htmlCite: boolean | null, --htmlNormalizeLists: boolean | null
```

Build options:

  - `source` ⇒ Input file
  - `dest` ⇒ Output file or `-` to print to stdout (optional, if not specified, it will be the same as source, except with extension changed to match output format)
  - `input` ⇒ Input type (optional, if not specified it is guessed based on source file extension)
  - `output` ⇒ Output type (optional, if not specified it is guessed based on dest file extension)
  - `htmlSelector` ⇒ If the input type is HTML, you can use a CSS selector to select the root element, from which the HTML will be parsed
  - `htmlMath` ⇒ Enables creating a `Math` element by surrounding text with `\<\<` and `\>\>`
  - `htmlCite` ⇒ Enables creating a `cite` element by surrounding text with `\[\[` and `\]\]`
  - `htmlNormalizeLists` ⇒ If ingesting HTML created by a WYSIWYG editor, it is possible the `ul` and `ol` element won't be nested, but only differentiated by margin (use this when importing from Google Docs)


## Vue export

Using the `MmlVueExporter` you can export into `.js` files that act as `Vue` components. To include other components you have to explicitly specify a list of allowed components and also their path, for creating import declarations. Additionally you can define props using the `MmlVueExporter.PropertyDeclarationWidget` and `MmlVueExporter.PropertyWidget` widgets. In this case you have to register a property once, and then each instance of the `\<Prop />` object will be replaced by the prop content.

```md
<Declare name="value" required />

<Prop name="value" />
```

You can use the Vite plugin to import `.md` files as components by including it in your `vite.config.ts`. This very README is using this configuration to appear in the website.

```ts
export default defineConfig(() => {
    return {
        plugins: [vue(), vueJsx(), mmlPlugin({
            allowedComponents: {
                "Button": "./src/vue3gui/Button",
                "pre": "./src/app/CodePreview@CodePreview"
            }
        })],
    }
})
```


## Widgets

Widgets are structs derived from `MmlWidget` and registered using the `widgets` option.

```ts
export class MyWidget extends Struct.define("MyWidget", {
    a: Type.string,
    b: Type.string,
}, MmlWidget) {
    public getValue(parser: MmlParser, content: SyntaxNode[]): SyntaxNode.Inline | null {
        return new SyntaxNode.Text({
            value: this.a + this.b
        })
    }
}
```

Widgets can then be used in source by creating an object.

```md
<MyWidget a="start" b="end" />
```

## LaTeX export

This library allows you to export as a LaTeX document. Only a subset of LaTeX features is supported, for everything else, you can use objects that will be converted to macro invocations. For example:

```md
<figure pragma-star pragma-block !htbp>
	<centering />
	<label>fig:difficulty-optimizer</label>
	<includegraphics scale=1>fig-difficulty-optimizer.pdf</includegraphics>
	<caption>Difficulty optimizer</caption>	
</figure>
```

Will be converted to:

```latex
\begin{figure*}[!htbp]
\centering
\label{fig:difficulty-optimizer}
\includegraphics[scale=1]{fig-difficulty-optimizer.pdf}
\caption{Proces genetického algoritmu}
\end{figure*}
```

The library also allows you to export tables. Hoverer, because markdown expects tables to be automatically sized by the HTML renderer, you have to use a special object to set table column widths. The specified numbers are fractions of the paper width. You can use the `long` attribute to use `longtable`. For example:

```md
<TableOptions widths="0.2|0.45|0.35" long before="\raggedright" />
```

Will be converted to:

```latex
\begin{longtable}{ |>{\raggedright}p{\dimexpr 0.2\textwidth -2\tabcolsep}|>{\raggedright}p{\dimexpr 0.45\textwidth -2\tabcolsep}|>{\raggedright}p{\dimexpr 0.35\textwidth -2\tabcolsep}|}
```

The following is an example for converting a Google Docs document to LaTeX. Remember to set the document to be viewable for everyone with a link and put `mobilebasic` at the end of the URL.

```
wget -O doc.html https://docs.google.com/document/d/.../mobilebasic
ucpem run @bt7s7k7/MiniML+cli build doc.html doc.tex --htmlSelector=.doc-content --htmlCite --htmlNormalizeLists --htmlMath
```
