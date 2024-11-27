import { MmlParser } from "../miniML/MmlParser"
import { LaTeXMathWidget } from "../mmlLaTeXExporter/LaTeXMathWidget"

export const DEFAULT_OPTIONS: ConstructorParameters<typeof MmlParser>[1] = {
    widgets: [LaTeXMathWidget]
}
