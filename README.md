# STA258 Ebook Companion

An AI study companion for **STA258 — Statistics with Applied Probability**, built around the open University of Toronto Mississauga ebook. It uses a Flask web application, the OpenAI Responses API, and an indexed copy of the ebook.

- [Read the STA258 ebook](https://nishanmudalige.github.io/STA258_Book/)
- [Ebook source repository](https://github.com/nishanmudalige/STA258_Book)
- [Developer Guide](DEVELOPER_GUIDE.md) — implementation details, brand assets, provenance rules, and maintenance

## What students can do

Ask about concepts, calculations, R, worked exercises, and figures in the ebook. The agent can also create **original explanations, examples, illustrative data, and statistical graphs** that are related to the material but do not appear in the book. It can help review passages for possible errors, although its findings require independent verification.

Responses distinguish their sources:

| Label | Colour | Meaning |
| --- | --- | --- |
| **From the textbook** | Green | Linked to an ebook file returned by retrieval; not an independent guarantee that every claim is correct |
| **Related / new** | Orange | Original examples, extensions, R code, or newly generated graphs; not presented as ebook content |
| **Outside scope** | Red | Questions unrelated to the ebook's statistical/academic subject area |

An answer can include both green and orange sections. Generated graphs are always considered **Related / new**, even if they illustrate a textbook concept. The agent identifies supporting ebook chapters when possible.

## Interface

The first view is intentionally compact: an MCS departmental logo, a small STA258 banner with the course hex sticker, **four randomly rotating suggested questions** arranged in one row on desktop, and a tall, resizable message box. A collapsible ten-chapter guide, dark mode, and responsive mobile layout are included. The light/dark theme changes the logo artwork automatically.

Both departmental SVGs have **transparent backgrounds**, and their containing link has **no white background, rounded white panel, or extra white padding**. In light mode, the logo uses `static/branding/utm-mcs-logo.svg`; in dark mode, it uses `static/branding/utm-mcs-logo-white-transparent.svg`.

## Deploy an update to an existing Render service

1. Extract this archive and copy the **contents of the `ebook_agent/` folder** to the root of your existing GitHub agent repository. Commit and push to the branch connected to Render.
2. Deploy the latest commit on Render (or allow automatic deployment).
3. Keep the Render environment variables already in use: `OPENAI_API_KEY` and `OPENAI_VECTOR_STORE_ID`, plus `OPENAI_MODEL` and `EBOOK_AGENT_ACCESS_CODE` if set. **Never commit a real key or password.**
4. Hard-refresh the site to ensure its old CSS has not been cached. Switch between light and dark mode: the SVG logo should now sit directly against the page background in both modes.

**This branding and documentation update does not require a vector-store rebuild.** The application files and retrieval corpus remain in place.

## Fresh installation

**1. Create a Python environment** (Python 3.13 as specified in `render.yaml`):

```bash
python -m venv .venv
source .venv/bin/activate             # macOS / Linux
# .venv\Scripts\Activate.ps1        # Windows PowerShell, instead of the line above
python -m pip install -r requirements.txt
```

**2. Set up the API configuration.** Create an OpenAI API key and provide it as an environment variable, not in Git. API usage is charged separately from a ChatGPT subscription.

```bash
export OPENAI_API_KEY="your-secret-api-key"
```

**3. Prepare and index the ebook**, if a vector store has not already been created:

```bash
python prepare_knowledge.py
# Or use: python prepare_knowledge.py --book-dir /path/to/STA258_Book
python ingest_ebook.py
```

The ingestion script creates a new OpenAI vector store, uploads files in `knowledge/`, waits for indexing, and prints `OPENAI_VECTOR_STORE_ID=vs_...`. Save that ID. If you already have a populated vector store, reuse it rather than repeating these steps.

**4. Run locally:**

```bash
export OPENAI_VECTOR_STORE_ID="vs_..."
# Optional: export OPENAI_MODEL="a-model-supported-by-your-API-project"
python -m flask --app app run --debug
```

Open <http://127.0.0.1:5000>. The model default configured by the project is in `app.py` / `.env.example`; confirm it is available to your OpenAI API project. On Windows PowerShell, use `$env:VARIABLE="value"` for these environment variables.

**5. Deploy a new Render service:** create a Python Web Service connected to this repository, with build command `pip install -r requirements.txt` and start command `gunicorn app:app`. Alternatively use `render.yaml` as a Blueprint. Enter `OPENAI_API_KEY`, `OPENAI_VECTOR_STORE_ID`, and any optional values in Render's environment-variable settings. The health endpoint is `/health`.

## Configuration

| Variable | Required | Purpose |
| --- | --- | --- |
| `OPENAI_API_KEY` | Yes | Server-side API secret |
| `OPENAI_VECTOR_STORE_ID` | Yes | Existing indexed ebook corpus (`vs_...`) |
| `OPENAI_MODEL` | No | Overrides the model default in `app.py` |
| `EBOOK_AGENT_ACCESS_CODE` | No | Optional code for restricting chat requests |
| `MAX_MESSAGE_CHARS` | No | Maximum question length (default 12000) |
| `MAX_OUTPUT_TOKENS` | No | Response token limit (default 3500) |

The backend limits `/api/chat` to 30 requests per hour per IP address and uses a per-process in-memory limiter; this is not strong production-wide abuse protection. The access code, if used, is kept in the browser's session storage, while the API secret remains on the server. Consider API budgets, monitoring, and stronger authentication for wider public deployments.

## Troubleshooting and next steps

- **Old white rectangle behind MCS logo:** hard-refresh and ensure the updated `static/styles.css` has `.institution-link { background: transparent; ... }`. Inspect the *link container*, not only the SVG.
- **Wrong logo in dark mode:** verify that both SVGs are deployed and that `static/app.js` can read `data-light-src` and `data-dark-src` from the image.
- **API errors:** check `/health` and Render logs, and verify the API key, selected model, and vector-store ID. `/health` checks configuration but does *not* send a model request.
- **Old textbook content:** regenerate/re-ingest only when the ebook source changes; then update the vector-store ID on Render after verifying indexing.

See [DEVELOPER_GUIDE.md](DEVELOPER_GUIDE.md) for the architectural map, exact provenance safeguards, plotting rules, file roles, and release test checklist.
