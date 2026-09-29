# Tomorrow's demo

## Before the presentation

1. Read README.md and VIVA.md.
2. Add your name / roll number / college to PROJECT-REPORT.md.
3. Run START.cmd for the simplest demo, or START-MONGODB.cmd to show actual MongoDB.
4. Keep the terminal open. Do not switch database modes during the presentation.
5. For real AI, configure your own key in .env and restart beforehand. Without a key, explain that the active mode is the extractive/keyword demo.
6. Do one full practice run. Dependencies and database binaries are already available on this computer.

## The five-minute walkthrough

Say: “This is a secure FAQ management application with a drafting and answer-retrieval workflow.”

Open a sample workspace. Explain that this is isolated sample content.

Create:
Question: Is there a student discount?
Answer: Students receive a 15 percent discount with a valid college ID.
Category: Billing.

Save. Edit 15 to 20. Filter by Billing and search student.

Open FAQ studio. Choose Use sample content. Generate drafts. Review one, adjust the question to avoid duplicating an existing sample, then save.

Open Test assistant. Ask: How can I get my money back?
Point to the stored answer and source.
Ask: Tell me about quantum asteroid telescopes.
Show that no reliable answer is returned.

Refresh to show the session and FAQs persist.
Export the knowledge base.
Sign out.

## Backup if the network is unavailable

START.cmd works locally after dependencies are installed. Draft extraction and keyword search need no network. MongoDB's automatic launcher also works after its binary is downloaded. Screenshots are in docs/screenshots.

## Be precise

Do not say that demo templates are an LLM, that JSON storage is MongoDB, or that 100% answer accuracy was measured. Explain what is implemented and which mode you are demonstrating.

