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
import { cx } from "~/utils/components"

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
  name: string
  text: string
  answers: Answer[]
  answerId: ID
}

const question1: Question = {
  id: "q1",
  text: "Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry's standard dummy text ever since the 1500s, when an unknown printer took a galley of type and scrambled it to make a type specimen book. It has survived not only five centuries, but also the leap into electronic typesetting, remaining essentially unchanged. It was popularised in the 1960s with the release of Letraset sheets containing Lorem Ipsum passages, and more recently with desktop publishing software like Aldus PageMaker including versions of Lorem Ipsum.",
  name: "1",
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
  name: "2",
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
  const isSkip = !!bodyParams.get("skip")
  let isShow = false
  const isCheck = !!bodyParams.get("check")
  const isGoto = !!bodyParams.get("goto")
  const answerId = bodyParams.get("answerId")
  const questionId = bodyParams.get("questionId")
  const gotoQuestionName = bodyParams.get("gotoQuestionName")
  const question = questions.find((q) => q.id === questionId)

  if (isGoto) {
    if (!gotoQuestionName) throw new Error(`Needs question id`)
    const question = questions.find((q) => q.name === gotoQuestionName)
    if (!question) throw new Error(`Question not found`)
    return json({
      isCorrect: null,
      isShow: false,
      question,
      answerId: null,
    })
  }

  if (!question) throw new Error(`Question ${questionId} not found`)

  let isCorrect: boolean | null = null
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
    question,
    answerId,
  })
}

export default function Index() {
  let question = useLoaderData<typeof loader>()
  const result = useActionData<typeof action>()

  if (result) {
    question = result.question
  }

  return (
    <div className="mainGrid">
      <div className="question mainGrid__main">
        <div className="question__header">
          <div className="question__name">{question.name}</div>
          <div className="question__text">{question.text}</div>
        </div>
        <Form method="post" className="question__form">
          <input type="hidden" name="questionId" value={question.id} />
          {question.answers.map((answer) => (
            <div key={`answer-${answer.id}`} className="question__answer">
              <div className="question__check">
                {result?.isShow &&
                  result.question.answerId === answer.id &&
                  "v"}
                {result?.isShow &&
                  result.answerId === answer.id &&
                  result.question.answerId !== answer.id &&
                  "x"}
              </div>
              <input
                id={`answer-${answer.id}`}
                name="answerId"
                value={answer.id}
                type="radio"
                disabled={result?.isShow}
                defaultChecked={result?.answerId === answer.id}
              />
              <label htmlFor={`answer-${answer.id}`}>{answer.text}</label>
            </div>
          ))}
          <div className="question__actionsBar">
            <div
              className={cx({
                question__actions: true,
                _skooch: !!result?.isShow,
              })}
            >
              {result?.isShow && (
                <button type="submit" name="skip" value="1">
                  Next
                </button>
              )}
              {!result?.isShow && (
                <>
                  <button type="submit" name="skip" value="1">
                    Skip
                  </button>
                  <button type="submit" name="check" value="1">
                    Check
                  </button>
                </>
              )}
            </div>
            <div className="question__gotoBlock">
              <input
                className="question__gotoInput"
                name="gotoQuestionName"
                type="text"
              />
              <button name="goto" type="submit" value="1">
                Go to question
              </button>
            </div>
          </div>
        </Form>
      </div>

      <div className="stats mainGrid__side">Stats go here</div>
    </div>
  )
}
