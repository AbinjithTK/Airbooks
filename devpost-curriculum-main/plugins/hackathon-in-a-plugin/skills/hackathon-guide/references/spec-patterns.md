# Spec Patterns — Agent Reference

This document is for the agent only. It informs how you conduct the /spec conversation, choose architectures, and produce the technical specification. Use this knowledge to propose sensible, buildable architectures quickly.

## Common Hackathon-Scale Architectures

These patterns are drawn from analyzing Devpost hackathon winners (TreeHacks, World's Largest Hackathon, DeveloperWeek, etc.). Propose whichever fits the learner's project and experience level.

### React/Vite + BaaS (Most Common Winner Pattern)
- **When:** Full-stack web app with dynamic data, auth, or real-time features
- **Shape:** React + Vite + Tailwind CSS → Supabase or Firebase (database + auth + storage) → Netlify or Vercel (hosting)
- **Real example:** KeyHaven (World's Largest Hackathon winner) — React/TypeScript/Vite + Supabase + Stripe + Netlify
- **Why it wins:** Supabase/Firebase handle the entire backend (auth, database, storage) so the learner writes zero backend code. All the time goes into the product, not the plumbing.
- **Hackathon tradeoffs:** Great for learners with any React experience. The BaaS handles complexity. Biggest risk: getting lost in Supabase/Firebase configuration.

### Python + Streamlit (Fastest to Demo)
- **When:** Data-focused app, AI/ML project, internal tool, or quick proof of concept
- **Shape:** Python script → Streamlit for instant web UI → External APIs (OpenAI, etc.)
- **Real example:** Oleksandr (won 7 of 15 hackathons) uses Python + Streamlit + LangChain/LlamaIndex as his go-to stack
- **Why it wins:** Streamlit turns any Python script into a web app with zero frontend knowledge. Deploys free on Streamlit Community Cloud. Perfect for AI/ML projects.
- **Hackathon tradeoffs:** Best for learners who know Python. Limited UI customization. Great for first-timers who want results fast.

### Next.js Full-Stack
- **When:** App needs SSR, API routes, and a polished frontend in one framework
- **Shape:** Next.js (App Router) → API routes or server actions → Database (Prisma + SQLite/Postgres)
- **Why it wins:** One framework handles everything. No separate backend setup.
- **Hackathon tradeoffs:** Powerful but framework-specific. Only recommend if the learner already knows Next.js or wants to learn it.

### Static Site / Client-Only
- **When:** No backend needed, data is local or from external APIs
- **Shape:** HTML/CSS/JS or React → External APIs or localStorage
- **Good for:** Tools, visualizations, single-user apps, browser extensions
- **Hackathon tradeoffs:** Simplest to deploy (GitHub Pages, Vercel). Great for absolute first-timers.

### CLI Tool
- **When:** No UI needed, command-line interface
- **Shape:** Python/Go/Node script with argument parsing
- **Good for:** Automation, file processing, developer tools
- **Hackathon tradeoffs:** Fast to build, easy to demo via screen recording. No deployment complexity.

### Bot / Integration
- **When:** API or service consumed by an existing platform (Slack bot, Discord bot, browser extension)
- **Shape:** API server → External platform's UI
- **Good for:** Integrations that extend tools people already use
- **Hackathon tradeoffs:** The "frontend" is someone else's problem. Focus on the logic.

### What Devpost Winners Have in Common
Based on research of winning Devpost projects and serial hackathon winners:
- **Strong concept > technical complexity.** Winners solve real problems simply, not complex problems elaborately. Judges consistently value clear problem-solving over impressive-but-unfocused technical feats.
- **Polished presentation matters enormously.** A clear project description, good screenshots, and a compelling submission page separate winners from the pack.
- **BaaS over custom backends.** Supabase, Firebase, and Streamlit Cloud dominate because they eliminate backend boilerplate. Winning projects consistently use these to spend time on the product, not the plumbing.
- **AI/LLM integration is near-universal** in recent winners. OpenAI, Anthropic, or open-source model APIs appear in most top projects. Major hackathons now have dedicated AI/agent tracks.
- **Plan before you build.** Serial hackathon winners explicitly map databases, model hosting, code interactions, and deployment strategy before writing code. The approach: spend time thinking before coding, use a proven stack, and focus on a strong idea.

## Diagramming

Use whatever format communicates best. Options:

**ASCII box diagrams** — work everywhere, no rendering dependencies:
```
┌──────────┐     ┌──────────┐     ┌──────────┐
│ Frontend │────→│   API    │────→│ Database │
└──────────┘     └──────────┘     └──────────┘
```

**Mermaid** — richer rendering in many tools:
```mermaid
graph LR
  Frontend --> API --> Database
```

Ask the learner if they have a preference. If they don't care, pick whichever is clearest for the specific diagram.

## File Structure Conventions

Always include a full file tree in the spec. Use ASCII tree format:

```
project/
├── src/
│   ├── components/    # UI components
│   ├── pages/         # Route-level pages
│   ├── lib/           # Shared utilities
│   └── api/           # API routes or client
├── docs/              # Hackathon artifacts (scope, prd, spec, etc.)
├── process-notes.md   # Learning journal
├── package.json
└── README.md
```

Annotate directories with brief comments explaining purpose. The learner should be able to look at this tree and understand where everything lives.

## Data Flow Documentation

For any app with data, document how data moves through the system:
1. Where does data originate? (User input, external API, file, etc.)
2. Where is it stored? (Database, localStorage, in-memory, file)
3. How does it get from A to B? (API call, function call, event, etc.)
4. What transforms happen along the way?

For hackathon projects, keep this pragmatic. A simple data flow narrative or diagram is enough — no need for formal data flow diagrams.

## Stack Research

When proposing a stack, **always web search for current documentation** on the specific tools, libraries, and APIs being used. Things change fast — a library that was standard 6 months ago might be deprecated. Check:
- Is this library actively maintained?
- What's the current stable version?
- Are there known issues or migration paths?
- Is there a simpler alternative that does the same thing?

For external APIs (Supabase, Firebase, OpenAI, etc.), search for current pricing, rate limits, and quickstart guides. Link to relevant docs in the spec so the agent has them during /build.

## Granular Subsections

The spec MUST have granular subsections — every architectural component gets its own heading. These headings become addresses that /checklist references.

Bad: one big "Architecture" section with everything in it.
Good: `## Frontend > ### Search Component`, `## API > ### Endpoints > #### GET /recipes`, `## Data Model > ### Recipes Table`.

The depth of nesting should match the complexity. A simple CLI tool might only need two levels. A full-stack app might need three or four. The rule is: if /checklist needs to point to it, it needs its own heading.

## Cross-Referencing the PRD

When writing the spec, reference PRD epic headings to maintain traceability:
- "This component implements the stories in `prd.md > Finding Recipes`"
- "See `prd.md > Managing Ingredients` for the acceptance criteria this must satisfy"

This connects the architectural decisions back to the requirements. During /build, the agent can look up both the spec (how to build it) and the PRD (what it should do) for any given checklist item.

## Other Areas Worth Spending Time On

Beyond data flow and file structure, these areas deserve real conversation time in /spec:

### State Management
Where does state live? This is the #1 source of confusion during build. For every piece of data the app touches, the learner should be able to answer: "Where is this stored? How does it get updated? What happens when the user navigates away and comes back?" Don't use the phrase "state management" with beginners — just ask the questions in plain language.

### API Contract / Interface Design
If the app talks to any external service (Supabase, OpenAI, a third-party API), spell out the exact calls: what endpoint, what payload, what comes back. This prevents the build from stalling while the agent figures out an API it's never seen before. Include links to the relevant docs.

### Error Boundaries and Fallbacks
Not exhaustive error handling — just the 2-3 places where things will actually break during a demo. What if the API is slow? What if the database is empty? What if the user's input is weird? Decide on a simple strategy: show a loading spinner, show a helpful error message, fall back to sample data. Keep it hackathon-appropriate.

### Submission & Demo Flow
What will judges see on the Devpost submission page? Walk through the key screenshots and flows now — make sure the architecture supports a compelling presentation. If the coolest feature requires a complex setup to demonstrate, that's a spec problem worth solving early. The submission page is how judges experience the project.

If the learner wants to deploy the app for a live link, discuss options appropriate to their stack (Vercel, Netlify, GitHub Pages, Railway, Fly.io, etc.) and make sure the architecture supports easy deployment. A deployed link strengthens the submission but isn't required.

## Deployment Considerations

Ask once where the learner plans to run their app:
- **Local only:** Simplest. Just needs to run on localhost. Screenshots and description carry the submission.
- **Deployed URL:** Note target platform (Vercel, Netlify, GitHub Pages, Railway, Fly.io, etc.). Include deployment steps in spec. If the learner wants to deploy but doesn't know how, help them pick an option that fits their stack.
- **Optional demo video:** The learner can record a short video and upload to YouTube or Vimeo. Not required for this hackathon, but it can strengthen the submission.

Most learners will run locally and submit with screenshots — that's fine. Don't over-invest in deployment unless the learner specifically wants a live URL.

## Architecture Self-Review

After drafting the spec, the agent should review its own work for:
- Ambiguities that would confuse /build ("what exactly does 'handle auth' mean here?")
- Failure points ("if this API is down, the whole app breaks — is there a fallback?")
- Complexity that doesn't match the time constraint ("this data model has 6 tables for a 3-hour build")
- Mismatches between the spec and the PRD ("the PRD says users can delete items but the spec has no delete endpoint")

Surface 2-3 of the most important issues for the learner to weigh in on. This teaches them that specs are living documents that benefit from review — not perfect blueprints handed down from above.
