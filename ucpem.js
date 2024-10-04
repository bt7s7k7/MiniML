/// <reference path="./.vscode/config.d.ts" />

const { project, github } = require("ucpem")

project.prefix("src").res("miniML",
    github("bt7s7k7/Vue3GUI").res("vue3gui"),
    github("bt7s7k7/Struct").res("struct"),
    github("bt7s7k7/CommonTypes").res("comTypes"),
    github("bt7s7k7/Apsides").res("editor"),
    github("bt7s7k7/LogLib").res("prettyPrint"),
)
