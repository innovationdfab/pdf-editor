"use client";

import {
  forwardRef,
  memo,
  useEffect,
  useImperativeHandle,
  useRef,
} from "react";

type NutrientViewerModule =
  typeof import("@nutrient-sdk/viewer");

type NutrientViewerType =
  NutrientViewerModule["default"];

type NutrientInstance =
  Awaited<
    ReturnType<NutrientViewerType["load"]>
  >;

/* =========================================================
   TYPES
========================================================= */

export type EngineeringUnit =
  | "inch"
  | "mm"
  | "cm";

export type AnalysisScope =
  | "current"
  | "all";

export type DimensionConfidence =
  | "high"
  | "review";

export type PdfRectData = {
  left: number;
  top: number;
  width: number;
  height: number;
};

export type DimensionCandidate = {
  id: string;

  pageIndex: number;
  pageNumber: number;

  original: string;
  converted: string;

  lineText: string;

  confidence: DimensionConfidence;

  lineBox: PdfRectData;
};

export type AnalyzeDimensionsOptions = {
  sourceUnit: EngineeringUnit;
  targetUnit: EngineeringUnit;
  scope: AnalysisScope;
};

export type AnalyzeDimensionsResult = {
  dimensions: DimensionCandidate[];
  pagesAnalyzed: number;
  totalPages: number;
};

export type PdfActionResult = {
  warning?: string;
};

export type NutrientEditorHandle = {
  startContentEditing: () => void;

  startPanMode: () => Promise<void>;

  saveToBackend:
    () => Promise<PdfActionResult>;

  downloadPdf: (
    filename: string
  ) => Promise<PdfActionResult>;

  analyzeDimensions: (
    options: AnalyzeDimensionsOptions
  ) => Promise<AnalyzeDimensionsResult>;

  locateDimension: (
    dimension: DimensionCandidate
  ) => Promise<void>;
};

type NutrientEditorProps = {
  documentId: string;

  onLoadingChange?: (
    loading: boolean
  ) => void;

  onReady?: (
    ready: boolean
  ) => void;

  onError?: (
    message: string
  ) => void;
};

/* =========================================================
   ICONS
========================================================= */

const IMAGE_ICON = `
<svg
  xmlns="http://www.w3.org/2000/svg"
  width="24"
  height="24"
  viewBox="0 0 24 24"
  fill="none"
  stroke="currentColor"
  stroke-width="1.8"
  stroke-linecap="round"
  stroke-linejoin="round"
>
  <rect x="3" y="4" width="18" height="16" rx="2"/>
  <circle cx="8.5" cy="9" r="1.5"/>
  <path d="M21 15l-5-5L5 20"/>
</svg>
`;

const SEARCH_ICON = `
<svg
  xmlns="http://www.w3.org/2000/svg"
  width="24"
  height="24"
  viewBox="0 0 24 24"
  fill="none"
  stroke="currentColor"
  stroke-width="1.8"
  stroke-linecap="round"
  stroke-linejoin="round"
>
  <circle cx="11" cy="11" r="7"/>
  <path d="m20 20-3.5-3.5"/>
</svg>
`;

/* =========================================================
   VIEWER CONTAINER
========================================================= */

function waitForViewerContainer(
  element: HTMLElement,
  signal: AbortSignal
): Promise<void> {
  return new Promise(
    (
      resolve,
      reject
    ) => {
      let observer:
        ResizeObserver | null =
          null;

      let frameOne = 0;
      let frameTwo = 0;

      let finished =
        false;

      const cleanup =
        () => {
          observer?.disconnect();

          cancelAnimationFrame(
            frameOne
          );

          cancelAnimationFrame(
            frameTwo
          );

          signal.removeEventListener(
            "abort",
            handleAbort
          );
        };

      const handleAbort =
        () => {
          if (
            finished
          ) {
            return;
          }

          finished =
            true;

          cleanup();

          reject(
            new DOMException(
              "Viewer startup aborted.",
              "AbortError"
            )
          );
        };

      const check =
        () => {
          if (
            finished ||
            signal.aborted
          ) {
            return;
          }

          const rect =
            element.getBoundingClientRect();

          if (
            !element.isConnected ||
            rect.width <= 0 ||
            rect.height <= 0
          ) {
            return;
          }

          frameOne =
            requestAnimationFrame(
              () => {
                frameTwo =
                  requestAnimationFrame(
                    () => {
                      if (
                        finished ||
                        signal.aborted
                      ) {
                        return;
                      }

                      const finalRect =
                        element.getBoundingClientRect();

                      if (
                        finalRect.width > 0 &&
                        finalRect.height > 0
                      ) {
                        finished =
                          true;

                        cleanup();

                        resolve();
                      }
                    }
                  );
              }
            );
        };

      observer =
        new ResizeObserver(
          check
        );

      observer.observe(
        element
      );

      signal.addEventListener(
        "abort",
        handleAbort,
        {
          once: true,
        }
      );

      check();
    }
  );
}

/* =========================================================
   HELPERS
========================================================= */

function nextFrame():
  Promise<void> {
  return new Promise(
    (
      resolve
    ) => {
      requestAnimationFrame(
        () => {
          resolve();
        }
      );
    }
  );
}

function delay(
  milliseconds:
    number
):
  Promise<void> {
  return new Promise(
    (
      resolve
    ) => {
      window.setTimeout(
        resolve,
        milliseconds
      );
    }
  );
}

/* =========================================================
   UNIT CONVERSION
========================================================= */

const UNIT_TO_MM: Record<
  EngineeringUnit,
  number
> = {
  inch: 25.4,
  mm: 1,
  cm: 10,
};

function parseFraction(
  value: string
):
  number | null {
  const clean =
    value.trim();

  const mixed =
    clean.match(
      /^(\d+)\s+(\d+)\/(\d+)$/
    );

  if (
    mixed
  ) {
    const whole =
      Number(
        mixed[1]
      );

    const numerator =
      Number(
        mixed[2]
      );

    const denominator =
      Number(
        mixed[3]
      );

    if (
      denominator ===
      0
    ) {
      return null;
    }

    return (
      whole +
      numerator /
        denominator
    );
  }

  const fraction =
    clean.match(
      /^(\d+)\/(\d+)$/
    );

  if (
    fraction
  ) {
    const numerator =
      Number(
        fraction[1]
      );

    const denominator =
      Number(
        fraction[2]
      );

    if (
      denominator ===
      0
    ) {
      return null;
    }

    return (
      numerator /
      denominator
    );
  }

  const parsed =
    Number(
      clean
    );

  return Number.isFinite(
    parsed
  )
    ? parsed
    : null;
}

function convertValue(
  value: number,
  from: EngineeringUnit,
  to: EngineeringUnit
) {
  return (
    value *
    UNIT_TO_MM[from] /
    UNIT_TO_MM[to]
  );
}

function formatConvertedValue(
  value: number
) {
  return value
    .toFixed(4)
    .replace(
      /\.?0+$/,
      ""
    );
}

function targetUnitLabel(
  unit:
    EngineeringUnit
) {
  return unit ===
    "inch"
    ? "in"
    : unit;
}

function explicitUnitToInternal(
  unit:
    string |
    undefined
):
  EngineeringUnit | null {
  if (
    !unit
  ) {
    return null;
  }

  const normalized =
    unit
      .trim()
      .toLowerCase();

  if (
    normalized === "\"" ||
    normalized === "â€³" ||
    normalized === "in" ||
    normalized === "inch" ||
    normalized === "inches"
  ) {
    return "inch";
  }

  if (
    normalized ===
    "mm"
  ) {
    return "mm";
  }

  if (
    normalized ===
    "cm"
  ) {
    return "cm";
  }

  return null;
}

/* =========================================================
   DIMENSION DETECTION
========================================================= */

