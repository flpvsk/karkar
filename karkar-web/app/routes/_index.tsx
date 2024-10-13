import {
  json,
  redirect,
  LoaderFunctionArgs,
  ActionFunctionArgs,
  MetaFunction,
} from "@remix-run/node"
import { useLoaderData, useActionData } from "@remix-run/react"
import { Form } from "react-router-dom"
import { createAppContext } from "~/context"
import { ID, Question } from "~/interfaces"
import { error, LoaderResult, ok } from "~/LoaderResult"
import * as storage from "~/storage"
import { cx } from "~/utils/components"
import { getUserId } from "~/utils/requests"

export const meta: MetaFunction = () => {
  return [
    { title: "Karkar" },
    {
      name: "description",
      content: "Flashcards for Einbürgerungstest",
    },
  ]
}

export const loader = async ({
  request,
}: LoaderFunctionArgs): LoaderResult<Question> => {
  try {
    const userId = await getUserId(request)
    const ctx = await createAppContext({ userId })
    const question = await storage.getNextQuestion(ctx)
    return json(ok(question))
  } catch (e) {
    return json(error(e))
  }
}

interface FormSubmitResult {
  isCorrect: boolean | null
  isShow: boolean
  question: Question
  answerId: ID | null
}

export async function action({
  request,
}: ActionFunctionArgs): LoaderResult<FormSubmitResult> {
  try {
    const userId = await getUserId(request)
    const ctx = await createAppContext({ userId })

    const bodyParams = await request.formData()
    const isSkip = !!bodyParams.get("skip")
    let isShow = false
    const isCheck = !!bodyParams.get("check")
    const isGoto = !!bodyParams.get("goto")
    const answerId = bodyParams.get("answerId")?.toString()
    const questionId = bodyParams.get("questionId")?.toString()
    const gotoQuestionName = bodyParams.get("gotoQuestionName")

    if (isGoto) {
      if (!gotoQuestionName) throw new Error(`Needs question name`)
      const question = await storage.getQuestionByName(
        {
          name: gotoQuestionName.toString(),
        },
        ctx,
      )
      if (!question) throw new Error(`Question not found`)
      return json(
        ok({
          isCorrect: null,
          isShow: false,
          question,
          answerId: null,
        }),
      )
    }

    if (!userId) throw new Error(`User not logged in`)

    if (isSkip) {
      return redirect("/")
    }

    if (!questionId) throw new Error(`questionId requied`)
    const question = await storage.getQuestionById({ id: questionId }, ctx)

    let isCorrect: boolean | null = null
    if (isCheck) {
      if (!question) throw new Error(`Question ${questionId} not found`)
      isCorrect = question.answerId === answerId
      isShow = true
      await storage.logCheck(
        {
          questionId: questionId,
          userAnswerId: answerId,
          correctAnswerId: question.answerId,
          isCorrect,
        },
        ctx,
      )
    }

    return json(
      ok({
        isCorrect,
        isShow,
        question,
        answerId: answerId ?? null,
      }),
    )
  } catch (e) {
    return json(error(e))
  }
}

export default function Index() {
  const loaderData = useLoaderData<typeof loader>()
  const actionData = useActionData<typeof action>()

  if (loaderData && loaderData.isError) {
    return <div className="errorText">{loaderData.error.message}</div>
  }

  let question = loaderData.data

  if (actionData && actionData.isError) {
    return <div className="errorText">{actionData.error.message}</div>
  }

  if (actionData && actionData.isOk) {
    question = actionData.data.question
  }

  const data = actionData?.data

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
                {data?.isShow && data.question.answerId === answer.id && "v"}
                {data?.isShow &&
                  data.answerId === answer.id &&
                  data.question.answerId !== answer.id && (
                    <span className="errorColor">x</span>
                  )}
              </div>
              <input
                id={`answer-${answer.id}`}
                name="answerId"
                value={answer.id}
                type="radio"
                disabled={data?.isShow}
                defaultChecked={data?.answerId === answer.id}
              />
              <label htmlFor={`answer-${answer.id}`}>{answer.text}</label>
            </div>
          ))}
          <div className="question__actionsBar">
            <div
              className={cx({
                question__actions: true,
                _skooch: !!data?.isShow,
              })}
            >
              {data?.isShow && (
                <button type="submit" name="skip" value="1">
                  Next
                </button>
              )}
              {!data?.isShow && (
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
