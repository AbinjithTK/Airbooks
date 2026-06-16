<!-- Every item MUST use the five-field format below. /build reads each item
     and relies on all five fields being present and consistently formatted.
     The header encodes methodology choices so /build doesn't re-ask. -->

# Build Checklist

## Build Preferences

- **Build mode:** [Autonomous / Step-by-step]
- **Comprehension checks:** [Yes / No / N/A (autonomous mode)]
- **Git:** [Commit cadence and style — e.g., "Commit after each item with message: 'Complete step N: [title]'"]
- **Verification:** [Yes / No. Step-by-step: per-item verification. Autonomous: checkpoints every 3-4 items. If No, verification is skipped.]
- **Check-in cadence:** [Step-by-step only: Learning-driven / balanced / speed-run — how much discussion during build. N/A for autonomous.]

## Checklist

- [ ] **1. [Clear title — what's done when this step is complete]**
  Spec ref: `spec.md > [Section] > [Subsection]`
  What to build: Concrete description of the work. Specific enough that /build can execute without guessing.
  Acceptance: Testable criteria from prd.md. What the learner verifies with their own eyes.
  Verify: Specific action — "Run dev server and confirm [what you should see]."

- [ ] **2. [Title]**
  Spec ref: `spec.md > [Section] > [Subsection]`
  What to build: [...]
  Acceptance: [...]
  Verify: [...]

<!-- Continue for all items. Typical project: 8-12 items, each 15-30 minutes.
     Sequence respects dependencies — earlier items unblock later ones.
     Last item is always Devpost submission. -->

- [ ] **N. Submit your project to Devpost**
  Spec ref: `prd.md > What We're Building` (the core submission story)
  What to build: Walk through the Devpost submission form. Write a project name and tagline. Draft the project story using scope.md and prd.md as source material — explain what you built, why, and what you learned. Add "built with" tags for your tech stack. Take screenshots of the working app for the image gallery. Upload your docs/ folder artifacts (scope, PRD, spec, checklist). Link your code repository. Optionally, link a deployed app or a demo video (YouTube/Vimeo). Review everything and submit.
  Acceptance: Submission is live on Devpost with project name, tagline, description, built-with tags, screenshots, docs artifacts, and repo link. All required fields are complete.
  Verify: Open your Devpost submission page and confirm the green "Submitted" badge appears. Read the project description — would someone who knows nothing about your project understand what it does and why it matters?
