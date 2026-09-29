# REST API guide

Base URL: http://127.0.0.1:3000/api

JSON request bodies. Successful authentication returns {user, token} and sets an HttpOnly session cookie. For API clients, send Authorization: Bearer TOKEN. Protected endpoints operate only on the authenticated user's FAQs.

## Public endpoints

- GET /health — application identifier, status, storage mode, AI availability, search mode.
- POST /auth/register — {name, email, password}; returns 201.
- POST /auth/login — {email, password}; returns 200.
- POST /auth/logout — clears the session cookie. Issued bearer tokens remain valid until expiry.

Registration: name 2–60 characters; valid email up to 254 characters; password at least 8 characters and at most 72 UTF-8 bytes. Passwords are hashed, never returned.

## Protected endpoints

- GET /auth/me — current user's id, name, email.
- GET /faqs — {faqs:[...]}.
- POST /faqs — {question, answer, category}; returns 201 and {faq}.
- PUT /faqs/:id — same fields; full update, returns {faq}.
- DELETE /faqs/:id — {ok:true}. Unknown or another user's ID returns 404.
- POST /faqs/sample — adds missing sample questions; {added:number}.
- POST /generate — {text, count}; returns {mode,drafts:[{question,answer,category}]}.
- POST /search — {query}; returns {mode,results,matched,answer,source}.

Question: 5–300 characters. Answer: 5–5,000 characters. Categories: General, Account, Billing, Orders, Support. Category defaults to General. Unknown request fields are rejected.

Generation accepts 30–20,000 characters and 1–8 drafts (default 5). Results are drafts only. POST each reviewed item to /faqs to persist it.

Search accepts 2–500 characters. It retrieves up to five ranked candidates. A weak match returns matched:false and source:null. A match returns the exact stored answer and source FAQ id/question. The demo uses a 0.30 top-score acceptance threshold; semantic mode uses 0.40. These thresholds are heuristic and need evaluation for a real dataset.

## Error contract

~~~json
{"error":"Please sign in to continue.","requestId":"request-uuid"}
~~~

400 invalid input or malformed JSON; 401 invalid login/token; 403 cross-origin browser mutation; 404 absent resource; 409 duplicate email / FAQ limit; 413 large body; 429 rate limit; 502 invalid/rejected AI upstream; 503 unreachable AI upstream; 500 sanitized internal error. Rate-limit errors contain error but do not include the application requestId field.

## Security decisions

No broad CORS policy is enabled. Same-origin browser requests use cookies. Non-browser clients can send bearer tokens. Explicit cross-site browser mutations are rejected. MongoDB operations are restricted by owner; client-supplied owner fields are not accepted. AI keys remain on the server.

## Example registration

~~~sh
curl -X POST http://127.0.0.1:3000/api/auth/register -H "Content-Type: application/json" -d "{\"name\":\"Student\",\"email\":\"student@example.com\",\"password\":\"StudyProject123!\"}"
~~~

Use the returned token in your API client. A ready-to-import Postman collection is supplied.

