import {
  Dialog as ShadcnDialog,
  DialogContent as ShadcnDialogContent,
} from "@/components/ui/dialog"
import { useState } from "react"

interface Note {
  id: string
  title: string
  content: string
  createdAt: string
}

interface NotePanelProps {
  note: Note
  onBackToChat: () => void
  onDelete: () => void
}

export function NotePanel({ note, onBackToChat, onDelete }: NotePanelProps) {
  const [isFullscreen, setIsFullscreen] = useState(false)

  const contentElement = (
    <div className="flex-1 flex flex-col overflow-hidden bg-card">
      {/* Panel Header */}
      <div className="h-12 border-b border-border flex items-center justify-between px-4 flex-shrink-0 bg-card">
        {/* Breadcrumbs */}
        <div className="flex items-center gap-1 text-[14px]">
          <span
            onClick={onBackToChat}
            className="text-muted-foreground hover:text-foreground cursor-pointer hover:underline transition-colors font-medium"
          >
            Studio
          </span>
          <span className="material-symbols-outlined text-[16px] text-muted-foreground select-none">
            chevron_right
          </span>
          <span className="text-foreground font-semibold">Note</span>
        </div>

        {/* Top-Right Expand Button */}
        <button
          onClick={() => setIsFullscreen(!isFullscreen)}
          className="w-8 h-8 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent rounded-full transition cursor-pointer outline-none"
        >
          <span className="material-symbols-outlined text-[20px]">
            {isFullscreen ? "close_fullscreen" : "open_in_full"}
          </span>
        </button>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-6 md:p-8 flex flex-col relative bg-background/20">
        <div className="w-full max-w-[720px] mx-auto flex flex-col flex-1">
          {/* Note Title & Trash Icon */}
          <div className="flex items-start justify-between gap-4 mb-6">
            <h1 className="text-[26px] font-semibold tracking-tight text-foreground leading-tight">
              {note.title}
            </h1>
            <button
              onClick={onDelete}
              className="w-9 h-9 flex items-center justify-center rounded-full text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition cursor-pointer outline-none"
              title="Delete note"
            >
              <span className="material-symbols-outlined text-[22px]">delete</span>
            </button>
          </div>

          {/* Note Body Content */}
          <div className="text-[15px] leading-relaxed text-foreground/90 whitespace-pre-wrap flex-1">
            {note.content}
          </div>
        </div>
      </div>

      {/* Bottom Alert / Action Footer */}
      <div className="h-14 border-t border-border px-6 flex items-center justify-between bg-card flex-shrink-0">
        <div className="flex items-center gap-2 text-[13px] text-muted-foreground">
          <span className="material-symbols-outlined text-[20px] text-amber-500 font-semibold select-none">
            info
          </span>
          <span>Saved responses are view only</span>
        </div>
        <button
          onClick={() => {
            console.log("Convert to source:", note.title)
          }}
          className="bg-background border border-border h-9 px-4 rounded-full flex items-center gap-1.5 text-[13px] font-medium text-foreground hover:bg-accent transition shadow-sm cursor-pointer outline-none"
        >
          <span className="material-symbols-outlined text-[16px]">change_circle</span>
          Convert to source
        </button>
      </div>
    </div>
  )

  if (isFullscreen) {
    return (
      <ShadcnDialog open={isFullscreen} onOpenChange={setIsFullscreen}>
        <ShadcnDialogContent
          showCloseButton={false}
          className="bg-card w-screen h-screen max-w-none p-0 flex flex-col overflow-hidden rounded-none border-none outline-none z-50"
        >
          {contentElement}
        </ShadcnDialogContent>
      </ShadcnDialog>
    )
  }

  return (
    <section className="flex-1 bg-card border border-border rounded-2xl flex flex-col overflow-hidden relative shadow-sm min-w-[400px]">
      {contentElement}
    </section>
  )
}
