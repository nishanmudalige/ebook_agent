## November 2026 — streamlined initial view

- Removed the oversized introductory sigma symbol, welcome headline, and explanatory paragraph. The four prompt suggestions now appear immediately under a small “Try a question” label and above the input.
- Reduced the height of the STA258 banner and chat heading without losing the UTM MCS logo, course hex badge, or ebook link.
- Removed the forced large empty chat area on first load: before a conversation starts, the chat panel fits its content. Once a question is sent, the regular scrollable conversation area returns.
- On narrow screens, the chat is shown before the chapter guide. Chapters remain available using the Show/Hide chapters button.
- Kept all backend answers, three coloured source badges, generated graphs, book citations, four rotating example questions, and light/dark modes.

## November 2026 — compact brand refresh and source labels

- Simplified the U of T Blue banner and replaced duplicate university logos with the departmental MCS wordmark.
- Included the STA258 cat/μ hex sticker next to the ebook link (upstream exact sticker with local vector fallback).
- Added new content provenance structure in `prompt.py`, `provenance.py`, and `app.py` for textbook-supported (green), related original (orange), and outside-the-ebook (red) answers.
- Added a safe generated graph renderer in `static/plots.js`; new plots are explicitly classified as related content.
- Kept chapter links, dark mode, question shuffle, original file search, figure links, and deployment configuration.
- Verified desktop/mobile presentation and tested different answer categories with representative mocked responses.

## November 2026 — U of T branded KyselyTutor-inspired UI

- New responsive UTM interface, 10-chapter navigation, dark mode, and supplied institutional/departmental logos.
- Four horizontally arranged random question cards on desktop, cycling through a 24-question bank; Shuffle / New chat / reload refresh the examples.
- Kept original backend, source links, Markdown/MathJax, access-code handling, and image rendering.
- See `UI_UPDATE.md` for details and installation.

# Updated ebook_agent fixes

This build includes:

- robust MathJax rendering for `\\(...\\)` and `\\[...\\]` without Markdown stripping the backslashes;
- better Markdown tables, lists, equations, and image layout;
- real ebook figure support using a lightweight local figure catalog and the existing public STA258_Book images;
- automatic conversion of relative ebook image paths to public GitHub URLs;
- instructions preventing ASCII-art substitutes when a real ebook figure is available;
- preservation of R chunk metadata and figure captions when rebuilding the knowledge files;
- the `previous_response_id = None` bug fix;
- detailed local Flask errors while retaining safer production errors;
- HTML sanitization for model-generated Markdown.

The bundled figure catalog works with an existing vector store. Re-ingesting the knowledge files is optional now, but recommended later if you want the vector store itself to contain the new figure index and preserved chunk metadata.
