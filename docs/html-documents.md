# Long-form HTML documents

Authored HTML should remain below 300 physical lines. Generated pages may be
longer when they compose several independently maintained source sections.

## Current guard

`npm run lint:html` rejects every new source HTML file over 300 lines. Seven
older files predate this rule. Their current lengths are frozen in
`scripts/lint/lint-html-limits.mjs`: they may shrink, but they cannot grow.
Removing those temporary baselines is the remaining migration work.

## Composition model

Long-form pages use recursive comments such as:

```html
<!-- include file="parts/spec/anatomy.html" -->
```

The include path is relative to the containing file and cannot escape
`src/html`. Circular includes fail the build. Includes are resolved before
localization, allowing every locale to reuse the same document structure.

The QR specification is the first migrated long-form page. The remaining
legacy baselines should move to the same model:

1. A page shell containing metadata, navigation, and footer markup.
2. An ordered manifest listing section source files.
3. Standalone section files below 300 lines.
4. A build step that composes sections into one semantic HTML document.
5. On-screen navigation that links to section IDs without removing content.

The application shell should use the same mechanism for tab panels. Lazy-loaded
application fragments can remain separate at runtime, while the guide build can
compose their explanatory forms into complete standalone pages.

This is preferable to storing HTML in JavaScript strings, minifying source, or
splitting files in the middle of elements. Each authored section remains valid,
searchable HTML and can be tested independently.

## Screen, print, and offline output

The full document should remain in the DOM. Screen navigation may present its
sections as tabs or a table of contents, but it should use links and disclosure
controls rather than deleting inactive content. Print CSS can then reveal every
section, remove sticky controls, and preserve headings and page-break rules.

The specification stylesheet provides a paper-friendly print mode. Every guide
footer also offers a client-side handbook action. It gathers About, Technology,
all guides, the specification, and Privacy in the active language, creates a
table of contents, and opens one continuous document for **Print** or
**Save as PDF**.

The ePub action packages the same ordered handbook with the application's
first-party ZIP writer:

- PDF is produced from the composed print document by the browser.
- ePub wraps sections as XHTML spine items with navigation, metadata, styles,
  and captured local images.
- The combined handbook includes About, Technology, Privacy, and every guide.
- Every locale should generate a separate book so language metadata, direction,
  links, and translated prose remain correct.

Keeping HTML composition as the shared source prevents the website, PDF, and
ePub editions from drifting apart.
