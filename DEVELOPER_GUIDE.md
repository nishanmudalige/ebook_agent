# STA258 Ebook Companion — Developer Guide

Technical and maintenance companion to [README.md](README.md). This document consolidates all earlier UI, branding, landing-page, provenance, and change-history notes. The `knowledge/*.md` files are **the ebook retrieval corpus** and deliberately remain separate.

## Architecture

| File / path | Role |
| --- | --- |
| `app.py` | Flask routes (`/`, `/health`, `/api/chat`, `/api/reset`); OpenAI Responses API call; rate limiting; indexed figure candidate lookup |
| `prompt.py` | Book-first tutor instructions, original-material boundaries, error-review behaviour, and response format guidance |
| `provenance.py` | Strict JSON response schema, source verification, plot normalization, provenance fallback |
| `source_map.py` | Retrieval filename → public ebook chapter URL |
| `figure_catalog.json` | Local catalogue of existing ebook illustrations |
| `prepare_knowledge.py` | Converts ebook source and datasets to retrieval-ready Markdown |
| `prepare_figures.py` | Prepares existing ebook figure metadata |
| `ingest_ebook.py` | Creates and indexes an OpenAI vector store from `knowledge/*.md` |
| `templates/index.html` | Main Jinja page template |
| `templates/preview.html` | Standalone preview markup with relative static asset paths; does not itself connect to an API |
| `static/styles.css` | U of T colours, responsive layout, composer, source badges, theme styling |
| `static/app.js` | Chat UI, API calls, local preferences, themes, 24-question bank, keyboard and chapter controls |
| `static/plots.js` | SVG graphs generated from validated plot data, not executable model-authored code |
| `static/branding/` | Local SVG logos and STA258 hex-sticker fallback |
| `render.yaml` | Render web-service build and environment settings |

### Request/response flow

1. A student enters a question or selects a suggested prompt. `static/app.js` posts it to `/api/chat` with an optional `previous_response_id` and, for protected sites, `X-Ebook-Agent-Code`.
2. `app.py` calls the OpenAI Responses API with `prompt.SYSTEM_PROMPT`, optional candidate ebook figures, and `file_search` against `OPENAI_VECTOR_STORE_ID` (`max_num_results=8`). It requests the structured schema in `provenance.ANSWER_FORMAT`.
3. The model returns `category`, `book_answer`, `related_answer`, `outside_answer`, `book_source_filenames`, and an optional `plot`.
4. `provenance.parse_answer` verifies claimed filenames against retrieved ebook files or file-citation annotations. A book section lacking a verifiable supporting filename is **downgraded to Related**; a verifiable filename is not proof that each sentence is correct.
5. The browser renders green/orange/red sections, chapter links, sanitized Markdown, MathJax equations, published ebook figures, and optional generated graphs.

### Provenance semantics

| Category | UI | Practical meaning |
| --- | --- | --- |
| `book` | Green `From the textbook` | A retrieved ebook file supports an attributed response |
| `mixed` | Green + orange | Textbook material plus a distinct original extension/example/graph |
| `related_outside` | Orange `Related · beyond the textbook` | In-scope material not verified as appearing in the book |
| `out_of_scope` | Red `Outside the ebook scope` | Outside the statistical/academic remit |

This classification describes *provenance*, not absolute correctness. Avoid saying an example or graph is in the ebook unless the retrieval evidence supports that claim. A generated graph is always orange even when it visualizes a book topic.

### Graphs, figures and safety

The model can request `normal`, `t`, `chi_square`, `f`, `line`, `scatter`, and `bar` plot specifications. `provenance.normalize_plot` validates finite numerical inputs, limits dataset sizes, constructs reference distribution curves server-side, and returns a normalized specification. `static/plots.js` renders SVG; the app does **not** run arbitrary Python, R, or JavaScript from a model response. Separately, `figure_catalog.json` and `knowledge/figure-index.md` help refer to figures already published with the ebook.

`static/app.js` renders Markdown through `marked`, sanitizes it via DOMPurify, then typesets LaTeX with MathJax. Relative ebook image paths resolve to published ebook assets. Math delimiters are protected before Markdown parsing so `\(...\)` and `\[...\]` survive. Model outputs and citations should still be checked for accuracy.

## UTM branding and the white-background fix

The intended design is compact and follows the supplied 2023 U of T colour guide:

