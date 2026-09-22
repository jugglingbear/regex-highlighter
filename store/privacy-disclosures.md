# Privacy disclosure text

Prepared for the dashboard and InfoSec review. These describe version 0.1.0; no dashboard submission has been made.

## Single purpose

Highlight user-selected regular-expression matches in the active web page, with an optional locally saved rule
library for reusing patterns and applying multiple highlight colors.

## Permission justifications

### activeTab

Access the active page after the user invokes the extension so it can read visible, non-editable text and display
requested highlights. The extension does not request persistent access to all websites or scan pages automatically.

### scripting

Execute the bundled text collection, highlight application, and clearing functions in the active tab. The code runs
in Chrome's isolated extension world and only processes the page to fulfill a user-requested operation.

### storage

Store the user's saved rule names, expressions, matching flags, colors, enabled states, and local rule identifiers
using `chrome.storage.local`. Saved rules remain on the device; the extension does not use `chrome.storage.sync`.

## Remote code

No remote code is used. All executable code, the matching worker, styles, and icons are bundled in the extension.
User-entered regular expressions are processed by JavaScript's regular-expression engine, not evaluated as scripts.

## Data handling

The extension accesses website text locally to find matches. It does not transmit that text, patterns, rules,
settings, results, or usage information to the developer or any third party. It has no analytics or telemetry.
Page text and match locations are processed in memory, not written to persistent storage. Saved rules and legacy
settings are stored locally as described in the privacy policy.

Use these facts to answer the dashboard's current questions. Distinguish local access to website content from
off-device collection; do not describe the extension as having no access to user data.

The extension does not sell data, use it for unrelated purposes, or use it for creditworthiness or lending decisions.

## Policy URL

[Public privacy policy](https://github.com/jugglingbear/regex-highlighter/blob/main/PRIVACY.md).
