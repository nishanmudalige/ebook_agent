"""Prepare OpenAI-file-search-friendly Markdown copies of the STA258 ebook.

Sources can be either:
  1. a local clone of STA258_Book, or
  2. the public GitHub main branch downloaded automatically.

R Markdown files are copied to .md (the textual source is intentionally retained,
including useful R code, exercises and solutions). Small CSV datasets are converted
to Markdown tables because .csv is not one of the documented file_search formats.
"""

from __future__ import annotations

import argparse
import io
import shutil
import tempfile
import zipfile
from pathlib import Path

import pandas as pd
import requests

GITHUB_ZIP = "https://github.com/nishanmudalige/STA258_Book/archive/refs/heads/main.zip"


def download_repo() -> Path:
    r = requests.get(GITHUB_ZIP, timeout=60)
    r.raise_for_status()
    temp = Path(tempfile.mkdtemp(prefix="sta258_book_"))
    with zipfile.ZipFile(io.BytesIO(r.content)) as z:
        z.extractall(temp)
    candidates = [p for p in temp.iterdir() if p.is_dir()]
    if not candidates:
        raise RuntimeError("Could not locate the extracted repository directory.")
    return candidates[0]


def clean_rmd_text(text: str, source_name: str) -> str:
    # Keep the source mostly intact so equations, exercises, solutions, and R code remain searchable.
    # We only normalize R Markdown chunk fences to standard Markdown code fences where convenient.
    out = []
    in_r_chunk = False
    for line in text.splitlines():
        stripped = line.strip()
        if stripped.startswith("```{r"):
            in_r_chunk = True
            out.append("```r")
            continue
        if in_r_chunk and stripped == "```":
            in_r_chunk = False
            out.append("```")
            continue
        # Remove a few purely build-oriented lines that do not help retrieval.
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


def prepare(book_dir: Path, output_dir: Path):
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
    rmds = sorted(chapters.glob("*.Rmd"))
    rmds = [p for p in rmds if not p.name.startswith("99-")]
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

    files = sorted(output_dir.glob("*.md"))
    total = sum(p.stat().st_size for p in files)
    print(f"Prepared {len(files)} knowledge files in {output_dir}")
    print(f"Total size: {total/1024:.1f} KiB")
    for p in files:
        print(f"  {p.name}")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--book-dir", type=Path, help="Path to a local STA258_Book clone")
    parser.add_argument("--output-dir", type=Path, default=Path("knowledge"))
    args = parser.parse_args()

    if args.book_dir:
        book_dir = args.book_dir.expanduser().resolve()
    else:
        print(f"Downloading current ebook source from {GITHUB_ZIP}")
        book_dir = download_repo()

    prepare(book_dir, args.output_dir.resolve())


if __name__ == "__main__":
    main()
