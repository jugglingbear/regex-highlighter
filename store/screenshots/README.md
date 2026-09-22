# Store screenshot setup

The [fictional guild archive](../juggling-bears.html) is a local page with no scripts or remote resources.
Serve the project directory locally, then open the archive in Chrome:

```sh
python3 -m http.server 8765 --bind 127.0.0.1
```

Page: <http://127.0.0.1:8765/store/juggling-bears.html>

## Example rules

Use the installed extension with Ignore case enabled and the other flags disabled.

| Rule name | Expression | Color | Expected matches |
| --- | --- | --- | --- |
| Guild permits | `\bJB-\d{4}-\d{3}\b` | `#ffe066` (gold) | 3 |
| Bear performers | `\bB\w+ Bear\b` | `#b7a4f4` (lavender) | 5 |
| Historical dates | `\b\d{1,2} (?:June\|July) \d{4}\b` | `#9de0ca` (mint) | 3 |

## Capture plan

1. Quick search: highlight the permit expression to show finding structured identifiers without saving.
2. Multiple colors: save all three named rules, then apply enabled rules. Expected total: 11 matches.
3. Capture the actual page and extension interface without personal browser tabs, bookmarks, or profile details.
   Export store screenshots at 1280 × 800 pixels. Do not manufacture highlights or match counts in the sample page.

The sample page and these instructions are excluded from the extension ZIP by the packaging inclusion list.

## Captured images

- `02-multiple-colors.png`: replacement capture with eleven matches and saved-rule controls visible, without a cursor.
- `01-dot-all.png`: two peach note matches with the bear header, live-search controls, and optional flag checkboxes.

Images are 1280 × 800 PNGs captured from the local page after applying the installed extension.
The replacement multicolor and Dot-all captures exclude personal browser chrome and the surrounding desktop.
The three example rules remain saved in the installed extension; the earlier long-word test rule was disabled.

## Multiline and Dot-all examples

Open the [performance ledger](../juggling-bears-ledger.html) through the same local server.
Its ledger is a single text node with real newline characters. This matters: the extension searches each text node
separately, so Dot-all does not bridge separate HTML paragraphs.

| Rule name | Expression | Flag to enable | Color | Expected matches |
| --- | --- | --- | --- | --- |
| Evening acts | `^ACT \d{2}: .+$` | Multiline (`m`) | `#a8d8ff` (sky blue) | 3 |
| Stage notes | `BEGIN NOTE.*?END NOTE` | Dot-all (`s`) | `#ffbea8` (peach) | 2 |

For each quick-search capture, enable only the indicated flag (Ignore case can remain enabled).
With that flag disabled, its expression returns zero matches on the ledger. Multiline makes `^` and `$` apply to
individual lines; Dot-all lets `.` match the newline characters inside each note. The lazy `.*?` keeps the two notes
separate. Save both rules and apply together to show five matches in two colors.

New captures should include the actual extension popup beside the document, with the pointer moved outside the
captured area. Only the two final numbered screenshots are retained in this directory.
