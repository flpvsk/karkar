import {
  json,
  redirect,
  ActionFunctionArgs,
  MetaFunction,
  TypedResponse,
} from "@remix-run/node"
import { useLoaderData, useActionData } from "@remix-run/react"
import { Form } from "react-router-dom"
import { ID } from "~/interfaces"

export const meta: MetaFunction = () => {
  return [
    { title: "Karkar" },
    {
      name: "description",
      content: "Flashcards for Einbürgerungstest",
    },
  ]
}

interface Answer {
  id: ID
  text: string
}

interface Question {
  id: ID
  text: string
  answers: Answer[]
  answerId: ID
}

const question1: Question = {
  id: "q1",
  text: "Hi",
  answerId: "q1a1",
  answers: [
    {
      id: "q1a1",
      text: "check 1",
    },
    {
      id: "q1a2",
      text: "check 2",
    },
  ],
}

const question2: Question = {
  id: "q2",
  text: "Question 2",
  answerId: "q2a2",
  answers: [
    {
      id: "q2a1",
      text: "answer 1",
    },
    {
      id: "q2a2",
      text: "answer 2",
    },
    {
      id: "q2a3",
      text: "answer 3",
    },
  ],
}

const questions = [question1, question2]

export const loader = async (): Promise<TypedResponse<Question>> => {
  const r = Math.floor(Math.random() * 2)
  return json(questions[r])
}

export async function action({ request }: ActionFunctionArgs) {
  const bodyParams = await request.formData()
  const isSkip = !!bodyParams.get('skip')
  let isShow = !!bodyParams.get('show')
  const isCheck = !!bodyParams.get('check')
  const answerId = bodyParams.get("answerId")
  const questionId = bodyParams.get("questionId")
  const question = questions.find((q) => q.id === questionId)

  if (!question) throw new Error(`Question ${questionId} not found`)

  let isCorrect: boolean | undefined = undefined
  if (isCheck) {
    isCorrect = question.answerId === answerId
    isShow = true
  }

  if (isSkip) {
    return redirect("/")
  }

  return json({
    isCorrect,
    isShow,
    questionId,
  })
}

export default function Index() {
  const question = useLoaderData<typeof loader>()
  const result = useActionData<typeof action>()
  console.log(result)
  return (
    <div className="question">
      {question.text}
      <Form method="post">
        <input type="hidden" name="questionId" value={question.id} />
        {question.answers.map((answer) => (
          <div key={`answer-${answer.id}`} className="question__answer">
            <input
              id={`answer-${answer.id}`}
              name="answerId"
              value={answer.id}
              type="radio"
            />
            <label htmlFor={`answer-${answer.id}`}>{answer.text}</label>
          </div>
        ))}
        <button type="submit" name="skip" value="1">
          Skip
        </button>
        <button type="submit" name="show" value="1">
          Show
        </button>
        <button type="submit" name="check" value="1">
          Check
        </button>
      </Form>
    </div>
  )
}
