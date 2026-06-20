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

interface CustomizeAudioOverviewDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onGenerate?: (config: {
    format: string
    language: string
    length: string
    focusText: string
  }) => void
}

const FORMAT_OPTIONS = [
  {
    id: "deep-dive",
    label: "Deep Dive",
    description: "A lively conversation between two hosts, unpacking and connecting topics in your sources",
  },
  {
    id: "brief",
    label: "Brief",
    description: "A bite-sized overview to help you grasp the core ideas from your sources quickly",
  },
  {
    id: "critique",
    label: "Critique",
    description: "An expert review of your sources, offering constructive feedback to help you improve your material",
  },
  {
    id: "debate",
    label: "Debate",
    description: "A thoughtful debate between two hosts, illuminating different perspectives on your sources",
  },
]

const LANGUAGES = [
  "English",
  "Spanish",
  "French",
  "German",
  "Indonesian",
  "Japanese",
  "Chinese",
]

export function CustomizeAudioOverviewDialog({
  open,
  onOpenChange,
  onGenerate,
}: CustomizeAudioOverviewDialogProps) {
  const [selectedFormat, setSelectedFormat] = useState("deep-dive")
  const [selectedLanguage, setSelectedLanguage] = useState("English")
  const [selectedLength, setSelectedLength] = useState("default")
  const [focusText, setFocusText] = useState("")

  const handleGenerate = () => {
    if (onGenerate) {
      onGenerate({
        format: selectedFormat,
        language: selectedLanguage,
        length: selectedLength,
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
              spatial_audio_off
            </span>
            <h2 className="text-[20px] font-semibold text-foreground tracking-tight">
              Customize Audio Overview
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
          {/* Format Section */}
          <div className="flex flex-col gap-3">
            <label className="text-[13px] font-semibold text-muted-foreground uppercase tracking-wider">
              Format
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {FORMAT_OPTIONS.map((option) => {
                const isActive = selectedFormat === option.id
                return (
                  <div
                    key={option.id}
                    onClick={() => setSelectedFormat(option.id)}
                    className={`border border-border rounded-2xl p-4 flex flex-col gap-2 cursor-pointer transition-all duration-200 relative group select-none min-h-[140px] ${
                      isActive
                        ? "bg-primary/5 dark:bg-primary/10 shadow-xs"
                        : "bg-card hover:bg-accent/50"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[15px] font-semibold text-foreground">
                        {option.label}
                      </span>
                      {isActive && (
                        <span className="material-symbols-outlined text-[18px] text-primary">
                          check
                        </span>
                      )}
                    </div>
                    <p className="text-[13px] leading-relaxed text-muted-foreground">
                      {option.description}
                    </p>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Custom Selectors - Language and Length */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
            {/* Language Selection */}
            <div className="flex flex-col gap-3">
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

            {/* Length Selection */}
            <div className="flex flex-col gap-3">
              <label className="text-[13px] font-semibold text-muted-foreground uppercase tracking-wider">
                Length
              </label>
              <div className="flex h-[44px] items-center border border-border rounded-xl p-1 bg-card w-full sm:w-auto self-start">
                {(["short", "default", "long"] as const).map((len) => {
                  const isActive = selectedLength === len
                  return (
                    <button
                      key={len}
                      onClick={() => setSelectedLength(len)}
                      className={`flex-1 sm:flex-initial h-full px-5 text-[13px] font-semibold capitalize rounded-lg transition-all cursor-pointer outline-none ${
                        isActive
                          ? "bg-primary text-primary-foreground shadow-sm"
                          : "text-muted-foreground hover:text-foreground hover:bg-accent/40"
                      }`}
                    >
                      {len}
                    </button>
                  )
                })}
              </div>
            </div>
          </div>

          {/* Focus Guidance Section */}
          <div className="flex flex-col gap-3">
            <label className="text-[13px] font-semibold text-muted-foreground uppercase tracking-wider">
              What should the AI hosts focus on in this episode?
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
                  <li>Focus on a specific source ("only cover the article about Italy")</li>
                  <li>Focus on a specific topic ("just discuss the novel's main character")</li>
                  <li>Target a specific audience ("explain to someone new to biology")</li>
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
