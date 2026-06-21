import { useState } from "react"
import {
  Dialog as ShadcnDialog,
  DialogContent as ShadcnDialogContent,
  DialogClose as ShadcnDialogClose,
} from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"

interface CustomizeMindMapDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onGenerate?: (config: {
    focusText: string
  }) => void
}

export function CustomizeMindMapDialog({
  open,
  onOpenChange,
  onGenerate,
}: CustomizeMindMapDialogProps) {
  const [focusText, setFocusText] = useState("")

  const handleGenerate = () => {
    if (onGenerate) {
      onGenerate({
        focusText,
      })
    }
    onOpenChange(false)
  }

  return (
    <ShadcnDialog open={open} onOpenChange={onOpenChange}>
      <ShadcnDialogContent
        showCloseButton={false}
        className="bg-popover text-popover-foreground rounded-[28px] border border-border shadow-2xl w-[92%] max-w-[840px] p-8 flex flex-col overflow-hidden sm:max-w-[840px] sm:rounded-[28px] gap-0 outline-none"
      >
        {/* Background Gradient Spotlight */}
        <div className="absolute top-0 left-0 w-[400px] h-[400px] bg-muted/20 rounded-full -translate-y-1/2 -translate-x-1/4 blur-[80px] pointer-events-none z-0" />

        {/* Header */}
        <div className="flex items-center justify-between pb-6 border-b border-border relative z-10">
          <div className="flex items-center gap-2">
            <span className="google-symbols text-[24px] text-foreground">
              flowchart
            </span>
            <h2 className="text-[20px] font-semibold text-foreground tracking-tight animate-none">
              Customize Mind Map
            </h2>
          </div>
          <ShadcnDialogClose asChild>
            <button className="w-10 h-10 flex items-center justify-center rounded-full text-muted-foreground hover:text-foreground hover:bg-accent transition cursor-pointer outline-none border-none bg-transparent">
              <span className="google-symbols text-[24px]">close</span>
            </button>
          </ShadcnDialogClose>
        </div>

        {/* Content Body */}
        <div className="relative z-10 flex flex-col gap-6 py-6 overflow-y-auto max-h-[400px] no-scrollbar">
          {/* Focus Guidance Section */}
          <div className="flex flex-col gap-3">
            <label className="text-[13px] font-semibold text-muted-foreground uppercase tracking-wider">
              What should the topic be?
            </label>
            <div className="border border-border rounded-2xl bg-card focus-within:ring-1 focus-within:ring-ring focus-within:border-ring transition flex flex-col overflow-hidden">
              <Textarea
                value={focusText}
                onChange={(e) => setFocusText(e.target.value)}
                placeholder="Type your instructions here..."
                className="w-full bg-transparent border-0 outline-none resize-y text-[14px] leading-relaxed text-foreground placeholder:text-muted-foreground min-h-[80px] p-4 focus-visible:ring-0 focus-visible:border-none focus-visible:ring-offset-0 shadow-none rounded-none focus:outline-none"
              />
              <div className="text-[12px] leading-relaxed text-muted-foreground border-t border-border/50 p-4 pt-3 bg-muted/5">
                <span className="font-semibold block mb-1">Things to try</span>
                <ul className="list-disc pl-4 space-y-1.5 font-medium">
                  <li>The mind map must be restricted to a specific source (e.g. "the article about Italy")</li>
                  <li>The mind map must focus solely on the key concepts of quantum physics</li>
                  <li>Create a mind map to help me study the causes of World War I</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end pt-4 border-t border-border relative z-10">
          <button
            onClick={handleGenerate}
            className="h-[44px] px-6 rounded-full bg-primary text-primary-foreground text-[14px] font-semibold hover:opacity-95 transition-all shadow-md active:scale-[0.98] cursor-pointer outline-none border-none"
          >
            Generate
          </button>
        </div>
      </ShadcnDialogContent>
    </ShadcnDialog>
  )
}
