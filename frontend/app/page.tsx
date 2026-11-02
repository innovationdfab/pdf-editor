"use client";

import {
  FilePenLine,
  FileText,
  Ruler,
} from "lucide-react";

export default function HomePage() {
  function openContentEditor() {
    window.location.assign(
      "/upload?mode=editor"
    );
  }

  function openUnitConverter() {
    window.location.assign(
      "/upload?mode=converter"
    );
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-br from-red-100 via-rose-50 to-red-200 px-6 py-12">

      {/* PREMIUM RED BACKGROUND */}

      <div className="pointer-events-none absolute -left-40 -top-40 h-[500px] w-[500px] rounded-full bg-red-300/35 blur-3xl" />

      <div className="pointer-events-none absolute -right-40 top-20 h-[460px] w-[460px] rounded-full bg-rose-300/30 blur-3xl" />

      <div className="pointer-events-none absolute bottom-[-180px] left-[20%] h-[500px] w-[500px] rounded-full bg-red-200/35 blur-3xl" />

      <div className="pointer-events-none absolute bottom-[-160px] right-[-100px] h-[420px] w-[420px] rounded-full bg-rose-300/30 blur-3xl" />

      <div className="pointer-events-none absolute left-1/2 top-1/2 h-[520px] w-[520px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/45 blur-3xl" />

      <section className="relative z-10 w-full max-w-5xl">

        {/* LOGO */}

        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-red-600 text-white shadow-xl shadow-red-600/25">
          <FileText
            size={30}
          />
        </div>

        {/* HEADING */}

        <div className="mx-auto mt-7 max-w-3xl text-center">

          <h1 className="text-4xl font-bold tracking-tight text-slate-950 sm:text-5xl">
            PDF Editor
          </h1>

          <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-slate-600 sm:text-lg">
            Choose what you want to do with your PDF.
          </p>

        </div>

        {/* OPTIONS */}

        <div className="mx-auto mt-10 grid max-w-4xl gap-6 md:grid-cols-2">

          {/* PDF CONTENT EDITOR */}

          <button
            type="button"
            onClick={
              openContentEditor
            }
            className="group relative overflow-hidden rounded-[28px] border border-red-200/80 bg-white/90 p-8 text-left shadow-[0_25px_70px_rgba(153,27,27,0.12)] backdrop-blur transition duration-300 hover:-translate-y-1 hover:border-red-400 hover:shadow-[0_30px_80px_rgba(220,38,38,0.16)]"
          >

            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-red-50 text-red-600 ring-1 ring-red-100 transition duration-300 group-hover:bg-red-600 group-hover:text-white">
              <FilePenLine
                size={29}
              />
            </div>

            <h2 className="mt-7 text-2xl font-bold text-slate-950">
              PDF Content Editor
            </h2>

            <p className="mt-3 text-sm leading-6 text-slate-600">
              Upload a PDF and directly edit its existing content, insert images and save or download the edited document.
            </p>

            <div className="mt-7 inline-flex rounded-xl bg-red-50 px-4 py-2.5 text-sm font-bold text-red-600 transition group-hover:bg-red-600 group-hover:text-white">
              Start Editing
            </div>

          </button>

          {/* PDF UNIT CONVERTER */}

          <button
            type="button"
            onClick={
              openUnitConverter
            }
            className="group relative overflow-hidden rounded-[28px] border border-red-200/80 bg-white/90 p-8 text-left shadow-[0_25px_70px_rgba(153,27,27,0.12)] backdrop-blur transition duration-300 hover:-translate-y-1 hover:border-red-400 hover:shadow-[0_30px_80px_rgba(220,38,38,0.16)]"
          >

            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-rose-50 text-rose-600 ring-1 ring-rose-100 transition duration-300 group-hover:bg-rose-600 group-hover:text-white">
              <Ruler
                size={29}
              />
            </div>

            <h2 className="mt-7 text-2xl font-bold text-slate-950">
              PDF Unit Converter
            </h2>

            <p className="mt-3 text-sm leading-6 text-slate-600">
              Upload an engineering drawing PDF and analyze dimensions for conversion between inch, mm and cm.
            </p>

            <div className="mt-7 inline-flex rounded-xl bg-rose-50 px-4 py-2.5 text-sm font-bold text-rose-600 transition group-hover:bg-rose-600 group-hover:text-white">
              Convert Dimensions
            </div>

          </button>

        </div>

        <p className="mt-8 text-center text-xs font-medium text-slate-500">
          PDF editing • Engineering drawings • Unit conversion
        </p>

      </section>

    </main>
  );
}