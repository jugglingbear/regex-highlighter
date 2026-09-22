# Chrome Web Store listing

Prepared text for the first submission. Dashboard fields have not been submitted.

## Name

Regex Highlighter

## Summary

Highlight regular-expression matches on the current page, entirely locally.

## Description

Find patterns on a web page without sending its content anywhere.

Regex Highlighter runs entirely within your local Chrome browser. Page text, regular expressions, saved rules,
and match results stay on your device. The extension makes no network requests and uses no analytics, telemetry,
cloud matching, or external AI services.

Open the extension, type a regular expression to highlight matches live. Press Enter to jump between results. Use it to spot repeated
phrases, numbers, identifiers, or other patterns in the page you are reading.

- Start searching immediately, without an account or saving a rule.
- Save useful expressions locally and reuse them later.
- Apply multiple saved rules with different highlight colors.
- Choose case sensitivity, multiline anchors, and dot-all matching.
- See match counts and clear highlights when you are finished.
- Open the popup with Command + Shift + Y on Mac or Ctrl + Shift + Y elsewhere, when the shortcut is available.

Highlighting runs only when you request it. The extension uses temporary active-tab access instead of permanent
access to every website. Saved rules use Chrome's local storage and are not synchronized to the cloud.

Use JavaScript regular expressions without surrounding slashes. Searches cover visible, non-editable text in the
main document, including text below the viewport. Matches do not span separate text nodes. Editable fields, frames,
shadow DOM, Chrome internal pages, and the built-in PDF viewer are not supported. Reapply highlights after page
content changes. Processing limits and a matching timeout help keep large or expensive searches bounded.

The local-only commitment describes this extension's behavior; websites, Chrome updates, and independently
configured device backups operate separately. See the privacy policy for details.

## Suggested listing settings

Language: English

Category: choose the closest productivity or developer-tools category offered by the dashboard.

Price: Free

## Outstanding links and choices

- Privacy policy: [public policy](https://github.com/jugglingbear/regex-highlighter/blob/main/PRIVACY.md).
- Support: [GitHub issues](https://github.com/jugglingbear/regex-highlighter/issues).
- Distribution: choose public, unlisted, or private and the available regions.
- Screenshots: `screenshots/02-multiple-colors.png` and `screenshots/04-dot-all.png` (1280 × 800).
- Promotional tile: `promo-tile.png` (440 × 280); editable source: `promo-tile.svg`.