function detectDimensionsInLine(
  lineText: string,
  pageIndex: number,
  lineIndex: number,
  sourceUnit:
    EngineeringUnit,
  targetUnit:
    EngineeringUnit,
  lineBox:
    PdfRectData
):
  DimensionCandidate[] {
  const results:
    DimensionCandidate[] =
      [];

  const text =
    lineText
      .replace(
        /\r?\n/g,
        " "
      )
      .trim();

  if (
    !text
  ) {
    return results;
  }

  const threadContext =
    /\b(?:UNC|UNF|UNEF|NPT|BSP|BSPT|TPI|THREAD)\b/i;

  const imperialThread =
    /\d+\s*\/\s*\d+\s*-\s*\d+/;

  if (
    threadContext.test(
      text
    ) ||
    imperialThread.test(
      text
    )
  ) {
    return results;
  }

  const metadataContext =
    /\b(?:PART\s*(?:NO|NUMBER)|DRAWING\s*(?:NO|NUMBER)|DWG|REV|REVISION|QTY|QUANTITY|DATE|SHEET|PAGE|SCALE|ANGLE|MATERIAL|WEIGHT|ITEM|PO\s*NUMBER)\b/i;

  const metadataLine =
    metadataContext.test(
      text
    );

  const dimensionPattern =
    /(Ã˜|âŒ€|R)?\s*((?:\d+\s+\d+\/\d+)|(?:\d+\/\d+)|(?:\d*\.\d+)|(?:\d+))\s*(inches?|inch|in|mm|cm|"|â€³)?(?:\s*Â±\s*((?:\d+\/\d+)|(?:\d*\.\d+)|(?:\d+)))?/gi;

  let match:
    RegExpExecArray |
    null;

  while (
    (
      match =
        dimensionPattern.exec(
          text
        )
    ) !== null
  ) {
    const prefix =
      match[1] ||
      "";

    const valueText =
      match[2];

    const explicitUnit =
      match[3];

    const tolerance =
      match[4];

    const original =
      match[0].trim();

    const after =
      text
        .slice(
          match.index +
            match[0].length
        )
        .trimStart()
        .charAt(
          0
        );

    if (
      after ===
      "Â°"
    ) {
      continue;
    }

    const hasPrefix =
      prefix.length >
      0;

    const hasFraction =
      valueText.includes(
        "/"
      );

    const hasDecimal =
      valueText.includes(
        "."
      );

    const hasTolerance =
      Boolean(
        tolerance
      );

    const hasUnit =
      Boolean(
        explicitUnit
      );

    if (
      !hasPrefix &&
      !hasFraction &&
      !hasDecimal &&
      !hasTolerance &&
      !hasUnit
    ) {
      continue;
    }

    if (
      metadataLine &&
      !hasPrefix &&
      !hasTolerance &&
      !hasUnit
    ) {
      continue;
    }

    const detectedUnit =
      explicitUnitToInternal(
        explicitUnit
      );

    if (
      detectedUnit &&
      detectedUnit !==
        sourceUnit
    ) {
      continue;
    }

    const numeric =
      parseFraction(
        valueText
      );

    if (
      numeric ===
      null
    ) {
      continue;
    }

    const convertedMain =
      formatConvertedValue(
        convertValue(
          numeric,
          sourceUnit,
          targetUnit
        )
      );

    let converted =
      `${prefix}${convertedMain}`;

    if (
      tolerance
    ) {
      const toleranceValue =
        parseFraction(
          tolerance
        );

      if (
        toleranceValue !==
        null
      ) {
        converted +=
          ` Â±${formatConvertedValue(
            convertValue(
              toleranceValue,
              sourceUnit,
              targetUnit
            )
          )}`;
      }
    }

    converted +=
      ` ${targetUnitLabel(
        targetUnit
      )}`;

    const confidence:
      DimensionConfidence =
        (
          hasPrefix ||
          hasUnit ||
          hasFraction ||
          hasTolerance
        )
          ? "high"
          : "review";

    results.push({
      id:
        `${pageIndex}-${lineIndex}-${match.index}-${results.length}`,

      pageIndex,

      pageNumber:
        pageIndex +
        1,

      original,

      converted,

      lineText:
        text,

      confidence,

      lineBox,
    });
  }

  return results;
}

/* =========================================================
   IMAGE DIMENSIONS
========================================================= */

async function getImageDimensions(
  file:
    File
):
  Promise<{
    width: number;
    height: number;
  }> {
  try {
    const bitmap =
      await createImageBitmap(
        file
      );

    const result = {
      width:
        bitmap.width,

      height:
        bitmap.height,
    };

    bitmap.close();

    return result;
  } catch {
    return {
      width: 400,
      height: 300,
    };
  }
}

/* =========================================================
   COMPONENT
========================================================= */

const NutrientEditorComponent =
  forwardRef<
    NutrientEditorHandle,
    NutrientEditorProps
  >(
    function NutrientEditorComponent(
      {
        documentId,
        onLoadingChange,
        onReady,
        onError,
      },
      ref
    ) {
      const viewerRef =
        useRef<
          HTMLDivElement |
          null
        >(null);

      const instanceRef =
        useRef<
          NutrientInstance |
          null
        >(null);

      const nutrientRef =
        useRef<
          NutrientViewerType |
          null
        >(null);

      const mouseCleanupRef =
        useRef<
          (() => void) |
          null
        >(null);

      const imageHitTestCleanupRef =
        useRef<
          (() => void) |
          null
        >(null);

      const imageEventsCleanupRef =
        useRef<
          (() => void) |
          null
        >(null);

      const searchEditCleanupRef =
        useRef<
          (() => void) |
          null
        >(null);

      const undoCleanupRef =
        useRef<
          (() => void) |
          null
        >(null);

      const mouseInstallTimerRef =
        useRef<
          number |
          null
        >(null);

      /*
       * TRUE until user:
       * - presses final Save, or
       * - enters Unit Converter.
       */
      const contentEditorWorkflowRef =
        useRef(
          false
        );

      /*
       * LOCKED WORKING IMAGE FLOW.
       *
       * Do not change this behavior.
       */
      const imageEditingRef =
        useRef(
          false
        );

      const imageSelectionConfirmedRef =
        useRef(
          false
        );

      const imageInsertBusyRef =
        useRef(
          false
        );
      /*
       * TRUE only while the user is adding/editing
       * a real Nutrient TextAnnotation.
       *
       * This is intentionally separate from
       * Content Editor PDF text editing.
       */
      const textAnnotationWorkflowRef =
        useRef(
          false
        );

      /*
       * Prevents the initial temporary empty
       * selection from immediately returning
       * us to Content Editor.
       */
      const textAnnotationSelectionArmedRef =
        useRef(
          false
        );

      /*
       * Cleanup for our Add Text toolbar override.
       */
      const addTextOverrideCleanupRef =
        useRef<
          (() => void) |
          null
        >(null);

      /*
       * Cleanup for TextAnnotation workflow events.
       */
      const textAnnotationEventsCleanupRef =
        useRef<
          (() => void) |
          null
        >(null);

      /*
       * Latest inserted/existing image annotations.
       */
      const imageAnnotationsRef =
        useRef<
          Map<
            string,
            any
          >
        >(
          new Map()
        );

      /*
       * Latest built-in Nutrient SearchState.
       */
      const searchStateRef =
        useRef<any>(
          null
        );

      /*
       * Prevent duplicate search-result edit actions.
       */
      const searchResultOpeningRef =
        useRef(
          false
        );

      const resumeAfterSearchRef =
        useRef(
          false
        );

      const previousInteractionModeRef =
        useRef<any>(
          null
        );

      const onLoadingChangeRef =
        useRef(
          onLoadingChange
        );

      const onReadyRef =
        useRef(
          onReady
        );

      const onErrorRef =
        useRef(
          onError
        );

      const LOCATE_OVERLAY_ID =
        "dimension-locate-highlight";

      useEffect(
        () => {
          onLoadingChangeRef.current =
            onLoadingChange;

          onReadyRef.current =
            onReady;

          onErrorRef.current =
            onError;
        },
        [
          onLoadingChange,
          onReady,
          onError,
        ]
      );

      /* =====================================================
         LOCATE HIGHLIGHT
      ===================================================== */

      function clearLocateHighlight() {
        const instance =
          instanceRef.current;

        if (
          !instance
        ) {
          return;
        }

        try {
          instance.removeCustomOverlayItem(
            LOCATE_OVERLAY_ID
          );
        } catch {
          // No highlight currently.
        }
      }

      /* =====================================================
         IMAGE CACHE
      ===================================================== */

      function cacheImageAnnotation(
        annotation:
          any
      ) {
        const NutrientViewer =
          nutrientRef.current;

        if (
          !NutrientViewer ||
          !annotation
        ) {
          return;
        }

        if (
          !(
            annotation instanceof
            NutrientViewer
              .Annotations
              .ImageAnnotation
          )
        ) {
          return;
        }

        const id =
          annotation.id;

        if (
          typeof id !==
          "string"
        ) {
          return;
        }

        imageAnnotationsRef.current.set(
          id,
          annotation
        );
      }

      function cacheAnnotationList(
        annotations:
          any
      ) {
        if (
          !annotations
        ) {
          return;
        }

        annotations.forEach(
          (
            annotation:
              any
          ) => {
            cacheImageAnnotation(
              annotation
            );
          }
        );
      }

      function removeCachedAnnotations(
        annotations:
          any
      ) {
        if (
          !annotations
        ) {
          return;
        }

        annotations.forEach(
          (
            annotation:
              any
          ) => {
            const id =
              annotation?.id;

            if (
              typeof id ===
              "string"
            ) {
              imageAnnotationsRef.current.delete(
                id
              );
            }
          }
        );
      }

      async function hydrateImageCacheForPage(
        pageIndex:
          number
      ) {
        const instance =
          instanceRef.current;

        if (
          !instance ||
          pageIndex <
            0 ||
          pageIndex >=
            instance.totalPageCount
        ) {
          return;
        }

        try {
          const annotations =
            await instance.getAnnotations(
              pageIndex
            );

          cacheAnnotationList(
            annotations
          );
        } catch (
          error
        ) {
          console.warn(
            "Unable to cache image annotations:",
            error
          );
        }
      }

      /* =====================================================
         CONTENT EDITING SESSION
      ===================================================== */

      async function finishContentEditorIfNeeded() {
        const instance =
          instanceRef.current;

        if (
          !instance
        ) {
          return;
        }

        if (
          instance
            .contentEditor
            .isActive()
        ) {
          await instance
            .saveContentEditingSession();
        }
      }

      /* =====================================================
         PAN MODE
      ===================================================== */

      function activatePanMode() {
        const instance =
          instanceRef.current;

        const NutrientViewer =
          nutrientRef.current;

        if (
          !instance ||
          !NutrientViewer
        ) {
          return;
        }

        imageEditingRef.current =
          false;

        imageSelectionConfirmedRef.current =
          false;

        try {
          instance.setSelectedAnnotations(
            null
          );
        } catch {
          // Nothing selected.
        }

        instance.setViewState(
          (
            state
          ) =>
            state.set(
              "interactionMode",
              NutrientViewer
                .InteractionMode
                .PAN
            )
        );
      }

      /* =====================================================
         CONTENT EDITOR MODE
      ===================================================== */

      function activateContentEditor() {
        const instance =
          instanceRef.current;

        const NutrientViewer =
          nutrientRef.current;

        if (
          !instance ||
          !NutrientViewer
        ) {
          return;
        }

        clearLocateHighlight();

        imageEditingRef.current =
          false;

        imageSelectionConfirmedRef.current =
          false;

        try {
          instance.setSelectedAnnotations(
            null
          );
        } catch {
          // Nothing selected.
        }

        instance.setViewState(
          (
            state
          ) =>
            state.set(
              "interactionMode",
              NutrientViewer
                .InteractionMode
                .CONTENT_EDITOR
            )
        );

        const currentPage =
          instance
            .viewState
            .currentPageIndex;

        void hydrateImageCacheForPage(
          currentPage
        );
      }

      /* =====================================================
         LOCKED IMAGE SELECTION BEHAVIOR
      ===================================================== */

      async function selectImageForEditing(
        annotationId:
          string
      ) {
        const instance =
          instanceRef.current;

        const NutrientViewer =
          nutrientRef.current;

        if (
          !instance ||
          !NutrientViewer ||
          imageEditingRef.current
        ) {
          return;
        }

        imageEditingRef.current =
          true;

        imageSelectionConfirmedRef.current =
          false;

        await finishContentEditorIfNeeded();

        instance.setViewState(
          (
            state
          ) =>
            state.set(
              "interactionMode",
              null
            )
        );

        try {
          instance.setSelectedAnnotations(
            null
          );
        } catch {
          // Nothing selected.
        }

        await nextFrame();
        await nextFrame();

        instance.setSelectedAnnotations(
          NutrientViewer
            .Immutable
            .List(
              [
                annotationId,
              ]
            )
        );
      }

      function returnToContentEditorAfterImage() {
        if (
          !contentEditorWorkflowRef.current
        ) {
          return;
        }

        imageEditingRef.current =
          false;

        imageSelectionConfirmedRef.current =
          false;

        window.setTimeout(
          () => {
            if (
              contentEditorWorkflowRef.current &&
              !imageEditingRef.current
            ) {
              activateContentEditor();
            }
          },
          100
        );
      }

      /* =====================================================
         LOCKED IMAGE HIT TESTING
      ===================================================== */

      function installImageHitTesting(
        instance:
          NutrientInstance,

        NutrientViewer:
          NutrientViewerType
      ) {
        imageHitTestCleanupRef.current?.();

        const contentDocument =
          instance.contentDocument;

        const handlePointerDown =
          (
            event:
              Event
          ) => {
            if (
              !contentEditorWorkflowRef.current ||
              imageEditingRef.current
            ) {
              return;
            }

            if (
              instance
                .viewState
                .interactionMode !==
              NutrientViewer
                .InteractionMode
                .CONTENT_EDITOR
            ) {
              return;
            }

            const pointerEvent =
              event as
                PointerEvent;

            if (
              pointerEvent.button !==
              0
            ) {
              return;
            }

            const target =
              pointerEvent.target as
                Element |
                null;

            if (
              target &&
              typeof target.closest ===
                "function" &&
              target.closest(
                [
                  "button",
                  "input",
                  "select",
                  "textarea",
                  "a",
                  "[role='button']",
                  "[contenteditable='true']",
                ].join(
                  ","
                )
              )
            ) {
              return;
            }

            const currentPage =
              instance
                .viewState
                .currentPageIndex;

            const candidatePages =
              [
                currentPage,
                currentPage -
                  1,
                currentPage +
                  1,
              ].filter(
                (
                  page,
                  index,
                  pages
                ) =>
                  page >=
                    0 &&
                  page <
                    instance
                      .totalPageCount &&
                  pages.indexOf(
                    page
                  ) ===
                    index
              );

            let imageId:
              string |
              null =
                null;

            for (
              const pageIndex
              of candidatePages
            ) {
              let point:
                any;

              try {
                point =
                  instance.transformContentClientToPageSpace(
                    new NutrientViewer
                      .Geometry
                      .Point({
                        x:
                          pointerEvent
                            .clientX,

                        y:
                          pointerEvent
                            .clientY,
                      }),

                    pageIndex
                  );
              } catch {
                continue;
              }

              const images =
                Array.from(
                  imageAnnotationsRef
                    .current
                    .values()
                )
                  .filter(
                    (
                      annotation:
                        any
                    ) =>
                      annotation
                        .pageIndex ===
                      pageIndex
                  )
                  .reverse();

              for (
                const image
                of images
              ) {
                const box =
                  image
                    .boundingBox;

                if (
                  !box
                ) {
                  continue;
                }

                const insideX =
                  point.x >=
                    box.left &&
                  point.x <=
                    box.left +
                      box.width;

                const insideY =
                  point.y >=
                    box.top &&
                  point.y <=
                    box.top +
                      box.height;

                if (
                  insideX &&
                  insideY
                ) {
                  if (
                    typeof image.id ===
                    "string"
                  ) {
                    imageId =
                      image.id;
                  }

                  break;
                }
              }

              if (
                imageId
              ) {
                break;
              }
            }

            if (
              !imageId
            ) {
              return;
            }

            pointerEvent.preventDefault();

            pointerEvent.stopPropagation();

            pointerEvent.stopImmediatePropagation();

            void selectImageForEditing(
              imageId
            );
          };

        contentDocument.addEventListener(
          "pointerdown",
          handlePointerDown,
          true
        );

        imageHitTestCleanupRef.current =
          () => {
            contentDocument.removeEventListener(
              "pointerdown",
              handlePointerDown,
              true
            );
          };
      }

      /* =====================================================
         IMAGE EVENTS
      ===================================================== */

      function installImageAnnotationEvents(
        instance:
          NutrientInstance,

        NutrientViewer:
          NutrientViewerType
      ) {
        imageEventsCleanupRef.current?.();

        const created =
          (
            annotations:
              any
          ) => {
            cacheAnnotationList(
              annotations
            );
          };

        const loaded =
          (
            annotations:
              any
          ) => {
            cacheAnnotationList(
              annotations
            );
          };

        const updated =
          (
            annotations:
              any
          ) => {
            cacheAnnotationList(
              annotations
            );
          };

        const deleted =
          (
            annotations:
              any
          ) => {
            removeCachedAnnotations(
              annotations
            );
          };

        const transformed =
          (
            event:
              any
          ) => {
            const annotation =
              event
                ?.annotation;

            if (
              annotation instanceof
              NutrientViewer
                .Annotations
                .ImageAnnotation
            ) {
              cacheImageAnnotation(
                annotation
              );
            }
          };

        const pageChanged =
          (
            pageIndex:
              number
          ) => {
            void hydrateImageCacheForPage(
              pageIndex
            );
          };

        instance.addEventListener(
          "annotations.create",
          created
        );

        instance.addEventListener(
          "annotations.load",
          loaded
        );

        instance.addEventListener(
          "annotations.update",
          updated
        );

        instance.addEventListener(
          "annotations.delete",
          deleted
        );

        instance.addEventListener(
          "annotations.transform",
          transformed
        );

        instance.addEventListener(
          "viewState.currentPageIndex.change",
          pageChanged
        );

        imageEventsCleanupRef.current =
          () => {
            try {
              instance.removeEventListener(
                "annotations.create",
                created
              );

              instance.removeEventListener(
                "annotations.load",
                loaded
              );

              instance.removeEventListener(
                "annotations.update",
                updated
              );

              instance.removeEventListener(
                "annotations.delete",
                deleted
              );

              instance.removeEventListener(
                "annotations.transform",
                transformed
              );

              instance.removeEventListener(
                "viewState.currentPageIndex.change",
                pageChanged
              );
            } catch {
              // Already removed.
            }
          };
      }

      /* =====================================================
         REAL RESIZABLE ADD TEXT

         IMPORTANT:

         Existing PDF text:
           -> still uses Content Editor.

         New text added by the user:
           -> uses Nutrient TextAnnotation.

         This gives the new text its own real annotation
         boundingBox with width + height and native
         annotation resizing.

         LOCKED FEATURES NOT TOUCHED:
         - image re-selection
         - image drag / resize
         - Search
         - Unit Converter
         - Save / Download
         - PDF content text editing
         - Locate
         - mouse zoom
      ===================================================== */

      async function startResizableTextAnnotationTool() {
        const instance =
          instanceRef.current;

        const NutrientViewer =
          nutrientRef.current;

        if (
          !instance ||
          !NutrientViewer
        ) {
          return;
        }

        textAnnotationWorkflowRef.current =
          true;

        textAnnotationSelectionArmedRef.current =
          false;

        /*
         * We still want to return to Content Editor
         * after the new annotation has been finished.
         */
        contentEditorWorkflowRef.current =
          true;

        /*
         * Content Editor and TextAnnotation creation
         * cannot be active at the same time.
         *
         * Save the current Content Editor state first.
         */
        try {
          if (
            instance
              .contentEditor
              .isActive()
          ) {
            await instance
              .saveContentEditingSession();
          }
        } catch (
          error
        ) {
          console.error(
            "Unable to temporarily close Content Editor:",
            error
          );

          textAnnotationWorkflowRef.current =
            false;

          return;
        }

        try {
          instance.setEditingAnnotation(
            null
          );
        } catch {
          // Nothing being edited.
        }

        try {
          instance.setSelectedAnnotations(
            null
          );
        } catch {
          // Nothing selected.
        }

        /*
         * Official Nutrient free-text annotation mode.
         *
         * The next click on the PDF creates
         * a TextAnnotation rather than a
         * Content Editor TextBlock.
         */
        instance.setViewState(
          (
            state
          ) =>
            state.set(
              "interactionMode",
              NutrientViewer
                .InteractionMode
                .TEXT
            )
        );
      }


      /* =====================================================
         PREPARE NEW TEXTANNOTATION

         Gives every newly-added TextAnnotation
         a useful initial WIDTH + HEIGHT.
      ===================================================== */

      async function prepareNewTextAnnotation(
        annotation:
          any
      ) {
        const instance =
          instanceRef.current;

        const NutrientViewer =
          nutrientRef.current;

        if (
          !instance ||
          !NutrientViewer ||
          !annotation ||
          !(
            annotation instanceof
            NutrientViewer
              .Annotations
              .TextAnnotation
          )
        ) {
          return;
        }

        const annotationId =
          annotation.id;

        const pageIndex =
          annotation.pageIndex;

        const originalBox =
          annotation.boundingBox;

        if (
          typeof annotationId !==
            "string" ||
          typeof pageIndex !==
            "number" ||
          !originalBox
        ) {
          return;
        }

        const pageInfo =
          instance.pageInfoForIndex(
            pageIndex
          );

        if (
          !pageInfo
        ) {
          return;
        }

        /*
         * Default new text area.
         *
         * User can resize it afterward.
         */
        const desiredWidth =
          260;

        const desiredHeight =
          90;

        const margin =
          10;

        const maxWidth =
          Math.max(
            60,
            pageInfo.width -
              originalBox.left -
              margin
          );

        const maxHeight =
          Math.max(
            35,
            pageInfo.height -
              originalBox.top -
              margin
          );

        const width =
          Math.min(
            maxWidth,
            Math.max(
              originalBox.width,
              desiredWidth
            )
          );

        const height =
          Math.min(
            maxHeight,
            Math.max(
              originalBox.height,
              desiredHeight
            )
          );

        let updatedAnnotation =
          annotation;

        /*
         * Give the annotation a real 2D area.
         */
        updatedAnnotation =
          updatedAnnotation
            .set(
              "boundingBox",
              new NutrientViewer
                .Geometry
                .Rect({
                  left:
                    originalBox.left,

                  top:
                    originalBox.top,

                  width,

                  height,
                })
            )
            .set(
              "isFitting",
              false
            )
            .set(
              "locked",
              false
            )
            .set(
              "lockedContents",
              false
            )
            .set(
              "readOnly",
              false
            );

        try {
          await instance.update(
            updatedAnnotation
          );
        } catch (
          error
        ) {
          console.error(
            "Unable to prepare new TextAnnotation:",
            error
          );

          return;
        }

        /*
         * Leave the repeated-create TEXT tool.
         * We only want one annotation for this click.
         */
        instance.setViewState(
          (
            state
          ) =>
            state.set(
              "interactionMode",
              null
            )
        );

        /*
         * Put the new TextAnnotation directly
         * into normal Nutrient text editing.
         */
        window.requestAnimationFrame(
          () => {
            window.requestAnimationFrame(
              () => {
                try {
                  instance
                    .setEditingAnnotation(
                      annotationId,
                      false
                    );
                } catch (
                  error
                ) {
                  console.error(
                    "Unable to edit new TextAnnotation:",
                    error
                  );
                }

                /*
                 * Arm deselection only AFTER
                 * Nutrient has mounted its
                 * annotation selection.
                 */
                window.requestAnimationFrame(
                  () => {
                    textAnnotationSelectionArmedRef.current =
                      true;
                  }
                );
              }
            );
          }
        );
      }


      /* =====================================================
         RETURN FROM TEXTANNOTATION TO CONTENT EDITOR
      ===================================================== */

      function returnToContentEditorAfterTextAnnotation() {
        textAnnotationWorkflowRef.current =
          false;

        textAnnotationSelectionArmedRef.current =
          false;

        const instance =
          instanceRef.current;

        if (
          !instance
        ) {
          return;
        }

        /*
         * Give Nutrient time to finish the
         * annotation deselection / editing event.
         */
        window.setTimeout(
          () => {
            if (
              contentEditorWorkflowRef.current &&
              !textAnnotationWorkflowRef.current
            ) {
              activateContentEditor();
            }
          },
          100
        );
      }


      /* =====================================================
         TEXTANNOTATION EVENTS
      ===================================================== */

      function installTextAnnotationWorkflow(
        instance:
          NutrientInstance,

        NutrientViewer:
          NutrientViewerType
      ) {
        textAnnotationEventsCleanupRef.current?.();

        /*
         * When the TEXT tool creates a TextAnnotation,
         * enlarge it and open it for typing.
         */
        const createdHandler =
          (
            annotations:
              any
          ) => {
            if (
              !textAnnotationWorkflowRef.current ||
              !annotations
            ) {
              return;
            }

            annotations.forEach(
              (
                annotation:
                  any
              ) => {
                if (
                  annotation instanceof
                  NutrientViewer
                    .Annotations
                    .TextAnnotation
                ) {
                  void prepareNewTextAnnotation(
                    annotation
                  );
                }
              }
            );
          };

        /*
         * Clicking OUTSIDE the new text annotation
         * returns the user to the normal Content Editor.
         */
        const selectionHandler =
          (
            annotations:
              any
          ) => {
            if (
              !textAnnotationWorkflowRef.current ||
              !textAnnotationSelectionArmedRef.current
            ) {
              return;
            }

            if (
              annotations &&
              annotations.size >
                0
            ) {
              return;
            }

            returnToContentEditorAfterTextAnnotation();
          };

        /*
         * If the user deletes the new text annotation,
         * also return normally to Content Editor.
         */
        const deleteHandler =
          (
            annotations:
              any
          ) => {
            if (
              !textAnnotationWorkflowRef.current ||
              !annotations
            ) {
              return;
            }

            let textDeleted =
              false;

            annotations.forEach(
              (
                annotation:
                  any
              ) => {
                if (
                  annotation instanceof
                  NutrientViewer
                    .Annotations
                    .TextAnnotation
                ) {
                  textDeleted =
                    true;
                }
              }
            );

            if (
              textDeleted
            ) {
              returnToContentEditorAfterTextAnnotation();
            }
          };

        instance.addEventListener(
          "annotations.create",
          createdHandler
        );

        instance.addEventListener(
          "annotationSelection.change",
          selectionHandler
        );

        instance.addEventListener(
          "annotations.delete",
          deleteHandler
        );

        textAnnotationEventsCleanupRef.current =
          () => {
            try {
              instance.removeEventListener(
                "annotations.create",
                createdHandler
              );

              instance.removeEventListener(
                "annotationSelection.change",
                selectionHandler
              );

              instance.removeEventListener(
                "annotations.delete",
                deleteHandler
              );
            } catch {
              // Already removed.
            }
          };
      }


      /* =====================================================
         REPLACE CONTENT EDITOR "ADD TEXT BOX"

         Nutrient's normal Content Editor T+ button creates
         a Content Editor text block.

         We keep the SAME visible button/icon but replace
         only its click action so it starts our real
         TextAnnotation tool instead.
      ===================================================== */

      function installAddTextButtonOverride(
        instance:
          NutrientInstance
      ) {
        addTextOverrideCleanupRef.current?.();

        const contentDocument =
          instance.contentDocument;

        let patchFrame =
          0;

        const patchButtons =
          () => {
            cancelAnimationFrame(
              patchFrame
            );

            patchFrame =
              requestAnimationFrame(
                () => {
                  /*
                   * Only patch this button while the
                   * PDF Content Editor is active.
                   */
                  if (
                    !instance
                      .contentEditor
                      .isActive()
                  ) {
                    return;
                  }

                  const buttons =
                    Array.from(
                      contentDocument
                        .querySelectorAll(
                          "button"
                        )
                    ) as
                      HTMLButtonElement[];

                  buttons.forEach(
                    (
                      button
                    ) => {
                      if (
                        button.dataset
                          .pdfRealTextAnnotation ===
                        "true"
                      ) {
                        return;
                      }

                      const label =
                        [
                          button.textContent,
                          button.getAttribute(
                            "title"
                          ),
                          button.getAttribute(
                            "aria-label"
                          ),
                          button.getAttribute(
                            "data-tooltip"
                          ),
                        ]
                          .filter(
                            Boolean
                          )
                          .join(
                            " "
                          )
                          .trim()
                          .toLowerCase();

                      /*
                       * Nutrient currently calls this
                       * Content Editor control
                       * "Add text box".
                       *
                       * We intentionally keep matching
                       * narrow so no other toolbar
                       * feature is touched.
                       */
                      const isAddText =
                        label.includes(
                          "add text box"
                        ) ||
                        label ===
                          "add text" ||
                        label.includes(
                          "add new text"
                        );

                      if (
                        !isAddText
                      ) {
                        return;
                      }

                      /*
                       * Clone preserves the exact
                       * Nutrient icon / styling but
                       * removes Nutrient's old
                       * Content Editor click handler.
                       */
                      const replacement =
                        button.cloneNode(
                          true
                        ) as
                          HTMLButtonElement;

                      replacement.dataset
                        .pdfRealTextAnnotation =
                        "true";

                      replacement.setAttribute(
                        "title",
                        "Add resizable text"
                      );

                      replacement.setAttribute(
                        "aria-label",
                        "Add resizable text"
                      );

                      replacement.addEventListener(
                        "click",
                        (
                          event
                        ) => {
                          event.preventDefault();

                          event.stopPropagation();

                          event.stopImmediatePropagation();

                          void startResizableTextAnnotationTool();
                        },
                        true
                      );

                      button.replaceWith(
                        replacement
                      );
                    }
                  );
                }
              );
          };

        const observer =
          new MutationObserver(
            patchButtons
          );

        observer.observe(
          contentDocument,
          {
            childList:
              true,

            subtree:
              true,

            attributes:
              true,

            attributeFilter:
              [
                "title",
                "aria-label",
              ],
          }
        );

        const stateChangeHandler =
          () => {
            patchButtons();
          };

        instance.addEventListener(
          "contentEditor.stateChange",
          stateChangeHandler
        );

        patchButtons();

        addTextOverrideCleanupRef.current =
          () => {
            observer.disconnect();

            cancelAnimationFrame(
              patchFrame
            );

            try {
              instance.removeEventListener(
                "contentEditor.stateChange",
                stateChangeHandler
              );
            } catch {
              // Already removed.
            }
          };
      }

      /* =====================================================
         SEARCH
      ===================================================== */

      async function openSearch() {
        const instance =
          instanceRef.current;

        const NutrientViewer =
          nutrientRef.current;

        if (
          !instance ||
          !NutrientViewer
        ) {
          return;
        }

        try {
          const returnToEditor =
            contentEditorWorkflowRef.current;

          imageEditingRef.current =
            false;

          imageSelectionConfirmedRef.current =
            false;

          await finishContentEditorIfNeeded();

          resumeAfterSearchRef.current =
            returnToEditor;

          try {
            instance.setSelectedAnnotations(
              null
            );
          } catch {
            // Nothing selected.
          }

          instance.setViewState(
            (
              state
            ) =>
              state.set(
                "interactionMode",
                NutrientViewer
                  .InteractionMode
                  .SEARCH
              )
          );
          /*
 * Move the existing Nutrient search bar
 * immediately after the Search icon.
 * Search behavior itself is unchanged.
 */
let searchPositionAttempt = 0;

const positionSearchBar = () => {
  searchPositionAttempt += 1;

  const viewerDocument =
    instance.contentDocument;

  const searchInput =
    Array.from(
      viewerDocument.querySelectorAll(
        "input"
      )
    ).find(
      (input) => {
        const placeholder =
          (
            input.getAttribute(
              "placeholder"
            ) || ""
          ).toLowerCase();

        return placeholder.includes(
          "search"
        );
      }
    ) as
      HTMLInputElement |
      undefined;

  if (!searchInput) {
    if (
      searchPositionAttempt <
      30
    ) {
      window.requestAnimationFrame(
        positionSearchBar
      );
    }

    return;
  }

  const buttons =
    Array.from(
      viewerDocument.querySelectorAll(
        "button"
      )
    ) as HTMLButtonElement[];

  const searchButton =
    buttons.find(
      (button) => {
        const label =
          [
            button.getAttribute(
              "aria-label"
            ),
            button.getAttribute(
              "title"
            ),
          ]
            .filter(Boolean)
            .join(" ")
            .toLowerCase();

        return label.includes(
          "search pdf"
        );
      }
    );

  if (!searchButton) {
    return;
  }

  let searchPanel =
    searchInput.parentElement;

  while (
  searchPanel
) {
    const rect =
      searchPanel.getBoundingClientRect();

    const panelButtons =
      searchPanel.querySelectorAll(
        "button"
      ).length;

    if (
      rect.width >= 400 &&
      panelButtons >= 2
    ) {
      break;
    }

    searchPanel =
      searchPanel.parentElement;
  }

  if (!searchPanel) {
  return;
}

  const buttonRect =
    searchButton
      .getBoundingClientRect();

  const panelRect =
    searchPanel
      .getBoundingClientRect();

  const viewportWidth =
  viewerDocument instanceof Document
    ? viewerDocument.documentElement.clientWidth
    : viewerDocument.host.getBoundingClientRect().width;
  const desiredLeft =
    buttonRect.right + 8;

  const maximumLeft =
    Math.max(
      8,
      viewportWidth -
        panelRect.width -
        8
    );

  searchPanel.style.position =
    "fixed";

  searchPanel.style.left =
    `${Math.min(
      desiredLeft,
      maximumLeft
    )}px`;

  searchPanel.style.right =
    "auto";

  searchPanel.style.top =
    `${buttonRect.top}px`;

  searchPanel.style.margin =
    "0";

  searchPanel.style.zIndex =
    "9999";
    /*
 * Keep search bar compact so it matches
 * the main toolbar height.
 */
/*
 * Match the search panel exactly
 * to the main toolbar/search-button height.
 */
const toolbarHeight =
  buttonRect.height;

searchPanel.style.height =
  `${toolbarHeight}px`;

searchPanel.style.minHeight =
  `${toolbarHeight}px`;

searchPanel.style.maxHeight =
  `${toolbarHeight}px`;

searchPanel.style.boxSizing =
  "border-box";

searchPanel.style.display =
  "flex";

searchPanel.style.alignItems =
  "center";

searchPanel.style.paddingTop =
  "0";

searchPanel.style.paddingBottom =
  "0";

searchPanel.style.overflow =
  "hidden";


const searchInputHeight =
  Math.max(
    34,
    toolbarHeight - 14
  );

searchInput.style.height =
  `${searchInputHeight}px`;

searchInput.style.minHeight =
  `${searchInputHeight}px`;

searchInput.style.maxHeight =
  `${searchInputHeight}px`;

searchInput.style.boxSizing =
  "border-box";
};

window.requestAnimationFrame(
  positionSearchBar
);
        } catch (
          error
        ) {
          console.error(
            "Search error:",
            error
          );

          resumeAfterSearchRef.current =
            false;

          if (
            contentEditorWorkflowRef.current
          ) {
            activateContentEditor();
          }
        }
      }

      /* =====================================================
         NEW:
         SEARCH RESULT -> BLUE EDITABLE CONTENT BOX
      ===================================================== */

      function rectCenter(
        rect:
          any
      ) {
        return {
          x:
            Number(
              rect?.left ??
              0
            ) +
            Number(
              rect?.width ??
              0
            ) /
              2,

          y:
            Number(
              rect?.top ??
              0
            ) +
            Number(
              rect?.height ??
              0
            ) /
              2,
        };
      }

      function distanceBetweenRects(
        first:
          any,

        second:
          any
      ) {
        if (
          !first ||
          !second
        ) {
          return Number
            .POSITIVE_INFINITY;
        }

        const firstCenter =
          rectCenter(
            first
          );

        const secondCenter =
          rectCenter(
            second
          );

        return (
          Math.abs(
            firstCenter.x -
              secondCenter.x
          ) +
          Math.abs(
            firstCenter.y -
              secondCenter.y
          )
        );
      }

      async function waitForMatchingContentBlock(
        pageIndex:
          number,

        term:
          string,

        resultRect:
          any
      ):
        Promise<any | null> {
        const instance =
          instanceRef.current;

        if (
          !instance
        ) {
          return null;
        }

        const searchTerm =
          term
            .trim()
            .toLocaleLowerCase();

        for (
          let attempt = 0;
          attempt <
            30;
          attempt++
        ) {
          const blocks =
            instance
              .contentEditor
              .getBlocks(
                pageIndex
              ) as
              readonly any[];

          if (
            blocks.length >
            0
          ) {
            const textBlocks =
              blocks.filter(
                (
                  block:
                    any
                ) =>
                  block &&
                  typeof block.id ===
                    "string" &&
                  typeof block.text ===
                    "string"
              );

            const matchingBlocks =
              textBlocks.filter(
                (
                  block:
                    any
                ) =>
                  block.text
                    .toLocaleLowerCase()
                    .includes(
                      searchTerm
                    )
              );

            const candidates =
              matchingBlocks.length >
              0
                ? matchingBlocks
                : textBlocks;

            if (
              candidates.length >
              0
            ) {
              let bestBlock =
                candidates[0];

              let bestDistance =
                Number
                  .POSITIVE_INFINITY;

              for (
                const block
                of candidates
              ) {
                const blockRect =
                  block
                    ?.boundingBox;

                if (
                  !blockRect
                ) {
                  if (
                    bestDistance ===
                    Number
                      .POSITIVE_INFINITY
                  ) {
                    bestBlock =
                      block;
                  }

                  continue;
                }

                const distance =
                  distanceBetweenRects(
                    blockRect,
                    resultRect
                  );

                if (
                  distance <
                  bestDistance
                ) {
                  bestDistance =
                    distance;

                  bestBlock =
                    block;
                }
              }

              return bestBlock;
            }
          }

          await delay(
            80
          );
        }

        return null;
      }

      async function openSearchResultInContentEditor(
        searchResult:
          any,

        term:
          string
      ) {
        const instance =
          instanceRef.current;

        const NutrientViewer =
          nutrientRef.current;

        if (
          !instance ||
          !NutrientViewer ||
          searchResultOpeningRef.current
        ) {
          return;
        }

        const cleanedTerm =
          term.trim();

        if (
          !cleanedTerm
        ) {
          return;
        }

        searchResultOpeningRef.current =
          true;

        try {
          const pageIndex =
            Number(
              searchResult
                ?.pageIndex
            );

          if (
            !Number.isInteger(
              pageIndex
            ) ||
            pageIndex <
              0 ||
            pageIndex >=
              instance
                .totalPageCount
          ) {
            return;
          }

          const rects =
            searchResult
              ?.rectsOnPage;

          if (
            !rects ||
            rects.size ===
              0
          ) {
            return;
          }

          const resultRect =
            NutrientViewer
              .Geometry
              .Rect
              .union(
                rects
              );

          /*
           * Search was started from the Content Editor workflow.
           * Keep that workflow active.
           */
          contentEditorWorkflowRef.current =
            true;

          resumeAfterSearchRef.current =
            false;

          /*
           * Stay at the searched result.
           * Do NOT zoom.
           */
          instance.jumpToRect(
            pageIndex,
            resultRect.grow(
              22
            )
          );

          /*
           * Search mode and Content Editor mode cannot
           * operate simultaneously.
           *
           * We now switch from Search to Content Editor.
           */
          activateContentEditor();

          /*
           * Allow page + blue Content Editor blocks
           * to render/detect.
           */
          await nextFrame();
          await nextFrame();

          const block =
            await waitForMatchingContentBlock(
              pageIndex,
              cleanedTerm,
              resultRect
            );

          if (
            !block ||
            typeof block.id !==
              "string"
          ) {
            /*
             * Content Editor is still open.
             * User can manually click the nearby blue box.
             */
            return;
          }

          /*
           * Put searched block directly into edit mode.
           */
          instance
            .contentEditor
            .focusBlock(
              block.id
            );

          await nextFrame();

          const text =
            typeof block.text ===
            "string"
              ? block.text
              : "";

          const lowerText =
            text.toLocaleLowerCase();

          const lowerTerm =
            cleanedTerm
              .toLocaleLowerCase();

          const matchIndex =
            lowerText.indexOf(
              lowerTerm
            );

          if (
            matchIndex <
            0
          ) {
            /*
             * Block is focused even when exact character
             * mapping is unavailable.
             */
            return;
          }

          /*
           * Select only the searched word inside
           * the blue editable text block.
           */
          await instance
            .contentEditor
            .setTextSelection(
              block.id,
              {
                begin:
                  matchIndex,

                end:
                  matchIndex +
                  cleanedTerm.length,
              }
            );
        } catch (
          error
        ) {
          console.error(
            "Unable to open searched text in Content Editor:",
            error
          );
        } finally {
          searchResultOpeningRef.current =
            false;
        }
      }

      function installSearchToEditBehavior(
        instance:
          NutrientInstance,

        NutrientViewer:
          NutrientViewerType
      ) {
        searchEditCleanupRef.current?.();

        const contentDocument =
          instance
            .contentDocument;

        /*
         * Keep the latest built-in search state.
         */
        const handleSearchStateChange =
          (
            state:
              any
          ) => {
            searchStateRef.current =
              state;
          };

        instance.addEventListener(
          "search.stateChange",
          handleSearchStateChange as any
        );

        searchStateRef.current =
          instance
            .searchState;

        /*
         * User searches normally.
         *
         * Yellow search result remains visible.
         *
         * Clicking that highlighted search result
         * moves it directly into Content Editor.
         */
        const handleSearchResultPointerDown =
          (
            event:
              Event
          ) => {
            const pointerEvent =
              event as
                PointerEvent;

            if (
              pointerEvent.button !==
              0
            ) {
              return;
            }

            if (
              searchResultOpeningRef.current
            ) {
              return;
            }

            if (
              instance
                .viewState
                .interactionMode !==
              NutrientViewer
                .InteractionMode
                .SEARCH
            ) {
              return;
            }

            const searchState =
              searchStateRef.current ??
              instance.searchState;

            const term =
              String(
                searchState
                  ?.term ??
                ""
              ).trim();

            const results =
              searchState
                ?.results;

            if (
              !term ||
              !results ||
              results.size ===
                0
            ) {
              return;
            }

            /*
             * Don't steal Search UI button/input clicks.
             */
            const target =
              pointerEvent.target as
                Element |
                null;

            if (
              target &&
              typeof target.closest ===
                "function" &&
              target.closest(
                [
                  "button",
                  "input",
                  "select",
                  "textarea",
                  "a",
                  "[role='button']",
                ].join(
                  ","
                )
              )
            ) {
              return;
            }

            let hitResult:
              any =
                null;

            results.forEach(
              (
                result:
                  any
              ) => {
                if (
                  hitResult
                ) {
                  return;
                }

                const pageIndex =
                  Number(
                    result
                      ?.pageIndex
                  );

                const rects =
                  result
                    ?.rectsOnPage;

                if (
                  !Number.isInteger(
                    pageIndex
                  ) ||
                  !rects ||
                  rects.size ===
                    0
                ) {
                  return;
                }

                let point:
                  any;

                try {
                  point =
                    instance.transformContentClientToPageSpace(
                      new NutrientViewer
                        .Geometry
                        .Point({
                          x:
                            pointerEvent
                              .clientX,

                          y:
                            pointerEvent
                              .clientY,
                        }),

                      pageIndex
                    );
                } catch {
                  return;
                }

                rects.forEach(
                  (
                    rect:
                      any
                  ) => {
                    if (
                      hitResult
                    ) {
                      return;
                    }

                    /*
                     * Small padding makes clicking the
                     * yellow highlight easier.
                     */
                    const padding =
                      5;

                    const left =
                      rect.left -
                      padding;

                    const top =
                      rect.top -
                      padding;

                    const right =
                      rect.left +
                      rect.width +
                      padding;

                    const bottom =
                      rect.top +
                      rect.height +
                      padding;

                    if (
                      point.x >=
                        left &&
                      point.x <=
                        right &&
                      point.y >=
                        top &&
                      point.y <=
                        bottom
                    ) {
                      hitResult =
                        result;
                    }
                  }
                );
              }
            );

            if (
              !hitResult
            ) {
              return;
            }

            pointerEvent.preventDefault();

            pointerEvent.stopPropagation();

            pointerEvent.stopImmediatePropagation();

            void openSearchResultInContentEditor(
              hitResult,
              term
            );
          };

        contentDocument.addEventListener(
          "pointerdown",
          handleSearchResultPointerDown,
          true
        );

        searchEditCleanupRef.current =
          () => {
            contentDocument.removeEventListener(
              "pointerdown",
              handleSearchResultPointerDown,
              true
            );

            try {
              instance.removeEventListener(
                "search.stateChange",
                handleSearchStateChange as any
              );
            } catch {
              // Already removed.
            }
          };
      }

      /* =====================================================
         INSERT IMAGE
      ===================================================== */

      async function insertImage() {
        const instance =
          instanceRef.current;

        const NutrientViewer =
          nutrientRef.current;

        if (
          !instance ||
          !NutrientViewer ||
          imageInsertBusyRef.current
        ) {
          return;
        }

        const input =
          document.createElement(
            "input"
          );

        input.type =
          "file";

        input.accept =
          "image/png,image/jpeg,image/jpg";

        input.style.display =
          "none";

        document.body.appendChild(
          input
        );

        input.onchange =
          async () => {
            const file =
              input.files?.[0];

            input.remove();

            if (
              !file
            ) {
              return;
            }

            imageInsertBusyRef.current =
              true;

            try {
              await finishContentEditorIfNeeded();

              const imageAttachmentId =
                await instance.createAttachment(
                  file
                );

              const dimensions =
                await getImageDimensions(
                  file
                );

              const pageIndex =
                instance
                  .viewState
                  .currentPageIndex;

              const pageInfo =
                instance.pageInfoForIndex(
                  pageIndex
                );

              if (
                !pageInfo
              ) {
                throw new Error(
                  "Unable to read current PDF page size."
                );
              }

              const maxWidth =
                pageInfo.width *
                0.35;

              const maxHeight =
                pageInfo.height *
                0.35;

              const ratio =
                dimensions.width /
                Math.max(
                  dimensions.height,
                  1
                );

              let width =
                Math.min(
                  maxWidth,
                  Math.max(
                    120,
                    dimensions.width *
                      0.5
                  )
                );

              let height =
                width /
                ratio;

              if (
                height >
                maxHeight
              ) {
                height =
                  maxHeight;

                width =
                  height *
                  ratio;
              }

              width =
                Math.max(
                  80,
                  width
                );

              height =
                Math.max(
                  60,
                  height
                );

              const left =
                Math.max(
                  10,
                  (
                    pageInfo.width -
                    width
                  ) /
                    2
                );

              const top =
                Math.max(
                  10,
                  (
                    pageInfo.height -
                    height
                  ) /
                    2
                );

              const annotationId =
                NutrientViewer
                  .generateInstantId();

              const annotation =
                new NutrientViewer
                  .Annotations
                  .ImageAnnotation({
                    id:
                      annotationId,

                    pageIndex,

                    contentType:
                      file.type ||
                      "image/png",

                    imageAttachmentId,

                    fileName:
                      file.name,

                    boundingBox:
                      new NutrientViewer
                        .Geometry
                        .Rect({
                          left,
                          top,
                          width,
                          height,
                        }),

                    locked:
                      false,

                    lockedContents:
                      false,

                    readOnly:
                      false,
                  });

              await instance.create(
                annotation
              );

              cacheImageAnnotation(
                annotation
              );

              /*
               * LOCKED WORKING BEHAVIOR:
               * inserted image immediately gets handles.
               */
              await selectImageForEditing(
                annotationId
              );
            } catch (
              error
            ) {
              console.error(
                "Image insertion error:",
                error
              );

              alert(
                error instanceof
                  Error
                  ? error.message
                  : "Unable to insert image."
              );

              imageEditingRef.current =
                false;

              imageSelectionConfirmedRef.current =
                false;

              if (
                contentEditorWorkflowRef.current
              ) {
                activateContentEditor();
              }
            } finally {
              imageInsertBusyRef.current =
                false;
            }
          };

        input.oncancel =
          () => {
            input.remove();
          };

        input.click();
      }

      /* =====================================================
         TOOLBAR
      ===================================================== */

      function applyMainToolbar(
        instance:
          NutrientInstance
      ) {
        const imageTool =
          {
            type:
              "custom",

            id:
              "pdf-editor-image",

            title:
              "Insert Image",

            icon:
              IMAGE_ICON,

            disabled:
              false,

            onPress() {
              void insertImage();
            }, 
          } as any;

        const searchTool =
          {
            type:
              "custom",

            id:
              "pdf-editor-search",

            title:
              "Search PDF",

            icon:
              SEARCH_ICON,

            disabled:
              false,

            onPress() {
              void openSearch();
            },
          } as any;
          /*
 * PAGE COUNTER
 * Shows: 1 / 2, 2 / 2, etc.
 */
const pageCounterNode =
  document.createElement(
    "div"
  );

pageCounterNode.style.display =
  "flex";

pageCounterNode.style.alignItems =
  "center";

pageCounterNode.style.justifyContent =
  "center";

pageCounterNode.style.minWidth =
  "64px";

pageCounterNode.style.height =
  "40px";

pageCounterNode.style.padding =
  "0 10px";

pageCounterNode.style.fontSize =
  "14px";

pageCounterNode.style.fontWeight =
  "600";

pageCounterNode.style.color =
  "#0f172a";

pageCounterNode.style.background =
  "#ffffff";

pageCounterNode.style.borderLeft =
  "1px solid #e2e8f0";

pageCounterNode.style.borderRight =
  "1px solid #e2e8f0";

pageCounterNode.style.pointerEvents =
  "none";

pageCounterNode.style.userSelect =
  "none";


const updatePageCounter =
  () => {
    const currentPage =
      instance
        .viewState
        .currentPageIndex +
      1;

    const totalPages =
      Math.max(
        1,
        instance.totalPageCount
      );

    pageCounterNode.textContent =
      `${currentPage} / ${totalPages}`;
  };


updatePageCounter();
          

        instance.setToolbarItems(
          [
           {
  type: "custom",

  id: "pdf-editor-prev-page",

  title: "Previous Page",

  icon: `
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
    >
      <path d="m15 18-6-6 6-6"/>
    </svg>
  `,

  onPress() {
    const currentPageIndex =
      instance
        .viewState
        .currentPageIndex;

    if (
      currentPageIndex <= 0
    ) {
      return;
    }

    instance.setViewState(
      (
        viewState
      ) =>
        viewState.set(
          "currentPageIndex",
          currentPageIndex - 1
        )
    );
  },
} as any,

{
  type: "custom",

  id:
    "pdf-editor-page-counter",

  title:
    "Page Count",

  node:
    pageCounterNode,
} as any,
{
  type: "custom",

  id: "pdf-editor-next-page",

  title: "Next Page",

  icon: `
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
    >
      <path d="m9 18 6-6-6-6"/>
    </svg>
  `,

  onPress() {
    const currentPageIndex =
      instance
        .viewState
        .currentPageIndex;

    const lastPageIndex =
      instance
        .totalPageCount -
      1;

    if (
      currentPageIndex >=
      lastPageIndex
    ) {
      return;
    }

    instance.setViewState(
      (
        viewState
      ) =>
        viewState.set(
          "currentPageIndex",
          currentPageIndex + 1
        )
    );
  },
} as any,

            {
              type:
                "zoom-out",
            },

            {
              type:
                "zoom-in",
            },

            {
              type:
                "layout-config",
            },

            imageTool,

            searchTool,
          ] as any
        );
      }
      

      /* =====================================================
         REMOVE NOTE
      ===================================================== */

      function removeNoteOption(
        instance:
          NutrientInstance
      ) { 
        instance.setAnnotationToolbarItems(
          (
            _annotation:
              any,

            context:
              any
          ) => {
            const items =
              context
                ?.defaultAnnotationToolbarItems ??
              [];

            return items.filter(
              (
                item:
                  any
              ) => {
                const text =
                  [
                    item?.type,
                    item?.id,
                    item?.title,
                    item?.name,
                    item
                      ?.localization
                      ?.defaultMessage,
                  ]
                    .filter(
                      Boolean
                    )
                    .join(
                      " "
                    )
                    .toLowerCase();

                return (
                  !text.includes(
                    "note"
                  )
                );
              }
            );
          }
        );
      }

      /* =====================================================
         CANCEL -> UNDO
      ===================================================== */

      function installUndoButton(
        instance:
          NutrientInstance
      ) {
        undoCleanupRef.current?.();

        const contentDocument =
          instance.contentDocument;

        let frame =
          0;

        const patch =
          () => {
            cancelAnimationFrame(
              frame
            );

            frame =
              requestAnimationFrame(
                () => {
                  if (
                    !instance
                      .contentEditor
                      .isActive()
                  ) {
                    return;
                  }

                  const buttons =
                    Array.from(
                      contentDocument
                        .querySelectorAll(
                          "button"
                        )
                    ) as HTMLButtonElement[];

                  const existing =
                    buttons.find(
                      (
                        button
                      ) =>
                        button
                          .dataset
                          .pdfUndo ===
                        "true"
                    );

                  const active =
                    instance
                      .contentEditor
                      .getActiveBlock();

                  const selected =
                    instance
                      .contentEditor
                      .getSelectedBlock();

                  const enabled =
                    Boolean(
                      active ||
                      selected
                    );

                  if (
                    existing
                  ) {
                    existing.disabled =
                      !enabled;

                    existing.style.opacity =
                      enabled
                        ? "1"
                        : "0.45";

                    existing.style.cursor =
                      enabled
                        ? "pointer"
                        : "not-allowed";

                    return;
                  }

                  const cancel =
                    buttons.find(
                      (
                        button
                      ) => {
                        const text =
                          button
                            .textContent
                            ?.trim()
                            .toLowerCase();

                        const aria =
                          button
                            .getAttribute(
                              "aria-label"
                            )
                            ?.trim()
                            .toLowerCase();

                        const title =
                          button
                            .getAttribute(
                              "title"
                            )
                            ?.trim()
                            .toLowerCase();

                        return (
                          text ===
                            "cancel" ||
                          aria ===
                            "cancel" ||
                          title ===
                            "cancel"
                        );
                      }
                    );

                  if (
                    !cancel
                  ) {
                    return;
                  }

                  const undo =
                    cancel.cloneNode(
                      true
                    ) as HTMLButtonElement;

                  undo.dataset.pdfUndo =
                    "true";

                  undo.textContent =
                    "Undo";

                  undo.setAttribute(
                    "title",
                    "Undo"
                  );

                  undo.setAttribute(
                    "aria-label",
                    "Undo"
                  );

                  undo.disabled =
                    !enabled;

                  undo.addEventListener(
                    "click",
                    (
                      event
                    ) => {
                      event.preventDefault();

                      event.stopPropagation();

                      event.stopImmediatePropagation();

                      try {
                        let block =
                          instance
                            .contentEditor
                            .getActiveBlock();

                        if (
                          !block
                        ) {
                          block =
                            instance
                              .contentEditor
                              .getSelectedBlock();

                          if (
                            block
                          ) {
                            instance
                              .contentEditor
                              .focusBlock(
                                block
                              );
                          }
                        }

                        requestAnimationFrame(
                          () => {
                            try {
                              if (
                                instance
                                  .contentEditor
                                  .canUndo()
                              ) {
                                instance
                                  .contentEditor
                                  .undo();
                              }
                            } catch (
                              error
                            ) {
                              console.error(
                                "Undo error:",
                                error
                              );
                            }

                            setTimeout(
                              patch,
                              0
                            );
                          }
                        );
                      } catch (
                        error
                      ) {
                        console.error(
                          "Undo error:",
                          error
                        );
                      }
                    },
                    true
                  );

                  cancel.replaceWith(
                    undo
                  );
                }
              );
          };

        const observer =
          new MutationObserver(
            patch
          );

        observer.observe(
          contentDocument,
          {
            childList:
              true,

            subtree:
              true,
          }
        );

        const stateChanged =
          () => {
            patch();
          };

        instance.addEventListener(
          "contentEditor.stateChange",
          stateChanged
        );

        patch();

        undoCleanupRef.current =
          () => {
            observer.disconnect();

            cancelAnimationFrame(
              frame
            );

            try {
              instance.removeEventListener(
                "contentEditor.stateChange",
                stateChanged
              );
            } catch {
              // Already removed.
            }
          };
      }

      /* =====================================================
         MOUSE PAN + MOUSE WHEEL ZOOM
      ===================================================== */

      function installMouseControls(
        instance:
          NutrientInstance,

        NutrientViewer:
          NutrientViewerType,

        attempt =
          0
      ) {
        mouseCleanupRef.current?.();

        const contentDocument =
          instance.contentDocument;

        const contentWindow =
          instance.contentWindow;

        const scroll =
          contentDocument.querySelector(
            ".PSPDFKit-Scroll"
          ) as HTMLElement | null;

        if (
          !scroll
        ) {
          if (
            attempt <
            12
          ) {
            mouseInstallTimerRef.current =
              window.setTimeout(
                () => {
                  installMouseControls(
                    instance,
                    NutrientViewer,
                    attempt +
                      1
                  );
                },
                150
              );
          }

          return;
        }

        let dragging =
          false;

        let startX =
          0;

        let startY =
          0;

        let startLeft =
          0;

        let startTop =
          0;

        let wheelBusy =
          false;

        const isPanMode =
          () =>
            instance
              .viewState
              .interactionMode ===
            NutrientViewer
              .InteractionMode
              .PAN;

        const isInteractive =
          (
            target:
              EventTarget |
              null
          ) => {
            if (
              !target
            ) {
              return false;
            }

            const element =
              target as
                Element;

            if (
              typeof element.closest !==
              "function"
            ) {
              return false;
            }

            return Boolean(
              element.closest(
                [
                  "button",
                  "input",
                  "select",
                  "textarea",
                  "a",
                  "[role='button']",
                  "[contenteditable='true']",
                ].join(
                  ","
                )
              )
            );
          };

        const mouseDown =
          (
            event:
              MouseEvent
          ) => {
            /*
             * IMPORTANT:
             * never steal mouse events from selected images.
             */
            if (
              imageEditingRef.current
            ) {
              return;
            }

            if (
              event.button !==
                0 ||
              !isPanMode() ||
              isInteractive(
                event.target
              )
            ) {
              return;
            }

            dragging =
              true;

            startX =
              event.clientX;

            startY =
              event.clientY;

            startLeft =
              scroll.scrollLeft;

            startTop =
              scroll.scrollTop;

            scroll.style.cursor =
              "grabbing";

            scroll.style.userSelect =
              "none";

            clearLocateHighlight();

            event.preventDefault();
          };

        const mouseMove =
          (
            event:
              MouseEvent
          ) => {
            if (
              !dragging
            ) {
              return;
            }

            scroll.scrollLeft =
              startLeft -
              (
                event.clientX -
                startX
              );

            scroll.scrollTop =
              startTop -
              (
                event.clientY -
                startY
              );

            event.preventDefault();
          };

        const mouseUp =
          () => {
            if (
              !dragging
            ) {
              return;
            }

            dragging =
              false;

            scroll.style.cursor =
              isPanMode()
                ? "grab"
                : "";

            scroll.style.userSelect =
              "";
          };

        const wheel =
          (
            event:
              WheelEvent
          ) => {
            event.preventDefault();

            event.stopPropagation();

            if (
              wheelBusy
            ) {
              return;
            }

            wheelBusy =
              true;

            requestAnimationFrame(
              () => {
                try {
                  const current =
                    instance
                      .currentZoomLevel;

                  const min =
                    instance
                      .minimumZoomLevel;

                  const max =
                    instance
                      .maximumZoomLevel;

                  let next =
                    event.deltaY <
                    0
                      ? current *
                        1.12
                      : current /
                        1.12;

                  next =
                    Math.max(
                      min,
                      Math.min(
                        max,
                        next
                      )
                    );

                  instance.setViewState(
                    (
                      state
                    ) =>
                      state.set(
                        "zoom",
                        next
                      )
                  );
                } finally {
                  wheelBusy =
                    false;
                }
              }
            );
          };

        const viewChanged =
          () => {
            const currentMode =
              instance
                .viewState
                .interactionMode;

            const previousMode =
              previousInteractionModeRef.current;

            if (
              resumeAfterSearchRef.current &&
              previousMode ===
                NutrientViewer
                  .InteractionMode
                  .SEARCH &&
              currentMode !==
                NutrientViewer
                  .InteractionMode
                  .SEARCH
            ) {
              resumeAfterSearchRef.current =
                false;

              setTimeout(
                () => {
                  if (
                    contentEditorWorkflowRef.current &&
                    currentMode !==
                      NutrientViewer
                        .InteractionMode
                        .CONTENT_EDITOR
                  ) {
                    activateContentEditor();
                  }
                },
                80
              );
            }

            previousInteractionModeRef.current =
              currentMode;
          };

        previousInteractionModeRef.current =
          instance
            .viewState
            .interactionMode;

        scroll.addEventListener(
          "mousedown",
          mouseDown,
          true
        );

        contentWindow.addEventListener(
          "mousemove",
          mouseMove,
          true
        );

        contentWindow.addEventListener(
          "mouseup",
          mouseUp,
          true
        );

        contentWindow.addEventListener(
          "blur",
          mouseUp
        );

        scroll.addEventListener(
          "wheel",
          wheel,
          {
            passive:
              false,

            capture:
              true,
          }
        );

        instance.addEventListener(
          "viewState.change",
          viewChanged
        );

        mouseCleanupRef.current =
          () => {
            scroll.removeEventListener(
              "mousedown",
              mouseDown,
              true
            );

            contentWindow.removeEventListener(
              "mousemove",
              mouseMove,
              true
            );

            contentWindow.removeEventListener(
              "mouseup",
              mouseUp,
              true
            );

            contentWindow.removeEventListener(
              "blur",
              mouseUp
            );

            scroll.removeEventListener(
              "wheel",
              wheel,
              true
            );

            try {
              instance.removeEventListener(
                "viewState.change",
                viewChanged
              );
            } catch {
              // Already removed.
            }
          };
      }

      /* =====================================================
         EXPORT
      ===================================================== */

      async function exportWithoutClosingEditor():
        Promise<ArrayBuffer> {
        const instance =
          instanceRef.current;

        if (
          !instance
        ) {
          throw new Error(
            "PDF editor is not ready."
          );
        }

        if (
          instance
            .contentEditor
            .isActive()
        ) {
          return await instance
            .exportContentEditorPDF();
        }

        return await instance.exportPDF();
      }

      /* =====================================================
         PUBLIC METHODS
      ===================================================== */

      useImperativeHandle(
        ref,
        () => ({
          startContentEditing() {
            contentEditorWorkflowRef.current =
              true;

            imageEditingRef.current =
              false;

            imageSelectionConfirmedRef.current =
              false;

            activateContentEditor();

            const instance =
              instanceRef.current;

            if (
              instance
            ) {
              applyMainToolbar(
                instance
              );
            }
          },

          async startPanMode() {
            const instance =
              instanceRef.current;

            if (
              !instance
            ) {
              throw new Error(
                "PDF editor is not ready."
              );
            }

            contentEditorWorkflowRef.current =
              false;

            imageEditingRef.current =
              false;

            imageSelectionConfirmedRef.current =
              false;

            await finishContentEditorIfNeeded();

            activatePanMode();

            applyMainToolbar(
              instance
            );
          },

                    async analyzeDimensions(
            options: AnalyzeDimensionsOptions
          ) {
            const instance = instanceRef.current;
            const NutrientViewer = nutrientRef.current;

            if (!instance || !NutrientViewer) {
              throw new Error("PDF editor is not ready.");
            }

            if (options.sourceUnit === options.targetUnit) {
              throw new Error(
                "Source and target units must be different."
              );
            }

            /*
             * Stable non-null aliases.
             * Do not use instanceRef directly inside nested helpers.
             */
            const viewerInstance = instance;
            const viewerModule = NutrientViewer;

            const totalPages =
              viewerInstance.totalPageCount;

            const currentPageIndex =
              viewerInstance
                .viewState
                .currentPageIndex;

            const requestedPages =
              options.scope === "all"
                ? Array.from(
                    {
                      length: totalPages,
                    },
                    (_, index) => index
                  )
                : [currentPageIndex];

            /*
             * Prevent accidentally converting the same
             * currently loaded page twice.
             */
            const converterState =
              viewerInstance as any;

            if (
              !converterState
                .__unitConverterAppliedPages
            ) {
              converterState
                .__unitConverterAppliedPages =
                  new Set<number>();
            }

            const appliedPages =
              converterState
                .__unitConverterAppliedPages as
                  Set<number>;

            const pagesToAnalyze =
              requestedPages.filter(
                (pageIndex) =>
                  !appliedPages.has(
                    pageIndex
                  )
              );

            if (
              pagesToAnalyze.length === 0
            ) {
              throw new Error(
                "This page has already been converted. Re-upload the original PDF to run another conversion."
              );
            }

            /*
             * =================================================
             * DETECT DIMENSIONS
             *
             * Existing side-panel detector remains unchanged.
             * =================================================
             */

            const dimensions:
              DimensionCandidate[] =
                [];

            for (
              const pageIndex
              of pagesToAnalyze
            ) {
              const textLines =
                await viewerInstance
                  .textLinesForPageIndex(
                    pageIndex
                  );

              textLines.forEach(
                (
                  textLine,
                  lineIndex
                ) => {
                  const box =
                    textLine
                      .boundingBox
                      .toJS();

                  const detected =
                    detectDimensionsInLine(
                      textLine.contents,
                      pageIndex,
                      lineIndex,
                      options.sourceUnit,
                      options.targetUnit,
                      {
                        left:
                          box.left,

                        top:
                          box.top,

                        width:
                          box.width,

                        height:
                          box.height,
                      }
                    );

                  dimensions.push(
                    ...detected
                  );
                }
              );
            }

            if (
              dimensions.length === 0
            ) {
              return {
                dimensions,

                pagesAnalyzed:
                  pagesToAnalyze.length,

                totalPages,
              };
            }

            /*
             * =================================================
             * INTERNAL HELPERS
             * =================================================
             */

            type SimpleRect = {
              left: number;
              top: number;
              width: number;
              height: number;
            };

            const toRectData = (
              rect: any
            ): SimpleRect => ({
              left:
                Number(
                  rect.left
                ),

              top:
                Number(
                  rect.top
                ),

              width:
                Number(
                  rect.width
                ),

              height:
                Number(
                  rect.height
                ),
            });

            const rectDistance = (
              first:
                SimpleRect,

              second:
                SimpleRect
            ) => {
              const firstX =
                first.left +
                first.width /
                  2;

              const firstY =
                first.top +
                first.height /
                  2;

              const secondX =
                second.left +
                second.width /
                  2;

              const secondY =
                second.top +
                second.height /
                  2;

              /*
               * Vertical weighting helps distinguish
               * repeated values in engineering drawings.
               */
              return (
                Math.abs(
                  firstX -
                    secondX
                ) +
                Math.abs(
                  firstY -
                    secondY
                ) *
                  3
              );
            };

            /*
             * Search text only on a specific PDF page
             * and return exact PDF rectangles.
             */
            const searchRects =
              async (
                query:
                  string,

                pageIndex:
                  number
              ):
                Promise<any[]> => {
                const clean =
                  query.trim();

                if (!clean) {
                  return [];
                }

                const results =
                  await viewerInstance
                    .search(
                      clean,
                      {
                        startPageIndex:
                          pageIndex,

                        endPageIndex:
                          pageIndex,
                      }
                    );

                const rects:
                  any[] =
                    [];

                results.forEach(
                  (
                    result:
                      any
                  ) => {
                    if (
                      result.pageIndex !==
                        pageIndex ||
                      !result
                        .rectsOnPage ||
                      result
                        .rectsOnPage
                        .size ===
                        0
                    ) {
                      return;
                    }

                    rects.push(
                      viewerModule
                        .Geometry
                        .Rect
                        .union(
                          result
                            .rectsOnPage
                        )
                    );
                  }
                );

                return rects;
              };

            /*
             * When the same value appears more than once,
             * use the result closest to the detector's
             * original line position.
             */
            const nearestRect = (
              rects:
                any[],

              anchor:
                PdfRectData
            ):
              any |
              null => {
                let winner:
                  any |
                  null =
                    null;

                let winnerDistance =
                  Number
                    .POSITIVE_INFINITY;

                for (
                  const rect
                  of rects
                ) {
                  const currentDistance =
                    rectDistance(
                      toRectData(
                        rect
                      ),
                      anchor
                    );

                  if (
                    currentDistance <
                    winnerDistance
                  ) {
                    winner =
                      rect;

                    winnerDistance =
                      currentDistance;
                  }
                }

                return winner;
              };

            const decimalPlaces = (
              text:
                string
            ) => {
              if (
                text.includes(
                  "/"
                )
              ) {
                return 3;
              }

              const dot =
                text.indexOf(
                  "."
                );

              return dot <
                0
                ? 0
                : text.length -
                    dot -
                    1;
            };

            /*
             * Drawing display precision.
             *
             * Side panel still keeps the full conversion
             * generated by detectDimensionsInLine().
             *
             * Example:
             *
             * Side panel:
             * .257 -> 6.5278 mm
             *
             * Drawing:
             * .257 -> 6.53
             */
            const formatDrawingNumber = (
              value:
                number,

              originalValue:
                string
            ) => {
              const originalDecimals =
                decimalPlaces(
                  originalValue
                );

              let precision =
                4;

              if (
                options.targetUnit ===
                "mm"
              ) {
                precision =
                  originalValue.includes(
                    "/"
                  )
                    ? 3
                    : Math.max(
                        2,
                        originalDecimals -
                          1
                      );
              } else if (
                options.targetUnit ===
                "cm"
              ) {
                precision =
                  Math.max(
                    3,
                    originalDecimals
                  );
              } else {
                precision =
                  Math.max(
                    3,
                    originalDecimals
                  );
              }

              return value
                .toFixed(
                  precision
                )
                .replace(
                  /(\.\d*?[1-9])0+$/,
                  "$1"
                )
                .replace(
                  /\.0+$/,
                  ""
                );
            };

            /*
             * Build only the replacement dimension.
             *
             * Ø, R and ± are preserved.
             * Thread data and angle values were already
             * excluded by detectDimensionsInLine().
             */
            const buildDrawingReplacement = (
              dimension:
                DimensionCandidate
            ) => {
              const match =
                dimension.original.match(
                  /^(Ø|⌀|R)?\s*((?:\d+\s+\d+\/\d+)|(?:\d+\/\d+)|(?:\d*\.\d+)|(?:\d+))\s*(inches?|inch|in|mm|cm|"|″)?(?:\s*±\s*((?:\d+\/\d+)|(?:\d*\.\d+)|(?:\d+)))?$/i
                );

              if (!match) {
                return dimension
                  .converted
                  .replace(
                    /\s+(?:mm|cm|in)$/i,
                    ""
                  )
                  .trim();
              }

              const prefix =
                match[1] ||
                "";

              const sourceValueText =
                match[2];

              const explicitUnit =
                match[3];

              const toleranceText =
                match[4];

              const sourceValue =
                parseFraction(
                  sourceValueText
                );

              if (
                sourceValue ===
                null
              ) {
                return dimension
                  .converted
                  .replace(
                    /\s+(?:mm|cm|in)$/i,
                    ""
                  )
                  .trim();
              }

              const convertedMain =
                formatDrawingNumber(
                  convertValue(
                    sourceValue,
                    options.sourceUnit,
                    options.targetUnit
                  ),
                  sourceValueText
                );

              let replacement =
                prefix.toUpperCase() ===
                "R"
                  ? `R${convertedMain}`
                  : prefix
                    ? `${prefix} ${convertedMain}`
                    : convertedMain;

              /*
               * Convert ± tolerance too.
               */
              if (toleranceText) {
                const toleranceValue =
                  parseFraction(
                    toleranceText
                  );

                if (
                  toleranceValue !==
                  null
                ) {
                  replacement +=
                    ` ±${formatDrawingNumber(
                      convertValue(
                        toleranceValue,
                        options.sourceUnit,
                        options.targetUnit
                      ),
                      toleranceText
                    )}`;
                }
              }

              /*
               * If the original measurement explicitly
               * showed a unit such as " / in / inch,
               * replace that explicit unit as well.
               *
               * Otherwise the global drawing-unit note
               * is updated later.
               */
              if (explicitUnit) {
                replacement +=
                  ` ${targetUnitLabel(
                    options.targetUnit
                  )}`;
              }

              return replacement;
            };

            /*
             * Preserve vertical dimensions.
             */
            const rotationFor = (
              rect:
                SimpleRect
            ) =>
              rect.height >
              rect.width *
                1.35
                ? 90
                : 0;

            const white =
              new viewerModule.Color({
                r: 255,
                g: 255,
                b: 255,
              });

            const black =
              new viewerModule.Color({
                r: 0,
                g: 0,
                b: 0,
              });

            const convertedPages =
              new Set<number>();

            let createdRedactionCount =
              0;

            /*
             * =================================================
             * REPLACE MEASUREMENTS
             *
             * IMPORTANT:
             *
             * Content Editor is NOT used here.
             *
             * Only the exact detected measurement rectangle
             * is redacted and replaced.
             *
             * Therefore:
             *
             * A / B / C
             * GD&T boxes
             * leader lines
             * arrows
             * thread specifications
             * notes
             *
             * are not reflowed.
             * =================================================
             */

            for (
              const dimension
              of dimensions
            ) {
              let matches:
                any[] =
                  [];

              try {
                matches =
                  await searchRects(
                    dimension.original,
                    dimension.pageIndex
                  );
              } catch (
                error
              ) {
                console.warn(
                  "Unit Converter: unable to locate dimension in PDF.",
                  dimension.original,
                  error
                );
              }

              const targetRect =
                nearestRect(
                  matches,
                  dimension.lineBox
                );

              /*
               * Safety:
               * if we cannot confidently identify the exact
               * PDF location, leave the drawing unchanged.
               * It still appears in the side review panel.
               */
              if (!targetRect) {
                console.warn(
                  "Unit Converter: detected dimension kept for review but was not replaced because its exact PDF position could not be confirmed.",
                  dimension.original
                );

                continue;
              }

              const rectData =
                toRectData(
                  targetRect
                );

              const replacement =
                buildDrawingReplacement(
                  dimension
                );

              /*
               * Nutrient removes the old content and
               * writes overlayText inside the SAME rectangle.
               *
               * fontSize = 0 means automatic fitting.
               */
              const redaction =
                new viewerModule
                  .Annotations
                  .RedactionAnnotation({
                    id:
                      viewerModule
                        .generateInstantId(),

                    pageIndex:
                      dimension
                        .pageIndex,

                    boundingBox:
                      targetRect,

                    rects:
                      viewerModule
                        .Immutable
                        .List([
                          targetRect,
                        ]),

                    fillColor:
                      white,

                    color:
                      black,

                    outlineColor:
                      null,

                    overlayText:
                      replacement,

                    repeatOverlayText:
                      false,

                    fontSize:
                      0,

                    rotation:
                      rotationFor(
                        rectData
                      ),
                  });

              await viewerInstance
                .create(
                  redaction
                );

              /*
               * Locate button should now point to the
               * exact converted-value location.
               */
              dimension.lineBox = {
                left:
                  rectData.left,

                top:
                  rectData.top,

                width:
                  rectData.width,

                height:
                  rectData.height,
              };

              createdRedactionCount++;

              convertedPages.add(
                dimension.pageIndex
              );
            }

            /*
             * =================================================
             * UPDATE GLOBAL DRAWING UNIT NOTE
             *
             * Example:
             *
             * ALL DIMENSIONS ARE IN INCHES
             *
             * becomes:
             *
             * ALL DIMENSIONS ARE IN MILLIMETRES
             *
             * This means we do NOT need to add "mm"
             * after every single dimension.
             * =================================================
             */

            if (
              options.sourceUnit ===
                "inch" &&
              convertedPages.size >
                0
            ) {
              const sourceNotes = [
                "ALL DIMENSIONS ARE IN INCHES",
                "ALL DIMENSIONS ARE IN INCH",
                "ALL DIMENSIONS IN INCHES",
              ];

              const targetNote =
                options.targetUnit ===
                "mm"
                  ? "ALL DIMENSIONS ARE IN MILLIMETRES"
                  : options.targetUnit ===
                      "cm"
                    ? "ALL DIMENSIONS ARE IN CENTIMETRES"
                    : "ALL DIMENSIONS ARE IN INCHES";

              for (
                const pageIndex
                of convertedPages
              ) {
                let noteReplaced =
                  false;

                for (
                  const sourceNote
                  of sourceNotes
                ) {
                  if (noteReplaced) {
                    break;
                  }

                  let noteRects:
                    any[] =
                      [];

                  try {
                    noteRects =
                      await searchRects(
                        sourceNote,
                        pageIndex
                      );
                  } catch {
                    noteRects =
                      [];
                  }

                  if (
                    noteRects.length ===
                    0
                  ) {
                    continue;
                  }

                  const noteRect =
                    noteRects[0];

                  const noteData =
                    toRectData(
                      noteRect
                    );

                  const noteRedaction =
                    new viewerModule
                      .Annotations
                      .RedactionAnnotation({
                        id:
                          viewerModule
                            .generateInstantId(),

                        pageIndex,

                        boundingBox:
                          noteRect,

                        rects:
                          viewerModule
                            .Immutable
                            .List([
                              noteRect,
                            ]),

                        fillColor:
                          white,

                        color:
                          black,

                        outlineColor:
                          null,

                        overlayText:
                          targetNote,

                        repeatOverlayText:
                          false,

                        fontSize:
                          0,

                        rotation:
                          rotationFor(
                            noteData
                          ),
                      });

                  await viewerInstance
                    .create(
                      noteRedaction
                    );

                  createdRedactionCount++;

                  noteReplaced =
                    true;
                }
              }
            }

            /*
             * =================================================
             * APPLY CHANGES TO CURRENT OPEN PDF
             *
             * This changes only the currently loaded browser PDF.
             *
             * Your existing Save button still controls when
             * the edited PDF is written to FastAPI/backend.
             * =================================================
             */

            if (
              createdRedactionCount >
              0
            ) {
              await viewerInstance
                .applyRedactions();

              convertedPages.forEach(
                (
                  pageIndex
                ) => {
                  appliedPages.add(
                    pageIndex
                  );
                }
              );
            }

            activatePanMode();

            /*
             * Existing side panel receives exactly the same
             * dimensions array and full conversion values.
             */
            return {
              dimensions,

              pagesAnalyzed:
                pagesToAnalyze.length,

              totalPages,
            };
          },
          async locateDimension(
            dimension
          ) {
            const instance =
              instanceRef.current;

            const NutrientViewer =
              nutrientRef.current;

            if (
              !instance ||
              !NutrientViewer
            ) {
              throw new Error(
                "PDF editor is not ready."
              );
            }

            clearLocateHighlight();

            let targetRect =
              new NutrientViewer
                .Geometry
                .Rect({
                  left:
                    dimension
                      .lineBox
                      .left,

                  top:
                    dimension
                      .lineBox
                      .top,

                  width:
                    dimension
                      .lineBox
                      .width,

                  height:
                    dimension
                      .lineBox
                      .height,
                });

            try {
              const results =
                await instance.search(
                  dimension.original,
                  {
                    startPageIndex:
                      dimension
                        .pageIndex,

                    endPageIndex:
                      dimension
                        .pageIndex,
                  }
                );

              const targetX =
                targetRect.left +
                targetRect.width /
                  2;

              const targetY =
                targetRect.top +
                targetRect.height /
                  2;

              let best =
                Number
                  .POSITIVE_INFINITY;

              results.forEach(
                (
                  result
                ) => {
                  if (
                    result.pageIndex !==
                      dimension
                        .pageIndex ||
                    result
                      .rectsOnPage
                      .size ===
                      0
                  ) {
                    return;
                  }

                  const candidate =
                    NutrientViewer
                      .Geometry
                      .Rect
                      .union(
                        result
                          .rectsOnPage
                      );

                  const x =
                    candidate.left +
                    candidate.width /
                      2;

                  const y =
                    candidate.top +
                    candidate.height /
                      2;

                  const distance =
                    Math.abs(
                      x -
                        targetX
                    ) +
                    Math.abs(
                      y -
                        targetY
                    ) *
                      3;

                  if (
                    distance <
                    best
                  ) {
                    best =
                      distance;

                    targetRect =
                      candidate;
                  }
                }
              );
            } catch {
              // Use original line rect.
            }

            instance.jumpToRect(
              dimension.pageIndex,
              targetRect.grow(
                18
              )
            );

            activatePanMode();

            const highlight =
              document.createElement(
                "div"
              );

            highlight.style.width =
              `${Math.max(
                targetRect.width,
                8
              )}px`;

            highlight.style.height =
              `${Math.max(
                targetRect.height,
                8
              )}px`;

            highlight.style.background =
              "rgba(37,99,235,0.28)";

            highlight.style.border =
              "2px solid #2563eb";

            highlight.style.borderRadius =
              "3px";

            highlight.style.boxSizing =
              "border-box";

            highlight.style.boxShadow =
              "0 0 0 3px rgba(37,99,235,0.16)";
              /*
 * Locate highlight pulse.
 * Blinks for 2 seconds, then stays normal blue.
 */
try {
  highlight.animate(
    [
      {
        opacity: "1",
        transform: "scale(1)",
        boxShadow:
          "0 0 0 3px rgba(37,99,235,0.16)",
      },
      {
        opacity: "0.25",
        transform: "scale(1.12)",
        boxShadow:
          "0 0 0 7px rgba(37,99,235,0.32)",
      },
      {
        opacity: "1",
        transform: "scale(1)",
        boxShadow:
          "0 0 0 3px rgba(37,99,235,0.16)",
      },
    ],
    {
      duration: 400,
      iterations: 5,
      easing: "ease-in-out",
    }
  );
} catch {
  // Keep normal blue highlight if animation is unavailable.
}

            highlight.style.pointerEvents =
              "none";

            instance.setCustomOverlayItem(
              new NutrientViewer
                .CustomOverlayItem({
                  id:
                    LOCATE_OVERLAY_ID,

                  node:
                    highlight,

                  pageIndex:
                    dimension
                      .pageIndex,

                  position:
                    new NutrientViewer
                      .Geometry
                      .Point({
                        x:
                          targetRect.left,

                        y:
                          targetRect.top,
                      }),
                })
            );
          },

          async saveToBackend() {
            const instance =
              instanceRef.current;

            if (
              !instance
            ) {
              throw new Error(
                "PDF editor is not ready."
              );
            }

            const pdfBuffer =
              await exportWithoutClosingEditor();

            const blob =
              new Blob(
                [
                  pdfBuffer,
                ],
                {
                  type:
                    "application/pdf",
                }
              );

            const formData =
              new FormData();

            formData.append(
              "file",
              blob,
              `${documentId}.pdf`
            );

           const response =
  await fetch(
    `${process.env.NEXT_PUBLIC_API_BASE_URL || "http://127.0.0.1:8000"}/api/documents/${documentId}/save`,
    {
      method:
        "POST",

      body:
        formData,
    }
  );

            if (
              !response.ok
            ) {
              let message =
                "Unable to save edited PDF.";

              try {
                const data =
                  await response.json();

                if (
                  typeof data
                    ?.detail ===
                  "string"
                ) {
                  message =
                    data.detail;
                }
              } catch {
                // Keep default.
              }

              throw new Error(
                message
              );
            }

            let warning:
              string |
              undefined;

            if (
              instance
                .contentEditor
                .isActive()
            ) {
              const result =
                await instance
                  .saveContentEditingSession();

              if (
                result.status ===
                  "reported" &&
                result
                  .uncoveredCodepoints
                  .length >
                  0
              ) {
                warning =
                  "Some edited characters may not be supported by the original PDF fonts.";
              }

              if (
                result.status ===
                "reportUnavailable"
              ) {
                warning =
                  "PDF saved, but font support could not be fully verified.";
              }
            }

            contentEditorWorkflowRef.current =
              false;

            imageEditingRef.current =
              false;

            imageSelectionConfirmedRef.current =
              false;

            searchResultOpeningRef.current =
              false;

            try {
              instance.setSelectedAnnotations(
                null
              );
            } catch {
              // Nothing selected.
            }

            activatePanMode();

            return {
              warning,
            };
          },

          async downloadPdf(
            filename
          ) {
            const pdfBuffer =
              await exportWithoutClosingEditor();

            const blob =
              new Blob(
                [
                  pdfBuffer,
                ],
                {
                  type:
                    "application/pdf",
                }
              );

            const url =
              URL.createObjectURL(
                blob
              );

            const cleanName =
              (
                filename ||
                "document.pdf"
              ).replace(
                /\.pdf$/i,
                ""
              );

            const link =
              document.createElement(
                "a"
              );

            link.href =
              url;

            link.download =
              `${cleanName}-edited.pdf`;

            document.body.appendChild(
              link
            );

            link.click();

            link.remove();

            setTimeout(
              () => {
                URL.revokeObjectURL(
                  url
                );
              },
              1000
            );

            return {};
          },
        })
      );

      /* =====================================================
         LOAD VIEWER
      ===================================================== */

      useEffect(
        () => {
          if (
            !documentId
          ) {
            return;
          }

          let cancelled =
            false;

          let loadedInstance:
            NutrientInstance |
            null =
              null;

          let selectionHandler:
            ((annotations: any) => void) |
            null =
              null;

          const controller =
            new AbortController();

          const load =
            async () => {
              const container =
                viewerRef.current;

              if (
                !container
              ) {
                return;
              }

              try {
                onLoadingChangeRef
                  .current?.(
                    true
                  );

                onReadyRef
                  .current?.(
                    false
                  );

                onErrorRef
                  .current?.(
                    ""
                  );

                const key =
                  process.env
                    .NEXT_PUBLIC_NUTRIENT_KEY;

                if (
                  !key
                ) {
                  throw new Error(
                    "NEXT_PUBLIC_NUTRIENT_KEY is missing."
                  );
                }

                const response =
  await fetch(
    `${process.env.NEXT_PUBLIC_API_BASE_URL || "http://127.0.0.1:8000"}/api/documents/${documentId}/file`,
    {
      signal:
        controller
          .signal,
    }
  );

                if (
                  !response.ok
                ) {
                  throw new Error(
                    `Unable to load PDF. HTTP ${response.status}`
                  );
                }

                const buffer =
                  await response
                    .arrayBuffer();

                const module =
                  await import(
                    "@nutrient-sdk/viewer"
                  );

                const NutrientViewer =
                  module.default;

                nutrientRef.current =
                  NutrientViewer;

                await waitForViewerContainer(
                  container,
                  controller.signal
                );

                if (
                  cancelled
                ) {
                  return;
                }

                try {
                  NutrientViewer.unload(
                    container
                  );
                } catch {
                  // Nothing loaded.
                }

                const instance =
                  await NutrientViewer.load({
                    container,

                    baseUrl:
                      `${window.location.origin}/`,

                    session:
                      key,

                    document:
                      buffer,

                    initialViewState:
  new NutrientViewer
    .ViewState({
      showToolbar:
        true,

      sidebarMode:
        NutrientViewer
          .SidebarMode
          .THUMBNAILS,

      interactionMode:
        NutrientViewer
          .InteractionMode
          .PAN,

      zoom: {
        wheelZoomMode:
          NutrientViewer
            .WheelZoomMode
            .ALWAYS,

        options: {
          enableKeyboardZoom:
            true,

          enableGestureZoom:
            true,
        },
      },
    }),

                    signal:
                      controller
                        .signal,
                  });

                if (
                  cancelled
                ) {
                  return;
                }

                loadedInstance =
                  instance;

                instanceRef.current =
                  instance;

                applyMainToolbar(
                  instance
                );

                removeNoteOption(
                  instance
                );

                installUndoButton(
                  instance
                );

                /*
                 * TextAnnotation only:
                 * adds top + bottom Y-axis resize handles.
                 */

                /*
                 * LOCKED image behavior.
                 */
                installImageAnnotationEvents(
                  instance,
                  NutrientViewer
                );

                installImageHitTesting(
                  instance,
                  NutrientViewer
                );

                /*
                 * NEW search -> editable blue box behavior.
                 */
                installSearchToEditBehavior(
                  instance,
                  NutrientViewer
                );

                await hydrateImageCacheForPage(
                  instance
                    .viewState
                    .currentPageIndex
                );

                activatePanMode();

                /*
                 * LOCKED image deselection behavior.
                 */
                selectionHandler =
                  (
                    annotations:
                      any
                  ) => {
                    if (
                      !imageEditingRef.current
                    ) {
                      return;
                    }

                    if (
                      annotations &&
                      annotations.size >
                        0
                    ) {
                      imageSelectionConfirmedRef.current =
                        true;

                      return;
                    }

                    if (
                      !imageSelectionConfirmedRef.current
                    ) {
                      return;
                    }

                    returnToContentEditorAfterImage();
                  };

                instance.addEventListener(
                  "annotationSelection.change",
                  selectionHandler
                );

                mouseInstallTimerRef.current =
                  window.setTimeout(
                    () => {
                      if (
                        !cancelled
                      ) {
                        installMouseControls(
                          instance,
                          NutrientViewer
                        );
                      }
                    },
                    500
                  );

                onReadyRef
                  .current?.(
                    true
                  );

                onLoadingChangeRef
                  .current?.(
                    false
                  );
              } catch (
                error
              ) {
                if (
                  cancelled ||
                  controller
                    .signal
                    .aborted
                ) {
                  return;
                }

                console.error(
                  "Nutrient load error:",
                  error
                );

                onErrorRef
                  .current?.(
                    error instanceof
                      Error
                      ? error.message
                      : "Unable to load PDF."
                  );

                onReadyRef
                  .current?.(
                    false
                  );

                onLoadingChangeRef
                  .current?.(
                    false
                  );
              }
            };

          void load();

          return () => {
            cancelled =
              true;

            controller.abort();

            if (
              mouseInstallTimerRef.current !==
              null
            ) {
              clearTimeout(
                mouseInstallTimerRef.current
              );

              mouseInstallTimerRef.current =
                null;
            }

            mouseCleanupRef.current?.();

            mouseCleanupRef.current =
              null;

            imageHitTestCleanupRef.current?.();

            imageHitTestCleanupRef.current =
              null;

            imageEventsCleanupRef.current?.();

            imageEventsCleanupRef.current =
              null;

            searchEditCleanupRef.current?.();

            searchEditCleanupRef.current =
              null;

            undoCleanupRef.current?.();

            undoCleanupRef.current =
              null;

            imageAnnotationsRef.current.clear();

            searchStateRef.current =
              null;

            imageEditingRef.current =
              false;

            imageSelectionConfirmedRef.current =
              false;

            contentEditorWorkflowRef.current =
              false;

            searchResultOpeningRef.current =
              false;

            resumeAfterSearchRef.current =
              false;

            if (
              loadedInstance &&
              selectionHandler
            ) {
              try {
                loadedInstance.removeEventListener(
                  "annotationSelection.change",
                  selectionHandler
                );
              } catch {
                // Already removed.
              }
            }

            if (
              loadedInstance
            ) {
              try {
                loadedInstance.removeCustomOverlayItem(
                  LOCATE_OVERLAY_ID
                );
              } catch {
                // Nothing.
              }
            }

            const container =
              viewerRef.current;

            const NutrientViewer =
              nutrientRef.current;

            if (
              container &&
              NutrientViewer
            ) {
              try {
                NutrientViewer.unload(
                  container
                );
              } catch {
                // Nothing.
              }
            }

            instanceRef.current =
              null;

            nutrientRef.current =
              null;
          };
        },
        [
          documentId,
        ]
      );

      return (
        <div
          ref={
            viewerRef
          }
          className="h-full w-full"
          style={{
            width:
              "100%",

            height:
              "100%",

            minWidth:
              "1px",

            minHeight:
              "420px",
          }}
        />
      );
    }
  );

const NutrientEditor =
  memo(
    NutrientEditorComponent
  );

NutrientEditor.displayName =
  "NutrientEditor";

export default NutrientEditor;


