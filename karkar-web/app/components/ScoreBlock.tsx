import { Score } from "~/interfaces"
import { cx } from "~/utils/components"

export function ScoreBlock({ score }: { score: Score }) {
  const success = score.attempts > 0 && score.correct > score.attempts / 2
  const error = score.attempts < 0 && score.correct > score.attempts / 2
  return (
    <>
      <span
        className={cx({
          __success: success,
          __error: score.attempts > 0 && error,
          __subtle: score.attempts === 0,
        })}
      >
        {score.correct}
      </span>
      {` / `}
      <span
        className={cx({
          __subtle: score.attempts === 0,
        })}
      >
        {score.attempts}
      </span>
    </>
  )
}
