## 2026-06-26 - Added Accessible Labels to Navigation
**Learning:** Found several icon-only buttons in the main navigation (Search clear, Theme toggle, Profile menu) that lacked screen-reader friendly labels. Adding dynamic ARIA labels based on state (e.g., 'Switch to light theme' vs 'Switch to dark theme') and mapping 'aria-expanded' to state variables significantly improves accessibility for these critical interactive elements.
**Action:** Always ensure icon-only buttons have descriptive ARIA labels, and dynamically update them based on state when applicable.
