import { defineComponent } from "vue"
import Content from "../../README.md"

export const Home = (defineComponent({
    name: "Home",
    setup(props, ctx) {
        return () => (
            <main class="as-page mml-document">
                <Content />
            </main>
        )
    },
}))
