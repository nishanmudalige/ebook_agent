# STA258 Ebook Companion — Developer Guide

This is the companion to [README.md](README.md). It consolidates the former `UI_UPDATE.md`, `STREAMLINED_LANDING.md`, `CHANGES.md`, and `COMPACT_BRANDING_AND_PROVENANCE.md` into a single implementation and maintenance reference.

## Architecture and data flow

1. `templates/index.html` and `static/styles.css` render the interface; `static/app.js` handles the theme, chapter guide, rotating question cards, text composer, chat requests, and answer display.
2. The browser sends `POST /api/chat` with `message` and an optional `previous_response_id`. If access control is enabled, it sends `X-Ebook-Agent-Code`.
3. `app.py` provides Flask routes, API configuration, rate limiting, a local ebook-figure lookup, and the OpenAI Responses API call. The call uses `file_search` with `OPENAI_VECTOR_STORE_ID`, and `prompt.py` supplies the tutor's instructions.
4. The response uses a structured schema (`provenance.ANSWER_FORMAT`) with `category`, `book_answer`, `related_answer`, `outside_answer`, `book_source_filenames`, and `plot`.
5. `provenance.py` checks that a green book answer is associated with at least one real ebook filename found in the API's search results or file-citation annotations. If no matching retrieved file can be verified, the answer is treated as **Related** with an explicit caveat rather than labeled **From the textbook**.
6. The browser renders the appropriate labelled sections, chapter links, sanitized Markdown/MathJax, and—when present—safe SVG plots from `static/plots.js`.

### Provenance contract

| Structured category | Presentation | Rule |
| --- | --- | --- |
| `book` | Green book section | Claims should be backed by retrieved ebook files; the server verifies matching filenames. |
| `mixed` | Green + orange sections | Distinguish ebook explanation from an original example, code, extension, or plot. |
| `related_outside` | Orange related section | In-scope statistical material not verified in the ebook. |
| `out_of_scope` | Red section | Unrelated to the agent's statistical / academic remit. |

`prompt.py` instructs the model to consult the book for in-scope questions, avoid fabricated citations, and clearly separate original material. **Checking retrieved filenames does not prove every claim is correct or precisely supported by the cited passage.** Manual checks remain important, especially for error audits.

### Generated graphs versus ebook figures

**Original graphs** use structured numerical specifications, not generated executable plotting code. The server validates and normalizes them in `provenance.normalize_plot`; the browser uses `static/plots.js` to draw SVG. Supported types are `normal`, `t`, `chi_square`, `f`, `line`, `scatter`, and `bar`. The server calculates distribution curves, checks numerical data for other chart types, bounds input sizes and values, and marks generated graphs **Related** even when the underlying concept is in the textbook.

**Existing ebook figures** are different: `figure_catalog.json` gives the backend candidate figures, and the UI can show published image URLs when appropriate. `knowledge/figure-index.md` supports searchable figure context. `prepare_figures.py` helps derive figure listings from the ebook's built site, while `prepare_knowledge.py` converts teaching source and dataset content to Markdown. Regenerate and re-ingest if you want the vector store itself to reflect newly prepared source material; the local figure catalog already works independently of a new vector-store ingestion.

## Interface and branding

| File | Responsibility |
| --- | --- |
| `templates/index.html` | Main Jinja template, logos, chapter links, chat and composer. |
| `templates/preview.html` | Standalone interface preview with relative static paths; no real API connection. |
| `static/styles.css` | U of T branding, compact layout, dark theme, responsive sizing, provenance labels. |
| `static/app.js` | Chat, keyboard interactions, saved preferences, prompt rotation, and theme-aware logo switching. |
| `static/plots.js` | Generated SVG plots from validated numerical data. |
| `static/branding/utm-mcs-logo.svg` | Light-theme MCS logo. |
| `static/branding/utm-mcs-logo-white-transparent.svg` | White transparent MCS logo for dark mode. |
| `static/branding/STA258_hex_badge_fallback.svg` | Local fallback for the course hex sticker. |

Brand accents follow the supplied U of T colour guide: **U of T Blue `#1E3765`** (primary), **`#007FA3`** (secondary), and **`#6FC7EA`** (light accent). Dark surfaces use navy-derived colours. The official STA258 course badge is requested from its published image URL with a local vector fallback if unavailable.

