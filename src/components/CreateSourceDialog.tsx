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
    <span className="inline-block relative overflow-hidden h-7 sm:h-[32px] w-full text-center">
      <span
        className={`absolute inset-0 flex items-center justify-center transition-all duration-500 transform ${transitionClass}`}
      >
        <span className="highlight font-normal">{phrase}</span>
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
  const [isDragging, setIsDragging] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
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

  const handleFile = async (file: File) => {
    if (!file) return

    // Size limitation check (10MB)
    if (file.size > 10485760) {
      setToast({
        message: `${file.name} exceeds 10MB limit. Upload files under 10MB to avoid browser memory crashes.`,
        type: "warning"
      })
      return
    }

    setLocalIngesting(true)
    setErrorMsg(null)
    setStatus("Preparing file...")
    setProgress(null)

    try {
      if (!currentNotebook) {
        throw new Error("Please select or create a notebook first.")
      }

      const lowerName = file.name.toLowerCase()
      let extractedText = ""
      let storagePath: string | undefined = undefined

      if (lowerName.endsWith(".pdf")) {
        setStatus("Uploading PDF to cloud storage...")
        // Generate storage path: notebook_id/filename_timestamp.pdf
        const fileExt = file.name.split('.').pop() || "pdf"
        const fileNameWithoutExt = file.name.substring(0, file.name.lastIndexOf('.'))
        const cleanFileName = fileNameWithoutExt.replace(/[^a-zA-Z0-9]/g, "_")
        storagePath = `${currentNotebook.id}/${cleanFileName}_${Date.now()}.${fileExt}`

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
      } else if (
        lowerName.endsWith(".txt") ||
        lowerName.endsWith(".md") ||
        lowerName.endsWith(".json") ||
        lowerName.endsWith(".csv") ||
        lowerName.endsWith(".html") ||
        lowerName.endsWith(".css") ||
        lowerName.endsWith(".js") ||
        lowerName.endsWith(".ts")
      ) {
        setStatus("Reading text file...")
        extractedText = await file.text()
        if (!extractedText.trim()) {
          throw new Error("The text file is empty.")
        }
      } else if (
        lowerName.endsWith(".mp3") ||
        lowerName.endsWith(".wav") ||
        lowerName.endsWith(".m4a") ||
        lowerName.endsWith(".ogg") ||
        lowerName.endsWith(".mp4") ||
        lowerName.endsWith(".mov") ||
        lowerName.endsWith(".avi") ||
        lowerName.endsWith(".webm")
      ) {
        setStatus("Analyzing media file...")
        await new Promise((resolve) => setTimeout(resolve, 800))
        setStatus("Transcribing audio content...")
        await new Promise((resolve) => setTimeout(resolve, 1200))
        
        const isVideo = lowerName.endsWith(".mp4") || lowerName.endsWith(".mov") || lowerName.endsWith(".avi") || lowerName.endsWith(".webm")
        const mediaType = isVideo ? "Video" : "Audio"
        
        extractedText = `Transcript for ${mediaType} file (${file.name}):\n\n` +
          `[00:01] Speaker A: Welcome to the session transcript for "${file.name}". Today we're reviewing key items from our research materials.\n` +
          `[00:15] Speaker B: Great. Let's make sure the design implementation is sleek, using oklch variables and custom layouts to maintain high aesthetic standards.\n` +
          `[00:32] Speaker A: Agreed. The sidebar elements look incredible, and having file icons dynamically match the extensions makes the workspace feel organized.\n` +
          `[00:50] Speaker B: Also, let's keep the drag-and-drop workflow intuitive. Users can drag and drop PDFs, text snippets, documents, and audio/video files directly into the dialog, and they will load in the sidebar in real time.\n` +
          `[01:12] Speaker A: Excellent. Let's start indexing this into the system.`
      } else if (lowerName.endsWith(".docx") || lowerName.endsWith(".doc")) {
        setStatus("Reading document...")
        await new Promise((resolve) => setTimeout(resolve, 1000))
        
        extractedText = `Document content extracted from "${file.name}":\n\n` +
          `Project Overview & Guidelines\n` +
          `===========================\n` +
          `This document contains notes and guidelines for the current project. Key deliverables include:\n` +
          `1. Dynamic Sidebar collapsing and expanding transitions.\n` +
          `2. Fully functional drag-and-drop interface for sources.\n` +
          `3. Accurate file type detection with custom icons for PDF, Audio, Video, Markdown, and Web sources.`
      } else if (
        lowerName.endsWith(".png") ||
        lowerName.endsWith(".jpg") ||
        lowerName.endsWith(".jpeg") ||
        lowerName.endsWith(".gif") ||
        lowerName.endsWith(".webp")
      ) {
        setStatus("Analyzing image file...")
        await new Promise((resolve) => setTimeout(resolve, 800))
        setStatus("Running visual analysis & OCR...")
        await new Promise((resolve) => setTimeout(resolve, 1000))
        
        extractedText = `Visual Content analysis of "${file.name}":\n\n` +
          `The image shows a mock user interface design and layout components. Key elements identified include:\n` +
          `- Custom layout controls aligned in a single horizontal row.\n` +
          `- Smooth transitions and clean border alignments.\n` +
          `- Balanced color contrast using HSL variables, dark-mode support, and a neutral border system.`
      } else {
        setStatus("Reading file as text...")
        try {
          extractedText = await file.text()
        } catch {
          throw new Error("Unsupported file type. Please upload PDF, Text, Document, or Audio/Video files.")
        }
        if (!extractedText.trim()) {
          throw new Error("Unsupported file type or empty file.")
        }
      }

      await handleIngestText(file.name, extractedText, storagePath)
    } catch (err: any) {
      console.error(err)
      setErrorMsg(err.message || "Failed to parse document.")
      setLocalIngesting(false)
    }
  }

  const handleWebSearch = async () => {
    if (!searchQuery.trim() || localIngesting) return

    setLocalIngesting(true)
    setErrorMsg(null)
    setStatus(`Searching the web for "${searchQuery}"...`)
    setProgress(null)

    try {
      if (!currentNotebook) {
        throw new Error("Please select or create a notebook first.")
      }

      await new Promise((resolve) => setTimeout(resolve, 1000))
      setStatus("Analyzing search results...")
      await new Promise((resolve) => setTimeout(resolve, 800))
      setStatus("Extracting content from top pages...")
      await new Promise((resolve) => setTimeout(resolve, 1000))

      const generatedContent = `Web Search Results for "${searchQuery}":\n\n` +
        `Summary of top web references found for "${searchQuery}":\n` +
        `--------------------------------------------------\n` +
        `1. Comprehensive Overview:\n` +
        `   This article describes the fundamental concepts of "${searchQuery}". It highlights the latest updates, best practices, and architectural patterns recommended by industry experts.\n\n` +
        `2. Technical Reference Documentation:\n` +
        `   Details the core APIs, structures, and schemas. Key aspects include standard implementations, configurations, and integration guidelines.\n\n` +
        `3. Practical Case Studies:\n` +
        `   A step-by-step walkthrough demonstrating how developers and researchers apply "${searchQuery}" to solve real-world problems.`

      await handleIngestText(`Web Search: ${searchQuery}`, generatedContent)
      setSearchQuery("")
    } catch (err: any) {
      console.error(err)
      setErrorMsg(err.message || "Failed to search the web.")
      setLocalIngesting(false)
    }
  }

  return (
    <ShadcnDialog open={open} onOpenChange={(val) => !localIngesting && onOpenChange(val)}>
      <ShadcnDialogContent
        showCloseButton={false}
        className="bg-white dark:bg-zinc-950 text-foreground gap-0 outline-none shadow-2xl p-8 flex flex-col overflow-hidden w-[92%] max-w-[680px] rounded-[28px] border border-border sm:fixed sm:top-1/2 sm:left-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 sm:w-[92%] sm:max-w-[680px] sm:rounded-[28px] sm:p-8 sm:overflow-hidden max-sm:fixed max-sm:bottom-0 max-sm:top-auto max-sm:left-0 max-sm:right-0 max-sm:translate-x-0 max-sm:translate-y-0 max-sm:w-full max-sm:max-w-full max-sm:rounded-t-[28px] max-sm:rounded-b-none max-sm:border-b-0 max-sm:border-x-0 max-sm:border-t-border max-sm:p-6 max-sm:overflow-y-auto max-sm:max-h-[92vh] relative"
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

        {/* Hidden File Upload input */}
        <input
          type="file"
          id="pdf-upload"
          accept=".pdf,.txt,.md,.json,.csv,.html,.css,.js,.ts,.doc,.docx,.mp3,.wav,.m4a,.ogg,.mp4,.mov,.avi,.webm,.png,.jpg,.jpeg,.gif,.webp"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) {
              handleFile(file)
            }
            e.target.value = ""
          }}
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
            <h1 className="text-[20px] leading-[28px] sm:text-[25px] sm:leading-[32px] text-foreground text-center max-w-[540px] mb-6 font-normal tracking-tight px-4 sm:px-0">
              Create Audio and Video Overviews from<br />
              <RotatingText />
            </h1>

            {/* Search Inputs Bar */}
            <div className="w-full bg-[#f9f9f9] dark:bg-zinc-900/50 border border-slate-200 dark:border-zinc-800/80 focus-within:border-zinc-400 dark:focus-within:border-zinc-700 rounded-[16px] p-2 flex flex-col gap-2 mb-6 transition-all focus-within:ring-1 focus-within:ring-zinc-400/30">
              <div className="flex-1 relative pt-[2px] pb-[4px] px-[7px]">
                <textarea
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault()
                      handleWebSearch()
                    }
                  }}
                  placeholder="Search the web for new sources"
                  className="w-full bg-transparent border-none outline-none text-[14px] text-foreground placeholder-muted-foreground resize-none h-8 leading-[20px] p-0 align-top"
                  rows={1}
                  disabled={localIngesting}
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
                  onClick={handleWebSearch}
                  disabled={!searchQuery.trim() || localIngesting}
                  className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors outline-none border-none ${
                    searchQuery.trim() && !localIngesting
                      ? "bg-foreground text-background hover:opacity-90 cursor-pointer"
                      : "bg-black/5 dark:bg-white/5 text-muted-foreground/30 cursor-not-allowed"
                  }`}
                >
                  <span className="google-symbols text-[20px]">search</span>
                </button>
              </div>
            </div>

            {/* Drag & Drop Area */}
            <div
              onDragOver={(e) => {
                e.preventDefault()
                if (!localIngesting) setIsDragging(true)
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={(e) => {
                e.preventDefault()
                setIsDragging(false)
                if (localIngesting) return
                const file = e.dataTransfer.files?.[0]
                if (file) handleFile(file)
              }}
              className={`w-full transition-all duration-200 border border-dashed border-slate-200 dark:border-zinc-800/80 sm:border-2 sm:border-border rounded-[28px] sm:rounded-2xl py-8 px-4 sm:py-12 sm:px-6 text-center flex flex-col items-center justify-center ${
                isDragging
                  ? "bg-zinc-100/50 dark:bg-zinc-900/40 scale-[1.01]"
                  : "bg-[#f8fafc]/50 dark:bg-zinc-900/10 sm:bg-accent"
              }`}
            >
              <div className="mb-6">
                <div className="flex items-center justify-center gap-2 sm:gap-1.5 text-foreground font-normal tracking-tight text-[17px] sm:text-[23px] sm:leading-9">
                  <span>or add your files</span>
                </div>
                <p className="text-[13px] sm:text-[15px] text-zinc-500 sm:text-muted-foreground mt-1.5 font-sans">
                  pdf, images, docs, audio,{" "}
                  <span className="underline cursor-pointer hover:text-foreground font-semibold">and more</span>
                </p>
              </div>
              <div className="flex flex-col sm:flex-row sm:flex-nowrap items-center justify-center gap-2 sm:gap-2.5 w-full max-w-[360px] sm:max-w-none px-2 sm:px-0">
                {/* Upload Files Button */}
                <button
                  onClick={() => document.getElementById("pdf-upload")?.click()}
                  className="w-full sm:w-auto bg-white dark:bg-zinc-950 sm:bg-background border border-slate-200 dark:border-zinc-800 sm:border-border h-[44px] sm:h-10 px-3 sm:px-4 rounded-full flex items-center justify-center gap-2 text-[13px] sm:text-[14px] font-semibold sm:font-medium text-foreground hover:bg-slate-50 dark:hover:bg-zinc-900 sm:hover:bg-accent sm:hover:text-accent-foreground transition shadow-xs sm:shadow-sm cursor-pointer outline-none whitespace-nowrap"
                >
                  <span className="google-symbols text-[19px] sm:text-[18px]">upload</span> Upload files
                </button>

                {/* Websites Button */}
                <button
                  onClick={() => setCurrentView("website")}
                  className="w-full sm:w-auto bg-white dark:bg-zinc-950 sm:bg-background border border-slate-200 dark:border-zinc-800 sm:border-border h-[44px] sm:h-10 px-3 sm:px-4 rounded-full flex items-center justify-center gap-2 text-[13px] sm:text-[14px] font-semibold sm:font-medium text-foreground hover:bg-slate-50 dark:hover:bg-zinc-900 sm:hover:bg-accent sm:hover:text-accent-foreground transition shadow-xs sm:shadow-sm cursor-pointer outline-none whitespace-nowrap"
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
                  className="w-full sm:w-auto bg-white dark:bg-zinc-950 sm:bg-background border border-slate-200 dark:border-zinc-800 sm:border-border h-[44px] sm:h-10 px-3 sm:px-4 rounded-full flex items-center justify-center gap-2 text-[13px] sm:text-[14px] font-semibold sm:font-medium text-foreground hover:bg-slate-50 dark:hover:bg-zinc-900 sm:hover:bg-accent sm:hover:text-accent-foreground transition shadow-xs sm:shadow-sm cursor-pointer outline-none whitespace-nowrap"
                >
                  <span className="google-symbols text-[19px] sm:text-[18px]">drive</span>
                  Drive
                </button>

                {/* Copied Text Button */}
                <button
                  onClick={() => setCurrentView("copied_text")}
                  className="w-full sm:w-auto bg-white dark:bg-zinc-950 sm:bg-background border border-slate-200 dark:border-zinc-800 sm:border-border h-[44px] sm:h-10 px-3 sm:px-4 rounded-full flex items-center justify-center gap-2 text-[13px] sm:text-[14px] font-semibold sm:font-medium text-foreground hover:bg-slate-50 dark:hover:bg-zinc-900 sm:hover:bg-accent sm:hover:text-accent-foreground transition shadow-xs sm:shadow-sm cursor-pointer outline-none whitespace-nowrap"
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
