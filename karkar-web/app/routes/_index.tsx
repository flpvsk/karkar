import {
  json,
  LoaderFunctionArgs,
  ActionFunctionArgs,
  MetaFunction,
} from "@remix-run/node"
import { useLoaderData, useActionData, useNavigation } from "@remix-run/react"
import { nanoid } from "nanoid"
import { Form } from "react-router-dom"
import { QuestionReports } from "~/components/QuestionReports"
import { createAppContext } from "~/context"
import { ID, Question, QuestionReportFull } from "~/interfaces"
import { error, LoaderResult, ok } from "~/LoaderResult"
import * as storage from "~/storage"
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

interface ShuffledQuestion {
  question: Question
  seed: string
}

interface PracticePageData extends ShuffledQuestion {
  reports: QuestionReportFull[]
}

function shuffleAnswers(question: Question, seed?: string): ShuffledQuestion {
  const s = seed ?? nanoid(question.answers.length)
  const newAnswers = []
  const answers = [...question.answers]
  while (answers.length) {
    let idx = s.charCodeAt(newAnswers.length % s.length)
    if (isNaN(idx)) {
      idx = 0
    }
    const [answer] = answers.splice(idx % answers.length, 1)
    newAnswers.push(answer)
  }
  return {
    question: {
      ...question,
      answers: newAnswers,
    },
    seed: s,
  }
}

export const loader = async ({
  request,
}: LoaderFunctionArgs): LoaderResult<PracticePageData> => {
  try {
    const userId = await getUserId(request)
    const ctx = await createAppContext({ userId })
    const recentReports = await storage.getRecentQuestionReports(undefined, ctx)
    const reportsForQuestion = await storage.getQuestionReports(ctx)
    const question = await storage.getNextRatedQuestion(reportsForQuestion, ctx)
    return json(
      ok({
        ...shuffleAnswers(question),
        reports: recentReports,
      }),
    )
  } catch (e) {
    return json(error(e))
  }
}

interface FormSubmitResult {
  isCorrect: boolean | null
  isShow: boolean
  answerId: ID | null
}

export async function action({
  request,
}: ActionFunctionArgs): LoaderResult<FormSubmitResult & PracticePageData> {
  try {
    const userId = await getUserId(request)
    const ctx = await createAppContext({ userId })

    const bodyParams = await request.formData()
    const isSkip = !!bodyParams.get("skip")
    const isNext = !!bodyParams.get("next")
    let isShow = false
    const isCheck = !!bodyParams.get("check")
    const isGoto = !!bodyParams.get("goto")
    const answerId = bodyParams.get("answerId")?.toString()
    const questionId = bodyParams.get("questionId")?.toString()
    const seed = bodyParams.get("seed")?.toString()
    const gotoQuestionName = bodyParams.get("gotoQuestionName")

    if (isGoto) {
      if (!gotoQuestionName) throw new Error(`Needs question name`)
      const question = await storage.getQuestionByName(
        {
          name: gotoQuestionName.toString(),
        },
        ctx,
      )
      const reports = await storage.getRecentQuestionReports(question.id, ctx)
      if (!question) throw new Error(`Question not found`)
      return json(
        ok({
          isCorrect: null,
          isShow: false,
          ...shuffleAnswers(question),
          reports,
          answerId: null,
        }),
      )
    }

    if (!userId) throw new Error(`User not logged in`)

    if (isNext || isSkip) {
      if (isSkip && !!questionId) {
        await storage.logSkip({ questionId }, ctx)
      }

      const reports = await storage.getRecentQuestionReports(undefined, ctx)
      const reportsForQuestion = await storage.getQuestionReports(ctx)
      const question = await storage.getNextRatedQuestion(
        reportsForQuestion,
        ctx,
      )
      return json(
        ok({
          isCorrect: null,
          isShow: false,
          ...shuffleAnswers(question),
          reports,
          answerId: null,
        }),
      )
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

    const reports = await storage.getRecentQuestionReports(question.id, ctx)

    return json(
      ok({
        isCorrect,
        isShow,
        ...shuffleAnswers(question, seed),
        reports,
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
  const navigation = useNavigation()
  const isSubmitting = navigation.state === "submitting"

  if (loaderData && loaderData.isError) {
    return <div className="errorText">{loaderData.error.message}</div>
  }

  let question = loaderData.data.question
  let reports = loaderData.data.reports
  let seed = loaderData.data.seed

  if (actionData && actionData.isError) {
    return <div className="errorText">{actionData.error.message}</div>
  }

  if (actionData && actionData.isOk) {
    question = actionData.data.question
    reports = actionData.data.reports
    seed = actionData.data.seed
  }

  const data = actionData?.data

  return (
    <div className="mainGrid">
      <div className="question mainGrid__main">
        <div className="question__header">
          <h2 className="question__name">{question.name}</h2>
          <div className="question__text">{question.text}</div>
        </div>
        {question.image && (
          <div className="question__imageBlock">
            <img
              alt="Question graphic"
              className="question__image"
              src={`images/${question.image}`}
            />
          </div>
        )}
        <Form method="post" className="question__form">
          <input type="hidden" name="questionId" value={question.id} />
          <input type="hidden" name="seed" value={seed} />
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
            {data?.isShow && (
              <button
                className="action_primary"
                type="submit"
                name="next"
                value="1"
                disabled={isSubmitting}
              >
                Next
              </button>
            )}
            {!data?.isShow && (
              <>
                <button
                  className="action_secondary"
                  type="submit"
                  name="skip"
                  value="1"
                  disabled={isSubmitting}
                >
                  Skip
                </button>
                <button
                  className="action_primary"
                  type="submit"
                  name="check"
                  value="1"
                  disabled={isSubmitting}
                >
                  Check
                </button>
              </>
            )}
            <div className="question__gotoBlock">
              <input
                className="question__gotoInput"
                name="gotoQuestionName"
                type="text"
              />
              <button
                name="goto"
                type="submit"
                value="1"
                disabled={isSubmitting}
              >
                Go to question
              </button>
            </div>
          </div>
        </Form>
      </div>

      <div className="mainGrid__side">
        <QuestionReports reports={reports} />
      </div>
    </div>
  )
}
