"use client";

import {
  FileText,
  Loader2,
  Upload,
  X,
} from "lucide-react";

import { useRouter } from "next/navigation";

import {
  ChangeEvent,
  DragEvent,
  useRef,
  useState,
} from "react";


type UploadResponse = {
  id?: string;
  document_id?: string;

  document?: {
    id?: string;
  };

  filename?: string;
  original_filename?: string;

  pages?: number;

  size?: number;
  size_bytes?: number;

  file_url?: string;
};


export default function HomePage() {
  const router =
    useRouter();

  const fileInputRef =
    useRef<HTMLInputElement | null>(
      null
    );

  const [
    selectedFile,
    setSelectedFile,
  ] = useState<File | null>(
    null
  );

  const [
    uploading,
    setUploading,
  ] = useState(false);

  const [
    dragActive,
    setDragActive,
  ] = useState(false);

  const [
    error,
    setError,
  ] = useState("");


  /* ================================================
     FORMAT FILE SIZE
  ================================================= */

  function formatFileSize(
    bytes: number
  ) {
    if (bytes === 0) {
      return "0 KB";
    }

    const kb =
      bytes / 1024;

    if (kb < 1024) {
      return `${kb.toFixed(2)} KB`;
    }

    const mb =
      kb / 1024;

    if (mb < 1024) {
      return `${mb.toFixed(2)} MB`;
    }

    const gb =
      mb / 1024;

    return `${gb.toFixed(2)} GB`;
  }


  /* ================================================
     VALIDATE PDF

     We accept:
     - application/pdf MIME
     - .pdf extension

     Some browsers/Windows file pickers may provide
     an empty MIME type, so extension is also checked.
  ================================================= */

  function isPdfFile(
    file: File
  ) {
    const hasPdfExtension =
      file.name
        .toLowerCase()
        .endsWith(".pdf");

    const hasPdfMime =
      file.type ===
      "application/pdf";

    return (
      hasPdfExtension ||
      hasPdfMime
    );
  }


  /* ================================================
     SELECT FILE
  ================================================= */

  function selectPdf(
    file: File
  ) {
    setError("");

    if (!isPdfFile(file)) {
      setSelectedFile(
        null
      );

      setError(
        "Please select a valid PDF file."
      );

      return;
    }

    /*
     * No page-count restriction.
     *
     * Normal PDFs
     * Multi-page PDFs
     * Engineering PDFs
     * Vector PDFs
     * Scanned PDFs
     * Mixed-font PDFs
     *
     * can all proceed to backend validation.
     */

    setSelectedFile(
      file
    );
  }


  /* ================================================
     FILE INPUT
  ================================================= */

  function handleFileChange(
    event:
      ChangeEvent<HTMLInputElement>
  ) {
    const file =
      event.target.files?.[0];

    if (!file) {
      return;
    }

    selectPdf(
      file
    );
  }


  /* ================================================
     DRAG + DROP
  ================================================= */

  function handleDragOver(
    event:
      DragEvent<HTMLDivElement>
  ) {
    event.preventDefault();

    event.stopPropagation();

    setDragActive(
      true
    );
  }


  function handleDragLeave(
    event:
      DragEvent<HTMLDivElement>
  ) {
    event.preventDefault();

    event.stopPropagation();

    setDragActive(
      false
    );
  }


  function handleDrop(
    event:
      DragEvent<HTMLDivElement>
  ) {
    event.preventDefault();

    event.stopPropagation();

    setDragActive(
      false
    );

    const file =
      event.dataTransfer
        .files?.[0];

    if (!file) {
      return;
    }

    selectPdf(
      file
    );
  }


  /* ================================================
     REMOVE SELECTED PDF
  ================================================= */

  function clearFile() {
    if (uploading) {
      return;
    }

    setSelectedFile(
      null
    );

    setError("");

    if (
      fileInputRef.current
    ) {
      fileInputRef.current.value =
        "";
    }
  }


  /* ================================================
     UPLOAD PDF
  ================================================= */

  async function uploadPdf() {
    if (
      !selectedFile ||
      uploading
    ) {
      return;
    }

    try {
      setUploading(
        true
      );

      setError("");

      const formData =
        new FormData();

      formData.append(
        "file",
        selectedFile
      );

      const response =
        await fetch(
          "http://127.0.0.1:8000/api/documents/upload",
          {
            method: "POST",

            body:
              formData,
          }
        );


      /*
       * Handle backend errors cleanly.
       */

      if (!response.ok) {
        let message =
          "Unable to upload PDF.";

        try {
          const errorData =
            await response.json();

          if (
            typeof errorData?.detail ===
            "string"
          ) {
            message =
              errorData.detail;
          }
        } catch {
          // Keep default error.
        }

        throw new Error(
          message
        );
      }


      const data:
        UploadResponse =
          await response.json();


      /*
       * IMPORTANT FIX
       *
       * Supports every response shape we have
       * used during development:
       *
       * data.document_id
       * data.id
       * data.document.id
       *
       * This prevents:
       *
       * Cannot read properties of undefined
       * (reading 'id')
       */

      const documentId =
        data.document_id ??
        data.id ??
        data.document?.id;


      if (!documentId) {
        console.error(
          "Unexpected upload response:",
          data
        );

        throw new Error(
          "PDF uploaded, but the backend did not return a document ID."
        );
      }


      /*
       * Use backend filename when available.
       * Otherwise preserve the original browser
       * filename.
       */

      const documentName =
        data.original_filename ??
        data.filename ??
        selectedFile.name;


      /*
       * Existing editor flow remains unchanged.
       */

      router.push(
        `/editor/${encodeURIComponent(
          documentId
        )}?name=${encodeURIComponent(
          documentName
        )}`
      );

    } catch (
      uploadError
    ) {
      console.error(
        "PDF upload error:",
        uploadError
      );

      const message =
        uploadError instanceof Error
          ? uploadError.message
          : "Unable to upload PDF.";

      setError(
        message
      );

      setUploading(
        false
      );
    }
  }


  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 sm:px-6">

      <div className="mx-auto w-full max-w-5xl">

        {/* ===========================================
            TITLE
        =========================================== */}

        <div className="text-center">

          <h1 className="text-4xl font-bold tracking-tight text-slate-950 sm:text-5xl">
            PDF Editor
          </h1>

          <p className="mt-4 text-base text-slate-600 sm:text-lg">
            Upload a PDF to start editing your document.
          </p>

        </div>


        {/* ===========================================
            UPLOAD CARD
        =========================================== */}

        <div className="mt-12 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-10">

          {/* DROP ZONE */}

          <div
            onDragOver={
              handleDragOver
            }
            onDragLeave={
              handleDragLeave
            }
            onDrop={
              handleDrop
            }
            onClick={() => {
              if (!uploading) {
                fileInputRef
                  .current
                  ?.click();
              }
            }}
            className={`flex min-h-[270px] cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed px-6 text-center transition ${
              dragActive
                ? "border-blue-500 bg-blue-50"
                : "border-slate-300 bg-white hover:border-slate-400 hover:bg-slate-50"
            }`}
          >

            <input
              ref={
                fileInputRef
              }
              type="file"
              accept=".pdf,application/pdf"
              onChange={
                handleFileChange
              }
              className="hidden"
            />


            <Upload
              size={45}
              strokeWidth={1.8}
              className="text-slate-500"
            />


            <p className="mt-5 text-xl font-medium text-slate-950">
              Choose PDF
            </p>


            <p className="mt-2 text-sm text-slate-500">
              Click to browse or drag and drop a PDF here
            </p>


            <p className="mt-2 text-xs text-slate-400">
              Text • Multi-page • Engineering • Vector • Scanned PDFs
            </p>

          </div>


          {/* =========================================
              SELECTED FILE
          ========================================= */}

          {selectedFile && (

            <div className="mt-6 flex items-center justify-between gap-4 rounded-xl bg-slate-100 px-5 py-4">

              <div className="flex min-w-0 items-center gap-4">

                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-white text-slate-700">

                  <FileText
                    size={22}
                  />

                </div>


                <div className="min-w-0">

                  <p className="truncate text-sm font-semibold text-slate-900">

                    {selectedFile.name}

                  </p>

                  <p className="mt-1 text-sm text-slate-500">

                    {formatFileSize(
                      selectedFile.size
                    )}

                  </p>

                </div>

              </div>


              <button
                type="button"
                onClick={(
                  event
                ) => {
                  event.stopPropagation();

                  clearFile();
                }}
                disabled={
                  uploading
                }
                aria-label="Remove PDF"
                title="Remove PDF"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-slate-500 transition hover:bg-white hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-40"
              >

                <X
                  size={19}
                />

              </button>

            </div>

          )}


          {/* =========================================
              ERROR
          ========================================= */}

          {error && (

            <div className="mt-5 rounded-xl border border-red-100 bg-red-50 px-5 py-4 text-sm text-red-700">

              {error}

            </div>

          )}


          {/* =========================================
              UPLOAD BUTTON
          ========================================= */}

          <button
            type="button"
            onClick={
              uploadPdf
            }
            disabled={
              !selectedFile ||
              uploading
            }
            className="mt-7 flex h-14 w-full items-center justify-center gap-2 rounded-xl bg-slate-950 px-5 text-base font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
          >

            {uploading ? (
              <>
                <Loader2
                  size={19}
                  className="animate-spin"
                />

                Uploading PDF...
              </>
            ) : (
              <>
                <Upload
                  size={19}
                />

                Upload PDF
              </>
            )}

          </button>

        </div>

      </div>

    </main>
  );
}