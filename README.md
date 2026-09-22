# Regex Highlighter

A local-only Chrome Manifest V3 extension. No runtime dependencies, account, or remote service.

## Privacy

**Your page content and regex data stay on your device.** The extension makes no network requests. All matching
runs locally in Chrome, and saved rules use local storage without cloud synchronization. There is no analytics,
telemetry, or external AI service.

See the [privacy policy](PRIVACY.md) for data handling, permissions, retention, and the scope of this commitment.
For an InfoSec review, the runtime files are listed below and the release ZIP contains the readable source code.
The [security review](SECURITY-REVIEW.md) records the reviewed ZIP checksum, data flow, permissions, completed checks,
and verification limits for workplace evaluation.

## Package for release

```sh
make package
```

Requires Node.js, npm, and the `zip` command (included with macOS). Runs the automated tests first, then creates
`dist/chrome-regex-0.1.0.zip`, using the version in `manifest.json` for the filename. This command does not bump the
version or upload anything. Rebuilding the same version replaces its ZIP only after packaging succeeds.

The archive has `manifest.json` at its root and includes only the popup, runtime JavaScript, and four PNG icons.
Tests, documentation, icon source, development scripts, and prior builds are excluded. Generated archives are ignored
by Git. Icons are packaged as checked in; run `make icons` after editing their generator. When adding runtime files,
update the explicit inclusion list in `scripts/package.js`.

## Install locally

1. Open `chrome://extensions` in Chrome.
2. Turn on **Developer mode**.
3. Click **Load unpacked** and select the project folder containing `manifest.json`.
4. Pin **Regex Highlighter** from Chrome’s extensions menu.
5. Open a regular web page and the popup. Type a pattern such as `\b\d+\b` in the focused field. Highlights update after a short pause.
   Press **Enter** to jump to the first result and again to advance. No name, saved rule, or saving step is required.
6. Click **Clear page** to remove highlights while keeping saved rules. After editing extension files, click **Reload** on its card in `chrome://extensions` and reopen the popup.

Enter raw JavaScript regex syntax without slash delimiters. All matches (`g`), Unicode (`u`), and Ignore case (`i`)
default on and can be unchecked. Multiline anchors (`m`) and Dot-all (`s`) default off.
With All matches off, quick search highlights one result at a time; **Enter** or **Next match** advances and wraps.
Saved rules without All matches still select only their first match across the collected page text.
Quick navigation skips zero-length matches. A zero-length first match in a non-global saved rule cannot be highlighted.
Unicode treats code points such as simple emoji as whole characters and enables Unicode property escapes;
without it, regex operates on UTF-16 code units. Saved rules retain their selected flags locally on this device.
Counts appear after running a search.

## Keyboard shortcut

Press **Command + Shift + Y** on Mac, or **Ctrl + Shift + Y** on Windows, Linux, and ChromeOS, to open the popup while Chrome is focused. Pinning the extension is optional.

If the extension is already installed, open `chrome://extensions` and click **Reload** on the Regex Highlighter card to pick up this update. Then try the shortcut on a regular web page.

To check or change the assigned keys, open `chrome://extensions/shortcuts`, find **Regex Highlighter**, and edit **Activate the extension**. If the shortcut is blank or conflicts with another extension or system shortcut, assign an available combination there. Chrome may retain an existing custom assignment instead of the suggested default.

This uses Chrome's built-in [`_execute_action` command](https://developer.chrome.com/docs/extensions/reference/api/commands), which opens the existing popup without a background script or additional permissions. The installed shortcut requires a manual check because browser automation cannot access Chrome's extension-management pages.

## Quick highlighting

Every popup opening starts with a blank **Regular expression** field focused and ready to type, including openings
via **Command + Shift + Y**. Typing updates highlights after a 250 ms pause; flag and color changes update immediately.
**Enter** or **Next match** scrolls to the first result, then advances through results and wraps.
**Refresh** reruns the search after page changes. **Shift + Enter** inserts a newline. Quick highlighting replaces this extension's current page
highlights and does not change saved rules, even if you have opened one for editing.

