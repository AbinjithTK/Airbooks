## 2025-02-23 - ARIA labels and dynamic text content
**Learning:** Adding static aria-labels to buttons containing dynamically changing text overrides the screen reader's ability to announce the new text, potentially breaking accessibility when state changes.
**Action:** When adding aria-labels to buttons, carefully ensure they are strictly icon-only buttons with no dynamic text, or make the aria-label string itself dynamic to match the text content.
