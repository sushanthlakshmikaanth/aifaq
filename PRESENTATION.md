# Presentation outline — AI FAQ Assistant

Use these as slide contents and brief speaking notes. Add your name, college, and guide on slide 1.

## Slide 1 — AI FAQ Assistant
Secure FAQ management and AI-assisted content preparation.  
[Student name] · [Department] · [College]

Say: “My project brings FAQ writing, organization, and answer retrieval into one application.”

## Slide 2 — Problem
- Repeated support questions consume time.
- Answers become inconsistent across documents.
- Users phrase the same question in different ways.
- Private content needs authenticated access.

## Slide 3 — Objectives
- Centralize FAQ content.
- Protect per-user knowledge bases.
- Draft FAQs from source text.
- Retrieve useful answers with visible sources.
- Support a practical browser demonstration.

## Slide 4 — Technology
Node.js · Express · MongoDB · Mongoose · JWT · bcrypt · Zod  
HTML · CSS · JavaScript  
Optional OpenAI structured generation and embeddings.

Say which database and AI mode is actually running.

## Slide 5 — Architecture
Browser → REST API → authentication / validation → FAQ service → database.  
Generation / search service → optional AI provider.

Say: “The API key stays on the backend, and every FAQ operation is scoped to the logged-in user.”

## Slide 6 — Main modules
Authentication · Knowledge base · FAQ studio · Test assistant · Export.

Show docs/screenshots/knowledge-desktop.png.

## Slide 7 — Drafting workflow
Paste source → create drafts → review/edit → save to knowledge base.

Explain the distinction between extractive demo mode and AI generation.

Show docs/screenshots/studio-desktop.png.

## Slide 8 — Retrieval
Query → keyword normalization OR embeddings → ranking → threshold → saved answer + source.

Say: “The assistant returns the saved answer, and an unmatched query receives a no-answer response.”

Show docs/screenshots/assistant-desktop.png.

## Slide 9 — Security and testing
- bcrypt password hashes; expiring JWTs.
- Owner isolation and validated requests.
- Safe errors and rate limits.
- 20 automated tests/subtests passed.
- Real MongoDB integration and browser flows passed.
- Live AI quality is not yet evaluated.

## Slide 10 — Live demo
Create FAQ → edit → filter → generate draft → review/save → ask question → show source → unrelated query → export.

Keep the server window open. Use docs/DEMO-SCRIPT.md.

## Slide 11 — Limitations and future work
API key required for real AI; single-process demo fallback; in-memory vector cache.  
Next: persistent vector database, evaluation dataset, account recovery, document upload, escalation.

## Slide 12 — Conclusion
A working authenticated FAQ platform with a reviewable drafting workflow and source-backed retrieval.

Say: “This implementation demonstrates the full application flow and provides a configurable AI integration. The next step is evaluating quality on real support questions.”

