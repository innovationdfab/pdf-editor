from pathlib import Path
from uuid import UUID, uuid4
import os

import fitz

from fastapi import (
    APIRouter,
    File,
    HTTPException,
    UploadFile,
)

from fastapi.responses import FileResponse


router = APIRouter(
    prefix="/api/documents",
    tags=["documents"],
)


# =====================================================
# UPLOAD DIRECTORY
# =====================================================

UPLOAD_DIR = (
    Path(__file__)
    .resolve()
    .parent
    .parent
    .parent
    / "uploads"
)

UPLOAD_DIR.mkdir(
    parents=True,
    exist_ok=True,
)


# =====================================================
# GET DOCUMENT PATH
# =====================================================

def get_document_path(
    document_id: str,
) -> Path:

    try:
        UUID(document_id)

    except ValueError:
        raise HTTPException(
            status_code=400,
            detail="Invalid document ID.",
        )

    return (
        UPLOAD_DIR
        / f"{document_id}.pdf"
    )


# =====================================================
# VALIDATE PDF
# =====================================================

def inspect_pdf(
    pdf_bytes: bytes,
) -> int:

    if not pdf_bytes:

        raise HTTPException(
            status_code=400,
            detail="The PDF file is empty.",
        )

    try:

        document = fitz.open(
            stream=pdf_bytes,
            filetype="pdf",
        )

        page_count = (
            document.page_count
        )

        document.close()

        return page_count

    except Exception as exc:

        raise HTTPException(
            status_code=400,
            detail="The uploaded file is not a valid PDF.",
        ) from exc


# =====================================================
# UPLOAD PDF
# =====================================================

@router.post("/upload")
async def upload_document(
    file: UploadFile = File(...),
):

    original_filename = (
        file.filename
        or "document.pdf"
    )

    # -----------------------------------------------
    # PDF TYPE CHECK
    # -----------------------------------------------

    if not original_filename.lower().endswith(
        ".pdf"
    ):

        raise HTTPException(
            status_code=400,
            detail="Only PDF files are supported.",
        )

    # -----------------------------------------------
    # READ PDF
    # -----------------------------------------------

    content = await file.read()

    # -----------------------------------------------
    # VALIDATE PDF + PAGE COUNT
    # -----------------------------------------------

    page_count = inspect_pdf(
        content
    )

    # -----------------------------------------------
    # CREATE DOCUMENT ID
    # -----------------------------------------------

    document_id = str(
        uuid4()
    )

    # -----------------------------------------------
    # SAVE PDF
    # -----------------------------------------------

    destination = (
        UPLOAD_DIR
        / f"{document_id}.pdf"
    )

    destination.write_bytes(
        content
    )

    file_size = len(
        content
    )

    # -----------------------------------------------
    # IMPORTANT:
    #
    # RETURN MULTIPLE COMPATIBLE FORMATS
    #
    # New frontend:
    # data.document_id
    #
    # Alternative:
    # data.id
    #
    # Old frontend:
    # data.document.id
    #
    # ALL THREE WILL NOW WORK.
    # -----------------------------------------------

    return {

        "id":
            document_id,

        "document_id":
            document_id,

        "document": {

            "id":
                document_id,

            "document_id":
                document_id,

            "filename":
                original_filename,

            "original_filename":
                original_filename,

            "pages":
                page_count,

            "size":
                file_size,

            "size_bytes":
                file_size,

            "file_url":
                f"/api/documents/{document_id}/file",
        },

        "filename":
            original_filename,

        "original_filename":
            original_filename,

        "pages":
            page_count,

        "size":
            file_size,

        "size_bytes":
            file_size,

        "file_url":
            f"/api/documents/{document_id}/file",
    }


# =====================================================
# GET PDF FILE
# =====================================================

@router.get(
    "/{document_id}/file"
)
async def get_document_file(
    document_id: str,
):

    pdf_path = get_document_path(
        document_id
    )

    if not pdf_path.exists():

        raise HTTPException(
            status_code=404,
            detail="PDF not found.",
        )

    return FileResponse(
        path=str(pdf_path),

        media_type=
            "application/pdf",

        filename=
            f"{document_id}.pdf",
    )


# =====================================================
# SAVE EDITED PDF
# =====================================================

@router.post(
    "/{document_id}/save"
)
async def save_edited_document(
    document_id: str,

    file: UploadFile = File(...),
):

    pdf_path = get_document_path(
        document_id
    )

    if not pdf_path.exists():

        raise HTTPException(
            status_code=404,
            detail="Original PDF not found.",
        )

    # -----------------------------------------------
    # READ EDITED PDF
    # -----------------------------------------------

    content = await file.read()

    # -----------------------------------------------
    # VERIFY EDITED PDF
    # -----------------------------------------------

    page_count = inspect_pdf(
        content
    )

    # -----------------------------------------------
    # TEMPORARY SAVE
    # -----------------------------------------------

    temporary_path = (
        UPLOAD_DIR
        / f"{document_id}.saving"
    )

    try:

        temporary_path.write_bytes(
            content
        )

        # Replace old PDF safely

        os.replace(
            temporary_path,
            pdf_path,
        )

    except Exception as exc:

        if temporary_path.exists():

            temporary_path.unlink(
                missing_ok=True
            )

        raise HTTPException(
            status_code=500,
            detail="Unable to save edited PDF.",
        ) from exc

    return {

        "success":
            True,

        "id":
            document_id,

        "document_id":
            document_id,

        "document": {
            "id":
                document_id,
        },

        "pages":
            page_count,

        "size":
            len(content),

        "message":
            "Edited PDF saved successfully.",
    }