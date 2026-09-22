# Reviewer instructions

No account, credentials, payment, or external service is required.

1. Open a normal web page containing selectable text, such as an article. Chrome internal pages and the Chrome Web
   Store cannot be highlighted because Chrome restricts extension access there.
2. Open Regex Highlighter from the toolbar. Enter `\b\w{4,}\b` and pause briefly. Words of at least four characters
   should be highlighted, and the popup should display a match count.
3. Click **Save highlight** to store the expression locally. It should appear in the saved-rule list.
4. Enter `\b\w{1,3}\b`, choose a different color, and click **Save highlight**. Click **Apply enabled rules**.
   Short and long words should now have different highlight colors.
5. Close and reopen the popup. Saved rules should still be listed; the quick-search field should be blank.
6. Click **Clear page**. Highlights should disappear while saved rules remain available.
7. Enter `[` and pause briefly. The popup should display an invalid-expression error.
8. Delete a saved rule. Reopen the popup and confirm the deleted rule is absent.

The extension reads visible, non-editable text in the active main document only. It skips form fields, frames,
and shadow DOM. All processing and rule storage are local. No network connection is required by the extension;
the page itself may require a connection to load.

## Additional release checks

These checks are for the maintainer and are not claims of completed validation.

- Load the extracted release ZIP and repeat the steps above in the installed extension.
- Test the keyboard shortcut and a page containing overlapping matches.
- Inspect the extension popup and worker network activity while saving, matching, clearing, and deleting rules.
  Separate extension activity from the page's and Chrome's own requests. The expected outbound request count from
  extension operations is zero.
- Test after disabling network access once the sample page has loaded.
- Record the tested Chrome version, extension version, and ZIP checksum for workplace review.
