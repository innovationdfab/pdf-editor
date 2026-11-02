"use client";

import {
  ArrowLeft,
  CheckCircle2,
  FileText,
  Loader2,
  Upload,
  X,
} from "lucide-react";

import {
  ChangeEvent,
  DragEvent,
  useRef,
  useState,
} from "react";

export default function UploadPage() {
  const fileInputRef =
    useRef<HTMLInputElement | null>(null);

  const [
    selectedFile,
    setSelectedFile,
  ] = useState<File | null>(null);

  const [
    isDragging,
    setIsDragging,
  ] = useState(false);

  const [
    uploading,
    setUploading,
  ] = useState(false);

  const [
    uploadError,
    setUploadError,
  ] = useState("");

  const MAX_FILE_SIZE =
    50 * 1024 * 1024;

  /* =================================================
     FILE VALIDATION
  ================================================= */

  function validateAndSetFile(
    file: File | undefined
  ) {
    setUploadError("");

    if (!file) {
      return;
    }

    const isPdf =
      file.type ===
        "application/pdf" ||
      file.name
        .toLowerCase()
        .endsWith(".pdf");

    if (!isPdf) {
      setSelectedFile(null);

     setUploadError(
  "This file is not supported."
);

      return;
    }

    if (
      file.size >
      MAX_FILE_SIZE
    ) {
      setSelectedFile(null);

      setUploadError(
        "PDF size must be 50 MB or less."
      );

      return;
    }

    setSelectedFile(file);
  }

  /* =================================================
     FILE INPUT
  ================================================= */

  function handleFileChange(
    event:
      ChangeEvent<HTMLInputElement>
  ) {
    validateAndSetFile(
      event.target.files?.[0]
    );

    event.target.value = "";
  }

  /* =================================================
     DRAG AND DROP
  ================================================= */

  function handleDragOver(
    event:
      DragEvent<HTMLDivElement>
  ) {
    event.preventDefault();

    setIsDragging(true);
  }

  function handleDragLeave(
    event:
      DragEvent<HTMLDivElement>
  ) {
    event.preventDefault();

    setIsDragging(false);
  }

  function handleDrop(
    event:
      DragEvent<HTMLDivElement>
  ) {
    event.preventDefault();

    setIsDragging(false);

    validateAndSetFile(
      event.dataTransfer.files?.[0]
    );
  }

  /* =================================================
     REMOVE FILE
  ================================================= */

  function removeSelectedFile() {
    if (uploading) {
      return;
    }

    setSelectedFile(null);
    setUploadError("");
  }

  /* =================================================
     FILE SIZE
  ================================================= */

  function formatFileSize(
    bytes: number
  ) {
    if (
      bytes <
      1024 * 1024
    ) {
      return `${(
        bytes / 1024
      ).toFixed(2)} KB`;
    }

    return `${(
      bytes /
      (1024 * 1024)
    ).toFixed(2)} MB`;
  }

  /* =================================================
     GET MODE FROM HOME PAGE

     editor
     OR
     converter
  ================================================= */

  function getSelectedMode():
    "editor" | "converter" {
    const params =
      new URLSearchParams(
        window.location.search
      );

    return params.get("mode") ===
      "converter"
      ? "converter"
      : "editor";
  }

  /* =================================================
     UPLOAD PDF
  ================================================= */

  async function uploadPdf() {
    if (
      !selectedFile ||
      uploading
    ) {
      return;
    }
    

    setUploadError("");
    setUploading(true);

    try {
      const formData =
        new FormData();

      formData.append(
        "file",
        selectedFile
      );

      const apiBaseUrl =
        process.env
          .NEXT_PUBLIC_API_BASE_URL ||
        "http://127.0.0.1:8000";

      const response =
        await fetch(
          `${apiBaseUrl}/api/documents/upload`,
          {
            method: "POST",
            body: formData,
          }
        );

      let data: any = null;

      try {
        data =
          await response.json();
      } catch {
        data = null;
      }

      if (!response.ok) {
        const message =
          data?.detail ||
          data?.message ||
          "Unable to upload PDF.";

        throw new Error(
          String(message)
        );
      }

      const documentId =
        data?.document_id ||
        data?.id ||
        data?.document
          ?.document_id ||
        data?.document
          ?.id;

      if (!documentId) {
        console.error(
          "Upload response:",
          data
        );

        throw new Error(
          "PDF uploaded, but the document ID was not returned by the backend."
        );
      }

      const originalName =
        data?.original_name ||
        data?.originalName ||
        data?.filename ||
        data?.document
          ?.original_name ||
        data?.document
          ?.originalName ||
        data?.document
          ?.filename ||
        selectedFile.name;

      /*
       * IMPORTANT:
       * Carry the tool selected on Home
       * into the actual PDF editor page.
       */

      const selectedMode =
        getSelectedMode();

      const editorUrl =
        `/editor/${encodeURIComponent(
          String(documentId)
        )}` +
        `?name=${encodeURIComponent(
          String(originalName)
        )}` +
        `&mode=${encodeURIComponent(
          selectedMode
        )}`;

      window.location.assign(
        editorUrl
      );

    } catch (error) {
      setUploadError(
        error instanceof Error
          ? error.message
          : "Unable to upload PDF."
      );

      setUploading(false);
    }
  }

  return (
    <main className="relative h-screen overflow-hidden bg-gradient-to-br from-red-50 via-rose-50 to-red-100 px-5">

      {/* BACKGROUND */}

      <div className="pointer-events-none absolute -left-32 -top-28 h-[360px] w-[360px] rounded-full bg-red-300/30 blur-3xl" />

      <div className="pointer-events-none absolute right-[-80px] top-[100px] h-[320px] w-[320px] rounded-full bg-rose-300/25 blur-3xl" />

      <div className="pointer-events-none absolute bottom-[-100px] left-[20%] h-[340px] w-[340px] rounded-full bg-red-200/25 blur-3xl" />

      <div className="pointer-events-none absolute bottom-[-80px] right-[-80px] h-[280px] w-[280px] rounded-full bg-pink-200/25 blur-3xl" />

      {/* BACK BUTTON */}

      <button
        type="button"
        onClick={() =>
          window.location.assign("/")
        }
        className="absolute left-6 top-5 z-30 inline-flex h-10 items-center gap-2 rounded-xl border border-red-100 bg-white/95 px-4 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-red-300 hover:text-red-600"
      >
        <ArrowLeft size={16} />

        Back
      </button>

      {/* CONTENT */}

      <div className="relative z-10 mx-auto flex h-full w-full max-w-6xl flex-col items-center justify-center py-4">

        {/* HEADING */}

        <div
          className={`mx-auto max-w-3xl text-center transition-all duration-300 ${
            selectedFile
              ? "mb-4"
              : "mb-6"
          }`}
        >

          <div
            className={`mx-auto flex items-center justify-center rounded-2xl bg-red-600 text-white shadow-lg shadow-red-600/25 transition-all ${
              selectedFile
                ? "h-11 w-11"
                : "h-13 w-13"
            }`}
          >
            <FileText
              size={
                selectedFile
                  ? 21
                  : 24
              }
            />
          </div>

          <h1
            className={`font-bold tracking-tight text-slate-950 transition-all ${
              selectedFile
                ? "mt-3 text-4xl"
                : "mt-4 text-4xl xl:text-5xl"
            }`}
          >
            PDF Editor
          </h1>

          <p
            className={`mx-auto max-w-xl text-slate-600 transition-all ${
              selectedFile
                ? "mt-2 text-base"
                : "mt-3 text-lg"
            }`}
          >
            Upload a PDF to start editing your document.
          </p>

        </div>

        {/* UPLOAD CARD */}

        <section
          className={`mx-auto w-full max-w-5xl rounded-[28px] border border-red-100 bg-white/95 shadow-[0_25px_80px_rgba(220,38,38,0.10)] backdrop-blur transition-all duration-300 ${
            selectedFile
              ? "p-4"
              : "p-5"
          }`}
        >

          {/* DROP AREA */}

          <div
            role="button"
            tabIndex={0}
            onClick={() =>
              fileInputRef
                .current
                ?.click()
            }
            onKeyDown={(
              event
            ) => {
              if (
                event.key === "Enter" ||
                event.key === " "
              ) {
                fileInputRef
                  .current
                  ?.click();
              }
            }}
            onDragOver={
              handleDragOver
            }
            onDragLeave={
              handleDragLeave
            }
            onDrop={
              handleDrop
            }
            className={`flex cursor-pointer flex-col items-center justify-center rounded-[24px] border-2 border-dashed px-6 text-center transition-all duration-300 ${
              selectedFile
                ? "h-[250px]"
                : "h-[330px]"
            } ${
              isDragging
                ? "border-red-500 bg-red-50"
                : "border-red-300 bg-white hover:border-red-500 hover:bg-red-50/40"
            }`}
          >

            <input
              ref={
                fileInputRef
              }
              type="file"
              accept="application/pdf,.pdf"
              onChange={
                handleFileChange
              }
              className="hidden"
            />

            <div
              className={`flex items-center justify-center rounded-2xl bg-red-50 text-red-600 ring-1 ring-red-100 transition-all ${
                selectedFile
                  ? "h-14 w-14"
                  : "h-16 w-16"
              }`}
            >
              <Upload
                size={
                  selectedFile
                    ? 25
                    : 28
                }
              />
            </div>

            <h2 className="mt-4 text-xl font-bold text-slate-950">
              Choose PDF
            </h2>

            <p className="mt-2 text-sm text-slate-600">
              Click to browse or drag and drop a PDF here
            </p>

            <p className="mt-3 text-sm font-medium text-slate-400">
            </p>

          </div>

          {/* SELECTED FILE */}

          {selectedFile && (
            <div className="mt-3 flex h-[64px] items-center justify-between gap-4 rounded-xl border border-emerald-100 bg-emerald-50/80 px-4">

              <div className="flex min-w-0 items-center gap-3">

                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white text-emerald-600 shadow-sm ring-1 ring-emerald-100">
                  <FileText size={18} />
                </div>

                <div className="min-w-0">

                  <div className="flex items-center gap-2">

                    <p className="truncate text-sm font-bold text-slate-900">
                      {selectedFile.name}
                    </p>

                    <CheckCircle2
                      size={15}
                      className="shrink-0 text-emerald-600"
                    />

                  </div>

                  <p className="mt-0.5 text-xs font-medium text-slate-500">
                    {formatFileSize(
                      selectedFile.size
                    )}
                  </p>

                </div>

              </div>

              <button
                type="button"
                disabled={
                  uploading
                }
                onClick={(
                  event
                ) => {
                  event.stopPropagation();

                  removeSelectedFile();
                }}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-500 transition hover:bg-white hover:text-red-600 disabled:opacity-40"
              >
                <X size={17} />
              </button>

            </div>
          )}

          {/* ERROR */}

          {uploadError && (
            <div className="mt-3 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-medium text-red-700">
              {uploadError}
            </div>
          )}

          {/* UPLOAD */}

          <button
            type="button"
            disabled={
              !selectedFile ||
              uploading
            }
            onClick={
              uploadPdf
            }
            className="mt-3 flex h-[52px] w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 text-sm font-bold text-white shadow-lg shadow-red-600/20 transition hover:from-red-700 hover:to-rose-700 disabled:cursor-not-allowed disabled:from-slate-300 disabled:to-slate-300 disabled:text-white disabled:shadow-none"
          >
            {uploading ? (
              <>
                <Loader2
                  size={18}
                  className="animate-spin"
                />

                Upload PDF
              </>
            ) : (
              <>
                <Upload size={18} />

                Upload PDF
              </>
            )}
          </button>

        </section>

      </div>

    </main>
  );
}