# Streamlined opening screen — November 7, 2026

The first visit now prioritizes the four rotating question cards and the chat input. The tall introduction (Σ emblem, promotional headline and explanatory paragraph) has been removed, and the chat panel no longer reserves hundreds of pixels of unused space before the first message. The STA258 banner, MCS wordmark, ebook link and course hex badge remain but use a much smaller footprint.

Desktop shows four questions in one row; tablet and mobile use two columns, with the narrowest phones stacking cards. On mobile the chapter guide is collapsed by default and the chat is placed before it. New chat restores the compact starter layout. Sending a message expands the normal scrolling chat and keeps source attribution and graph output unchanged.

To deploy, replace the application files with the contents of the archive, commit to GitHub, then redeploy the existing Render service. Existing `OPENAI_API_KEY`, `OPENAI_VECTOR_STORE_ID`, and Render configuration remain unchanged. No vector-store rebuild is needed for this visual update.

The opening screen, shuffle, chapter toggle, mobile layout, mocked answer provenance and generated graph output were browser-tested locally. The live OpenAI connection has not been tested for this revision.
