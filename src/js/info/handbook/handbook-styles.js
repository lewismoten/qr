export const HANDBOOK_TEXT_COLOR = '#172033';

export const HANDBOOK_DOCUMENT_CSS = `
:root {
  --book-ink: #172033;
  --book-teal: #0f766e;
  --book-mint: #5eead4;
  --book-blue: #075985;
  --mode: #d97706;
  --count: #2563eb;
  --data: #0f766e;
}
html { color: var(--book-ink); font: 11pt/1.5 Georgia, serif; }
body { margin: 0; }
a { color: var(--book-blue); text-decoration: underline; }
h1, h2, h3, h4 {
  color: var(--book-teal);
  font-family: "Avenir Next", "Trebuchet MS", sans-serif;
  break-after: avoid;
}
h1 { color: #083344; }
img, svg { max-width: 100%; height: auto; break-inside: avoid; }
pre, code { font-family: ui-monospace, Consolas, monospace; white-space: pre-wrap; }
table { width: 100%; border-collapse: collapse; }
th, td { padding: 0.25rem; border: 1px solid #94a3b8; }
button, input, select, textarea, dialog, footer, .spec-footer,
.info-page-header, nav:not(.handbook-toc) { display: none !important; }
.handbook-cover, .handbook-title-page, .handbook-preface,
.handbook-division { break-before: page; break-after: page; min-height: 8.25in; }
.handbook-cover, .handbook-division {
  box-sizing: border-box;
  padding: 0.65in;
  display: grid;
  place-content: center;
  overflow: hidden;
  background:
    radial-gradient(circle at 15% 10%, rgba(94, 234, 212, 0.32), transparent 35%),
    linear-gradient(145deg, #071827, #0f4c4b 62%, #d7a849);
  color: #fffaf0;
  text-align: center;
}
.handbook-cover h1, .handbook-division h1 { color: #fffaf0; }
.handbook-cover h1 { margin: 0.25rem 0; font-size: 34pt; }
.handbook-cover p { margin: 0.2rem auto; max-width: 28rem; }
.handbook-cover-qr {
  width: 3.2in;
  margin: 0 auto 0.35in;
  padding: 0.18in;
  border-radius: 0.22in;
  background: #fff;
}
.handbook-title-page, .handbook-preface {
  box-sizing: border-box;
  padding-top: 1.2in;
}
.handbook-title-page dl { margin-top: 0.7in; }
.handbook-title-page div { display: grid; grid-template-columns: 8rem 1fr; }
.handbook-title-page dt { color: var(--book-teal); font-weight: 700; }
.handbook-title-page dd { margin: 0; }
.handbook-preface p { max-width: 36rem; }
.handbook-division { min-height: 8.6in; }
.handbook-division-kicker { color: var(--book-mint); text-transform: uppercase; }
.handbook-title { margin-bottom: 0.2in; }
.handbook-toc ol { margin: 0.12rem 0; padding-inline-start: 1.35rem; }
.handbook-toc li { margin: 0.1rem 0; }
.handbook-toc-group { font-weight: 700; }
.handbook-chapter { break-before: page; page-break-before: always; }
.handbook-chapter > h1 { margin-top: 0; }
.handbook-chapter .guide-section {
  break-before: page;
  page-break-before: always;
}
.handbook-external-link { color: #9a3412; text-decoration-style: double; }
.handbook-external-indicator { margin-inline-start: 0.25em; font-weight: 900; }
.reference-links, .implementation-links {
  display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 0.35rem;
}
.reference-links a {
  min-height: 0; padding: 0.45rem; display: block;
  border: 1px solid #99c9c2; border-radius: 0.45rem; text-decoration: none;
}
.reference-links a span { display: block; font-size: 8pt; }
.unit-example-grid {
  display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 0.35rem;
}
.unit-example {
  min-width: 0; padding: 0.35rem; overflow: hidden;
  border: 1px solid #cbd5e1; border-radius: 0.4rem;
}
.payload-units-card { grid-column: 1 / -1; }
.unit-stream { display: grid; grid-template-columns: auto auto minmax(0, 1fr); gap: 0.15rem; }
.unit-stream > span { padding: 0.25rem; color: white; border-radius: 0.25rem; }
.unit-stream .mode { background: var(--mode); }
.unit-stream .count { background: var(--count); }
.unit-stream .data { background: var(--data); }
.unit-stream small { display: block; font-size: 6pt; }
.unit-stream code {
  color: inherit; font-size: 7pt; overflow-wrap: anywhere; word-break: break-all;
}
.mixed-mode-stream { display: grid; grid-template-columns: repeat(3, 1fr); gap: 0.2rem; }
.mixed-segment {
  min-width: 0; padding: 0.3rem; border-inline-start: 0.3rem solid #0f766e;
  background-color: #ccfbf1; color: #134e4a;
}
.mixed-segment.alphanumeric {
  border-inline-start-color: #2563eb; background-color: #dbeafe; color: #1e3a8a;
}
.mixed-segment.byte {
  border-inline-start-color: #0284c7; background-color: #e0f2fe; color: #0c4a6e;
}
.mixed-segment code { color: inherit; overflow-wrap: anywhere; word-break: break-all; }
.mask-guide { break-before: page; }
.mask-formula-grid {
  display: grid; grid-template-columns: repeat(4, 1fr); gap: 0.25rem;
  break-inside: avoid;
}
.mask-formula-card { margin: 0; padding: 0.2rem; border: 1px solid #cbd5e1; }
.mask-formula-card img { width: 100%; max-height: 1.3in; object-fit: contain; }
.mask-formula-card figcaption { font-size: 7pt; }
.mask-formula-card code { font-size: 6pt; }
.visual-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 0.35rem; }
.visual-card { break-inside: avoid; }
.visual-card img { max-height: 2.7in; object-fit: contain; }
.hero {
  padding: 0.5in; border-radius: 0.18in;
  background: radial-gradient(circle at 90% 0, #ccfbf1, transparent 45%), #f0fdfa;
  break-inside: avoid;
}
.hero img { max-height: 3in; object-fit: contain; }
.geo-world-map {
  min-height: 0 !important; height: auto !important; position: relative;
  overflow: hidden; aspect-ratio: 2 / 1; background: #bde6ed;
}
.geo-world-map img { width: 100%; height: 100%; object-fit: contain; }
.geo-world-overlay, .geo-world-marker, .geo-world-label,
.geo-world-map .slippy-map-controls { display: none !important; }
.geo-world-map .slippy-map-attribution {
  position: absolute; z-index: 2; inset: auto 0 0 auto; padding: 0.1rem 0.2rem;
  background: rgba(255, 255, 255, 0.9); font-size: 6pt;
}
.geo-layer-table { table-layout: fixed; font-size: 8pt; }
.geo-layer-table tr { break-inside: avoid; page-break-inside: avoid; }
.geo-layer-table p { margin: 0; overflow-wrap: anywhere; }
.geo-layer-sample {
  width: 0.8in; margin: auto; position: relative; overflow: hidden;
  border: 1px solid #94a3b8; aspect-ratio: 1; background: #dbeafe;
}
.geo-layer-sample > img {
  width: calc(var(--sample-scale, 1) * 100%); max-width: none;
  height: calc(var(--sample-scale, 1) * 100%); object-fit: cover;
}
.geo-layer-sample-mosaic {
  position: absolute; display: block; overflow: hidden; inset: 0 0 0.18in;
}
.geo-layer-sample.has-centered-map > img { visibility: hidden; }
.geo-layer-sample-mosaic .slippy-map-tile {
  position: absolute; width: 100%; height: 100%; overflow: hidden;
}
.geo-layer-sample-mosaic canvas { width: 100%; height: 100%; }
.geo-layer-sample-marker {
  display: none;
}
.geo-layer-sample figcaption {
  position: absolute; z-index: 3; inset: auto 0 0; padding: 0.05rem;
  border-top: 1px solid #94a3b8; background: #f8fafc;
  color: #334155; font-size: 5pt;
  text-align: center;
}
.guide-pixel-sample { width: 2.6in !important; max-height: 3in; margin-inline: auto; }
.guide-pixel-sample svg, .guide-pixel-sample img { max-height: 3in; }
.process-list { padding: 0; list-style: none; }
.process-list li {
  margin-bottom: 0.35rem; padding: 0.35rem;
  border: 1px solid #cbd5e1; break-inside: avoid;
}
.process-list strong { color: var(--book-teal); }
.process-list p { margin: 0.15rem 0 0; }
`;
