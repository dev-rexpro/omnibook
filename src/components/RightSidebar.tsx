import { useState } from "react"
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu"
import {
  Dialog as ShadcnDialog,
  DialogContent as ShadcnDialogContent,
} from "@/components/ui/dialog"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import type { Citation } from "@/store/useNotebookStore"
import { getFileIcon } from "@/lib/utils"

interface Note {
  id: string
  title: string
  content: string
  createdAt: string
  citations?: Citation[]
}

const getNoteIconDetails = (title: string, isMobile: boolean) => {
  const lowerTitle = title.toLowerCase()
  const defaultIcon = isMobile ? "description" : "article"
  const defaultColorClass = isMobile ? "text-zinc-900 dark:text-zinc-100" : "text-gray-700 dark:text-foreground"

  if (lowerTitle.includes("audio overview")) {
    return { icon: "audio_magic_eraser", colorClass: "text-[#224484]" }
  }
  if (lowerTitle.includes("slide deck")) {
    return { icon: "tablet", colorClass: "text-[#796731]" }
  }
  if (lowerTitle.includes("video overview")) {
    return { icon: "subscriptions", colorClass: "text-[#0f5223]" }
  }
  if (lowerTitle.includes("mind map") || lowerTitle.includes("mindmap")) {
    return { icon: "flowchart", colorClass: "text-[#802272]" }
  }
  if (lowerTitle.includes("report")) {
    return { icon: "auto_tab_group", colorClass: "text-[#796731]" }
  }
  if (lowerTitle.includes("flashcard")) {
    return { icon: "cards_star", colorClass: "text-[#8c2e2a]" }
  }
  if (lowerTitle.includes("quiz")) {
    return { icon: "quiz", colorClass: "text-[#056a95]" }
  }
  if (lowerTitle.includes("infographic")) {
    return { icon: "stacked_bar_chart", colorClass: "text-[#802272]" }
  }
  if (lowerTitle.includes("data table") || lowerTitle.includes("table")) {
    return { icon: "table_view", colorClass: "text-[#224484]" }
  }

  return { icon: defaultIcon, colorClass: defaultColorClass }
}

const formatNoteTimeAgo = (dateString?: string) => {
  if (!dateString) return "Just now"
  if (!dateString.includes("-") && !dateString.includes("T")) {
    return dateString
  }
  try {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    if (diffMs < 0) return "Just now"
    
    const diffMins = Math.floor(diffMs / (60 * 1000))
    if (diffMins < 1) return "Just now"
    if (diffMins < 60) return `${diffMins}m ago`
    
    const diffHours = Math.floor(diffMins / 60)
    if (diffHours < 24) return `${diffHours}h ago`
    
    const diffDays = Math.floor(diffHours / 24)
    return `${diffDays}d ago`
  } catch (e) {
    return "Just now"
  }
}

const getNoteSubtitle = (note: Note) => {
  const uniqueSources = note.citations && note.citations.length > 0
    ? new Set(note.citations.map((c) => c.filename)).size
    : 0

  const timeAgoStr = formatNoteTimeAgo(note.createdAt)
  if (uniqueSources > 0) {
    return `${uniqueSources} source${uniqueSources > 1 ? "s" : ""} · ${timeAgoStr}`
  }
  return timeAgoStr
}

// ─── Custom Citation Badge Component with Hover Card ───
const CitationBadge = ({ num, citations }: { num: number; citations?: Citation[] }) => {
  const [isHovered, setIsHovered] = useState(false)
  const citation = citations?.find(c => c.index === num)

  if (!citation) {
    return (
      <span className="inline-flex items-center justify-center bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 rounded-full w-4.5 h-4.5 text-[10px] font-bold mx-0.5 select-none align-middle -translate-y-[1px]">
        {num}
      </span>
    )
  }

  return (
    <span 
      className="relative inline-block select-none text-left"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <span className="inline-flex items-center justify-center bg-zinc-200 dark:bg-zinc-800 hover:bg-zinc-300 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 rounded-full w-4.5 h-4.5 text-[10px] font-bold mx-0.5 cursor-pointer transition-colors select-none align-middle -translate-y-[1px]">
        {num}
      </span>

      {isHovered && (
        <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-3 bg-popover border border-border text-popover-foreground rounded-xl shadow-xl z-50 text-[12px] leading-relaxed flex flex-col gap-1.5 animate-slide-in pointer-events-none">
          <span className="font-semibold text-foreground flex items-center gap-1.5 border-b border-border/50 pb-1">
            <span className="google-symbols text-[14px] text-primary">
              {getFileIcon(citation.filename)}
            </span>
            <span className="truncate max-w-[200px]">{citation.filename}</span>
          </span>
          <span className="text-muted-foreground italic font-normal line-clamp-4 select-text">
            "{citation.content.trim()}"
          </span>
        </span>
      )}
    </span>
  )
}

