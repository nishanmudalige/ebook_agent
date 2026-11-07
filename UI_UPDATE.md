# STA258 ebook companion — interface update (November 2026)

This guide describes the first visual update. The subsequent November 2026 update also changed `app.py`, `prompt.py`, `provenance.py`, and `static/plots.js` to add generated graphs and provenance badges; see `COMPACT_BRANDING_AND_PROVENANCE.md`. The API integration, stored ebook knowledge, Render settings and existing vector-store ID remain usable.

## What's new

- University of Toronto Mississauga branding (the supplied UTM logo and Mathematical & Computational Sciences white wordmark).
- Colours drawn from the supplied *University of Toronto Colour Quick Guide*: U of T Blue `#1E3765` (primary), Pantone 633 `#007FA3` (accent), and Pantone 2985 `#6FC7EA` (light accent). Dark mode uses navy-derived dark backgrounds.
- A KyselyTutor-inspired header, textbook introduction, chapter navigation, and chat layout, with an original blue hero and small statistics graphic.
- Clickable chapter links for all ten STA258 chapters. The chapter panel may be shown/hidden; this preference is saved in the browser.
- Light/dark theme toggle, with the chosen theme saved locally in the browser.
- **Four randomly selected example questions**, in a **single horizontal row on desktop**, chosen from **24** STA258-specific prompts. A new selection appears on each visit and new chat; use **Shuffle** to select another four. The selection avoids repeating questions from the immediately preceding group where possible. At narrower widths the cards reorganise into two columns.
- A revised chat composition area, responsive layout, keyboard hints, source links, and accessibility labels.

## Installation / redeployment

### Existing Render + GitHub deployment

1. Unzip this archive and open its `ebook_agent` directory.
2. Replace the contents of your existing GitHub `ebook_agent` repository with these files (preserving any repository-specific customizations you may have made). In particular, copy the `templates/index.html`, `static/styles.css`, `static/app.js`, and `static/branding/` files.
3. Commit and push the changes to the branch used by Render. If automatic deploy is enabled, Render will redeploy. Otherwise, open the service in Render and select **Manual Deploy → Deploy latest commit**.
4. Your existing Render environment variables and OpenAI vector store ID should remain unchanged. **Do not put API keys or access codes into GitHub.**
5. Reload the deployed website (hard refresh if old CSS is cached).

### Local development

```bash
python -m venv .venv
source .venv/bin/activate          # Windows: .venv\\Scripts\\activate
python -m pip install -r requirements.txt
# Set OPENAI_API_KEY and OPENAI_VECTOR_STORE_ID in your environment.
python -m flask --app app run --debug
```

Open `http://127.0.0.1:5000`. The interface loads even if the API is not configured, but sending a question requires the environment variables.

## Maintained behaviour

- `/api/chat` receives `message` and optional `previous_response_id` as before.
- For protected sites, the access code is still sent in `X-Ebook-Agent-Code`; the entered code is stored only in browser session storage.
- Source links, safe Markdown rendering, MathJax mathematical typesetting, and ebook figure URL resolution remain in place.
- Enter submits; Shift + Enter creates a line break.
- No extra Python requirements or new external application services were introduced.

## Files changed

- `templates/index.html` — new accessible page layout and controls.
- `static/styles.css` — U of T light/dark, responsive visual system.
- `static/app.js` — UI behaviour, random prompts, current chat integration.
- `static/branding/utm-logo.svg` — provided UTM crest and wordmark.
- `static/branding/utm-mcs-wordmark-white.svg` — provided white MCS wordmark.
- `static/branding/utm-logo-fallback.jpg` — alternative provided UTM logo format (optional).
- `README.md` and `CHANGES.md` — update notes.
