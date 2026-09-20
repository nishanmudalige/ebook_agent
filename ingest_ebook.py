"""Create an OpenAI vector store and ingest the prepared STA258 ebook knowledge files.

Run this once after setting OPENAI_API_KEY. The script prints the vector-store ID;
put that value in Render as OPENAI_VECTOR_STORE_ID.
"""

from __future__ import annotations

import argparse
import os
import sys
import time
from pathlib import Path

from openai import OpenAI


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--knowledge-dir", type=Path, default=Path("knowledge"))
    parser.add_argument("--name", default="STA258 ebook knowledge base")
    parser.add_argument("--poll-seconds", type=float, default=2.0)
    args = parser.parse_args()

    if not os.getenv("OPENAI_API_KEY"):
        sys.exit("Set OPENAI_API_KEY before running this script.")

    files = sorted(args.knowledge_dir.glob("*.md"))
    if not files:
        sys.exit("No .md files found. Run prepare_knowledge.py first.")

    client = OpenAI()
    vector_store = client.vector_stores.create(name=args.name)
    print(f"Created vector store: {vector_store.id}")

    attached_ids = []
    for path in files:
        print(f"Uploading {path.name} ...")
        with path.open("rb") as fh:
            uploaded = client.files.create(file=fh, purpose="assistants")
        attached = client.vector_stores.files.create(
            vector_store_id=vector_store.id,
            file_id=uploaded.id,
            attributes={"filename": path.name, "collection": "STA258_Book"},
        )
        attached_ids.append(attached.id)

    print("Waiting for vector-store indexing to finish ...")
    while True:
        page = client.vector_stores.files.list(vector_store_id=vector_store.id)
        statuses = [item.status for item in page.data]
        completed = sum(s == "completed" for s in statuses)
        failed = sum(s == "failed" for s in statuses)
        print(f"  completed={completed}/{len(statuses)}, failed={failed}")
        if failed:
            print("At least one file failed to index. Inspect it in the API dashboard before deploying.")
            break
        if statuses and all(s == "completed" for s in statuses):
            break
        time.sleep(args.poll_seconds)

    print("\nAdd this to Render:")
    print(f"OPENAI_VECTOR_STORE_ID={vector_store.id}")


if __name__ == "__main__":
    main()
