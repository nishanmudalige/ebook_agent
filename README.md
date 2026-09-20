# ebook_agent — STA258 ebook tutor and critical reviewer

A Render-ready Flask chat application grounded in the public STA258 ebook:

- Ebook: https://nishanmudalige.github.io/STA258_Book/
- Repository: https://github.com/nishanmudalige/STA258_Book

The app uses the OpenAI Responses API plus `file_search`. The ebook is indexed in an OpenAI vector store, while the selected base model supplies general statistics and mathematics knowledge.

## What it can do

- answer conceptual questions from the ebook;
- explain and extend examples;
- solve or guide users through exercises;
- generate R code;
- cite retrieved ebook chapters in the chat UI;
- critically check the ebook for likely mathematical, statistical, numerical, wording, or caption errors.

## 1. Create the agent repository

Create a new GitHub repository named `ebook_agent`, copy this project into it, then commit and push.

## 2. Create an OpenAI API project and API key

In the OpenAI API dashboard, create/select a project and create a secret API key. API usage is billed separately from a ChatGPT subscription.

Never put the key in GitHub. Keep it in a local environment variable and later in Render's environment-variable settings.

macOS/Linux:

```bash
export OPENAI_API_KEY="sk-..."
```

PowerShell:

```powershell
$env:OPENAI_API_KEY="sk-..."
```

## 3. Install locally

```bash
python -m venv .venv
source .venv/bin/activate       # macOS/Linux
# .venv\Scripts\Activate.ps1    # Windows PowerShell
pip install -r requirements.txt
```

## 4. Prepare the ebook knowledge files

To download the current `main` branch of the ebook automatically:

```bash
python prepare_knowledge.py
```

Or, if you already cloned `STA258_Book` locally:

```bash
python prepare_knowledge.py --book-dir /path/to/STA258_Book
```

The script copies the `.Rmd` teaching source into supported `.md` files and converts the small CSV datasets into Markdown tables.

## 5. Create and populate the OpenAI vector store

```bash
python ingest_ebook.py
```

Wait until every file reports `completed`. The script then prints a value such as:

```text
OPENAI_VECTOR_STORE_ID=vs_abc123...
```

Save that ID.

## 6. Test locally

macOS/Linux:

```bash
export OPENAI_VECTOR_STORE_ID="vs_abc123..."
export OPENAI_MODEL="gpt-5.6-terra"
flask --app app run --debug
```

PowerShell:

```powershell
$env:OPENAI_VECTOR_STORE_ID="vs_abc123..."
$env:OPENAI_MODEL="gpt-5.6-terra"
flask --app app run --debug
```

Open the local address shown by Flask, usually `http://127.0.0.1:5000`.

Useful tests:

1. `According to the ebook, what is the difference between a parameter and a statistic?`
2. `Explain the intuition behind a 95% confidence interval.`
3. `Help me solve an exercise from Chapter 8 and show the ANOVA steps.`
4. `Check the regression chapter for any caption or sign inconsistency.`
5. `Give R code to carry out a Welch two-sample t confidence interval.`

## 7. Deploy to Render

1. Sign in to Render.
2. Click **New > Web Service**.
3. Connect the GitHub repository containing `ebook_agent`.
4. Set the service name to `ebook-agent` or `ebook_agent`.
5. Runtime: **Python 3**.
6. Build command: `pip install -r requirements.txt`.
7. Start command: `gunicorn app:app`.
8. Add environment variables:
   - `OPENAI_API_KEY` = your secret API key
   - `OPENAI_VECTOR_STORE_ID` = the `vs_...` ID printed by `ingest_ebook.py`
   - `OPENAI_MODEL` = `gpt-5.6-terra` (recommended starting point)
   - `EBOOK_AGENT_ACCESS_CODE` = an optional shared password to prevent unrestricted public use
9. Set health check path to `/health` if configuring manually.
10. Deploy.

Render will provide an `onrender.com` URL. The OpenAI API key remains server-side and is never sent to the browser.

## 8. Updating the ebook later

When the ebook changes substantially:

```bash
python prepare_knowledge.py
python ingest_ebook.py --name "STA258 ebook knowledge base - updated"
```

This creates a new vector store. Replace `OPENAI_VECTOR_STORE_ID` in Render with the new ID and redeploy. After verifying the new version, delete the old vector store/files from the OpenAI API dashboard if you no longer need them.

For small corrections, it is also possible to update only changed files through the API, but recreating this small knowledge base is simpler and less error-prone.

## Model choice

`gpt-5.6-terra` is the default here because it offers a strong balance of reasoning quality and cost for tutoring. For the most demanding error audits, set `OPENAI_MODEL=gpt-5.6-sol`. For a high-volume, lower-cost student deployment, you can experiment with `gpt-5.6-luna` and evaluate answer quality before switching.

## Security and cost controls

- Never commit `OPENAI_API_KEY` or a `.env` file.
- Set `EBOOK_AGENT_ACCESS_CODE` if the Render URL should not be open to anyone.
- The server rate-limits `/api/chat` to 30 requests/hour/IP as a basic safeguard.
- Set an OpenAI project budget/usage alert.
- Keep `max_num_results` modest (currently 8) to control retrieval latency and tokens.
- The free Render tier may sleep after inactivity; the first request after sleep can be slower.

## Important implementation files

- `app.py`: Flask backend and OpenAI Responses API call
- `prompt.py`: tutor/error-checker behavior
- `prepare_knowledge.py`: converts the ebook repo to retrieval files
- `ingest_ebook.py`: creates and populates the OpenAI vector store
- `source_map.py`: maps source filenames to the live ebook pages
- `templates/index.html`, `static/*`: chat interface with Markdown and MathJax
- `render.yaml`: optional Render Blueprint configuration
