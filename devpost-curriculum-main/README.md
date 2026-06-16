# devpost-curriculum

Devpost's plugin marketplace for Claude Code. A collection of agent-powered tools for hackathon participants and organizers.

Currently ships one plugin — more coming soon.

## Plugins

### hackathon-in-a-plugin

A hackathon curriculum that guides you from idea spark to working app in 3–4 hours, delivered as eight agent commands.

**Commands:** `/onboard` → `/scope` → `/prd` → `/spec` → `/checklist` → `/build` → `/iterate` → `/reflect`

#### Install

```
/plugin marketplace add https://github.com/challengepost/devpost-curriculum
/plugin install hackathon-in-a-plugin@devpost-curriculum
```
Then run `/reload-plugins` and restart Claude Code.
You can then run `/onboard` to start. Requires [Claude Code](https://claude.ai/code).

#### About

A complete hackathon curriculum built as a set of agent skills. Each command produces artifacts that downstream commands consume — scope doc, PRD, technical spec, build checklist, and reflection.

The curriculum teaches spec-driven development: the planning documents aren't busywork, they're the submission itself. The agent acts as a hackathon coach — brisk, sharp, encouraging — interviewing you through each phase.

**Skills:**

| Command | What it does |
|---|---|
| `/onboard` | Welcome, introductions, and learner profile |
| `/scope` | Brainstorm and refine your idea into a focused project scope |
| `/prd` | Turn scope into detailed product requirements |
| `/spec` | Translate PRD into a technical blueprint |
| `/checklist` | Break the spec into a concrete build checklist |
| `/build` | Build the app — autonomous (single run) or step-by-step (one item per session) |
| `/iterate` | Optional polish pass after the build is done |
| `/reflect` | Wrap up with a quiz, qualitative feedback, and reflection |

---

## License

MIT
