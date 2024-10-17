import { Score } from "~/interfaces"
import { cx } from "~/utils/components"

export function ScoreBlock({ score }: { score: Score }) {
  const isSuccess = score.attempts > 0 && score.correct > score.attempts / 2
  const isError = score.attempts > 0 && score.correct < score.attempts / 2
  return (
    <>
      <span
        className={cx({
          __success: isSuccess,
          __error: isError,
          __subtle: score.attempts === 0,
        })}
      >
        {score.correct}
        {` / `}
        {score.attempts}
      </span>
    </>
  )
}
