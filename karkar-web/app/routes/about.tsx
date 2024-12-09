import { json, LoaderFunctionArgs } from "@remix-run/node"
import { useLoaderData } from "@remix-run/react"
import { LoaderResult, ok, error, isAuthErrorResponse } from "~/LoaderResult"
import { RandomLoginLink } from "~/components/RandomLoginLink"
import { getUserId } from "~/utils/requests"

interface AboutPageData {
  loginLink: string
}

export const loader = async ({
  request,
}: LoaderFunctionArgs): LoaderResult<AboutPageData> => {
  try {
    const userId = await getUserId(request)
    const host = process.env.HOST_ADDR ?? `http://localhost:5173`
    const loginLink = `${host}/?userId=${userId}`
    return json(ok({ loginLink }))
  } catch (e) {
    return json(error(e))
  }
}

export default function About() {
  const loaderData = useLoaderData<typeof loader>()

  if (isAuthErrorResponse(loaderData)) {
    return <RandomLoginLink />
  }

  if (loaderData && loaderData.isError) {
    return <div className="errorText">{loaderData.error.message}</div>
  }

  return (
    <div className="basicText">
      <h3>Motivation</h3>
      <p>
        This site is built to practice for Einbürgerungs- (aka Leben in
        Deutschland) test in Berlin.
      </p>
      <p>
        The list of questions is taken from{` `}
        <a href="https://gist.github.com/travisbrown/b9e99fc9272615b5f9ddf756b5e666b6">
          here.
        </a>
        {` `}
        By the time you are reading this some of them are most likely out of
        date!
      </p>
      <h3>Typos</h3>
      <p>
        The text of questions was OCR&#39;d from the official web page and
        contains typos.
      </p>
      <h3>Using multiple devices</h3>
      <p>
        You can use the generated user identifier to preserve your progress
        across devices. Copy the string of symbols at the top of the page next
        to &ldquo;Current user&rdquo; and paste it into &ldquo;Change user
        to&rdquo; input on any other device.
      </p>
      <p>
        Alternatively use this URL to login as the current user:
        <br />
        <a href={loaderData.data.loginLink}>{loaderData.data.loginLink}</a>
      </p>
      <h3>Privacy notice</h3>
      <p>
        This site uses cookies for the sole purpose of passing the user
        identifier.
      </p>
      <p>
        The site does not store any personally identifiable information. Please
        keep in mind that user identifiers can be guessed and someone else might
        be able to hijack your session: see the stats page and continue
        answering questions for that user account.
      </p>
      <p>Information that is storred for each user account:</p>
      <ul>
        <li>
          Timestamp, user id, question and answer every time user presses
          &ldquo;Check&rdquo; or &ldquo;Skip&rdquo;
        </li>
      </ul>
      <h3>Source</h3>
      <p>
        Source code of the website is available on github:
        <br />
        <a href="https://github.com/flpvsk/karkar">
          https://github.com/flpvsk/karkar
        </a>
      </p>
      <h3>Thanks</h3>
      <p>
        Huge thank you to{" "}
        <a href="https://gist.github.com/travisbrown">Travis Brown</a> for
        scraping and putting out{" "}
        <a href="https://gist.github.com/travisbrown/b9e99fc9272615b5f9ddf756b5e666b6">
          the list of questions!
        </a>
      </p>
    </div>
  )
}
