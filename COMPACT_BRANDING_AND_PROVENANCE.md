# Compact banner and related-content update — November 2026

- Replaced the original tall, decorative hero with a short, flat U of T Blue (#1E3765) banner.
- Promoted the supplied Mathematical and Computational Sciences wordmark as the **only institutional logo** in the header; removed competing duplicate institutional branding and ornamental graphics.
- Included a small **STA258 hex sticker**, linking to the ebook. The badge is the same public image used on the STA258 ebook homepage; it is loaded from its upstream GitHub URL, with an embedded local vector fallback so the sticker remains visible if the online source cannot load.
- Preserved the four rotating prompt cards on desktop, responsive layout, chapter menu, dark mode and math/chat handling.
- Added book-provenance answer modes: **From the textbook** (green, verified file-search source); **Related · beyond the textbook** (orange, original examples, code or newly generated graphs); **Outside the ebook scope** (red). Mixed replies may show green and orange sections together. Related is allowed even when the requested graph/example does not exist in the ebook.
- Plot support uses safe generated 2-D SVG charts from validated numerical data. It never runs user/model-supplied plotting code. New plots always have an orange badge.

The hex-badge image is retrieved at runtime from:
https://raw.githubusercontent.com/nishanmudalige/STA258/main/Hex%20Badges/STA258_no_bg.png

To deploy, replace existing repository files with this folder, commit/push, and redeploy the Render service. Keep OPENAI_API_KEY, OPENAI_VECTOR_STORE_ID, and other environment variables set on Render. The output provenance categories need the included app.py, prompt.py, provenance.py, and plots.js, not only a UI-only copy.

The local fallback is a faithful, simplified original vector rendering, rather than a copy of the upstream raster image; when accessible, the upstream official image fades over it.
