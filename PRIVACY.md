# Regex Highlighter privacy policy

Effective date: September 21, 2026

## Local processing only

**Regex Highlighter does not transmit your data off your device.** Page text, regular expressions, saved rules,
settings, and match results are processed entirely within your local Chrome browser. The extension makes no network
requests and has no server, analytics, telemetry, advertising, or external AI service. Its code and assets are bundled
with the extension; it does not download code, fonts, or other resources at runtime.

Keeping work content on the local machine is a core design requirement of this extension.

## What the extension accesses

When you run a highlight operation, the extension reads visible, non-editable text in the active page's main document
to find matches for the regular expressions you choose. Text below the visible viewport may also be searched.
Matching runs in a local worker inside Chrome. Page text and match locations are held in memory for processing and
highlighting; the extension does not write them to persistent storage.

The extension skips form inputs, editable content, frames, and shadow DOM. It does not collect browsing history or
read cookies. Highlighting is initiated by you; the extension does not automatically scan websites in the background.

## What is saved on your device

When you save a rule, the extension stores its name, regular expression, matching options, highlight color, enabled
state, and a locally generated rule identifier in `chrome.storage.local`. Previously saved search settings may also
remain in local storage for compatibility. These values can contain sensitive information if you include it in a
pattern or rule name.

The extension does not use `chrome.storage.sync` or provide cloud synchronization. Unsaved patterns are not written
to persistent storage. Local storage is part of your Chrome profile; the extension does not add its own encryption.

## Sharing and use

The developer receives no page content, patterns, saved rules, match results, or usage reports from the extension.
The extension does not sell, share, or transfer this information to anyone. Data is used only to provide the
highlighting and saved-rule features you request, never for advertising, profiling, or model training.

Regex Highlighter's use of information received from Google APIs complies with the
[Chrome Web Store User Data Policy](https://developer.chrome.com/docs/webstore/program-policies/user-data-faq),
including its Limited Use requirements.

## Permissions

- `activeTab`: grants temporary access to the active tab after you invoke the extension.
- `scripting`: runs the local text collection and highlighting code in that tab.
- `storage`: saves your rule library locally between browser sessions.

The extension requests no persistent host permissions, browsing-history permission, or cookie permission.

## Retention and deletion

Saved rules remain in your Chrome profile until you delete them or uninstall the extension. Use **Delete** beside a
saved rule to remove it from the library. Uninstalling the extension removes its Chrome local storage, including any
legacy settings. **Clear page** removes highlights and temporary collected text for the current page; it does not
delete saved rules. Navigating away from or closing a page discards that page's in-memory extension state.

## Scope of this policy

This policy describes the extension's own behavior. It does not control the websites you visit, Chrome's own network
activity (including extension installation and updates), or independently configured device backups and workplace
management software. The extension does not send your content through those services.

## Changes

This policy will be updated when the extension's data handling changes, with a revised effective date. Review the
policy and extension version as part of your organization's approval process.
