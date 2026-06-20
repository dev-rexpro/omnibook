import { useState } from "react"
import {
  Dialog as ShadcnDialog,
  DialogContent as ShadcnDialogContent,
  DialogClose as ShadcnDialogClose,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu"
import { Textarea } from "@/components/ui/textarea"

interface CustomizeDataTableDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onGenerate?: (config: {
    language: string
    focusText: string
  }) => void
}

const LANGUAGES = [
  "English",
  "Spanish",
  "French",
  "German",
  "Indonesian",
  "Japanese",
  "Chinese",
]

export function CustomizeDataTableDialog({
  open,
  onOpenChange,
  onGenerate,
}: CustomizeDataTableDialogProps) {
  const [selectedLanguage, setSelectedLanguage] = useState("English")
  const [focusText, setFocusText] = useState("")

  const handleGenerate = () => {
    if (onGenerate) {
      onGenerate({
        language: selectedLanguage,
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
            <span className="material-symbols-outlined text-[24px] text-foreground">
              table_view
            </span>
            <h2 className="text-[20px] font-semibold text-foreground tracking-tight">
              Customize Data Table
            </h2>
          </div>
          <ShadcnDialogClose asChild>
            <button className="w-10 h-10 flex items-center justify-center rounded-full text-muted-foreground hover:text-foreground hover:bg-accent transition cursor-pointer outline-none">
              <span className="material-symbols-outlined text-[24px]">close</span>
            </button>
          </ShadcnDialogClose>
        </div>

        {/* Content Body */}
        <div className="relative z-10 flex flex-col gap-6 py-6 overflow-y-auto max-h-[400px] no-scrollbar">
          {/* Language Selection */}
          <div className="flex flex-col gap-3 max-w-[360px]">
            <label className="text-[13px] font-semibold text-muted-foreground uppercase tracking-wider">
              Choose language
            </label>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="h-[44px] px-4 border border-border bg-card text-foreground rounded-xl flex items-center justify-between text-[14px] font-medium hover:bg-accent/50 active:scale-[0.99] transition shadow-xs cursor-pointer outline-none w-full">
                  <span>{selectedLanguage}</span>
                  <span className="material-symbols-outlined text-[20px] text-muted-foreground">
                    keyboard_arrow_down
                  </span>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-[200px] max-h-[250px] overflow-y-auto bg-popover text-popover-foreground border border-border rounded-xl shadow-lg p-1 z-50 text-[14px] font-sans outline-none">
                {LANGUAGES.map((lang) => (
                  <DropdownMenuItem
                    key={lang}
                    onClick={() => setSelectedLanguage(lang)}
                    className={`flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer transition-colors outline-none ${
                      selectedLanguage === lang
                        ? "bg-primary/5 text-primary font-semibold hover:bg-primary/10"
                        : "hover:bg-accent hover:text-accent-foreground"
                    }`}
                  >
                    <span>{lang}</span>
                    {selectedLanguage === lang && (
                      <span className="material-symbols-outlined text-[16px] text-primary">
                        check
                      </span>
                    )}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Focus Guidance Section */}
          <div className="flex flex-col gap-3">
            <label className="text-[13px] font-semibold text-muted-foreground uppercase tracking-wider">
              Describe the data table you want to create
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
                  <li>Create a table with the major findings in these research papers, using columns: title, author, key result</li>
                  <li>Extract the most important quotes from my readings, grouping them by topic and author</li>
                  <li>List vacation destinations in Italy with city, best time to visit, attractions, and cost</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end pt-4 border-t border-border relative z-10">
          <button
            onClick={handleGenerate}
            className="h-[44px] px-6 rounded-full bg-primary text-primary-foreground text-[14px] font-semibold hover:opacity-95 transition-all shadow-md active:scale-[0.98] cursor-pointer outline-none"
          >
            Generate
          </button>
        </div>
      </ShadcnDialogContent>
    </ShadcnDialog>
  )
}
