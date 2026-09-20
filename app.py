import os
from collections import OrderedDict

from flask import Flask, jsonify, render_template, request
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from openai import OpenAI

from prompt import SYSTEM_PROMPT
from source_map import source_details

app = Flask(__name__)
limiter = Limiter(get_remote_address, app=app, default_limits=["120 per hour"], storage_uri="memory://")

OPENAI_MODEL = os.getenv("OPENAI_MODEL", "gpt-5.6-terra")
VECTOR_STORE_ID = os.getenv("OPENAI_VECTOR_STORE_ID", "").strip()
ACCESS_CODE = os.getenv("EBOOK_AGENT_ACCESS_CODE", "").strip()
MAX_MESSAGE_CHARS = int(os.getenv("MAX_MESSAGE_CHARS", "12000"))
MAX_OUTPUT_TOKENS = int(os.getenv("MAX_OUTPUT_TOKENS", "3500"))

client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))


def check_access(req):
    if not ACCESS_CODE:
        return True
    return req.headers.get("X-Ebook-Agent-Code", "") == ACCESS_CODE


def extract_citations(response):
    """Return unique file citations from a Responses API result."""
    try:
        payload = response.model_dump()
    except Exception:
        return []

    found = OrderedDict()
    for item in payload.get("output", []) or []:
        if item.get("type") != "message":
            continue
        for content in item.get("content", []) or []:
            if content.get("type") != "output_text":
                continue
            for ann in content.get("annotations", []) or []:
                if ann.get("type") == "file_citation" and ann.get("filename"):
                    filename = ann["filename"]
                    found.setdefault(filename, source_details(filename))
    return list(found.values())


@app.get("/")
def index():
    return render_template("index.html", model=OPENAI_MODEL, protected=bool(ACCESS_CODE))


@app.get("/health")
def health():
    return jsonify({
        "status": "ok",
        "configured": bool(os.getenv("OPENAI_API_KEY") and VECTOR_STORE_ID),
        "model": OPENAI_MODEL,
    })


@app.post("/api/chat")
@limiter.limit("30 per hour")
def chat():
    if not check_access(request):
        return jsonify({"error": "Invalid access code."}), 401

    if not os.getenv("OPENAI_API_KEY"):
        return jsonify({"error": "OPENAI_API_KEY is not configured on the server."}), 500
    if not VECTOR_STORE_ID:
        return jsonify({"error": "OPENAI_VECTOR_STORE_ID is not configured on the server."}), 500


    data = request.get_json(silent=True) or {}
    
    message = str(data.get("message", "")).strip()
    
    raw_previous_response_id = data.get("previous_response_id")
    
    if isinstance(raw_previous_response_id, str):
        previous_response_id = raw_previous_response_id.strip() or None
    else:
        previous_response_id = None

    if not message:
        return jsonify({"error": "Please enter a question."}), 400
    if len(message) > MAX_MESSAGE_CHARS:
        return jsonify({"error": f"Question is too long. Maximum {MAX_MESSAGE_CHARS} characters."}), 400

    try:
        kwargs = dict(
            model=OPENAI_MODEL,
            instructions=SYSTEM_PROMPT,
            input=message,
            tools=[{
                "type": "file_search",
                "vector_store_ids": [VECTOR_STORE_ID],
                "max_num_results": 8,
            }],
            include=["file_search_call.results"],
            max_output_tokens=MAX_OUTPUT_TOKENS,
            store=True,
        )
        if previous_response_id:
            kwargs["previous_response_id"] = previous_response_id

        response = client.responses.create(**kwargs)

        return jsonify({
            "answer": response.output_text,
            "response_id": response.id,
            "sources": extract_citations(response),
            "model": OPENAI_MODEL,
        })
    except Exception as exc:
        app.logger.exception("OpenAI request failed")

        if app.debug:
            return jsonify({
                "error": f"{type(exc).__name__}: {str(exc)}"
            }), 500

        return jsonify({
            "error": f"The agent request failed: {type(exc).__name__}. Check the Render logs for details."
        }), 500

@app.post("/api/reset")
def reset():
    if not check_access(request):
        return jsonify({"error": "Invalid access code."}), 401
    return jsonify({"ok": True})


if __name__ == "__main__":
    port = int(os.getenv("PORT", "10000"))
    app.run(host="0.0.0.0", port=port, debug=False)
