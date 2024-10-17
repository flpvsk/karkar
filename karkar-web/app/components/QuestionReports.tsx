import { QuestionReportFull } from "~/interfaces"
import { ScoreBlock } from "./ScoreBlock"

export function QuestionReports(props: { reports: QuestionReportFull[] }) {
  const { reports } = props
  return (
    <div className="reports">
      <ul className="reports__list">
        {reports.map((report) => (
          <li className="reports__listItem" key={`report-${report.questionId}`}>
            <span className="reports__questionNumber">
              {report.questionName}:
            </span>
            <span className="reports__questionScore">
              <ScoreBlock score={report.overallScore} />
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}
