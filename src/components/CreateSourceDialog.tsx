import { useState, useEffect } from "react"
import {
  Dialog as ShadcnDialog,
  DialogContent as ShadcnDialogContent,
  DialogClose as ShadcnDialogClose,
} from "@/components/ui/dialog"
import { useNotebookStore } from "@/store/useNotebookStore"
import { supabase } from "@/lib/supabaseClient"
import * as pdfjs from "pdfjs-dist"

const PHRASES = ["YouTube videos", "your notes", "your documents", "websites"]

function RotatingText() {
  const [phrase, setPhrase] = useState(PHRASES[0])
  const [animState, setAnimState] = useState<"visible" | "exit" | "enter">("visible")

  useEffect(() => {
    const interval = setInterval(() => {
      setAnimState("exit")

      setTimeout(() => {
        setPhrase((prev) => {
          const nextIndex = (PHRASES.indexOf(prev) + 1) % PHRASES.length
          return PHRASES[nextIndex]
        })
        setAnimState("enter")

        setTimeout(() => {
          setAnimState("visible")
        }, 55)
      }, 500) // matches transition duration (duration-500)
    }, 3500)

    return () => clearInterval(interval)
  }, [])

  let transitionClass = "translate-y-0 opacity-100"
  if (animState === "exit") {
    transitionClass = "-translate-y-full opacity-0"
  } else if (animState === "enter") {
    transitionClass = "translate-y-full opacity-0"
  }

  return (
    <span className="inline-block relative overflow-hidden h-7 sm:h-[32px] w-full">
      <span
        className={`absolute inset-0 block w-full text-center text-emerald-500 dark:text-emerald-400 font-semibold transition-all duration-500 transform ${transitionClass}`}
      >
        {phrase}
      </span>
    </span>
  )
}

interface CreateSourceDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CreateSourceDialog({ open, onOpenChange }: CreateSourceDialogProps) {
  const [currentView, setCurrentView] = useState<"main" | "website" | "copied_text">("main")
  const [websiteInput, setWebsiteInput] = useState("")
  const [copiedTextInput, setCopiedTextInput] = useState("")
  const [toast, setToast] = useState<{ message: string; type: "error" | "success" | "warning" } | null>(null)

  // Ingestion states
  const { currentNotebook } = useNotebookStore()
  const [localIngesting, setLocalIngesting] = useState(false)
  const [status, setStatus] = useState("")
  const [progress, setProgress] = useState<{ current: number; total: number } | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  // Reset view and inputs when dialog opens
  useEffect(() => {
    if (open) {
      setCurrentView("main")
      setWebsiteInput("")
      setCopiedTextInput("")
      setLocalIngesting(false)
      setStatus("")
      setProgress(null)
      setErrorMsg(null)
      setToast(null)
    }
  }, [open])