The opening screen deliberately avoids a large decorative welcome block. It shows the compact course header, four suggested questions, and a usable input area immediately. Desktop displays the four prompts in one row; narrower viewports reflow them. On mobile, the chat precedes the chapter list, and the list starts collapsed.

- The **24-question bank** and rotation/shuffle logic are in `static/app.js`. The UI attempts to avoid repeating the most recently displayed group.
- Theme and chapter visibility are saved in browser local storage; the optional access code is held in browser session storage.
- The composer starts at **six rows** and has a larger CSS minimum height; it remains vertically resizable. Enter sends; Shift + Enter inserts a line break.
- The decorative blue dot preceding the footer's source-status legend was removed; the three coloured category indicators remain.
- Markdown is rendered through `marked`, sanitized using DOMPurify, with mathematical notation handled by MathJax. The application rewrites relative ebook image paths to published asset URLs.

## Code map

| File | Purpose |
| --- | --- |
| `app.py` | Routes `/`, `/health`, `/api/chat`, `/api/reset`, chat API call, figure candidates. |
| `prompt.py` | Book-first tutoring, answer separation, graph and math instructions. |
| `provenance.py` | Structured output schema, citation checks, plot data checks. |
| `source_map.py` | Map chapter/source filenames to public ebook page URLs. |
| `prepare_knowledge.py` | Generate retrieval-ready Markdown files from the source ebook. |
| `prepare_figures.py` | Extract figure metadata from the built ebook. |
| `ingest_ebook.py` | Create and populate a new OpenAI vector store. |
| `knowledge/*.md` | Retrieval corpus (chapters, datasets, figure index, index). Do not consolidate. |
| `figure_catalog.json` | Backend's local figure candidates. |
| `render.yaml` | Optional Render Blueprint and runtime configuration. |
| `.env.example` | Placeholder environment variable names; not a secret file. |

## Maintenance and deployment notes

**Interface-only updates** do not require a new vector store. Keep the current API key and vector-store environment variables in Render. **Prompt, provenance, or plot changes** require deploying the matching Python and JavaScript files together. **Knowledge changes** require generating and indexing new retrieval content if you want the hosted vector store updated.

To rebuild the knowledge base:

```bash
python prepare_knowledge.py
python ingest_ebook.py --name "STA258 ebook knowledge base - updated"
```

Wait for indexing before switching Render to the newly printed vector-store ID. Retire older vector stores only after confirming the replacement works.

To smoke-test an updated build:

1. Verify `/health` and the browser console; note that `/health` does not make a real model request.
2. Toggle light/dark and check the MCS logo changes appropriately. Refresh to check saved theme.
3. Toggle chapters, shuffle prompts, start a new chat, and check four-card desktop / mobile presentation.
4. Ask one book-based question, one request for a new statistical plot, and one clearly unrelated question. Check green/orange/red sections, citations and chart labels.
5. Test LaTeX, code blocks, tables, long prompts, and published figure images; verify actual model behavior before releasing broadly.

## Consolidated change history (2026)

- **Initial rendering fixes:** Protected mathematical delimiters before Markdown parsing; improved Markdown layout and figure handling; restored caption/chunk metadata in knowledge preparation; fixed null `previous_response_id`; sanitized HTML and kept detailed tracebacks in local debug mode only.
- **UTM interface redesign:** U of T palette, chapter guide, theme toggle, responsive layout, and four randomized STA258 prompts from a bank of 24.
- **Source provenance and visualizations:** Structured green/orange/red answer sections, conservative citation matching, and new validated SVG charts distinct from original ebook figures.
- **Compact opening screen:** Removed the oversized Σ/welcome block and tall hero, reduced empty space, made the chat the first mobile element, and placed suggested prompts directly above the input.
- **Latest composer and branding refinement:** Enlarged the text-entry area, removed the extraneous blue footer dot, and switched MCS header logos based on light/dark mode.

The application still needs live end-to-end testing with a configured OpenAI account after deployment. Prior visual previews or simulated answers are not evidence of a working API connection.
