# Testing

API tests live in `apps/api/tests` and use Vitest plus Supertest. Each test builds an Express app against a temporary JSON file and a temporary upload directory, so the suite does not write the development `demo-data.json`.

From the repository root:

```bash
npm test
```

That builds `@news-india/shared` and then runs the API suite. The suite covers:

- health
- public listing, pagination, and hidden unpublished stories
- English and Hindi search, plus a story that has no Hindi translation
- trending calculation
- login, logout, CSRF, and user administration
- the reporter-to-editor workflow and a second repository reading the same file
- PDF upload validation, download authorization, and Hindi PDF output
- YouTube URL validation
- a corrupt JSON file that fails startup and names `npm run reset-demo`

The workflow test logs in as the reporter, creates a draft, edits it, submits it, confirms the public API does not return it, confirms the reporter cannot publish it, logs in as the editor, approves and publishes it, edits the title, and opens a new repository on the same file to confirm the edit was stored.

`apps/api/tests/api.test.ts` is the suite. `apps/api/tests/helpers.ts` creates the temporary app. Do not add a debug script back into `tests/`.

There is no browser test runner. After `npm run dev`, check the public site and the newsroom in a browser: language switch, search, a story page, the empty live desk, and a login.
