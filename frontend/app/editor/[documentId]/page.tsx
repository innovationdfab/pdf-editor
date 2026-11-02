"use client";

import {
  ArrowLeft,
  Download,
  FileText,
  Loader2,
  MapPin,
  Ruler,
  Save,
  Search,
  X,
} from "lucide-react";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import NutrientEditor, {
  type AnalysisScope,
  type DimensionCandidate,
  type EngineeringUnit,
  type NutrientEditorHandle,
} from "./NutrientEditor";

type ActionType =
  | "saving"
  | "downloading"
  | null;

type WorkflowMode =
  | "editor"
  | "converter";

type Notice = {
  type:
    | "success"
    | "warning"
    | "error";

  text: string;
};

export default function EditorPage() {
  const editorRef =
    useRef<
      NutrientEditorHandle | null
    >(null);

  const initialModeAppliedRef =
    useRef(false);

  const [
    documentId,
    setDocumentId,
  ] = useState("");

  const [
    documentName,
    setDocumentName,
  ] = useState(
    "PDF Document"
  );

  const [
    workflowMode,
    setWorkflowMode,
  ] = useState<WorkflowMode>(
    "editor"
  );

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    error,
    setError,
  ] = useState("");

  const [
    editorReady,
    setEditorReady,
  ] = useState(false);

  const [
    action,
    setAction,
  ] = useState<ActionType>(
    null
  );

  const [
    notice,
    setNotice,
  ] = useState<
    Notice | null
  >(null);

  /* =================================================
     UNIT CONVERTER
  ================================================= */

  const [
    converterOpen,
    setConverterOpen,
  ] = useState(false);

  const [
    sourceUnit,
    setSourceUnit,
  ] = useState<
    EngineeringUnit
  >("inch");

  const [
    targetUnit,
    setTargetUnit,
  ] = useState<
    EngineeringUnit
  >("mm");

  const [
    analysisScope,
    setAnalysisScope,
  ] = useState<
    AnalysisScope
  >("current");

  const [
    analyzing,
    setAnalyzing,
  ] = useState(false);

  const [
    dimensions,
    setDimensions,
  ] = useState<
    DimensionCandidate[]
  >([]);

  const [
    selectedDimensionIds,
    setSelectedDimensionIds,
  ] = useState<
    string[]
  >([]);

  const [
    analysisMessage,
    setAnalysisMessage,
  ] = useState("");

  const [
    pagesAnalyzed,
    setPagesAnalyzed,
  ] = useState(0);

  const [
    locatingDimensionId,
    setLocatingDimensionId,
  ] = useState<
    string | null
  >(null);

  /* =================================================
     READ DOCUMENT + SELECTED HOME MODE
  ================================================= */

  useEffect(() => {
    const parts =
      window.location.pathname
        .split("/")
        .filter(Boolean);

    const editorIndex =
      parts.indexOf(
        "editor"
      );

    const id =
      editorIndex >= 0
        ? parts[
            editorIndex + 1
          ] || ""
        : "";

    const params =
      new URLSearchParams(
        window.location.search
      );

    const name =
      params.get(
        "name"
      );

    const requestedMode:
      WorkflowMode =
        params.get("mode") ===
        "converter"
          ? "converter"
          : "editor";

    if (name) {
      setDocumentName(
        name
      );
    }

    /*
     * IMPORTANT:
     *
     * In converter mode reserve the converter
     * panel space BEFORE Nutrient mounts.
     *
     * This prevents Nutrient from initially
     * calculating the PDF using full-screen width.
     */

    setWorkflowMode(
      requestedMode
    );

    setConverterOpen(
      requestedMode ===
        "converter"
    );

    if (!id) {
      setLoading(false);

      setError(
        "Document ID is missing."
      );

      return;
    }

    initialModeAppliedRef.current =
      false;

    setDocumentId(
      id
    );

    setError("");
    setEditorReady(false);
    setLoading(true);
  }, []);

  /* =================================================
     VIEWER CALLBACKS
  ================================================= */

  const handleLoadingChange =
    useCallback(
      (
        value: boolean
      ) => {
        setLoading(
          value
        );
      },
      []
    );

  const handleReady =
    useCallback(
      (
        ready: boolean
      ) => {
        setEditorReady(
          ready
        );

        setLoading(
          false
        );
      },
      []
    );

  const handleError =
    useCallback(
      (
        message: string
      ) => {
        setError(
          message
        );

        setLoading(
          false
        );
      },
      []
    );

  /* =================================================
     AUTO OPEN MODE CHOSEN ON HOME PAGE
  ================================================= */

  useEffect(() => {
    if (
      !editorReady ||
      !editorRef.current ||
      initialModeAppliedRef.current
    ) {
      return;
    }

    initialModeAppliedRef.current =
      true;

    async function applySelectedMode() {
      const editor =
        editorRef.current;

      if (!editor) {
        return;
      }

      try {
        if (
          workflowMode ===
          "converter"
        ) {
          /*
           * Converter workflow:
           * PDF remains normal/read mode.
           */

          await editor
            .startPanMode();

          setConverterOpen(
            true
          );

          return;
        }

        /*
         * Content Editor workflow:
         * directly show editable text boxes.
         */

        setConverterOpen(
          false
        );

        editor
          .startContentEditing();

      } catch (
        modeError
      ) {
        setNotice({
          type:
            "error",

          text:
            modeError instanceof
              Error
              ? modeError.message
              : "Unable to open the selected PDF tool.",
        });
      }
    }

    void applySelectedMode();

  }, [
    editorReady,
    workflowMode,
  ]);

  /* =================================================
     SAVE
  ================================================= */

  async function saveEditedPdf() {
    if (
      !editorRef.current ||
      action
    ) {
      return;
    }

    try {
      setAction(
        "saving"
      );

      setNotice(
        null
      );

      const result =
        await editorRef.current
          .saveToBackend();

      setNotice({
        type:
          result.warning
            ? "warning"
            : "success",

        text:
          result.warning
            ? `PDF saved. ${result.warning}`
            : "Edited PDF saved successfully.",
      });

    } catch (
      saveError
    ) {
      setNotice({
        type:
          "error",

        text:
          saveError instanceof
            Error
            ? saveError.message
            : "Unable to save edited PDF.",
      });

    } finally {
      setAction(
        null
      );
    }
  }

  /* =================================================
     DOWNLOAD
  ================================================= */

  async function downloadEditedPdf() {
    if (
      !editorRef.current ||
      action
    ) {
      return;
    }

    try {
      setAction(
        "downloading"
      );

      setNotice(
        null
      );

      const result =
        await editorRef.current
          .downloadPdf(
            documentName
          );

      setNotice({
        type:
          result.warning
            ? "warning"
            : "success",

        text:
          result.warning
            ? `PDF downloaded. ${result.warning} Returning to upload page...`
            : "PDF downloaded successfully. Returning to upload page...",
      });

      await new Promise<void>(
        (
          resolve
        ) => {
          window.setTimeout(
            resolve,
            1200
          );
        }
      );

      window.location.assign(
        `/upload?mode=${workflowMode}`
      );

    } catch (
      downloadError
    ) {
      setNotice({
        type:
          "error",

        text:
          downloadError instanceof
            Error
            ? downloadError.message
            : "Unable to download edited PDF.",
      });

      setAction(
        null
      );
    }
  }

  /* =================================================
     ANALYZE DRAWING
  ================================================= */

  async function analyzeDrawing() {
    if (
      !editorRef.current
    ) {
      setAnalysisMessage(
        "PDF editor is not ready."
      );

      return;
    }

    if (
      sourceUnit ===
      targetUnit
    ) {
      setAnalysisMessage(
        "Please select different source and target units."
      );

      return;
    }

    try {
      setAnalyzing(
        true
      );

      setDimensions(
        []
      );

      setSelectedDimensionIds(
        []
      );

      setAnalysisMessage(
        ""
      );

      setPagesAnalyzed(
        0
      );

      const result =
        await editorRef.current
          .analyzeDimensions({
            sourceUnit,

            targetUnit,

            scope:
              analysisScope,
          });

      setPagesAnalyzed(
        result.pagesAnalyzed
      );

      setDimensions(
        result.dimensions
      );

      setSelectedDimensionIds(
        result.dimensions
          .filter(
            (
              item
            ) =>
              item.confidence ===
              "high"
          )
          .map(
            (
              item
            ) =>
              item.id
          )
      );

      if (
        result.dimensions
          .length ===
        0
      ) {
        setAnalysisMessage(
          "No likely editable dimensions were detected."
        );
      }

    } catch (
      analysisError
    ) {
      setAnalysisMessage(
        analysisError instanceof
          Error
          ? analysisError.message
          : "Unable to analyze drawing."
      );

    } finally {
      setAnalyzing(
        false
      );
    }
  }

  /* =================================================
     LOCATE
  ================================================= */

  async function locateDimension(
    item:
      DimensionCandidate
  ) {
    if (
      !editorRef.current
    ) {
      return;
    }

    try {
      setLocatingDimensionId(
        item.id
      );

      setAnalysisMessage(
        ""
      );

      await editorRef.current
        .locateDimension(
          item
        );

    } catch (
      locateError
    ) {
      setAnalysisMessage(
        locateError instanceof
          Error
          ? locateError.message
          : "Unable to locate this dimension."
      );

    } finally {
      setLocatingDimensionId(
        null
      );
    }
  }

  /* =================================================
     SELECT DIMENSION
  ================================================= */

  function toggleDimension(
    id: string
  ) {
    setSelectedDimensionIds(
      (
        current
      ) =>
        current.includes(
          id
        )
          ? current.filter(
              (
                value
              ) =>
                value !== id
            )
          : [
              ...current,
              id,
            ]
    );
  }

  function clearAnalysis() {
    setDimensions(
      []
    );

    setSelectedDimensionIds(
      []
    );

    setAnalysisMessage(
      ""
    );

    setPagesAnalyzed(
      0
    );

    setLocatingDimensionId(
      null
    );
  }

  const actionsDisabled =
    loading ||
    !editorReady ||
    action !== null;

  return (
    <main className="flex h-screen flex-col overflow-hidden bg-slate-100">

      {/* ============================================
          HEADER
      ============================================ */}

      <header className="relative z-40 flex h-16 shrink-0 items-center justify-between border-b border-slate-200 bg-white px-4">

        <div className="flex min-w-0 items-center gap-3">

          {/* BACK */}

          <button
            type="button"
            onClick={() =>
              window.location.assign(
                `/upload?mode=${workflowMode}`
              )
            }
            className="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-800 hover:bg-slate-50"
          >
            <ArrowLeft
              size={19}
            />
          </button>

          {/* FILE ICON */}

          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-950 text-white">
            <FileText
              size={19}
            />
          </div>

          {/* FILE NAME */}

          <div className="min-w-0">

            <h1 className="max-w-[420px] truncate text-sm font-semibold text-slate-950">
              {documentName}
            </h1>

            <p className="mt-0.5 text-xs font-medium text-slate-500">
              {workflowMode ===
              "converter"
                ? "PDF Unit Converter"
                : "PDF Editor"}
            </p>

          </div>

        </div>

        {/* RIGHT */}

        <div className="flex items-center gap-2">

          {loading && (
            <div className="rounded-full bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-700">
              Opening PDF...
            </div>
          )}

          {/* SAVE */}

          <button
            type="button"
            disabled={
              actionsDisabled
            }
            onClick={
              saveEditedPdf
            }
            className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-800 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {action ===
            "saving" ? (
              <Loader2
                size={16}
                className="animate-spin"
              />
            ) : (
              <Save
                size={16}
              />
            )}

            {action ===
            "saving"
              ? "Saving..."
              : "Save"}
          </button>

          {/* DOWNLOAD */}

          <button
            type="button"
            disabled={
              actionsDisabled
            }
            onClick={
              downloadEditedPdf
            }
            className="inline-flex h-10 items-center gap-2 rounded-lg bg-slate-950 px-4 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {action ===
            "downloading" ? (
              <Loader2
                size={16}
                className="animate-spin"
              />
            ) : (
              <Download
                size={16}
              />
            )}

            {action ===
            "downloading"
              ? "Downloading..."
              : "Download"}
          </button>

        </div>

      </header>

      {/* ============================================
          NOTICE
      ============================================ */}

      {notice && (
        <div
          className={`relative z-40 shrink-0 border-b px-4 py-2 text-center text-xs font-medium ${
            notice.type ===
            "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-800"
              : notice.type ===
                "warning"
              ? "border-amber-200 bg-amber-50 text-amber-900"
              : "border-red-200 bg-red-50 text-red-800"
          }`}
        >
          {notice.text}
        </div>
      )}

      {/* ============================================
          EDITOR + CONVERTER AREA

          IMPORTANT FIX:
          This is now a true FLEX layout.

          Left:
          Nutrient PDF viewer

          Right:
          fixed 410px Unit Converter

          The converter NO LONGER overlays the PDF.
      ============================================ */}

      <section className="relative flex min-h-0 flex-1 overflow-hidden">

        {/* ==========================================
            PDF VIEWER AREA

            flex-1 means Nutrient receives exactly
            the remaining visible width.
        ========================================== */}

        <div className="relative h-full min-w-0 flex-1 overflow-hidden">

          {documentId && (
            <div className="h-full w-full">

              <NutrientEditor
                ref={
                  editorRef
                }
                documentId={
                  documentId
                }
                onLoadingChange={
                  handleLoadingChange
                }
                onReady={
                  handleReady
                }
                onError={
                  handleError
                }
              />

            </div>
          )}

        </div>

        {/* ==========================================
            RESERVE CONVERTER SPACE DURING LOADING

            Critical:
            Nutrient must see the reduced viewport
            from its first render.

            Therefore we reserve 410px even before
            editorReady becomes true.
        ========================================== */}

        {workflowMode ===
          "converter" &&
          converterOpen &&
          !editorReady && (
            <div className="h-full w-[410px] shrink-0 border-l border-slate-200 bg-white" />
          )}

        {/* ==========================================
            UNIT CONVERTER

            REAL SEPARATE COLUMN.
            NOT ABSOLUTE.
            NOT OVERLAYING PDF.
        ========================================== */}

        {workflowMode ===
          "converter" &&
          converterOpen &&
          editorReady && (
            <aside
              className="relative z-30 flex h-full w-[410px] shrink-0 flex-col border-l border-slate-300 bg-white text-slate-950 shadow-[-12px_0_30px_rgba(15,23,42,0.06)]"
            >

              {/* PANEL HEADER */}

              <div className="flex shrink-0 items-center justify-between border-b border-slate-200 bg-white px-5 py-4">

                <div>

                  <h2 className="text-sm font-bold text-slate-950">
                    Unit Converter
                  </h2>

                  <p className="mt-1 text-xs font-medium text-slate-600">
                    Engineering dimensions
                  </p>

                </div>

                <button
                  type="button"
                  onClick={() =>
                    setConverterOpen(
                      false
                    )
                  }
                  className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-700 hover:bg-slate-100 hover:text-slate-950"
                >
                  <X
                    size={19}
                  />
                </button>

              </div>

              {/* ====================================
                  SETTINGS
              ==================================== */}

              <div className="shrink-0 border-b border-slate-200 bg-white p-5">

                <div className="grid grid-cols-2 gap-3">

                  {/* FROM */}

                  <label className="block">

                    <span className="mb-1.5 block text-xs font-semibold text-slate-700">
                      From
                    </span>

                    <select
                      value={
                        sourceUnit
                      }
                      onChange={(
                        event
                      ) => {
                        setSourceUnit(
                          event.target
                            .value as
                            EngineeringUnit
                        );

                        clearAnalysis();
                      }}
                      className="h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-950 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    >
                      <option value="inch">
                        Inch
                      </option>

                      <option value="mm">
                        mm
                      </option>

                      <option value="cm">
                        cm
                      </option>

                    </select>

                  </label>

                  {/* TO */}

                  <label className="block">

                    <span className="mb-1.5 block text-xs font-semibold text-slate-700">
                      To
                    </span>

                    <select
                      value={
                        targetUnit
                      }
                      onChange={(
                        event
                      ) => {
                        setTargetUnit(
                          event.target
                            .value as
                            EngineeringUnit
                        );

                        clearAnalysis();
                      }}
                      className="h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-950 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    >
                      <option value="mm">
                        mm
                      </option>

                      <option value="cm">
                        cm
                      </option>

                      <option value="inch">
                        Inch
                      </option>

                    </select>

                  </label>

                </div>

                {/* ==================================
                    ANALYZE SCOPE
                ================================== */}

                <div className="mt-4">

                  <p className="mb-2 text-xs font-semibold text-slate-700">
                    Analyze
                  </p>

                  <div className="grid grid-cols-2 gap-2">

                    <button
                      type="button"
                      onClick={() => {
                        setAnalysisScope(
                          "current"
                        );

                        clearAnalysis();
                      }}
                      className={`h-10 rounded-lg border text-xs font-semibold transition ${
                        analysisScope ===
                        "current"
                          ? "border-blue-500 bg-blue-50 text-blue-700"
                          : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                      }`}
                    >
                      Current Page
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setAnalysisScope(
                          "all"
                        );

                        clearAnalysis();
                      }}
                      className={`h-10 rounded-lg border text-xs font-semibold transition ${
                        analysisScope ===
                        "all"
                          ? "border-blue-500 bg-blue-50 text-blue-700"
                          : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                      }`}
                    >
                      All Pages
                    </button>

                  </div>

                </div>

                {/* ==================================
                    ANALYZE BUTTON
                ================================== */}

                <button
                  type="button"
                  onClick={
                    analyzeDrawing
                  }
                  disabled={
                    analyzing ||
                    sourceUnit ===
                      targetUnit
                  }
                  className="mt-4 flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-blue-600 text-sm font-bold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-600"
                >
                  {analyzing ? (
                    <Loader2
                      size={17}
                      className="animate-spin"
                    />
                  ) : (
                    <Search
                      size={17}
                    />
                  )}

                  {analyzing
                    ? "Analyzing Drawing..."
                    : "Analyze Drawing"}
                </button>

                {/* PREVIEW */}

                <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5">

                  <p className="text-xs font-medium leading-5 text-amber-900">
                    Preview only. Analyze Drawing does not modify the PDF.
                  </p>

                </div>

              </div>

              {/* ====================================
                  RESULTS
              ==================================== */}

              <div className="min-h-0 flex-1 overflow-y-auto bg-white p-4">

                {analysisMessage && (
                  <div className="mb-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs font-medium text-amber-900">
                    {analysisMessage}
                  </div>
                )}

                {dimensions.length >
                  0 && (
                  <div className="mb-4 flex items-center justify-between">

                    <p className="text-xs font-semibold text-slate-700">
                      {dimensions.length} detected · {pagesAnalyzed} page(s)
                    </p>

                    <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700">
                      {selectedDimensionIds.length} selected
                    </span>

                  </div>
                )}

                <div className="space-y-3">

                  {dimensions.map(
                    (
                      item
                    ) => {
                      const checked =
                        selectedDimensionIds.includes(
                          item.id
                        );

                      const locating =
                        locatingDimensionId ===
                        item.id;

                      return (
                        <div
                          key={
                            item.id
                          }
                          className={`rounded-xl border p-4 transition ${
                            checked
                              ? "border-blue-300 bg-blue-50/40"
                              : "border-slate-200 bg-white"
                          }`}
                        >

                          <div className="flex items-center justify-between gap-3">

                            <label className="flex items-center gap-2 text-xs font-semibold text-slate-700">

                              <input
                                type="checkbox"
                                checked={
                                  checked
                                }
                                onChange={() =>
                                  toggleDimension(
                                    item.id
                                  )
                                }
                                className="h-4 w-4 cursor-pointer accent-blue-600"
                              />

                              Page {item.pageNumber}

                            </label>

                            <span
                              className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase ${
                                item.confidence ===
                                "high"
                                  ? "bg-emerald-100 text-emerald-800"
                                  : "bg-amber-100 text-amber-800"
                              }`}
                            >
                              {item.confidence ===
                              "high"
                                ? "Likely dimension"
                                : "Review"}
                            </span>

                          </div>

                          <div className="mt-3 grid grid-cols-[1fr_auto_1fr] items-center gap-2">

                            <div className="rounded-lg bg-slate-100 p-2.5 text-center text-sm font-bold text-slate-950">
                              {item.original}
                            </div>

                            <span className="font-semibold text-slate-500">
                              →
                            </span>

                            <div className="rounded-lg border border-blue-200 bg-white p-2.5 text-center text-sm font-bold text-blue-700">
                              {item.converted}
                            </div>

                          </div>

                          <p className="mt-2 truncate text-[11px] font-medium text-slate-600">
                            {item.lineText}
                          </p>

                          <button
                            type="button"
                            disabled={
                              locatingDimensionId !==
                              null
                            }
                            onClick={() =>
                              void locateDimension(
                                item
                              )
                            }
                            className="mt-3 inline-flex h-9 items-center gap-1.5 rounded-lg border border-blue-300 bg-white px-3 text-xs font-bold text-blue-700 transition hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {locating ? (
                              <Loader2
                                size={14}
                                className="animate-spin"
                              />
                            ) : (
                              <MapPin
                                size={14}
                              />
                            )}

                            {locating
                              ? "Locating..."
                              : "Locate"}
                          </button>

                        </div>
                      );
                    }
                  )}

                </div>

                {/* ==================================
                    NO ANALYSIS
                ================================== */}

                {!analyzing &&
                  dimensions.length ===
                    0 &&
                  !analysisMessage && (
                  <div className="flex min-h-[220px] items-center justify-center text-center">

                    <div>

                      <Ruler
                        size={30}
                        className="mx-auto text-slate-400"
                      />

                      <p className="mt-3 text-sm font-semibold text-slate-700">
                        No analysis yet
                      </p>

                      <p className="mt-1 text-xs text-slate-500">
                        Choose the units and click Analyze Drawing.
                      </p>

                    </div>

                  </div>
                )}

              </div>

            </aside>
          )}

        {/* ==========================================
            LOADING OVERLAY

            Covers full editor + converter area.
        ========================================== */}

        {loading && (
          <div className="pointer-events-none absolute inset-0 z-50 flex items-center justify-center bg-white">

            <div className="flex flex-col items-center">

              <Loader2 className="h-8 w-8 animate-spin text-slate-900" />

              <p className="mt-4 text-sm font-semibold text-slate-900">
                Opening PDF
              </p>

              <p className="mt-1 text-xs text-slate-600">
                Loading PDF editor...
              </p>

            </div>

          </div>
        )}

        {/* ==========================================
            ERROR
        ========================================== */}

        {error && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-white">

            <div className="rounded-xl border border-red-200 bg-red-50 p-5 text-sm font-medium text-red-800">
              {error}
            </div>

          </div>
        )}

      </section>

    </main>
  );
}