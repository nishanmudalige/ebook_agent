"""Prepare retrieval-friendly Markdown and a lightweight figure catalog for STA258.

Sources can be either:
  1. a local clone/copy of STA258_Book, or
  2. the public GitHub main branch downloaded automatically.

The generated figure catalog contains URLs only; it does not copy the image files into
this app, keeping ebook_agent small even when the ebook contains many figures.
"""

from __future__ import annotations

import argparse
import io
import json
import re
import tempfile
import zipfile
from pathlib import Path
from urllib.parse import quote

import pandas as pd
import requests

GITHUB_ZIP = "https://github.com/nishanmudalige/STA258_Book/archive/refs/heads/main.zip"
RAW_BOOK_BASE = "https://raw.githubusercontent.com/nishanmudalige/STA258_Book/main/"
IMAGE_EXTENSIONS = {".png", ".jpg", ".jpeg", ".gif", ".svg"}


def download_repo() -> Path:
    r = requests.get(GITHUB_ZIP, timeout=120)
    r.raise_for_status()
    temp = Path(tempfile.mkdtemp(prefix="sta258_book_"))
    with zipfile.ZipFile(io.BytesIO(r.content)) as z:
        z.extractall(temp)
    candidates = [p for p in temp.iterdir() if p.is_dir()]
    if not candidates:
        raise RuntimeError("Could not locate the extracted repository directory.")
    return candidates[0]


def clean_rmd_text(text: str, source_name: str) -> str:
    """Keep course content searchable while using ordinary Markdown code fences.

    Unlike the original version, this preserves an R chunk's label/options as a text
    comment before the code block. That makes captions and figure names searchable.
    """
    out = []
    in_r_chunk = False

    for line in text.splitlines():
        stripped = line.strip()
        if stripped.startswith("```{r"):
            in_r_chunk = True
            chunk_header = stripped[4:-1].strip() if stripped.endswith("}") else stripped
            out.append(f"<!-- R chunk metadata: {chunk_header} -->")
            out.append("```r")
            continue
        if in_r_chunk and stripped == "```":
            in_r_chunk = False
            out.append("```")
            continue
        if stripped.startswith("knitr::opts_chunk$set"):
            continue
        out.append(line)

    header = (
        f"<!-- ebook_agent retrieval copy; source: {source_name} -->\n"
        "<!-- Treat this as course material but independently verify mathematical/statistical claims. -->\n\n"
    )
    return header + "\n".join(out).strip() + "\n"


def csv_to_markdown(path: Path) -> str:
    df = pd.read_csv(path)
    return (
        f"# Dataset: {path.name}\n\n"
        f"Source file: `{path.name}` in the STA258 ebook repository.\n\n"
        f"Rows: {len(df)}; Columns: {len(df.columns)}.\n\n"
        + df.to_markdown(index=False)
        + "\n"
    )


def chapter_metadata(chapters: Path):
    metadata = {}
    for rmd in sorted(chapters.glob("*.Rmd")):
        text = rmd.read_text(encoding="utf-8", errors="replace")
        title_match = re.search(r"^#\s+(.+?)\s*$", text, re.MULTILINE)
        chapter = title_match.group(1).strip() if title_match else rmd.stem

        for match in re.finditer(r"^```\{r\s*([^,}\s]+)?([^}]*)\}", text, re.MULTILINE):
            label = (match.group(1) or "").strip()
            options = match.group(2) or ""
            if not label:
                continue
            caption_match = re.search(r"fig\.cap\s*=\s*(['\"])(.*?)\1", options)
            metadata[label] = {
                "caption": caption_match.group(2) if caption_match else "",
                "chapter": chapter,
                "source": rmd.name,
            }
    return metadata


