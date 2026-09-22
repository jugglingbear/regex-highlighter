# Regex Highlighter security review

This document records development review evidence for workplace InfoSec and IT evaluation. It is an AI-assisted
project review, not an independent security audit, penetration test, or certification. The
[privacy policy](PRIVACY.md) describes the extension's data-handling commitment.

## Reviewed artifact

Review date: September 21, 2026

Extension version: 0.1.0 (Manifest V3)

Archive: `dist/chrome-regex-0.1.0.zip`

Original reviewed SHA-256: `3f23c3562118574332b8db04e77e8c02e18f26e3a53a141bff6011ddcf5c75bd`

Current archive SHA-256: `415b7715658013610411692e732a6016ecf963b590c698f13a9f93ed4f088cb1`

The archive now includes the bear popup header, optional All matches and Unicode controls, live quick search,
and Enter/Next match navigation. Existing saved flags remain unchanged. Quick search collects bounded navigation
results even with All matches off, displaying only the current result; saved rules retain first-match behavior.
New input cancels a running worker, and page mutations are serialized to prevent stale results replacing newer ones.
All 26 automated tests passed, including live updates, stale-worker cancellation, wraparound navigation, changed-text
rejection, and flag persistence. The user reported that live search and navigation worked after reloading in Chrome. Actual popup inspection
confirmed automatic updates to two Dot-all matches and eleven saved-rule matches; navigation edge cases were tested
in the automated suite, not exhaustively in Chrome. The installed UI evidence below refers to the original reviewed build.

The ZIP passed its integrity check. All 12 entries matched the corresponding project files byte for byte during
review. Its contents are `manifest.json`, `popup.html`, `popup.css`, `popup.js`, `page.js`, `rules.js`, `worker.js`,
`matcher.js`, and four PNG icons. Tests, development tools, and documentation are excluded from the archive.

The user reported loading the extracted release ZIP in Chrome after removing the earlier installation. The installed
copy was exercised through its actual toolbar popup on macOS. The exact Chrome and macOS versions were not recorded.
The installed folder was not independently hashed; archive verification and installed UI testing are separate evidence.

## Permissions and activation

| Permission | Purpose |
| --- | --- |
| `activeTab` | Temporary access to the active page after the user invokes the extension. |
| `scripting` | Run bundled text collection, highlighting, and clearing code in the active tab. |
| `storage` | Retain the saved rule library in `chrome.storage.local`. |

The [manifest](manifest.json) declares no persistent host permissions, background service worker, automatic content
scripts, native messaging, or externally connectable interface. Matching begins only when requested through the popup.

## Data flow and retention

1. [The popup](popup.js) reads the expression and options entered by the user, or loads saved rules locally.
2. [Page collection](page.js) reads visible, non-editable text nodes from the active main document through
   `chrome.scripting.executeScript`. The collected text returns to the popup within Chrome.
3. The popup sends text and selected rules to the bundled [worker](worker.js) through local worker messaging.
   [The matcher](matcher.js) uses JavaScript regular expressions to return text-node indices, match offsets, and counts.
4. The popup passes match locations and colors back to the page function. CSS Custom Highlight ranges display matches
   without replacing the page's text. Highlight styling is inserted into the page DOM.
5. Explicit saves, edits, enable/disable changes, and deletions update the library through [local storage](rules.js).

Page text and match locations are not written to persistent storage. The worker is terminated when matching finishes
or times out. Collected text references are cleared after successful highlight application or **Clear page**; failed
or timed-out operations may leave temporary text in the page's isolated extension state until cleared, replaced by
another collection, or discarded on navigation or tab closure. Highlight ranges remain until cleared or navigation.

Saved names, patterns, flags, colors, enabled states, and local rule identifiers persist in the Chrome profile.
Legacy search settings may also remain. No `chrome.storage.sync` is used. The extension adds no storage encryption;
sensitive information entered into patterns or rule names becomes part of the local saved data when saved.

## Source review findings

Every runtime source file in the ZIP was read, including HTML, CSS, JavaScript, and the manifest.

- No outbound network calls or external endpoints were found.
- All imports, the worker, styles, and icons resolve to bundled resources. Fonts are system fonts.
- No analytics, telemetry, advertising SDK, external AI service, or runtime third-party dependency was found.
- Worker `postMessage` calls exchange data locally within Chrome; they are not network transmissions.
- Expressions are compiled with `RegExp`, not executed as JavaScript through `eval` or `Function`.
- Rule names and result messages are rendered as text. Highlight colors are validated as six-digit hex values before
  being interpolated into page CSS.
- The extension does not read cookies or browsing history. It uses the current tab's ID to target the requested action.

These findings support the conclusion that this version's extension code does not transmit user data off the device
and has no network dependency for processing an already-loaded page. This is a source-review conclusion, not a
measurement of live traffic or a guarantee about other software on the machine.

## Verification performed

The project's automated suite passed all 17 tests during release packaging. It covers matcher behavior, limits,
invalid expressions, Unicode zero-length matches, saved-rule handling, migration, and popup-controller flows.
Controller tests use simulated browser APIs; they do not substitute for installed-extension checks.

The ZIP-installed copy was tested on a public page with ordinary selectable text:

| Check | Observed result |
| --- | --- |
| Keyboard activation | Command + Shift + Y opened a blank, focused expression field. |
| Quick highlight | `\b\w{4,}\b` applied successfully and reported 431 matches. |
| Saving and reopening | Saved rule remained; unsaved quick-search field reset. |
| Two rules and colors | Long-word and short-word rules reported 431 and 386 matches; distinct swatches were shown. |
| Editing | Renaming the second rule updated the existing entry without duplicating it. |
| Disabling | Disabling the short-word rule reduced application to one rule and 431 matches. |
| Invalid expression | `[` produced an unterminated-character-class error. |
| Deleting and reopening | The temporary second rule remained absent after reopening. |
| Clearing | Popup reported zero matches; the page was visually clear and the saved rule remained. |

Counts describe the page at test time and are not fixed expectations for a changing public website. Earlier browser
fixture checks covered overlap priority and multiple-color rendering using the project modules; those fixture checks
were separate from this ZIP-installed run. No functional failure was observed in the installed checks listed above.

## Limits and unverified areas

- No live network capture or disconnected-network test was performed. Offline capability is inferred from the code.
- No independent audit, adversarial page testing, or comprehensive browser/platform compatibility test was performed.
- Chrome's installation/update traffic, the visited website's own requests, device backups, and workplace management
  tools are outside the extension's control. Page-visible highlight styling is not a secrecy boundary from the website.
- Source review found collection caps of 1,000,000 characters and 20,000 text nodes, a shared 5,000-match cap, up to
  30 saved rules, and a two-second worker timeout. These bound work but do not prove immunity to all resource exhaustion.
- Matching excludes frames, shadow DOM, and editable fields; matches do not span text nodes. Browser-restricted pages
  are unsupported. These limitations should be included when assessing suitability for a workplace workflow.

## Repeating the review

From the project directory, run the automated tests and verify the artifact's checksum:

```sh
make test
shasum -a 256 dist/chrome-regex-0.1.0.zip
```

Compare the checksum with the reviewed value above. Review the runtime source and follow the
[installed-extension test instructions](store/reviewer-instructions.md). An organization can additionally capture
extension-specific network activity and test on an already-loaded page while offline.

A changed archive requires a new checksum and review record. Rebuilding may change ZIP metadata even without runtime
source changes. This record applies to the identified archive, not automatically to future releases. Keep the policy,
manifest, review evidence, and distributed package aligned when making changes.