New input cancels an older search. Invalid partial patterns leave previous highlights visible with a status message;
clearing the pattern clears highlights. Navigation is disabled until valid results are ready. If matched page text
changes, rerun with **Refresh** before navigating. Results remain bounded by the existing collection and match limits.

To reuse the same expression later, click **Save highlight**. It saves the current regex,
flags, and color as a new enabled rule, automatically named from the pattern (up to 60 characters). To choose a name,
expand **Name or edit saved rule (optional)** and enter a **Rule name** before saving. You can also rename it later
with **Edit**. **Save highlight** always creates a new rule, even while editing, and retains the expression in the
editor. Highlighting never saves automatically. Only explicitly
choosing **Edit** on a saved rule and then **Update saved rule** changes that rule. **+ New** or **New quick search**
leaves edit mode and focuses a fresh field. Unsaved editor text is discarded when the popup closes.

Quick highlighting works while the library loads and even if saved-rule storage is unavailable. Saving and applying
saved rules wait for successful loading; storage completion does not replace typed text or steal focus.

After updating, **Reload** the extension at `chrome://extensions`, close the old popup, and reopen it. Verify the
caret is ready without clicking the field, including when opening with **Command + Shift + Y**.

## Saved rules and multiple colors

Reload the extension card at `chrome://extensions`, then reopen with **Command + Shift + Y**. Existing valid saved search settings migrate to a rule named **Previous search**.

- **+ New** starts a fresh quick search. Optionally save its name, regex, color, and flags as described above.
  **Edit** opens a saved rule for explicit updating; **Delete** removes it. Checkboxes persist enabled states.
- **Apply enabled rules** replaces this extension’s page highlights with all checked rules. For example, save a red “Bad text” rule and a yellow “Warnings” rule, enable both, and apply. Saving, editing, deleting, or disabling rules does not change existing page highlights until you apply again.
- Live quick search applies just the editor pattern and color without saving. **Refresh** reruns it.
  No name is required.
- **Clear page** removes all this extension’s highlights on the current page, preserving saved rules and enabled states. No enabled rules produces guidance to enable one or clear the page.
- Rules persist in `chrome.storage.local` across popup and browser sessions on this device. They are not synced between devices. Removing the extension removes its saved data. Highlights update while editing the popup and disappear on navigation; there is no automatic all-site application and no additional permissions.
- On overlapping text, the **earlier rule in the list wins the color**, while non-overlapping portions retain their own colors. Rules stay in creation order; editing keeps the position. Per-rule counts include overlapping matches, so the total is the sum of rule counts, not the number of distinct highlighted regions. “Last applied results” describes the last application in this popup session; reopen and apply to refresh counts.

## Scope and limits

- Searches visible, non-editable text nodes in the main document, including text below the fold. Each text node is searched separately: matches do not span formatting elements or paragraphs.
- Skips scripts, styles, hidden content, form controls, editable regions, frames, and shadow DOM. Chrome internal pages, the Web Store, and built-in PDF viewer cannot be searched. Local files require enabling **Allow access to file URLs** in extension details.
- Highlights use CSS Custom Highlight, leaving the page’s text and elements intact. Re-run after page content changes; navigation removes highlights. Invalid or timed-out searches preserve prior highlights.
- Maximum 1,000,000 collected characters, 20,000 text nodes, and 5,000 highlights shared across enabled rules, in list order. Up to 30 rules can be saved. Partial results are labeled; later rules may receive no remaining highlight budget. The entire matching batch runs in a local worker terminated after two seconds to contain expensive expressions. Timeout or a changed page leaves previous highlights intact.
- Permissions: `activeTab` grants access after your toolbar click or activation shortcut; `scripting` runs the highlighter in that tab; `storage` remembers the saved rule library. No persistent host permissions and no network requests.