  // Toast self-dismiss timer
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => {
        setToast(null)
      }, 5000)
      return () => clearTimeout(timer)
    }
  }, [toast])

  const handleIngestText = async (filename: string, text: string, storagePath?: string) => {
    if (!currentNotebook) {
      setErrorMsg("Please select or create a notebook first.")
      return
    }

    try {
      const store = useNotebookStore.getState()
      
      // Close dialog immediately to let user see background indexing
      onOpenChange(false)
      
      // Run ingestion in background
      store.ingestDocument(currentNotebook.id, filename, text, storagePath).catch((err) => {
        console.error("Background ingestion failed:", err)
      })
    } catch (err: any) {
      console.error(err)
      setErrorMsg(err.message || "Failed to initiate background ingestion.")
      setLocalIngesting(false)
    }
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.type !== "application/pdf") {
      setErrorMsg("Only PDF files are supported at this time.")
      return
    }

    // Size limitation check (10MB)
    if (file.size > 10485760) {
      setToast({
        message: "PDF exceeds 10MB limit. Upload files under 10MB to avoid browser memory crashes.",
        type: "warning"
      })
      e.target.value = "" // clear input
      return
    }

    setLocalIngesting(true)
    setErrorMsg(null)
    setStatus("Uploading PDF to cloud storage...")
    setProgress(null)

    try {
      if (!currentNotebook) {
        throw new Error("Please select or create a notebook first.")
      }

      // Generate storage path: notebook_id/filename_timestamp.pdf
      const fileExt = file.name.split('.').pop() || "pdf"
      const fileNameWithoutExt = file.name.substring(0, file.name.lastIndexOf('.'))
      const cleanFileName = fileNameWithoutExt.replace(/[^a-zA-Z0-9]/g, "_")
      const storagePath = `${currentNotebook.id}/${cleanFileName}_${Date.now()}.${fileExt}`

      const { error: uploadErr } = await supabase.storage
        .from("document-pdfs")
        .upload(storagePath, file, {
          cacheControl: "3600",
          upsert: false,
        })

      if (uploadErr) {
        throw new Error(`Failed to upload PDF: ${uploadErr.message}`)
      }

      setStatus("Reading PDF file...")
      const arrayBuffer = await file.arrayBuffer()
      setStatus("Initializing PDF parser...")

      // Configure worker src locally from public directory to avoid CDN 404 errors
      pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs"

      const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise
      let extractedText = ""

      for (let i = 1; i <= pdf.numPages; i++) {
        setStatus(`Extracting text from page ${i} of ${pdf.numPages}...`)
        const page = await pdf.getPage(i)
        const textContent = await page.getTextContent()
        const pageText = textContent.items.map((item: any) => item.str).join(" ")
        extractedText += pageText + "\n"
      }

      if (!extractedText.trim()) {
        try {
          await supabase.storage.from("document-pdfs").remove([storagePath])
        } catch (cleanupErr) {
          console.error("Cleanup uploaded file failed:", cleanupErr)
        }
        throw new Error("Parsed PDF appears to have no extractable text.")
      }

      await handleIngestText(file.name, extractedText, storagePath)
    } catch (err: any) {
      console.error(err)
      setErrorMsg(err.message || "Failed to parse PDF document.")
      setLocalIngesting(false)
    }
  }

  return (
    <ShadcnDialog open={open} onOpenChange={(val) => !localIngesting && onOpenChange(val)}>
      <ShadcnDialogContent
        showCloseButton={false}
        className="bg-white dark:bg-zinc-950 text-foreground gap-0 outline-none shadow-2xl p-8 flex flex-col overflow-hidden w-[92%] max-w-[840px] rounded-[28px] border border-border sm:fixed sm:top-1/2 sm:left-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 sm:w-[92%] sm:max-w-[840px] sm:rounded-[28px] sm:p-8 sm:overflow-hidden max-sm:fixed max-sm:bottom-0 max-sm:top-auto max-sm:left-0 max-sm:right-0 max-sm:translate-x-0 max-sm:translate-y-0 max-sm:w-full max-sm:max-w-full max-sm:rounded-t-[28px] max-sm:rounded-b-none max-sm:border-b-0 max-sm:border-x-0 max-sm:border-t-border max-sm:p-6 max-sm:overflow-y-auto max-sm:max-h-[92vh] relative"
      >
        {/* Background Spotlight */}
        <div
          className="absolute top-0 left-0 w-[400px] h-[400px] bg-muted/30 rounded-full -translate-y-1/2 -translate-x-1/4 blur-[80px] pointer-events-none z-0"
        />

        {/* Custom Absolute Close Button for Main View */}
        {currentView === "main" && !localIngesting && (
          <ShadcnDialogClose asChild>
            <button
              id="btnCloseModal"
              className="absolute top-6 right-6 w-10 h-10 flex items-center justify-center rounded-full text-muted-foreground hover:text-foreground hover:bg-accent transition z-30 cursor-pointer outline-none"
            >
              <span className="google-symbols text-[24px]">close</span>
            </button>
          </ShadcnDialogClose>
        )}

        {/* Hidden PDF Upload input */}
        <input
          type="file"
          id="pdf-upload"
          accept=".pdf"
          className="hidden"
          onChange={handleFileUpload}
          disabled={localIngesting}
        />

        {/* Error Alert Display */}
        {errorMsg && (
          <div className="bg-destructive/10 text-destructive text-[13px] font-medium p-3.5 rounded-xl border border-destructive/20 flex flex-col gap-1 mb-4 relative z-10 select-text">
            <div className="flex items-center gap-2">
              <span className="google-symbols text-[18px]">error</span>
              <span className="font-semibold">Ingestion Failed</span>
            </div>
            <p className="text-[12px] text-muted-foreground leading-normal mt-0.5">{errorMsg}</p>
            <button
              onClick={() => setErrorMsg(null)}
              className="text-[11px] text-destructive underline hover:no-underline font-semibold mt-1 self-start cursor-pointer border-none bg-transparent p-0 outline-none"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* View Routing */}
        {currentView === "main" && (
          <div className="relative z-10 flex flex-col items-center">
            <h1 className="text-[20px] leading-[28px] sm:text-[25px] sm:leading-[32px] text-foreground text-center max-w-[540px] mb-6 font-bold sm:font-semibold tracking-tight px-4 sm:px-0">
              Create Audio and Video Overviews from<br />
              <RotatingText />
            </h1>

            {/* Search Inputs Bar */}
            <div className="w-full bg-[#f9f9f9] dark:bg-zinc-900/50 border border-slate-200 dark:border-zinc-800/80 focus-within:border-blue-400 dark:focus-within:border-zinc-700 rounded-[16px] p-2 flex flex-col gap-2 mb-6 transition-all focus-within:ring-1 focus-within:ring-blue-400/30">
              <div className="flex-1 relative pt-[2px] pb-[4px] px-[7px]">
                <textarea
                  placeholder="Search the web for new sources"
                  className="w-full bg-transparent border-none outline-none text-[14px] text-foreground placeholder-muted-foreground resize-none h-8 leading-[20px] p-0 align-top"
                  rows={1}
                  disabled
                />
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1">
                  <button
                    className="bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 text-foreground h-8 px-2.5 rounded-full flex items-center gap-1 hover:bg-slate-50 dark:hover:bg-zinc-900 text-[13px] font-medium transition-colors cursor-pointer outline-none"
                  >
                    <span className="google-symbols text-[20px] text-zinc-500">language</span>
                    <span className="text-[13px] hidden sm:inline">Web</span>
                    <span className="google-symbols text-[20px] text-zinc-400">keyboard_arrow_down</span>
                  </button>
                  <button
                    className="bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 text-foreground h-8 px-2.5 rounded-full flex items-center gap-1 hover:bg-slate-50 dark:hover:bg-zinc-900 text-[13px] font-medium transition-colors cursor-pointer outline-none"
                  >
                    <span className="google-symbols text-[20px] text-zinc-500">search_spark</span>
                    <span className="text-[13px] hidden sm:inline">Fast Research</span>
                    <span className="google-symbols text-[20px] text-zinc-400">keyboard_arrow_down</span>
                  </button>
                </div>
                <button
                  className="w-8 h-8 rounded-full bg-black/5 dark:bg-white/5 text-muted-foreground/30 flex items-center justify-center cursor-not-allowed outline-none border-none"
                  disabled
                >
                  <span className="google-symbols text-[20px]">search</span>
                </button>
              </div>
            </div>

            {/* Drag & Drop Area */}
            <div className="w-full bg-[#f8fafc]/50 dark:bg-zinc-900/10 sm:bg-accent border border-dashed border-slate-200 dark:border-zinc-800/80 sm:border-2 sm:border-border rounded-[28px] sm:rounded-2xl py-8 px-4 sm:py-12 sm:px-6 text-center flex flex-col items-center justify-center">
              <div className="mb-6">
                <div className="flex items-center justify-center gap-2 sm:gap-1.5 text-foreground font-semibold tracking-tight text-[17px] sm:text-[23px] sm:leading-9">
                  <span className="google-symbols text-[20px] sm:text-[24px] text-zinc-500 sm:text-muted-foreground select-none">
                    upload
                  </span>
                  <span>or add your files</span>
                </div>
                <p className="text-[13px] sm:text-[15px] text-zinc-500 sm:text-muted-foreground mt-1.5 font-sans">
                  pdf, images, docs, audio,{" "}
                  <span className="underline cursor-pointer hover:text-foreground font-semibold">and more</span>
                </p>
              </div>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5 sm:gap-3 w-full max-w-[360px] sm:max-w-none px-2 sm:px-0">
                {/* Upload Files Button */}
                <button
                  onClick={() => document.getElementById("pdf-upload")?.click()}
                  className="w-full sm:w-auto bg-white dark:bg-zinc-950 sm:bg-background border border-slate-200 dark:border-zinc-800 sm:border-border h-[44px] sm:h-10 px-6 rounded-full flex items-center justify-center gap-2 text-[14px] sm:text-[15px] font-semibold sm:font-medium text-foreground hover:bg-slate-50 dark:hover:bg-zinc-900 sm:hover:bg-accent sm:hover:text-accent-foreground transition shadow-xs sm:shadow-sm cursor-pointer outline-none"
                >
                  <span className="google-symbols text-[19px] sm:text-[18px]">upload</span> Upload files
                </button>

                {/* Websites Button */}
                <button
                  onClick={() => setCurrentView("website")}
                  className="w-full sm:w-auto bg-white dark:bg-zinc-950 sm:bg-background border border-slate-200 dark:border-zinc-800 sm:border-border h-[44px] sm:h-10 px-6 rounded-full flex items-center justify-center gap-2 text-[14px] sm:text-[15px] font-semibold sm:font-medium text-foreground hover:bg-slate-50 dark:hover:bg-zinc-900 sm:hover:bg-accent sm:hover:text-accent-foreground transition shadow-xs sm:shadow-sm cursor-pointer outline-none"
                >
                  <span className="flex items-center gap-1.5 justify-center">
                    <span className="google-symbols text-[19px] sm:text-[18px]">link</span>
                    <svg viewBox="0 0 24 24" className="w-[18px] h-[18px] fill-[#FF0000] flex-shrink-0" xmlns="http://www.w3.org/2000/svg">
                      <path d="M23.498 6.163a3.003 3.003 0 0 0-2.11-2.11C19.517 3.545 12 3.545 12 3.545s-7.517 0-9.388.508a3.003 3.003 0 0 0-2.11 2.11C0 8.033 0 12 0 12s0 3.967.502 5.837a3.003 3.003 0 0 0 2.11 2.11c1.871.508 9.388.508 9.388.508s7.517 0 9.388-.508a3.003 3.003 0 0 0 2.11-2.11C24 15.967 24 12 24 12s0-3.967-.502-5.837z" />
                      <polygon points="9.545 15.568 15.818 12 9.545 8.432" fill="#FFFFFF" />
                    </svg>
                  </span>
                  Websites
                </button>

                {/* Drive Button */}
                <button
                  className="w-full sm:w-auto bg-white dark:bg-zinc-950 sm:bg-background border border-slate-200 dark:border-zinc-800 sm:border-border h-[44px] sm:h-10 px-6 rounded-full flex items-center justify-center gap-2 text-[14px] sm:text-[15px] font-semibold sm:font-medium text-foreground hover:bg-slate-50 dark:hover:bg-zinc-900 sm:hover:bg-accent sm:hover:text-accent-foreground transition shadow-xs sm:shadow-sm cursor-pointer outline-none"
                >
                  <svg className="w-[19px] h-[19px] sm:w-[18px] sm:h-[18px] flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" xmlns="http://www.w3.org/2000/svg">
                    <path d="M22 19L12 2L2 19H22Z" />
                    <path d="M12 2V19" />
                    <path d="M7 10.5L17 10.5" />
                  </svg>
                  Drive
                </button>

                {/* Copied Text Button */}
                <button
                  onClick={() => setCurrentView("copied_text")}
                  className="w-full sm:w-auto bg-white dark:bg-zinc-950 sm:bg-background border border-slate-200 dark:border-zinc-800 sm:border-border h-[44px] sm:h-10 px-6 rounded-full flex items-center justify-center gap-2 text-[14px] sm:text-[15px] font-semibold sm:font-medium text-foreground hover:bg-slate-50 dark:hover:bg-zinc-900 sm:hover:bg-accent sm:hover:text-accent-foreground transition shadow-xs sm:shadow-sm cursor-pointer outline-none"
                >
                  <span className="google-symbols text-[19px] sm:text-[18px]">content_paste</span> Copied text
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Website subdialog */}
        {currentView === "website" && (
          <div className="relative z-10 flex flex-col gap-5">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setCurrentView("main")}
                  className="w-10 h-10 flex items-center justify-center rounded-full text-muted-foreground hover:text-foreground hover:bg-accent transition cursor-pointer outline-none"
                  disabled={localIngesting}
                >
                  <span className="google-symbols text-[24px]">arrow_back</span>
                </button>
                <h2 className="text-[20px] font-semibold text-foreground tracking-tight">
                  Website and YouTube URLs
                </h2>
              </div>
              <ShadcnDialogClose asChild disabled={localIngesting}>
                <button className="w-10 h-10 flex items-center justify-center rounded-full text-muted-foreground hover:text-foreground hover:bg-accent transition cursor-pointer outline-none">
                  <span className="google-symbols text-[24px]">close</span>
                </button>
              </ShadcnDialogClose>
            </div>

            {/* Description */}
            <p className="text-[15px] text-muted-foreground -mt-2">
              Paste in Website and YouTube URLs below to upload as a source in NotebookLM.
            </p>

            {/* Textarea */}
            <textarea
              value={websiteInput}
              onChange={(e) => setWebsiteInput(e.target.value)}
              placeholder="Paste any links"
              className="w-full min-h-[160px] bg-card border border-border focus:border-ring focus:ring-1 focus:ring-ring rounded-2xl p-4 text-[15px] outline-none resize-y placeholder-muted-foreground text-foreground transition-all"
              disabled={localIngesting}
            />

            {/* Bullet points */}
            <ul className="flex flex-col gap-1.5 text-[13px] text-muted-foreground pl-1 list-none">
              <li className="flex items-start gap-2">
                <span className="mt-[7px] w-1.5 h-1.5 rounded-full bg-muted-foreground/60 flex-shrink-0" />
                <span>To add multiple URLs, separate with a space or new line.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-[7px] w-1.5 h-1.5 rounded-full bg-muted-foreground/60 flex-shrink-0" />
                <span>Only the visible text on the website will be imported at this time.</span>
              </li>
            </ul>

            {/* Footer action */}
            <div className="flex justify-end mt-2">
              <button
                disabled={!websiteInput.trim() || localIngesting}
                onClick={() => {
                  const displayDomain = websiteInput.split("//")[1]?.split("/")[0] || "Link"
                  handleIngestText(
                    `Website (${displayDomain})`, 
                    `Source Link URL: ${websiteInput}\n\nGrounding reference for link search.`
                  )
                }}
                className={`h-[40px] px-6 rounded-full text-[14px] font-semibold transition active:scale-[0.98] cursor-pointer outline-none ${
                  websiteInput.trim() && !localIngesting
                    ? "bg-foreground text-background hover:opacity-90"
                    : "bg-muted text-muted-foreground/50 cursor-not-allowed"
                }`}
              >
                Insert
              </button>
            </div>
          </div>
        )}

        {/* Copied Text subdialog */}
        {currentView === "copied_text" && (
          <div className="relative z-10 flex flex-col gap-5">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setCurrentView("main")}
                  className="w-10 h-10 flex items-center justify-center rounded-full text-muted-foreground hover:text-foreground hover:bg-accent transition cursor-pointer outline-none"
                  disabled={localIngesting}
                >
                  <span className="google-symbols text-[24px]">arrow_back</span>
                </button>
                <h2 className="text-[20px] font-semibold text-foreground tracking-tight">
                  Paste copied text
                </h2>
              </div>
              <ShadcnDialogClose asChild disabled={localIngesting}>
                <button className="w-10 h-10 flex items-center justify-center rounded-full text-muted-foreground hover:text-foreground hover:bg-accent transition cursor-pointer outline-none">
                  <span className="google-symbols text-[24px]">close</span>
                </button>
              </ShadcnDialogClose>
            </div>

            {/* Description */}
            <p className="text-[15px] text-muted-foreground -mt-2">
              Paste your copied text below to upload as a source in NotebookLM.
            </p>

            {/* Textarea */}
            <textarea
              value={copiedTextInput}
              onChange={(e) => setCopiedTextInput(e.target.value)}
              placeholder="Paste text here"
              className="w-full min-h-[220px] bg-card border border-border focus:border-ring focus:ring-1 focus:ring-ring rounded-2xl p-4 text-[15px] outline-none resize-y placeholder-muted-foreground text-foreground transition-all"
              disabled={localIngesting}
            />

            {/* Footer action */}
            <div className="flex justify-end mt-4">
              <button
                disabled={!copiedTextInput.trim() || localIngesting}
                onClick={() => {
                  const nowStr = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                  handleIngestText(`Text Snippet (${nowStr})`, copiedTextInput)
                }}
                className={`h-[40px] px-6 rounded-full text-[14px] font-semibold transition active:scale-[0.98] cursor-pointer outline-none ${
                  copiedTextInput.trim() && !localIngesting
                    ? "bg-foreground text-background hover:opacity-90"
                    : "bg-muted text-muted-foreground/50 cursor-not-allowed"
                }`}
              >
                Insert
              </button>
            </div>
          </div>
        )}

        {/* Loading Overlay */}
        {localIngesting && (
          <div className="absolute inset-0 bg-white/95 dark:bg-zinc-950/95 backdrop-blur-xs flex flex-col items-center justify-center z-50 p-6 text-center rounded-[28px] max-sm:rounded-t-[28px] max-sm:rounded-b-none">
            <div className="flex flex-col items-center gap-6 max-w-sm w-full">
              <div className="relative w-16 h-16 flex items-center justify-center">
                <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-emerald-500 border-r-emerald-500 animate-spin" />
                <div className="w-9 h-9 rounded-full bg-emerald-500/10 dark:bg-emerald-400/10 flex items-center justify-center animate-pulse">
                  <span className="google-symbols text-[18px] text-emerald-500 dark:text-emerald-400">
                    drive_pdf
                  </span>
                </div>
              </div>
              <div className="space-y-2 w-full">
                <h3 className="text-[15px] font-semibold text-foreground tracking-wide font-sans">
                  Ingesting source
                </h3>
                <p className="text-[13px] text-muted-foreground font-sans min-h-[40px] px-4 leading-normal">
                  {status}
                </p>
                {progress && (
                  <div className="w-full flex flex-col items-center mt-4">
                    <div className="w-full bg-slate-100 dark:bg-zinc-900 rounded-full h-2 overflow-hidden border border-border">
                      <div
                        className="bg-emerald-500 h-full rounded-full transition-all duration-300"
                        style={{ width: `${(progress.current / progress.total) * 100}%` }}
                      />
                    </div>
                    <span className="text-[11px] text-muted-foreground font-sans mt-2 font-medium">
                      Embedding chunk {progress.current} of {progress.total} (
                      {Math.round((progress.current / progress.total) * 100)}%)
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {toast && (
          <div className="fixed bottom-6 right-6 z-50 animate-fade-in bg-zinc-900/95 dark:bg-zinc-100/95 backdrop-blur-md text-white dark:text-zinc-900 px-4 py-3.5 rounded-2xl shadow-2xl flex items-start gap-3 border border-white/10 dark:border-black/10 select-text max-w-sm">
            <span className="google-symbols text-[20px] text-amber-500 mt-0.5">warning</span>
            <div className="flex flex-col gap-0.5">
              <span className="text-[13px] font-bold tracking-tight">File limit exceeded</span>
              <span className="text-[12px] opacity-80 leading-normal">{toast.message}</span>
            </div>
          </div>
        )}
      </ShadcnDialogContent>
    </ShadcnDialog>
  )
}
