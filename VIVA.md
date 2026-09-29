# Viva preparation

**What does your project do?**  
It lets users securely create and manage FAQs, draft new FAQs from source text, and retrieve saved answers through a support-style interface.

**Why Node.js and Express?**  
Node.js supports asynchronous I/O for database and provider requests. Express supplies routing and middleware for the REST API.

**Why MongoDB and Mongoose?**  
FAQs are naturally document-shaped records. Mongoose defines schemas, validates fields, and supplies convenient database queries. The owner index supports per-user lookups.

**Is bcrypt encryption?**  
No. It is a one-way password hashing algorithm with a salt and configurable work factor. Login compares a password against the stored hash.

**What is JWT used for?**  
It carries a signed user identity and expiry. The server verifies its signature, issuer, audience, and expiry before granting access.

**Where is the browser token stored?**  
In an HttpOnly, SameSite=Strict cookie. JavaScript cannot read that cookie. API clients can instead use the token returned from login as a bearer token.

**Does logout revoke every token?**  
No. It clears the browser cookie. A copied bearer token remains valid until its eight-hour expiry. Token revocation is future work.

**How are users isolated?**  
Every FAQ list, update, and delete operation filters on the authenticated owner. The client cannot supply or change an owner field.

**What happens without MongoDB?**  
A labelled local JSON adapter persists data to disk. It is single-process demo storage, not MongoDB. The separate MongoDB launcher starts an actual database process locally.

**Where is the AI?**  
With an API key, source text goes to an LLM using structured output, and search compares embeddings. Without a key, the demo uses sentence extraction and keyword/synonym rules. Do not describe that fallback as a language model.

**What are embeddings?**  
Numeric vectors representing text. Similar vectors tend to represent related meaning. The application compares query and FAQ vectors using cosine similarity.

**What is cosine similarity?**  
The dot product of two vectors divided by the product of their lengths. It measures directional similarity. It is not a probability that an answer is correct.

**Is this a RAG chatbot?**  
It implements retrieval over a knowledge base and separate FAQ generation. Chat answers are retrieved verbatim; it does not currently synthesize conversational answers from retrieved context. Describe it as a retrieval-based FAQ assistant.

**How do you reduce unsupported answers?**  
Drafts are instructed to use supplied facts, validated, and manually reviewed. The assistant returns stored answers with source references and abstains below a threshold. This reduces risk but does not prove correctness.

**What is centralized error handling?**  
A final Express middleware maps known errors to safe HTTP responses. Unexpected internal errors return a generic message and request ID instead of stack traces or database details.

**How did you test it?**  
20 Node tests/subtests, real MongoDB adapter integration, and browser tests on desktop and mobile. AI provider contracts were mocked. Live AI quality and accuracy were not measured.

**What are the limitations?**  
No password recovery, email verification, vector database, team roles, server-side chat history, or evaluated AI accuracy. Search currently scans records and vectors are cached in memory.

**What would you improve next?**  
Create an evaluation dataset, add a persistent vector index and pagination, improve account lifecycle controls, and introduce document parsing and human escalation.

