import os
import shutil
from tempfile import NamedTemporaryFile

from fastapi import (
    APIRouter,
    UploadFile,
    File,
    HTTPException
)

from pydantic import BaseModel

from app.rag import (
    index_pdf,
    ask_question
)


router = APIRouter()


class QuestionRequest(BaseModel):

    question: str


@router.get("/health")
def health_check():

    return {
        "status": "ok",
        "message": "RAG Customer Support API is running"
    }


@router.post("/upload")
async def upload_pdf(
    file: UploadFile = File(...)
):

    if not file.filename:
        raise HTTPException(
            status_code=400,
            detail="Filename is missing."
        )

    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(
            status_code=400,
            detail="Only PDF files are supported."
        )

    try:

        with NamedTemporaryFile(
            delete=False,
            suffix=".pdf"
        ) as temp_file:

            shutil.copyfileobj(
                file.file,
                temp_file
            )

            temp_path = temp_file.name

        result = index_pdf(
            temp_path,
            file.filename
        )

        return {
            "success": True,
            "message": "PDF indexed successfully.",
            "data": result
        }

    except Exception as e:

        raise HTTPException(
            status_code=500,
            detail=str(e)
        )

    finally:

        if "temp_path" in locals():
            if os.path.exists(temp_path):
                os.remove(temp_path)


@router.post("/chat")
def chat(
    request: QuestionRequest
):

    question = request.question.strip()

    if not question:
        raise HTTPException(
            status_code=400,
            detail="Question cannot be empty."
        )

    try:

        result = ask_question(
            question
        )

        return {
            "success": True,
            "question": question,
            "answer": result["answer"],
            "context": result["context"]
        }

    except Exception as e:

        raise HTTPException(
            status_code=500,
            detail=str(e)
        )