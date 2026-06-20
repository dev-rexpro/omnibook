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

interface Note {
  id: string
  title: string
  content: string
  createdAt: string
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
  { icon: "spatial_audio_off", label: "Audio Overview" },
  { icon: "tablet", label: "Slide Deck" },
  { icon: "subscriptions", label: "Video Overview" },
  { icon: "flowchart", label: "Mind Map" },
  { icon: "analytics", label: "Reports" },
  { icon: "cards_star", label: "Flashcards" },
  { icon: "quiz", label: "Quiz" },
  { icon: "stacked_bar_chart", label: "Infographic" },
  { icon: "table_view", label: "Data Table" },
]

const MOBILE_COLORS = [
  { bg: "bg-indigo-50/80 dark:bg-indigo-950/20", border: "border-indigo-100 dark:border-indigo-900/30", text: "text-indigo-600 dark:text-indigo-400" }, // Audio Overview
  { bg: "bg-amber-50/80 dark:bg-amber-950/20", border: "border-amber-100 dark:border-amber-900/30", text: "text-amber-600 dark:text-amber-400" }, // Slide Deck
  { bg: "bg-emerald-50/80 dark:bg-emerald-950/20", border: "border-emerald-100 dark:border-emerald-900/30", text: "text-emerald-600 dark:text-emerald-400" }, // Video Overview
  { bg: "bg-fuchsia-50/80 dark:bg-fuchsia-950/20", border: "border-fuchsia-100 dark:border-fuchsia-900/30", text: "text-fuchsia-600 dark:text-fuchsia-400" }, // Mind Map
  { bg: "bg-stone-50/80 dark:bg-stone-900/20", border: "border-stone-200 dark:border-stone-800/30", text: "text-stone-600 dark:text-stone-400" }, // Reports
  { bg: "bg-orange-50/80 dark:bg-orange-950/20", border: "border-orange-100 dark:border-orange-900/30", text: "text-orange-600 dark:text-orange-400" }, // Flashcards
  { bg: "bg-cyan-50/80 dark:bg-cyan-950/20", border: "border-cyan-100 dark:border-cyan-900/30", text: "text-cyan-600 dark:text-cyan-400" }, // Quiz
  { bg: "bg-pink-50/80 dark:bg-pink-950/20", border: "border-pink-100 dark:border-pink-900/30", text: "text-pink-600 dark:text-pink-400" }, // Infographic
  { bg: "bg-sky-50/80 dark:bg-sky-950/20", border: "border-sky-100 dark:border-sky-900/30", text: "text-sky-600 dark:text-sky-400" }, // Data Table
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
                <span className="material-symbols-outlined text-[14px] text-muted-foreground select-none">
                  chevron_right
                </span>
                <span className="text-foreground font-semibold font-sans">Note</span>
              </div>
              <button
                onClick={() => onNoteSelect(null)}
                className="w-8 h-8 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent rounded-full transition cursor-pointer outline-none border-none bg-transparent"
              >
                <span className="material-symbols-outlined text-[16px]">collapse_content</span>
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
                  <span className="material-symbols-outlined text-[18px]">delete</span>
                </button>
              </div>
              <div className="text-[13px] leading-relaxed text-foreground/90 whitespace-pre-wrap font-sans">
                {activeNote.content}
              </div>
            </div>

            {/* Footer */}
            <div className="absolute bottom-0 left-0 right-0 border-t border-border px-4 h-14 flex items-center justify-between bg-background z-20">
              <div className="flex items-center gap-1 text-[11px] text-muted-foreground font-sans">
                <span className="material-symbols-outlined text-[16px] text-amber-500 font-semibold select-none animate-pulse">
                  info
                </span>
                <span>Saved responses are view only</span>
              </div>
              <button
                onClick={() => console.log("Convert to source:", activeNote.title)}
                className="bg-card border border-border h-9 px-4 rounded-full flex items-center justify-center gap-1 text-[11px] font-medium text-foreground hover:bg-accent transition shadow-sm cursor-pointer outline-none flex-shrink-0 font-sans"
              >
                <span className="material-symbols-outlined text-[14px]">convert_to_text</span>
                Convert to source
              </button>
            </div>
          </div>
        ) : (
          /* Main studio cards list and notes list */
          <div className="flex-1 flex flex-col overflow-hidden relative">
            <div className="flex-1 overflow-y-auto flex flex-col pb-24">
              {/* Colored items grid */}
              <div className="grid grid-cols-2 gap-2.5 p-4 flex-shrink-0">
                {STUDIO_ITEMS.map((item, index) => {
                  const colors = MOBILE_COLORS[index] || { bg: "bg-muted", border: "border-border", text: "text-foreground" }
                  return (
                    <div
                      key={index}
                      onClick={() => {
                        if (onChevronClick) onChevronClick(item.label)
                      }}
                      className={`border ${colors.border} ${colors.bg} rounded-xl p-3 h-[64px] flex justify-between items-center cursor-pointer transition shadow-xs group/item`}
                    >
                      <div className="flex flex-col gap-1 min-w-0 flex-1">
                        <span className={`material-symbols-outlined text-[16px] ${colors.text}`}>
                          {item.icon}
                        </span>
                        <span className={`text-[12px] font-semibold truncate font-sans ${colors.text}`} title={item.label}>
                          {item.label}
                        </span>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          if (onChevronClick) onChevronClick(item.label)
                        }}
                        className="w-8 h-8 rounded-full flex items-center justify-center bg-transparent hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer outline-none border-none"
                      >
                        <span className={`material-symbols-outlined text-[16px] ${colors.text}`}>
                          chevron_right
                        </span>
                      </button>
                    </div>
                  )
                })}
              </div>

              {/* Notes list or Empty state */}
              {notes.length > 0 ? (
                <div className="flex-1 flex flex-col gap-3 px-4 pb-20">
                  <div className="text-[11px] font-bold text-muted-foreground/70 px-1 uppercase tracking-wider select-none font-sans">
                    Notes
                  </div>
                  <div className="flex flex-col gap-2">
                    {notes.map((note) => (
                      <div
                        key={note.id}
                        onClick={() => onNoteSelect(note.id)}
                        className="flex items-start justify-between p-4 rounded-2xl cursor-pointer text-foreground bg-card border border-border/50 hover:bg-accent transition-all duration-200"
                      >
                        <div className="flex items-start gap-3 min-w-0 flex-1">
                          <span className="material-symbols-outlined text-[20px] text-foreground/75 mt-0.5">
                            description
                          </span>
                          <div className="flex flex-col gap-0.5 min-w-0">
                            <span className="text-[14px] font-semibold truncate leading-tight font-sans">
                              {note.title}
                            </span>
                            <span className="text-[11px] text-muted-foreground font-medium font-sans">
                              {note.createdAt}
                            </span>
                          </div>
                        </div>
                        
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button
                              onClick={(e) => e.stopPropagation()}
                              className="w-7 h-7 flex items-center justify-center text-muted-foreground hover:text-foreground rounded-full hover:bg-muted transition cursor-pointer outline-none border-none bg-transparent"
                            >
                              <span className="material-symbols-outlined text-[18px]">more_vert</span>
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent
                            align="end"
                            sideOffset={4}
                            className="w-[200px] bg-popover text-popover-foreground border border-border rounded-lg shadow-lg py-1.5 z-50 text-[13px] flex flex-col font-sans outline-none"
                          >
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation()
                                console.log("Convert to source:", note.title)
                              }}
                              className="flex items-center gap-2 px-3 py-1.5 hover:bg-accent hover:text-accent-foreground text-left w-full transition-colors outline-none cursor-pointer font-sans"
                            >
                              <span>Convert to source</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation()
                                setNoteToDeleteId(note.id)
                              }}
                              className="flex items-center gap-2 px-3 py-1.5 hover:bg-destructive/10 hover:text-destructive text-left w-full transition-colors outline-none cursor-pointer text-destructive font-sans"
                            >
                              <span>Delete</span>
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                /* Empty state */
                <div className="flex-1 flex flex-col items-center justify-center p-6 text-center pb-24 mt-4">
                  <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center mb-3">
                    <span className="material-symbols-outlined text-[24px] text-muted-foreground/60 icon-fill">
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
            <div className="absolute bottom-6 left-0 right-0 flex justify-center pointer-events-none z-30">
              <button
                onClick={onAddNoteClick}
                className="bg-zinc-950 text-zinc-50 dark:bg-zinc-50 dark:text-zinc-950 h-10 px-5 rounded-full flex items-center gap-2 text-[14px] font-semibold shadow-lg hover:scale-105 transition-all pointer-events-auto cursor-pointer outline-none border-none font-sans"
              >
                <span className="material-symbols-outlined text-[18px]">edit_note</span>
                <span>Add note</span>
              </button>
            </div>
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
      id="sidebarStudio"
      className={`sidebar flex-shrink-0 bg-sidebar text-sidebar-foreground border border-sidebar-border rounded-2xl flex flex-col relative shadow-sm overflow-hidden transition-all duration-300 ${
        isCollapsed ? "collapsed" : ""
      } ${
        selectedNoteId !== null ? "w-[480px] lg:w-[500px]" : "w-[360px] lg:w-[370px]"
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
              <span className="material-symbols-outlined text-[16px] text-muted-foreground select-none">
                chevron_right
              </span>
              <span className="text-foreground font-semibold font-sans">Note</span>
            </div>
            <button
              onClick={() => onNoteSelect(null)}
              className="w-8 h-8 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-sidebar-accent rounded-full transition cursor-pointer outline-none border-none bg-transparent"
              title="Close note"
            >
              <span className="material-symbols-outlined text-[18px]">collapse_content</span>
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
                <span className="material-symbols-outlined text-[20px]">delete</span>
              </button>
            </div>
            <div className="text-[13px] leading-relaxed text-foreground/90 whitespace-pre-wrap font-sans">
              {activeNote.content}
            </div>
          </div>

          {/* Footer Area inside sidebar - side-by-side elements in a single row */}
          <div className="absolute bottom-0 left-0 right-0 border-t border-sidebar-border px-4 h-14 flex items-center justify-between bg-sidebar z-20">
            <div className="flex items-center gap-1.5 text-[12px] text-muted-foreground font-sans">
              <span className="material-symbols-outlined text-[18px] text-amber-500 font-semibold select-none">
                info
              </span>
              <span>Saved responses are view only</span>
            </div>
            <button
              onClick={() => console.log("Convert to source:", activeNote.title)}
              className="bg-card border border-border h-9 px-4 rounded-full flex items-center justify-center gap-1.5 text-[12px] font-medium text-foreground hover:bg-accent transition shadow-sm cursor-pointer outline-none flex-shrink-0 font-sans"
            >
              <span className="material-symbols-outlined text-[16px]">convert_to_text</span>
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
              <span className="material-symbols-outlined text-[20px]">dock_to_left</span>
            </button>
          </div>

          {/* Expanded Scroll Body */}
          <div className="sidebar-content w-[360px] lg:w-[370px] flex-1 overflow-y-auto flex flex-col pb-24">
            <div className="grid grid-cols-2 gap-2.5 p-4 flex-shrink-0">
              {STUDIO_ITEMS.map((item, index) => (
                <div
                  key={index}
                  onClick={() => {
                    if (onChevronClick) onChevronClick(item.label)
                  }}
                  className="border border-zinc-150 hover:bg-zinc-50 text-zinc-800 rounded-xl p-3 h-[64px] flex justify-between items-center cursor-pointer transition shadow-xs group/item"
                >
                  <div className="flex flex-col gap-1 min-w-0 flex-1">
                    <span className="material-symbols-outlined text-[16px] text-zinc-700">
                      {item.icon}
                    </span>
                    <span className="text-[13px] font-semibold text-zinc-800 truncate font-sans" title={item.label}>
                      {item.label}
                    </span>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      if (onChevronClick) onChevronClick(item.label)
                    }}
                    className="w-8 h-8 rounded-full flex items-center justify-center bg-transparent hover:bg-zinc-200/50 dark:hover:bg-zinc-800/50 transition-colors opacity-0 group-hover/item:opacity-100 cursor-pointer outline-none border-none"
                  >
                    <span className="material-symbols-outlined text-[16px] text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100">
                      chevron_right
                    </span>
                  </button>
                </div>
              ))}
            </div>

            {notes.length > 0 ? (
              <div className="flex-1 flex flex-col gap-3 px-4 pb-20">
                <div className="text-[11px] font-bold text-sidebar-foreground/50 px-1 uppercase tracking-wider select-none font-sans">
                  Notes
                </div>
                <div className="flex flex-col gap-2">
                  {notes.map((note) => (
                    <div
                      key={note.id}
                      onClick={() => onNoteSelect(note.id)}
                      className={`flex items-start justify-between p-4 rounded-2xl cursor-pointer text-foreground transition-all duration-200 select-none border border-transparent ${
                        selectedNoteId === note.id
                          ? "bg-zinc-100 dark:bg-zinc-800"
                          : "bg-transparent hover:bg-zinc-100 dark:hover:bg-zinc-800"
                      }`}
                    >
                      <div className="flex items-start gap-3 min-w-0 flex-1">
                        <span className="material-symbols-outlined text-[20px] text-foreground/75 mt-0.5">
                          description
                        </span>
                        <div className="flex flex-col gap-0.5 min-w-0">
                          <span className="text-[14px] font-semibold truncate leading-tight font-sans">
                            {note.title}
                          </span>
                          <span className="text-[12px] text-muted-foreground font-medium font-sans">
                            {note.createdAt}
                          </span>
                        </div>
                      </div>
                      
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button
                            onClick={(e) => e.stopPropagation()}
                            className="w-7 h-7 flex items-center justify-center text-muted-foreground hover:text-foreground rounded-full hover:bg-accent/60 transition cursor-pointer outline-none border-none bg-transparent animate-none"
                          >
                            <span className="material-symbols-outlined text-[18px]">more_vert</span>
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
                            <span className="material-symbols-outlined text-[18px] text-muted-foreground">convert_to_text</span>
                            <span>Convert to source</span>
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation()
                              console.log("Convert all notes to source")
                            }}
                            className="flex items-center gap-2.5 px-3 py-2 hover:bg-accent hover:text-accent-foreground text-left w-full transition-colors outline-none cursor-pointer font-sans"
                          >
                            <span className="material-symbols-outlined text-[18px] text-muted-foreground">library_add</span>
                            <span>Convert all notes to source</span>
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation()
                              console.log("Export to Docs:", note.title)
                            }}
                            className="flex items-center gap-2.5 px-3 py-2 hover:bg-accent hover:text-accent-foreground text-left w-full transition-colors outline-none cursor-pointer font-sans"
                          >
                            <span className="material-symbols-outlined text-[18px] text-muted-foreground">description</span>
                            <span>Export to Docs</span>
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation()
                              console.log("Export to Sheets:", note.title)
                            }}
                            className="flex items-center gap-2.5 px-3 py-2 hover:bg-accent hover:text-accent-foreground text-left w-full transition-colors outline-none cursor-pointer font-sans"
                          >
                            <span className="material-symbols-outlined text-[18px] text-muted-foreground">table_view</span>
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
                            <span className="material-symbols-outlined text-[18px]">delete</span>
                            <span>Delete</span>
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              /* Empty State */
              <div className="flex-1 flex flex-col items-center justify-center p-6 text-center pb-24">
                <div className="w-10 h-10 rounded-xl bg-sidebar-accent flex items-center justify-center mb-3">
                  <span className="material-symbols-outlined text-[24px] text-sidebar-foreground/60 icon-fill">
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
      <div className="collapsed-icons absolute top-16 left-0 right-0 flex flex-col items-center gap-4 p-2 overflow-y-auto max-h-[calc(100vh-200px)] z-20 pb-20 no-scrollbar">
        {STUDIO_ITEMS.map((item, index) => (
          <div
            key={index}
            className="w-10 h-10 text-zinc-600 rounded-lg flex items-center justify-center cursor-pointer hover:bg-zinc-100 hover:text-zinc-900 transition relative group/tip flex-shrink-0"
          >
            <span className="material-symbols-outlined text-[18px]">{item.icon}</span>
            <div className="absolute right-12 bg-zinc-900 text-white text-[13px] rounded px-2 py-1 whitespace-nowrap opacity-0 group-hover/tip:opacity-100 transition pointer-events-none z-30 font-sans">
              {item.label}
            </div>
          </div>
        ))}
      </div>

      {/* Floating Add Note button: ALWAYS floats at the bottom in collapsed/expanded main state */}
      {!isCollapsed && selectedNoteId === null && (
        <div
          className="absolute bottom-6 left-0 right-0 flex justify-center pointer-events-none z-30"
          id="btnContainerAddNote"
        >
          <button
            id="btnTextAddNote"
            onClick={onAddNoteClick}
            className="bg-primary text-primary-foreground h-[40px] px-[20px] rounded-full flex items-center gap-2 text-[15px] font-medium shadow-lg hover:scale-105 transition-all pointer-events-auto cursor-pointer outline-none border-none font-sans"
          >
            <span className="material-symbols-outlined text-[18px] flex-shrink-0">
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
