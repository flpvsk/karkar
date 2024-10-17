import { LoaderFunctionArgs, json } from "@remix-run/node"
import { useLoaderData } from "@remix-run/react"
import { LoaderResult, error, ok } from "~/LoaderResult"
import { createAppContext } from "~/context"
import { QuestionReportFull } from "~/interfaces"
import * as storage from "~/storage"
import { getUserId } from "~/utils/requests"
import { cx } from "~/utils/components"
import { ScoreBlock } from "~/components/ScoreBlock"

interface StatsPageData {
  reports: QuestionReportFull[]
}

export const loader = async ({
  request,
}: LoaderFunctionArgs): LoaderResult<StatsPageData> => {
  try {
    const userId = await getUserId(request)
    const ctx = await createAppContext({ userId })
    const reports = await storage.getQuestionReports(ctx)
    const question = await storage.getNextRatedQuestion(reports, ctx)
    return json(
      ok({
        question,
        reports: reports,
      }),
    )
  } catch (e) {
    return json(error(e))
  }
}
export default function Stats() {
  const loaderData = useLoaderData<typeof loader>()
  if (loaderData.isError) {
    return <div className="errorText">{loaderData.error.message}</div>
  }

  return (
    <div className="stats">
      <table className="stats__table">
        <thead>
          <tr>
            <th></th>
            <th></th>
            <th colSpan={5}>Correct / Attempts</th>
          </tr>
          <tr>
            <th>Q</th>
            <th>Raiting</th>
            <th>Last 24h</th>
            <th>Last 48h</th>
            <th>Last 4d</th>
            <th>Last 2w</th>
            <th>Overall</th>
          </tr>
        </thead>
        <tbody>
          {loaderData.data.reports.map((report) => (
            <tr key={`report-${report.questionId}`}>
              <td className="__tdCenter">{report.questionName}</td>
              <td
                className={cx({
                  __tdCenter: true,
                  __success: report.raiting > 0,
                  __error: report.raiting < 0,
                  __subtle: Math.abs(report.raiting) < 0.0001,
                })}
              >
                {Math.round(report.raiting * 10) / 10}
              </td>
              <td className="__tdCenter">
                <ScoreBlock score={report.last24Score} />
              </td>
              <td className="__tdCenter">
                <ScoreBlock score={report.last48Score} />
              </td>
              <td className="__tdCenter">
                <ScoreBlock score={report.last96Score} />
              </td>
              <td className="__tdCenter">
                <ScoreBlock score={report.last384Score} />
              </td>
              <td className="__tdCenter">
                <ScoreBlock score={report.overallScore} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