## Test

Run the complete automated suite from the project directory:

```sh
make test
```

This runs `npm test`, which executes every `tests/*.test.js` file with Node's test runner. Node.js and npm are
required; no dependency installation is needed. A failing test makes `make test` exit nonzero. The current tests
cover offsets, flags, invalid patterns, Unicode zero-width matches, limits, text-node boundaries, saved-rule
persistence/edit/delete/disable, migration, multiple colors, overlapping counts, and the popup controller’s
quick-search/focus/optional-save flows.

Run `make` or `make help` for the command list. `npm test` remains available directly; override the npm executable
with `make test NPM=/path/to/npm` if needed.

**Browser checks are separate:** `make test` does not launch Chrome, run the browser fixtures, or exercise the
installed extension. Use the manual checks below for rendering, browser persistence, and extension permissions.

For a browser integration fixture, run this from the project directory:

```sh
python3 -m http.server 8765 --bind 127.0.0.1
```

Open `http://127.0.0.1:8765/tests/demo.html` and click **Run integration checks**. It uses the actual page/matcher/worker modules to verify highlighting, clearing, hidden/editable exclusions, unchanged page content, and worker execution. The first email should show red over its overlapping prefix and yellow over the remainder; the second email should be yellow. Reload the fixture and rerun to check that two rules were restored from the prior run. Fixture persistence uses a localStorage adapter for the same rule-library module, not the installed extension’s storage. This harness does not exercise Chrome extension permissions or the installed toolbar popup.

For an interactive preview of the real popup JavaScript, open `http://127.0.0.1:8765/tests/popup-preview.html`. It uses a test-only Chrome adapter and localStorage; its Apply button highlights the preview page itself. The fixture does not prove installed extension permission behavior.

To smoke-test the installed extension on a freshly loaded fixture, use live quick search: search `\b\d+\b` (4 matches),
`cat` (3 with ignore-case, 1 without), `[` (invalid-pattern feedback), and `(?=cat)` (0 highlights, zero-length
warning). Clear should remove the highlights without changing the page. Try a Chrome internal page for access-error
feedback.

Validation during development: all 17 automated tests passed. Chrome integration checks verified two colors, overlap
priority, counts, clearing, unchanged text, worker execution, and persistence across reload. The popup preview was
exercised for add/edit/delete/disable, validation, reload persistence and multi-rule application, and colors/layout were
visually checked. The user confirmed the installed keyboard shortcut works. Browser automation blocks
`chrome://extensions`, so loading the unpacked extension and the installed-popup smoke test remain manual.

## Files

- `Makefile`: default help, automated tests, icon generation, and release packaging.
- `scripts/package.js`: builds a clean, versioned ZIP from an explicit runtime file list.
- `icons/`: violet capture-bear regex icon, with SVG and 16/32/48/128-pixel PNG exports.
- `scripts/generate-icons.js`: dependency-free icon generator; run `make icons` after design changes.
- `manifest.json`: extension metadata and minimal permissions.
- `popup.html`, `popup.css`, `popup.js`: toolbar interface and orchestration.
- `page.js`: collection and non-destructive highlight ranges.
- `matcher.js`, `worker.js`: matching logic and cancellable worker.
- `rules.js`: rule validation, local persistence, and migration.
- `tests/`: automated checks and local browser fixture.

Chrome APIs: [scripting](https://developer.chrome.com/docs/extensions/reference/api/scripting), [activeTab](https://developer.chrome.com/docs/extensions/develop/concepts/activeTab). Highlight API: [MDN](https://developer.mozilla.org/en-US/docs/Web/API/CSS_Custom_Highlight_API).

Quick-flow browser validation uses the real popup controller through the test-only adapter: default field focus,
Enter without a name, optional save of the same pattern, empty focused field after reload, and retained saved-rule
application were checked. Actual installed-popup/shortcut focus still needs the manual check above.