def build_figure_catalog(book_dir: Path):
    chapters = book_dir / "Chapters"
    meta = chapter_metadata(chapters)
    catalog = []

    figure_dir = book_dir / "Book_files" / "figure-html"
    if figure_dir.exists():
        for path in sorted(figure_dir.iterdir()):
            if not path.is_file() or path.suffix.lower() not in IMAGE_EXTENSIONS:
                continue
            label = re.sub(r"-\d+$", "", path.stem)
            details = meta.get(label, {})
            caption = details.get("caption") or re.sub(r"[-_]+", " ", label)
            rel = path.relative_to(book_dir).as_posix()
            catalog.append({
                "label": label,
                "caption": caption,
                "chapter": details.get("chapter", ""),
                "filename": rel,
                "url": RAW_BOOK_BASE + quote(rel, safe="/"),
            })

    static_images = chapters / "Images"
    if static_images.exists():
        for path in sorted(static_images.rglob("*")):
            if not path.is_file() or path.suffix.lower() not in IMAGE_EXTENSIONS:
                continue
            rel = path.relative_to(book_dir).as_posix()
            catalog.append({
                "label": path.stem,
                "caption": re.sub(r"[-_]+", " ", path.stem),
                "chapter": "",
                "filename": rel,
                "url": RAW_BOOK_BASE + quote(rel, safe="/"),
            })

    return catalog


def write_figure_files(catalog, output_dir: Path, catalog_path: Path):
    catalog_path.write_text(json.dumps(catalog, ensure_ascii=False, indent=2), encoding="utf-8")

    lines = [
        "# STA258 Ebook Figure Index",
        "",
        "Real figures from the STA258 ebook. Use these exact URLs when relevant. Do not invent image URLs.",
        "",
    ]
    for fig in catalog:
        lines.extend([
            f"## {fig['label']}",
            f"Caption: {fig['caption']}",
            *([f"Chapter: {fig['chapter']}"] if fig.get("chapter") else []),
            f"Image: ![{fig['caption']}]({fig['url']})",
            "",
        ])
    (output_dir / "figure-index.md").write_text("\n".join(lines), encoding="utf-8")


def prepare(book_dir: Path, output_dir: Path, catalog_path: Path):
    output_dir.mkdir(parents=True, exist_ok=True)
    for old in output_dir.glob("*.md"):
        old.unlink()

    index = book_dir / "index.Rmd"
    if index.exists():
        (output_dir / "index.md").write_text(
            clean_rmd_text(index.read_text(encoding="utf-8", errors="replace"), "index.Rmd"),
            encoding="utf-8",
        )

    chapters = book_dir / "Chapters"
    rmds = [p for p in sorted(chapters.glob("*.Rmd")) if not p.name.startswith("99-")]
    if not rmds:
        raise RuntimeError(f"No chapter Rmd files found under {chapters}")

    for src in rmds:
        dst = output_dir / (src.stem + ".md")
        dst.write_text(
            clean_rmd_text(src.read_text(encoding="utf-8", errors="replace"), src.name),
            encoding="utf-8",
        )

    for csv_path in sorted(chapters.glob("*.csv")):
        dst = output_dir / f"dataset-{csv_path.stem}.md"
        dst.write_text(csv_to_markdown(csv_path), encoding="utf-8")

    catalog = build_figure_catalog(book_dir)
    write_figure_files(catalog, output_dir, catalog_path)

    files = sorted(output_dir.glob("*.md"))
    total = sum(p.stat().st_size for p in files)
    print(f"Prepared {len(files)} knowledge files in {output_dir}")
    print(f"Prepared {len(catalog)} figure links in {catalog_path}")
    print(f"Total knowledge size: {total/1024:.1f} KiB")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--book-dir", type=Path, help="Path to a local STA258_Book clone/copy")
    parser.add_argument("--output-dir", type=Path, default=Path("knowledge"))
    parser.add_argument("--catalog", type=Path, default=Path("figure_catalog.json"))
    args = parser.parse_args()

    if args.book_dir:
        book_dir = args.book_dir.expanduser().resolve()
    else:
        print(f"Downloading current ebook source from {GITHUB_ZIP}")
        book_dir = download_repo()

    prepare(book_dir, args.output_dir.resolve(), args.catalog.resolve())


if __name__ == "__main__":
    main()
