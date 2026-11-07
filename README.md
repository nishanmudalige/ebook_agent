# STA258 Ebook Companion

An AI study companion for **STA258: Statistics with Applied Probability** at the University of Toronto Mississauga. It uses a Flask web app, OpenAI Responses API, and `file_search` over a vector store containing the ebook.

- **Read the ebook:** <https://nishanmudalige.github.io/STA258_Book/>
- **Ebook source:** <https://github.com/nishanmudalige/STA258_Book>
- **Technical details and maintenance:** [DEVELOPER_GUIDE.md](DEVELOPER_GUIDE.md)

## What students can do

- Ask about concepts, formulas, exercises, and R code; request step-by-step explanations and check calculations.
- Follow links to relevant ebook chapters and, where available, view figures from the published book.
- Request **original** examples, simulated data, interpretations, or statistical plots that are related to the subject but **not** present in the ebook.
- Ask the agent to examine possible mathematical, numerical, wording, or figure/caption issues in the text. Its suggestions require independent verification.

Responses distinguish their evidence:

| Label | Colour | Meaning |
| --- | --- | --- |
| **From the textbook** | Green | The response is attributed to ebook files retrieved during the request. |
| **Related · beyond the textbook** | Orange | New examples, explanations, R code, or graphs based on general statistical knowledge; **not claimed to be in the book**. |
| **Outside the ebook scope** | Red | The question is outside the academic subject area the agent supports. |

A response can combine a green ebook explanation with an orange, newly created example or graph. The interface does not use a green label without a matching retrieved ebook file. This is a *provenance safeguard*, not a guarantee that every statement is correct.

### Interface

- Compact U of T / MCS branding with STA258 hex badge and direct ebook link.
- Four questions shown side by side on desktop, randomly selected from a bank of 24. **Shuffle**, **New chat**, and reloading select new prompts; smaller screens use fewer columns.
- Collapsible ten-chapter guide; on mobile, the chat appears first and the chapter guide is initially collapsed.
- Light/dark mode with saved preference; the MCS logo switches to the white transparent SVG in dark mode.
- Enlarged, resizable question-entry box. **Enter** sends and **Shift + Enter** starts a new line.
- Markdown, formatted equations (MathJax), original SVG plots, and links to relevant sources.

## Updating an existing GitHub + Render deployment

If your app already works and you are **only replacing this project's interface or documentation**, you do **not** need to recreate the vector store.

1. Unzip the application and copy the **contents of `ebook_agent/`** into the root of the existing GitHub repository, preserving any intentional project-specific customizations.
2. Commit and push to the branch connected to Render.
3. If auto-deployment is off, go to **Render → Manual Deploy → Deploy latest commit**.
4. Keep your existing `OPENAI_API_KEY`, `OPENAI_VECTOR_STORE_ID`, and other Render environment variables. Do not upload the secret key to GitHub.
5. Reload the site; hard-refresh if old styling is cached.

The backend features require the coordinated files `app.py`, `prompt.py`, `provenance.py`, and `static/plots.js`. Copying only the HTML and CSS is insufficient.

## Starting from scratch

Run commands **inside the `ebook_agent/` directory**. Python 3 and `pip` are required.

### 1. Install dependencies

macOS / Linux:

```bash
python -m venv .venv
source .venv/bin/activate
python -m pip install -r requirements.txt
```

Windows PowerShell:

```powershell
python -m venv .venv
.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
```

The ZIP intentionally excludes `.venv/`; generate it on your own machine as above.

### 2. Configure the API

Create an OpenAI API key in the API dashboard; API charges are separate from ChatGPT subscriptions. Configure environment variables in your shell or Render, **not in committed files**.

| Variable | Use |
| --- | --- |
| `OPENAI_API_KEY` | **Required** for model requests. |
| `OPENAI_VECTOR_STORE_ID` | **Required** for chat; the `vs_...` value from the knowledge ingest script. |
| `OPENAI_MODEL` | Optional override. The supplied code and Render configuration currently specify `gpt-5.6-terra`; verify that your API project supports the chosen model. |
| `EBOOK_AGENT_ACCESS_CODE` | Optional shared access code. If empty, the site is not protected by this code. |
| `MAX_MESSAGE_CHARS` | Optional; defaults to `12000`. |
| `MAX_OUTPUT_TOKENS` | Optional; defaults to `3500`. |

For example, in macOS / Linux:

```bash
export OPENAI_API_KEY="YOUR_API_KEY"
export OPENAI_VECTOR_STORE_ID="vs_YOUR_VECTOR_STORE_ID"
# Optional: export OPENAI_MODEL="YOUR_SUPPORTED_MODEL"
```

In PowerShell use `$env:OPENAI_API_KEY="..."` and `$env:OPENAI_VECTOR_STORE_ID="..."`.

**If you already have a working vector-store ID, reuse it.** Otherwise, prepare and ingest the book files:

```bash
python prepare_knowledge.py
python ingest_ebook.py
```

You can also prepare from a local clone: `python prepare_knowledge.py --book-dir /path/to/STA258_Book`. Wait for indexing to complete; the ingest script prints a `vs_...` ID to use as `OPENAI_VECTOR_STORE_ID`.

### 3. Run locally

```bash
python -m flask --app app run --debug
```

Open <http://127.0.0.1:5000>. The page can display without API configuration; asking a question requires the API key and vector store ID.

### 4. Deploy on Render

1. Push the app files to a GitHub repository.
2. In Render, create a **Web Service** using that repository and a Python runtime, or use the included `render.yaml` blueprint.
3. For a manual service, use **Build command:** `pip install -r requirements.txt` and **Start command:** `gunicorn app:app`.
4. Set `OPENAI_API_KEY` and `OPENAI_VECTOR_STORE_ID` in Render's environment settings, plus any desired optional variables.
5. If needed, set the health check path to `/health` and deploy.

Do not put keys or access codes in source control. `/health` reports whether the API key and vector store ID are configured; it does not verify that a live model request will succeed.

## Quick checks

- Ask: “According to the ebook, explain the difference between a parameter and a statistic.” Confirm a relevant citation when book content is shown.
- Ask: “Invent a new two-sample t-test example and draw a suitable graph.” Ensure the new illustration is marked **Related** rather than **From the textbook**.
- Try a question unrelated to statistics and confirm the scope label.
- Test **Shuffle**, **New chat**, the chapter toggle, light/dark logo switching, and mobile layout.
- Check mathematical notation, figures, and source links. Any AI-generated statistical result should be verified before reuse.

## Maintaining the ebook content

`knowledge/*.md` consists of **separate chapter, dataset, index, and figure-source files** used for retrieval. These are *not project documentation* and must **not** be merged into this README. They remain unchanged in this package.

When the ebook is updated substantially, regenerate the knowledge files and create a new vector store using `prepare_knowledge.py` and `ingest_ebook.py`; update Render's `OPENAI_VECTOR_STORE_ID` after successful indexing. For existing book images, the app also uses a local figure catalog; see the technical guide.

## Security, cost, and limitations

- Keep the API key server-side and use API project spending limits / alerts.
- The Flask app limits `/api/chat` to **30 requests/hour per IP** (with an overall default limit of 120/hour per IP); this is only a basic safeguard.
- The optional access code is a simple shared-secret check, not a full account system.
- New graphs are *illustrations*. The model has no live general-web browsing tool in this app, and it can make mistakes or fail to retrieve relevant material.
- A live OpenAI request must be tested in your own deployment; UI previews and mocked answers alone cannot verify model connectivity.
