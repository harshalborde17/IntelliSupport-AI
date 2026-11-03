import os
import uuid
import requests

from pypdf import PdfReader

from app.config import (
    CHUNK_SIZE,
    CHUNK_OVERLAP,
    TOP_K,
    LLM_API_KEY,
    LLM_API_URL,
    LLM_MODEL
)

from app.chromadb import chroma_service


def extract_text_from_pdf(file_path):

    reader = PdfReader(file_path)

    text = ""

    for page in reader.pages:

        page_text = page.extract_text()

        if page_text:
            text += page_text + "\n"

    return text


def chunk_text(
    text,
    chunk_size=CHUNK_SIZE,
    overlap=CHUNK_OVERLAP
):

    text = text.replace("\r", "\n")

    chunks = []

    start = 0

    while start < len(text):

        end = start + chunk_size

        chunk = text[start:end].strip()

        if chunk:
            chunks.append(chunk)

        start = end - overlap

    return chunks


def index_pdf(file_path, filename):

    text = extract_text_from_pdf(file_path)

    if not text.strip():
        raise ValueError(
            "No readable text found in the PDF."
        )

    chunks = chunk_text(text)

    documents = []
    metadatas = []
    ids = []

    for index, chunk in enumerate(chunks):

        documents.append(chunk)

        metadatas.append({
            "source": filename,
            "chunk": index
        })

        ids.append(
            f"{filename}-{uuid.uuid4()}"
        )

    chroma_service.add_documents(
        documents=documents,
        metadatas=metadatas,
        ids=ids
    )

    return {
        "filename": filename,
        "chunks": len(chunks)
    }


def retrieve_context(question):

    results = chroma_service.search(
        question,
        top_k=TOP_K
    )

    documents = results.get(
        "documents",
        [[]]
    )[0]

    metadatas = results.get(
        "metadatas",
        [[]]
    )[0]

    context_parts = []

    for document, metadata in zip(
        documents,
        metadatas
    ):

        source = metadata.get(
            "source",
            "Unknown"
        )

        context_parts.append(
            f"Source: {source}\n{document}"
        )

    return "\n\n---\n\n".join(
        context_parts
    )


def create_prompt(question, context):

    return f"""
You are a professional AI customer support assistant.

Your job is to answer the customer's question using ONLY the
information available in the provided support context.

IMPORTANT RESPONSE FORMATTING RULES:

1. Always make the answer easy to read.
2. Never return one large paragraph when the answer contains multiple points.
3. Use a short, clear heading when appropriate.
4. Use bullet points for lists.
5. Use numbered lists for step-by-step instructions.
6. Leave a blank line between different sections.
7. Use **bold text** only for important terms.
8. Use Markdown tables ONLY when comparing 3 or more items.
9. Keep table columns short and readable.
10. Do not put multiple unrelated points on the same line.
11. Do not use unnecessary emojis.
12. Do not repeat the customer's question.
13. Start directly with the answer.
14. Keep the response concise but complete.
15. Never invent information.

For comparison questions, use this format:

### Comparison Title

| Item | Key Points |
|------|------------|
| **Item 1** | Important information |
| **Item 2** | Important information |
| **Item 3** | Important information |

For normal questions, prefer this format:

### Main Answer

Short explanation.

**Key points:**

- Point one
- Point two
- Point three

For step-by-step questions:

### Steps

1. First step
2. Second step
3. Third step

If the information cannot be found in the context, respond exactly:

"I couldn't find that information in the available support documents."

Do not invent policies, prices, dates, features, procedures, statistics,
or other information that is not present in the context.

---------------- CONTEXT ----------------

{context}

-------------- END CONTEXT --------------

CUSTOMER QUESTION:

{question}

Return ONLY the final answer.
"""

def call_llm(prompt):

    if not LLM_API_KEY:
        raise ValueError(
            "LLM_API_KEY is not configured. "
            "Check your .env file."
        )

    if not LLM_API_URL:
        raise ValueError(
            "LLM_API_URL is not configured. "
            "Check your .env file."
        )

    if not LLM_MODEL:
        raise ValueError(
            "LLM_MODEL is not configured. "
            "Check your .env file."
        )

    headers = {
        "Authorization": f"Bearer {LLM_API_KEY}",
        "Content-Type": "application/json"
    }

    payload = {
        "model": LLM_MODEL,
        "messages": [
            {
                "role": "user",
                "content": prompt
            }
        ],
        "temperature": 0.2
    }

    try:

        response = requests.post(
            LLM_API_URL,
            headers=headers,
            json=payload,
            timeout=60
        )

        # Print useful debugging information
        print("LLM URL:", LLM_API_URL)
        print("LLM MODEL:", LLM_MODEL)
        print("LLM STATUS:", response.status_code)

        if response.status_code != 200:

            print("LLM RESPONSE:", response.text)

            raise RuntimeError(
                f"LLM API Error {response.status_code}: "
                f"{response.text}"
            )

        data = response.json()

        if "choices" not in data:
            raise RuntimeError(
                f"Unexpected LLM response: {data}"
            )

        return data["choices"][0]["message"]["content"]

    except requests.exceptions.Timeout:

        raise RuntimeError(
            "LLM API request timed out."
        )

    except requests.exceptions.ConnectionError:

        raise RuntimeError(
            "Could not connect to the LLM API. "
            "Check your internet connection and API URL."
        )

    except requests.exceptions.RequestException as e:

        raise RuntimeError(
            f"LLM request failed: {str(e)}"
        )



def ask_question(question):

    context = retrieve_context(question)

    if not context.strip():
        return {
            "answer": (
                "I couldn't find relevant information "
                "in the support documents."
            ),
            "context": ""
        }

    prompt = create_prompt(
        question,
        context
    )

    answer = call_llm(prompt)

    return {
        "answer": answer,
        "context": context
    }