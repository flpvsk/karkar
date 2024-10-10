import type { MetaFunction } from "@remix-run/node"

export const meta: MetaFunction = () => {
  return [
    { title: "Karkar" },
    {
      name: "description",
      content: "Flashcards for Einbürgerungstest",
    },
  ]
}

export default function Index() {
  return <div>hi</div>
}
