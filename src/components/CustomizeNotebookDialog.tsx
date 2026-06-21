import { useState, useEffect } from "react"
import {
  Dialog as ShadcnDialog,
  DialogContent as ShadcnDialogContent,
  DialogClose as ShadcnDialogClose,
} from "@/components/ui/dialog"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"

interface CustomizeNotebookDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  notebookTitle: string
  onTitleChange: (title: string) => void
  notebookCover: string | null
  onCoverChange: (cover: string | null) => void
}

export function CustomizeNotebookDialog({
  open,
  onOpenChange,
  notebookTitle,
  onTitleChange,
  notebookCover,
  onCoverChange,
}: CustomizeNotebookDialogProps) {
  const [title, setTitle] = useState(notebookTitle)
  const [cover, setCover] = useState<string | null>(notebookCover)
  const [customSummaryEnabled, setCustomSummaryEnabled] = useState(false)
  const [summaryText, setSummaryText] = useState("")

  // Keep internal title state in sync with prop when dialog opens
  useEffect(() => {
    if (open) {
      setTitle(notebookTitle)
      setCover(notebookCover)
    }
  }, [open, notebookTitle, notebookCover])

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onloadend = () => {
        if (typeof reader.result === "string") {
          setCover(reader.result)
        }
      }
      reader.readAsDataURL(file)
    }
  }

  const handleDone = () => {
    onTitleChange(title)
    onCoverChange(cover)
    onOpenChange(false)
  }

  return (
    <ShadcnDialog open={open} onOpenChange={onOpenChange}>
      <ShadcnDialogContent
        showCloseButton={false}
        className="bg-popover text-popover-foreground rounded-[28px] border border-border shadow-2xl w-[92%] max-w-[640px] p-8 flex flex-col overflow-hidden sm:max-w-[640px] sm:rounded-[28px] gap-0 outline-none"
      >
        {/* Background Gradient Spotlight */}
        <div className="absolute top-0 left-0 w-[400px] h-[400px] bg-muted/20 rounded-full -translate-y-1/2 -translate-x-1/4 blur-[80px] pointer-events-none z-0" />

        {/* Header */}
        <div className="flex items-center justify-between pb-6 border-b border-border relative z-10">
          <h2 className="text-[18px] font-semibold text-foreground tracking-tight max-w-[85%] truncate">
            Customize the experience of "{notebookTitle}"
          </h2>
          <ShadcnDialogClose asChild>
            <button className="w-10 h-10 flex items-center justify-center rounded-full text-muted-foreground hover:text-foreground hover:bg-accent transition cursor-pointer outline-none flex-shrink-0">
              <span className="google-symbols text-[24px]">close</span>
            </button>
          </ShadcnDialogClose>
        </div>

        {/* Content Body */}
        <div className="relative z-10 flex flex-col gap-6 py-6 px-1 overflow-y-auto max-h-[420px] no-scrollbar">
          {/* Banner Graphic Area */}
          <div 
            className="w-full h-[180px] bg-muted/20 transition duration-300 rounded-2xl border border-border/40 relative flex items-center justify-center overflow-hidden flex-shrink-0 bg-cover bg-center"
            style={cover ? { backgroundImage: `url(${cover})` } : undefined}
          >
            {/* Dark Vignette Overlay */}
            {cover && (
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent pointer-events-none z-0" />
            )}
            
            {!cover && (
              <span className="google-symbols text-muted-foreground/15 text-[80px] select-none z-0">
                landscape
              </span>
            )}
            
            <input
              type="file"
              id="cover-upload-input"
              accept="image/*"
              className="hidden"
              onChange={handleImageUpload}
            />

            {/* Delete button (only visible when there is a cover image) */}
            {cover && (
              <button 
                onClick={() => setCover(null)}
                type="button"
                className="absolute top-4 left-4 bg-black/55 backdrop-blur-md border border-white/20 w-8 h-8 rounded-full flex items-center justify-center text-white hover:bg-black/70 cursor-pointer shadow-sm active:scale-[0.97] transition-all z-10"
              >
                <span className="google-symbols text-[18px]">delete</span>
              </button>
            )}
            
            <button 
              onClick={() => document.getElementById("cover-upload-input")?.click()}
              type="button"
              className={`absolute top-4 right-4 backdrop-blur-md border px-4 py-1.5 rounded-full flex items-center gap-1.5 text-xs font-semibold cursor-pointer shadow-sm active:scale-[0.97] transition-all z-10 ${
                cover
                  ? "bg-black/55 border-white/20 text-white hover:bg-black/70"
                  : "bg-background/90 border-border text-foreground hover:bg-accent"
              }`}
            >
              <span className="google-symbols text-[16px]">upload</span>
              Upload
            </button>
          </div>

          {/* Title Input Field */}
          <div className="flex flex-col gap-2 mt-2">
            <label className="text-[12px] font-semibold text-muted-foreground tracking-wide pl-1 select-none">
              Notebook title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full h-11 px-4 border border-border rounded-xl bg-card text-[15px] font-medium text-foreground outline-none focus:ring-1 focus:ring-ring focus:border-ring transition"
            />
          </div>

          {/* Summary Control Section */}
          <div className="flex flex-col gap-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3 flex-1">
                <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-foreground flex-shrink-0">
                  <span className="google-symbols text-[20px]">subject</span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-[15px] font-semibold text-foreground">
                    Set custom notebook summary
                  </span>
                  <p className="text-[13px] text-muted-foreground leading-relaxed">
                    By default, NotebookLM autogenerates a summary that refreshes every time you open the notebook. You can choose to override this by manually setting a custom summary.
                  </p>
                </div>
              </div>
              <div className="pt-1.5 flex-shrink-0">
                <Switch
                  checked={customSummaryEnabled}
                  onCheckedChange={setCustomSummaryEnabled}
                />
              </div>
            </div>

            {/* Custom Summary Textarea */}
            {customSummaryEnabled && (
              <div className="transition-all duration-200">
                <Textarea
                  value={summaryText}
                  onChange={(e) => setSummaryText(e.target.value)}
                  placeholder="Write your about message here..."
                  className="w-full text-[14px] leading-relaxed resize-y min-h-[100px] bg-card border border-border rounded-2xl p-4 focus-visible:ring-1 focus-visible:ring-ring focus-visible:border-ring shadow-xs"
                />
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end pt-4 border-t border-border relative z-10 flex-shrink-0">
          <button
            onClick={handleDone}
            className="h-[40px] px-6 rounded-full bg-muted hover:bg-accent text-foreground text-[14px] font-semibold transition active:scale-[0.98] cursor-pointer outline-none"
          >
            Done
          </button>
        </div>
      </ShadcnDialogContent>
    </ShadcnDialog>
  )
}
