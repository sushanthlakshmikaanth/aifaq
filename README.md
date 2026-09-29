# AI FAQ Assistant

A complete final-year project: a Node.js / Express REST API, a responsive browser interface, MongoDB / Mongoose persistence, JWT authentication, bcrypt password hashing, FAQ management, optional AI drafting, and answer retrieval.

## Open it now

On this computer, double-click **START.cmd**. It opens http://127.0.0.1:3000.

Choose **Open a sample workspace** for a quick demonstration. This creates an isolated demo account and loads six sample FAQs. A demo account uses a random password and its browser session lasts eight hours. For a reusable login, choose **Create an account** with an email and password you remember. Sample FAQs describe a fictional business; password reset mentioned in that sample content is not a password-reset feature of this application.

The dependencies are already installed on this computer. On a new computer, install Node.js 22 or newer; the launcher installs dependencies using npm ci. That first installation needs internet access.

## Run with real MongoDB

Close any existing project server before switching modes.

- Double-click **START-MONGODB.cmd** for a real local MongoDB process, managed automatically for the demo. It stores database files under data/mongodb. The first run on a new computer downloads MongoDB and requires internet. The binary is already available on this computer.
- Alternatively, copy .env.example to .env and set MONGODB_URI to a MongoDB connection string, then run START.cmd.
- A blank MONGODB_URI without DEMO_MONGO=1 uses a persistent JSON store at data/database.json. The interface labels that mode **Local demo**. It is an explicit fallback, not MongoDB.
- Local JSON and MongoDB are separate databases; accounts do not automatically transfer between them.
- Local MongoDB is for this laptop demonstration. For deployment, use an authenticated MongoDB service and HTTPS.

## Enable real AI

Copy .env.example to .env and add your own OPENAI_API_KEY. Restart the server. Do not paste keys into frontend files or share .env.

OPENAI_MODEL defaults to gpt-4o-mini; EMBEDDING_MODEL defaults to text-embedding-3-small. Both can be configured for models your API account supports. Live requests may incur API charges. An OpenAI API key is not included.

With a key, FAQ Studio uses the Responses API with a strict JSON schema, and search uses embeddings with cosine similarity. Your source text, saved FAQs, and search queries are sent to OpenAI as needed. Without a key, the clearly labelled demo uses extractive question templates and keyword/synonym matching. It is not generative AI or embedding-based semantic search. If an enabled AI provider fails, the app shows a safe error; it does not silently pretend the demo is AI.

## Five-minute presentation

1. Open a sample workspace and explain the six saved FAQs and categories.
2. Create an FAQ: “Is there a student discount?” / “Students receive a 15 percent discount with a valid college ID.”
3. Edit that answer, search for it, and show category filtering.
4. Open FAQ Studio, choose Use sample content, and Generate drafts.
5. Review and save a draft. Drafts are never saved automatically.
6. Open Test assistant and ask “How can I get my money back?”
7. Show the answer and its FAQ source. Ask an unrelated question to show the no-match response.
8. Refresh to demonstrate persistence. Use Export to download the FAQs as JSON.
9. Explain the actual active database/AI modes shown in the interface.

## Commands

~~~sh
npm ci
npm start
npm run dev
npm test
npm run test:mongo
npm run test:browser
~~~

Browser tests use installed Microsoft Edge and require the app on port 3000. Change the browser channel in tests/browser.mjs if using another OS. MongoDB integration tests use a temporary real MongoDB process. No AI key is used by automated tests.

## Structure

- src/app.js — Express routes, validation, authentication, ownership checks, rate limits, error handling.
- src/store.js — Mongoose schemas and the local demo storage adapter.
- src/ai.js — AI provider, structured drafting, semantic retrieval, demo fallback.
- src/server.js — configuration, database initialization, startup and shutdown.
- src/launch.js — Windows-friendly startup and browser opening.
- public/ — responsive HTML, CSS, and JavaScript.
- tests/ — API, mock provider contracts, real MongoDB integration, and browser tests.
- docs/ — project report, API guide, demo script, presentation outline, screenshots.
- data/ — local runtime data and generated session secret; do not submit it.

## Security and practical limits

Passwords use bcrypt hashing with work factor 12. JWTs expire after eight hours; browser cookies are HttpOnly and SameSite=Strict. API clients may use bearer tokens. Input schemas allowlist fields, all FAQ operations are owner-scoped, and browser text is escaped before rendering. Security headers, request size limits, rate limits, and sanitized errors are implemented.

JWT logout clears the browser cookie; it does not revoke already issued bearer tokens. There is no email verification, password-reset workflow, role hierarchy, audit log, or human ticketing workflow. The chat retrieves an existing answer; it does not generate conversational responses or retain server-side chat history. Similarity scores are ranking signals, not calibrated confidence. Embeddings are cached in process memory, not stored in a vector database.

JSON mode is single-process demo storage. Do not run multiple processes against the same JSON file. Search scans at most the account's FAQs in memory; a production system needs a persistent vector index, pagination, monitoring, backups, evaluation and stronger lifecycle controls. NODE_ENV=production requires MONGODB_URI and a JWT_SECRET of at least 32 characters; HTTPS is required for secure cookies.

## Verification

- 20 Node test assertions/subtests passed.
- Real MongoDB integration passed: connection, schemas, unique email, CRUD, owner isolation.
- Desktop/mobile browser flows passed with no JavaScript errors and no mobile horizontal overflow.
- AI request/response contracts tested with mocked provider responses.
- Live OpenAI generation and embeddings were not executed because no API key was provided.

See docs/PROJECT-REPORT.md, docs/PRESENTATION.md, and docs/VIVA.md before presenting. Replace student and college placeholders in the report. Do not claim measured AI accuracy or live AI validation that has not been performed.

Official API references: [Structured outputs](https://developers.openai.com/api/docs/guides/structured-outputs) and [embeddings](https://developers.openai.com/api/docs/guides/embeddings).