- Primary **U of T Blue** `#1E3765`; teal `#007FA3` and light blue `#6FC7EA` as accents.
- Light-mode logo: `static/branding/utm-mcs-logo.svg` (blue artwork, transparent SVG canvas).
- Dark-mode logo: `static/branding/utm-mcs-logo-white-transparent.svg` (white artwork, transparent SVG canvas).
- The `#institutionLogo` element switches its `src` from the two `data-*-src` values in `static/app.js` when the theme toggles; initial stored theme is applied on load.
- The course hex sticker sits alongside the ebook link. The UI requests the course image from its public GitHub URL and has a local vector fallback (`STA258_hex_badge_fallback.svg`).

**Root cause of the white block (7 November 2026):** the SVG canvases were already transparent. An earlier `.institution-link` CSS declaration had `background: #fff`, white-side padding, and rounded corners. Those styles imposed an opaque card around the transparent artwork. The corrected `static/styles.css` uses:

```css
.institution-link {
  display: inline-flex;
  align-items: center;
  background: transparent;
  border: 0;
  box-shadow: none;
  padding: 0;
  border-radius: 0;
  flex: 0 1 auto;
  min-width: 0;
}
```

**Do not restore a white background on `.institution-link`**. Test on a nonwhite page to verify transparency. This is a **container/style problem**, not a reason to recolour the actual logo artwork or turn it into a raster image.

## Landing page and interaction details

- Short U of T Blue STA258 band; no oversized Σ symbol, decorative plot, or verbose introduction.
- Four distinct example-question cards chosen from a bank of 24, on a single desktop row. Shuffle, reload, and New chat rotate them, avoiding immediate repeats when possible.
- Ten linked ebook chapters with a collapsible chapter panel. Mobile places the chat above the chapter list; the list normally starts collapsed.
- Tall composer: six text rows, CSS minimum height of 165px on desktop and 140px on narrower screens, with vertical resizing. Enter sends; Shift+Enter adds a newline.
- Footer status legend uses three provenance dots only; the unrelated standalone blue indicator was removed.
- Light/dark theme and chapter visibility persist in `localStorage`; optional access code is kept in `sessionStorage`.

## Maintaining the knowledge base

When the ebook changes, regenerate `knowledge/*.md` with `prepare_knowledge.py` (either download the public source or use `--book-dir`), then re-run `ingest_ebook.py` to create a new vector store. Wait for indexing to report completion before updating `OPENAI_VECTOR_STORE_ID` on Render. Existing figures in the local catalogue can be served without rebuilding the vector store; re-ingestion matters for newly changed searchable text or figure-index metadata.

Avoid merging the files in `knowledge/`: their chapter and dataset filenames are used for source mapping, retrieval and chapter citations. The Markdown consolidation applies **only to root project documentation**.

## Release checklist

1. Confirm **two root Markdown guides only**: `README.md` and `DEVELOPER_GUIDE.md`; preserve `knowledge/*.md` intact.
2. Confirm the MCS logo background is transparent and that the link container has no solid background, padding, or rounded white card; verify both light and dark modes and reload to check preference persistence.
3. Check the four prompt cards on desktop and their responsive reflow on small screens; Shuffle, New chat, and chapter toggle should still work.
4. Check the tall resizable composer, Enter/Shift+Enter, long questions, and mobile layout.
5. Verify `/health`, Render environment variables, API permissions, and one real request from each category (book, mixed/new graph, outside scope). `/health` alone is not an end-to-end test.
6. Inspect textbook citation links, MathJax, tables, code blocks, and graph/figure rendering. Check that a new example or plot is not mislabeled as copied from the ebook.

## Consolidated changes

- **Original agent:** ebook ingestion and file search; chapter links and source-aware explanations; improved handling of Markdown, MathJax, relative images, figures, and null previous-response IDs.
- **UTM redesign:** branded blue/teal palette, responsive layout, table of contents, dark mode, course hex badge, four rotating prompts from 24 examples.
- **Provenance and visualization:** verified-file guard for green sections, orange original content, red outside-scope classification, validated original graphs.
- **Layout simplification:** removed the oversized welcome content, shortened the STA258 banner, brought suggestions and the composer together, prioritized mobile chat.
- **Composer and theme refinements:** taller question area, removed unnecessary blue legend dot, theme-specific blue/white logos.
- **Current fix:** removed the white CSS background and framing from `.institution-link` so transparent SVG logos blend directly into the page in either theme; consolidated redundant root documentation into these two guides.

For current installation/deployment commands, use [README.md](README.md), not old update notes. Live OpenAI end-to-end behaviour must be tested against the configured API account before treating the release as production-verified.