const parseCitations = (text: string, citations?: Citation[]): React.ReactNode => {
  const citationRegex = /\[(\d+)\]/g
  const parts = text.split(citationRegex)
  if (parts.length === 1) return text

  return parts.map((part, idx) => {
    if (idx % 2 === 1) {
      const citationNumber = parseInt(part, 10)
      return <CitationBadge key={idx} num={citationNumber} citations={citations} />
    }
    return part
  })
}

// ─── Premium Inline Markdown Formatter ───
const parseInlineMarkdown = (text: string, citations?: Citation[]): React.ReactNode => {
  const parts = text.split(/`([^`]+)`/)
  return parts.map((part, index) => {
    if (index % 2 === 1) {
      return (
        <code key={index} className="bg-muted px-1.5 py-0.5 rounded font-mono text-[13px] text-zinc-900 dark:text-zinc-100 font-semibold">
          {part}
        </code>
      )
    }
    
    const boldParts = part.split(/\*\*([^*]+)\*\*/)
    return boldParts.map((bPart, bIdx) => {
      if (bIdx % 2 === 1) {
        return <strong key={bIdx} className="font-bold text-foreground">{bPart}</strong>
      }
      
      const italicParts = bPart.split(/\*([^*]+)\*/)
      return italicParts.map((iPart, iIdx) => {
        if (iIdx % 2 === 1) {
          return <em key={iIdx} className="italic">{iPart}</em>
        }
        return parseCitations(iPart, citations)
      })
    })
  })
}

const formatParagraphs = (text: string, citations?: Citation[]): React.ReactNode[] => {
  const paragraphs = text.split("\n\n")
  return paragraphs.map((para, pIdx) => {
    const trimmed = para.trim()
    if (!trimmed) return null

    if (trimmed.startsWith("### ")) {
      return <h3 key={pIdx} className="text-[15px] font-bold text-foreground mt-4 mb-2">{parseInlineMarkdown(trimmed.substring(4), citations)}</h3>
    }
    if (trimmed.startsWith("## ")) {
      return <h2 key={pIdx} className="text-[17px] font-bold text-foreground mt-4 mb-2">{parseInlineMarkdown(trimmed.substring(3), citations)}</h2>
    }
    if (trimmed.startsWith("# ")) {
      return <h1 key={pIdx} className="text-[19px] font-bold text-foreground mt-4 mb-2">{parseInlineMarkdown(trimmed.substring(2), citations)}</h1>
    }

    const lines = trimmed.split("\n")
    const isList = lines.every(line => {
      const l = line.trim()
      return l.startsWith("•") || l.startsWith("-") || l.startsWith("*") || /^\d+\.\s/.test(l)
    })

    if (isList) {
      return (
        <ul key={pIdx} className="list-disc pl-5 flex flex-col gap-1.5 my-2">
          {lines.map((line, lIdx) => {
            const cleanLine = line.replace(/^([•\-*]|\d+\.)\s*/, "")
            return <li key={lIdx}>{parseInlineMarkdown(cleanLine, citations)}</li>
          })}
        </ul>
      )
    }

    return (
      <p key={pIdx} className="mb-2.5 leading-relaxed text-[14px]">
        {parseInlineMarkdown(para, citations)}
      </p>
    )
  })
}

const formatMessageText = (text: string, citations?: Citation[]) => {
  if (!text) return null

  const codeBlockRegex = /```(\w*)\n([\s\S]*?)```/g
  const elements: React.ReactNode[] = []
  let lastIndex = 0
  let match

  while ((match = codeBlockRegex.exec(text)) !== null) {
    const precedingText = text.substring(lastIndex, match.index)
    if (precedingText.trim()) {
      elements.push(...formatParagraphs(precedingText, citations))
    }

    const language = match[1] || "code"
    const codeContent = match[2]
    elements.push(
      <pre key={`code-${match.index}`} className="bg-zinc-950 dark:bg-zinc-900 text-zinc-100 p-4 rounded-xl font-mono text-[13px] my-3 overflow-x-auto shadow-inner border border-border/30 relative group">
        <div className="absolute top-2 right-3 text-[10px] text-zinc-500 uppercase font-semibold select-none">
          {language}
        </div>
        <code>{codeContent}</code>
      </pre>
    )
    lastIndex = codeBlockRegex.lastIndex
  }

  const remainingText = text.substring(lastIndex)
  if (remainingText.trim() || elements.length === 0) {
    elements.push(...formatParagraphs(remainingText, citations))
  }

  return elements
}

interface RightSidebarProps {
  isCollapsed: boolean
  onToggleCollapse: () => void
  notes: Note[]
  selectedNoteId: string | null
  onNoteSelect: (id: string | null) => void
  onAddNoteClick: () => void
  onDeleteNote: (id: string) => void
  onChevronClick?: (item: string) => void
  isMobile?: boolean
}

const STUDIO_ITEMS = [
  { icon: "audio_magic_eraser", bg: "bg-[#edeffa]", text: "text-[#224484]", hoverGif: "gif/ao_hover_2x.gif", label: "Audio Overview" },
  { icon: "tablet", bg: "bg-[#f2f2e8]", text: "text-[#796731]", hoverGif: "gif/slides_hover_2x.gif", label: "Slide Deck" },
  { icon: "subscriptions", bg: "bg-[#e1f1e5]", text: "text-[#0f5223]", hoverGif: "gif/vo_hover_2x.gif", label: "Video Overview" },
  { icon: "flowchart", bg: "bg-[#f0e9ef]", text: "text-[#802272]", hoverGif: "gif/mindmap_hover_2x.gif", label: "Mind Map" },
  { icon: "auto_tab_group", bg: "bg-[#f2f2e8]", text: "text-[#796731]", hoverGif: "gif/report_hover_2x.gif", label: "Reports" },
  { icon: "cards_star", bg: "bg-[#f7edeb]", text: "text-[#8c2e2a]", hoverGif: "gif/flashcards_hover_2x.gif", label: "Flashcards" },
  { icon: "quiz", bg: "bg-[#def1f7]", text: "text-[#056a95]", hoverGif: "gif/quizzes_hover_2x.gif", label: "Quiz" },
  { icon: "stacked_bar_chart", bg: "bg-[#f0e9ef]", text: "text-[#802272]", hoverGif: "gif/infographics_hover_2x.gif", label: "Infographic" },
  { icon: "table_view", bg: "bg-[#edeffa]", text: "text-[#224484]", hoverGif: "gif/table_hover_2x.gif", label: "Data Table" },
]

export function RightSidebar({
  isCollapsed,
  onToggleCollapse,
  notes,
  selectedNoteId,
  onNoteSelect,
  onAddNoteClick,
  onDeleteNote,
  onChevronClick,
  isMobile = false,
}: RightSidebarProps) {
  const [noteToDeleteId, setNoteToDeleteId] = useState<string | null>(null)
  const activeNote = notes.find((n) => n.id === selectedNoteId)

  if (isMobile) {
    return (
      <div className="w-full flex-1 flex flex-col bg-background overflow-hidden relative">
        {selectedNoteId !== null && activeNote ? (
          /* Note details view */
          <div className="flex-1 flex flex-col overflow-hidden bg-background">
            {/* Header */}
            <div className="h-12 border-b border-sidebar-border flex items-center justify-between px-4 flex-shrink-0 bg-background">
              <div className="flex items-center gap-1 text-[13px]">
                <span
                  onClick={() => onNoteSelect(null)}
                  className="text-muted-foreground hover:text-foreground cursor-pointer hover:underline transition-colors font-medium font-sans animate-fade-in"
                >
                  Studio
                </span>
                <span className="google-symbols text-[14px] text-muted-foreground select-none">
                  chevron_right
                </span>
                <span className="text-foreground font-semibold font-sans">Note</span>
              </div>
              <button
                onClick={() => onNoteSelect(null)}
                className="w-8 h-8 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent rounded-full transition cursor-pointer outline-none border-none bg-transparent"
              >
                <span className="google-symbols text-[16px]">collapse_content</span>
              </button>
            </div>

            {/* Content Body */}
            <div className="flex-1 overflow-y-auto p-4 flex flex-col pb-20">
              <div className="flex items-start justify-between gap-3 mb-4">
                <h3 className="text-[16px] font-bold tracking-tight text-foreground leading-snug font-sans">
                  {activeNote.title}
                </h3>
                <button
                  onClick={() => setNoteToDeleteId(activeNote.id)}
                  className="w-8 h-8 flex items-center justify-center rounded-full text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition cursor-pointer outline-none border-none bg-transparent flex-shrink-0"
                >
                  <span className="google-symbols text-[18px]">delete</span>
                </button>
              </div>
              <div className="text-[13px] leading-relaxed text-foreground/90 font-sans flex flex-col gap-2.5">
                {formatMessageText(activeNote.content, activeNote.citations)}
              </div>
            </div>

            {/* Footer */}
            <div className="absolute bottom-0 left-0 right-0 border-t border-border px-4 h-14 flex items-center justify-end bg-background z-20">
              <button
                onClick={() => console.log("Convert to source:", activeNote.title)}
                className="bg-card border border-border h-9 px-4 rounded-full flex items-center justify-center gap-1.5 text-[12px] font-medium text-foreground hover:bg-accent transition shadow-sm cursor-pointer outline-none flex-shrink-0 font-sans"
              >
                <span className="google-symbols text-[14px]">convert_to_text</span>
                Convert to source
              </button>
            </div>
          </div>
        ) : (
          /* Main studio cards list and notes list */
          <div className="flex-1 flex flex-col overflow-hidden relative">
            <div className="flex-1 overflow-y-auto flex flex-col pb-24">
              {/* Items grid */}
              <div className="grid grid-cols-2 gap-2.5 p-4 flex-shrink-0 studio-grid">
                {STUDIO_ITEMS.map((item, index) => (
                  <div
                    key={index}
                    onClick={() => {
                      if (onChevronClick) onChevronClick(item.label)
                    }}
                    className={`${item.bg} ${item.text} rounded-xl p-3 h-[64px] studio-btn flex justify-between items-center cursor-pointer hover:brightness-95 transition`}
                  >
                    <div className="flex flex-col gap-1 min-w-0 flex-1">
                      <span className="google-symbols text-[16px]">{item.icon}</span>
                      <img src={item.hoverGif} className="hover-gif" alt={`${item.label} hover animation`} />
                      <span className="text-xs font-medium truncate font-sans">{item.label}</span>
                    </div>
                    <div
                      className="w-7 h-7 rounded-full bg-gray-100 dark:bg-muted flex items-center justify-center flex-shrink-0 text-current"
                    >
                      <span className="google-symbols text-[16px]">chevron_right</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Notes list or Empty state */}
              {notes.length > 0 ? (
                <div className="flex-1 flex flex-col gap-3 px-4 pb-20">
                  <div className="text-[11px] font-bold text-muted-foreground/70 px-1 uppercase tracking-wider select-none font-sans">
                    Notes
                  </div>
                  <div className="flex flex-col gap-2">
                    {notes.map((note) => {
                      const isSelected = selectedNoteId === note.id
                      return (
                        <div
                          key={note.id}
                          onClick={() => onNoteSelect(note.id)}
                          className={`w-full flex items-center justify-between p-3 border rounded-xl transition-all group cursor-pointer ${
                            isSelected
                              ? "bg-[#fcfcfc] dark:bg-zinc-900 border-slate-300 dark:border-zinc-800 rounded-xl hover:bg-slate-50 dark:hover:bg-zinc-800/80"
                              : "bg-slate-50/50 dark:bg-zinc-900/40 border-slate-200/50 dark:border-zinc-800/40 opacity-60 hover:opacity-85"
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0 flex-1">
                            <span className={`google-symbols text-[20px] flex-shrink-0 select-none ${getNoteIconDetails(note.title, true).colorClass}`}>
                              {getNoteIconDetails(note.title, true).icon}
                            </span>
                            <div className="flex-1 min-w-0">
                              <div className="flex flex-col gap-0.5 min-w-0">
                                <span className="text-[13px] font-semibold text-foreground truncate block font-sans" title={note.title}>
                                  {note.title}
                                </span>
                                <span className="text-[11px] text-muted-foreground font-medium font-sans">
                                  {getNoteSubtitle(note)}
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 flex-shrink-0">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <button
                                  onClick={(e) => e.stopPropagation()}
                                  className="text-muted-foreground hover:text-foreground w-8 h-8 rounded-full flex items-center justify-center transition cursor-pointer outline-none bg-transparent hover:bg-accent border-none"
                                >
                                  <span className="google-symbols text-[18px]">more_vert</span>
                                </button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent
                                align="end"
                                sideOffset={4}
                                className="bg-popover text-popover-foreground border border-border rounded-lg shadow-lg py-1 z-50 text-[13px] flex flex-col font-sans outline-none min-w-[160px] w-max whitespace-nowrap"
                              >
                                <DropdownMenuItem
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    console.log("Convert to source:", note.title)
                                  }}
                                  className="flex items-center gap-2 px-3 py-2 hover:bg-accent hover:text-accent-foreground text-left w-full transition-colors outline-none cursor-pointer whitespace-nowrap font-sans"
                                >
                                  <span className="google-symbols text-[16px]">convert_to_text</span>
                                  <span>Convert to source</span>
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    setNoteToDeleteId(note.id)
                                  }}
                                  className="flex items-center gap-2 px-3 py-2 hover:bg-destructive/10 hover:text-destructive text-left w-full transition-colors outline-none cursor-pointer text-destructive/80 font-medium whitespace-nowrap font-sans"
                                >
                                  <span className="google-symbols text-[16px] text-destructive">delete</span>
                                  <span>Delete</span>
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              ) : (
                /* Empty state */
                <div className="flex-1 flex flex-col items-center justify-center p-6 text-center pb-24 mt-4">
                  <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center mb-3">
                    <span className="google-symbols text-[24px] text-muted-foreground/60 icon-fill">
                      magic_button
                    </span>
                  </div>
                  <p className="text-[13px] font-semibold text-foreground font-sans">
                    Studio output will be saved here.
                  </p>
                  <p className="text-[12px] text-muted-foreground mt-1.5 px-4 leading-relaxed font-sans max-w-[280px]">
                    After adding sources, click to add Audio Overview, Study Guide, Mind Map, and more!
                  </p>
                </div>
              )}
            </div>

            {/* Floating button */}
            {selectedNoteId === null && (
              <div className="absolute bottom-6 left-0 right-0 flex justify-center pointer-events-none z-30">
                <button
                  onClick={onAddNoteClick}
                  className="bg-zinc-950 text-zinc-50 dark:bg-zinc-50 dark:text-zinc-950 h-10 px-5 rounded-full flex items-center gap-2 text-[14px] font-semibold shadow-lg hover:scale-105 transition-all pointer-events-auto cursor-pointer outline-none border-none font-sans"
                >
                  <span className="google-symbols text-[18px]">edit_note</span>
                  <span>Add note</span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* Delete Dialog */}
        <ShadcnDialog open={noteToDeleteId !== null} onOpenChange={(open) => { if (!open) setNoteToDeleteId(null) }}>
          <ShadcnDialogContent
            showCloseButton={false}
            className="bg-popover text-popover-foreground rounded-[24px] border border-border shadow-2xl w-[90%] max-w-[360px] p-6 flex flex-col gap-4 outline-none z-50 font-sans"
          >
            <div className="flex flex-col gap-1.5">
              <h3 className="text-[17px] font-bold text-foreground tracking-tight">
                Delete note?
              </h3>
              <p className="text-[13px] text-muted-foreground leading-relaxed">
                This will permanently delete your note. You won't be able to recover it.
              </p>
            </div>
            <div className="flex items-center justify-end gap-2.5 mt-2">
              <button
                onClick={() => setNoteToDeleteId(null)}
                className="h-9 px-4 rounded-full text-[13px] font-semibold bg-muted hover:bg-accent text-foreground transition cursor-pointer outline-none border-none"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (noteToDeleteId) {
                    onDeleteNote(noteToDeleteId)
                    setNoteToDeleteId(null)
                  }
                }}
                className="h-9 px-4 rounded-full text-[13px] font-semibold bg-zinc-950 text-zinc-50 dark:bg-zinc-50 dark:text-zinc-950 hover:opacity-90 transition cursor-pointer outline-none border-none"
              >
                Delete
              </button>
            </div>
          </ShadcnDialogContent>
        </ShadcnDialog>
      </div>
    )
  }

  return (
    <section
      id="panel-studio"
      className={`sidebar flex-shrink-0 bg-sidebar text-sidebar-foreground border border-sidebar-border rounded-2xl flex flex-col relative shadow-sm overflow-hidden w-[320px] lg:w-[340px] ${
        isCollapsed ? "collapsed" : ""
      }`}
    >
      {/* 1. NOTE DETAIL VIEW STATE */}
      {selectedNoteId !== null && activeNote ? (
        <div className="flex-1 flex flex-col overflow-hidden bg-sidebar">
          {/* Header */}
          <div className="h-12 border-b border-sidebar-border flex items-center justify-between px-4 flex-shrink-0 bg-sidebar">
            <div className="flex items-center gap-1 text-[14px]">
              <span
                onClick={() => onNoteSelect(null)}
                className="text-muted-foreground hover:text-foreground cursor-pointer hover:underline transition-colors font-medium font-sans"
              >
                Studio
              </span>
              <span className="google-symbols text-[16px] text-muted-foreground select-none">
                chevron_right
              </span>
              <span className="text-foreground font-semibold font-sans">Note</span>
            </div>
            <button
              onClick={() => onNoteSelect(null)}
              className="w-8 h-8 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-sidebar-accent rounded-full transition cursor-pointer outline-none border-none bg-transparent"
              title="Close note"
            >
              <span className="google-symbols text-[18px]">collapse_content</span>
            </button>
          </div>

          {/* Content Body */}
          <div className="flex-1 overflow-y-auto p-4 flex flex-col pb-20">
            <div className="flex items-start justify-between gap-3 mb-4">
              <h3 className="text-[17px] font-bold tracking-tight text-foreground leading-snug font-sans">
                {activeNote.title}
              </h3>
              <button
                onClick={() => {
                  setNoteToDeleteId(activeNote.id)
                }}
                className="w-8 h-8 flex items-center justify-center rounded-full text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition cursor-pointer outline-none border-none bg-transparent flex-shrink-0"
                title="Delete note"
              >
                <span className="google-symbols text-[20px]">delete</span>
              </button>
            </div>
            <div className="text-[13px] leading-relaxed text-foreground/90 font-sans flex flex-col gap-2.5">
              {formatMessageText(activeNote.content, activeNote.citations)}
            </div>
          </div>

          {/* Footer Area inside sidebar */}
          <div className="absolute bottom-0 left-0 right-0 border-t border-sidebar-border px-4 h-14 flex items-center justify-end bg-sidebar z-20">
            <button
              onClick={() => console.log("Convert to source:", activeNote.title)}
              className="bg-card border border-border h-9 px-4 rounded-full flex items-center justify-center gap-1.5 text-[12px] font-medium text-foreground hover:bg-accent transition shadow-sm cursor-pointer outline-none flex-shrink-0 font-sans"
            >
              <span className="google-symbols text-[16px]">convert_to_text</span>
              Convert to source
            </button>
          </div>
        </div>
      ) : (
        /* 2. MAIN GRID AND LIST STATE */
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Header */}
          <div className="sidebar-header h-12 border-b border-sidebar-border flex items-center justify-between px-4 flex-shrink-0 bg-sidebar z-10 relative">
            <h2 className="text-[15px] font-semibold tracking-tight text-sidebar-foreground sidebar-title font-sans">
              Studio
            </h2>
            <button
              id="btnToggleStudio"
              onClick={onToggleCollapse}
              className="w-8 h-8 flex items-center justify-center text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent rounded-full transition flex-shrink-0 z-10 bg-sidebar cursor-pointer outline-none border-none bg-transparent"
            >
              <span className="google-symbols text-[20px]">dock_to_left</span>
            </button>
          </div>

          {/* Expanded Scroll Body */}
          <div className="sidebar-content w-full flex-1 overflow-y-auto flex flex-col pb-24">
            <div className="grid grid-cols-2 gap-2.5 p-4 flex-shrink-0 studio-grid">
              {STUDIO_ITEMS.map((item, index) => (
                <div
                  key={index}
                  onClick={() => {
                    if (onChevronClick) onChevronClick(item.label)
                  }}
                  className={`${item.bg} ${item.text} rounded-xl p-3 h-[64px] studio-btn flex justify-between items-center cursor-pointer hover:brightness-95 transition`}
                >
                  <div className="flex flex-col gap-1 min-w-0 flex-1">
                    <span className="google-symbols text-[16px]">{item.icon}</span>
                    <img src={item.hoverGif} className="hover-gif" alt={`${item.label} hover animation`} />
                    <span className="text-xs font-medium truncate font-sans">{item.label}</span>
                  </div>
                  <div
                    className="w-7 h-7 rounded-full bg-gray-100 dark:bg-muted flex items-center justify-center flex-shrink-0 text-current"
                  >
                    <span className="google-symbols text-[16px]">chevron_right</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="mx-4 border-b border-sidebar-border"></div>

            {notes.length > 0 ? (
              <div className="p-4 pt-2 flex flex-col gap-1">
                {notes.map((note) => {
                  const isSelected = selectedNoteId === note.id
                  return (
                    <div
                      key={note.id}
                      onClick={() => onNoteSelect(note.id)}
                      className={`flex items-center p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-muted transition cursor-pointer group ${
                        isSelected ? "bg-gray-100 dark:bg-muted" : ""
                      }`}
                    >
                      <div className="flex items-center gap-3 flex-1 overflow-hidden">
                        <span className={`google-symbols text-[24px] flex-shrink-0 select-none ${getNoteIconDetails(note.title, false).colorClass}`}>
                          {getNoteIconDetails(note.title, false).icon}
                        </span>
                        <div className="flex flex-col justify-center min-w-0">
                          <span className="text-sm font-medium text-gray-900 dark:text-foreground truncate block font-sans" title={note.title}>
                            {note.title}
                          </span>
                          <span className="text-xs text-gray-500 dark:text-muted-foreground mt-0.5">
                            {getNoteSubtitle(note)}
                          </span>
                        </div>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button
                            onClick={(e) => e.stopPropagation()}
                            className="w-8 h-8 rounded-full flex items-center justify-center text-gray-500 dark:text-muted-foreground hover:bg-gray-200 dark:hover:bg-accent opacity-0 group-hover:opacity-100 transition shrink-0 cursor-pointer outline-none bg-transparent border-none"
                          >
                            <span className="google-symbols text-[20px]">more_vert</span>
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent
                          align="end"
                          sideOffset={4}
                          className="w-[260px] bg-popover text-popover-foreground border border-border rounded-lg shadow-lg py-1.5 z-50 text-[13px] flex flex-col font-sans outline-none"
                        >
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation()
                              console.log("Convert to source:", note.title)
                            }}
                            className="flex items-center gap-2.5 px-3 py-2 hover:bg-accent hover:text-accent-foreground text-left w-full transition-colors outline-none cursor-pointer font-sans"
                          >
                            <span className="google-symbols text-[18px] text-muted-foreground">convert_to_text</span>
                            <span>Convert to source</span>
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation()
                              console.log("Convert all notes to source")
                            }}
                            className="flex items-center gap-2.5 px-3 py-2 hover:bg-accent hover:text-accent-foreground text-left w-full transition-colors outline-none cursor-pointer font-sans"
                          >
                            <span className="google-symbols text-[18px] text-muted-foreground">library_add</span>
                            <span>Convert all notes to source</span>
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation()
                              console.log("Export to Docs:", note.title)
                            }}
                            className="flex items-center gap-2.5 px-3 py-2 hover:bg-accent hover:text-accent-foreground text-left w-full transition-colors outline-none cursor-pointer font-sans"
                          >
                            <span className="google-symbols text-[18px] text-muted-foreground">description</span>
                            <span>Export to Docs</span>
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation()
                              console.log("Export to Sheets:", note.title)
                            }}
                            className="flex items-center gap-2.5 px-3 py-2 hover:bg-accent hover:text-accent-foreground text-left w-full transition-colors outline-none cursor-pointer font-sans"
                          >
                            <span className="google-symbols text-[18px] text-muted-foreground">table_view</span>
                            <span>Export to Sheets</span>
                          </DropdownMenuItem>
                          <div className="h-px bg-border my-1" />
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation()
                              setNoteToDeleteId(note.id)
                            }}
                            className="flex items-center gap-2.5 px-3 py-2 hover:bg-destructive/10 hover:text-destructive text-left w-full transition-colors outline-none cursor-pointer text-destructive font-sans"
                          >
                            <span className="google-symbols text-[18px]">delete</span>
                            <span>Delete</span>
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  )
                })}
              </div>
            ) : (
              /* Empty State */
              <div className="flex-1 flex flex-col items-center justify-center p-6 text-center pb-24">
                <div className="w-10 h-10 rounded-xl bg-sidebar-accent flex items-center justify-center mb-3">
                  <span className="google-symbols text-[24px] text-sidebar-foreground/60 icon-fill">
                    magic_button
                  </span>
                </div>
                <p className="text-[13px] font-semibold text-sidebar-foreground font-sans">
                  Studio output will be saved here.
                </p>
                <p className="text-[13px] text-sidebar-foreground/60 mt-1.5 px-4 leading-relaxed font-sans">
                  After adding sources, click to add Audio Overview, Study Guide, Mind Map, and more!
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Collapsed Sidebar Miniature Icons */}
      <TooltipProvider>
        <div className="collapsed-icons absolute top-16 left-0 right-0 flex flex-col items-center gap-4 p-2 overflow-y-auto max-h-[calc(100vh-200px)] z-20 pb-20 no-scrollbar">
          {STUDIO_ITEMS.map((item, index) => (
            <Tooltip key={index}>
              <TooltipTrigger asChild>
                <div
                  onClick={() => onChevronClick && onChevronClick(item.label)}
                  className="w-10 h-10 text-gray-700 dark:text-foreground rounded-full flex items-center justify-center cursor-pointer hover:bg-gray-100 dark:hover:bg-muted transition relative flex-shrink-0"
                >
                  <span className="google-symbols text-[20px]">{item.icon}</span>
                </div>
              </TooltipTrigger>
              <TooltipContent side="left">
                <span>{item.label}</span>
              </TooltipContent>
            </Tooltip>
          ))}
        </div>
      </TooltipProvider>

      {/* Floating Add Note button */}
      {selectedNoteId === null && (
        <div
          className="absolute bottom-6 left-0 right-0 flex justify-center pointer-events-none z-30"
          id="btnContainerAddNote"
        >
          <button
            id="btnTextAddNote"
            onClick={onAddNoteClick}
            className="bg-primary text-primary-foreground h-[40px] px-[20px] rounded-full flex items-center gap-2 text-[15px] font-medium shadow-lg hover:scale-105 transition-all pointer-events-auto cursor-pointer outline-none border-none font-sans"
            data-tooltip="Add note"
          >
            <span className="google-symbols text-[18px] flex-shrink-0">
              sticky_note_2
            </span>
            <span id="textAddNote">Add note</span>
          </button>
        </div>
      )}

      {/* Delete Confirmation Warning Dialog */}
      <ShadcnDialog open={noteToDeleteId !== null} onOpenChange={(open) => { if (!open) setNoteToDeleteId(null) }}>
        <ShadcnDialogContent
          showCloseButton={false}
          className="bg-popover text-popover-foreground rounded-[24px] border border-border shadow-2xl w-[90%] max-w-[360px] p-6 flex flex-col gap-4 outline-none z-50 font-sans"
        >
          <div className="flex flex-col gap-1.5">
            <h3 className="text-[17px] font-bold text-foreground tracking-tight">
              Delete note?
            </h3>
            <p className="text-[13px] text-muted-foreground leading-relaxed">
              This will permanently delete your note. You won't be able to recover it.
            </p>
          </div>
          <div className="flex items-center justify-end gap-2.5 mt-2">
            <button
              onClick={() => setNoteToDeleteId(null)}
              className="h-9 px-4 rounded-full text-[13px] font-semibold bg-muted hover:bg-accent text-foreground transition cursor-pointer outline-none border-none"
            >
              Cancel
            </button>
            <button
              onClick={() => {
                if (noteToDeleteId) {
                  onDeleteNote(noteToDeleteId)
                  setNoteToDeleteId(null)
                }
              }}
              className="h-9 px-4 rounded-full text-[13px] font-semibold bg-zinc-950 text-zinc-50 dark:bg-zinc-50 dark:text-zinc-950 hover:opacity-90 transition cursor-pointer outline-none border-none"
            >
              Delete
            </button>
          </div>
        </ShadcnDialogContent>
      </ShadcnDialog>
    </section>
  )
}
