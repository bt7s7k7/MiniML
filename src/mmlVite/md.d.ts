
declare module "*.md" {
    import { DefineComponent } from "vue"
    declare const component: DefineComponent
    export default component
}
