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

interface CustomizeInfographicDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onGenerate?: (config: {
    language: string
    orientation: string
    visualStyle: string
    detailLevel: string
    focusText: string
  }) => void
}

const VISUAL_STYLES = [
  { id: "instructional", label: "Instructional", icon: "draw" },
  { id: "bento-grid", label: "Bento Grid", icon: "grid_view" },
  { id: "bricks", label: "Bricks", icon: "extension" },
  { id: "scientific", label: "Scientific", icon: "science" },
  { id: "professional", label: "Professional", icon: "business_center" },
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

export function CustomizeInfographicDialog({
  open,
  onOpenChange,
  onGenerate,
}: CustomizeInfographicDialogProps) {
  const [selectedLanguage, setSelectedLanguage] = useState("English")
  const [selectedOrientation, setSelectedOrientation] = useState("Landscape")
  const [selectedStyle, setSelectedStyle] = useState("instructional")
  const [selectedDetail, setSelectedDetail] = useState("Standard")
  const [focusText, setFocusText] = useState("")

  const handleGenerate = () => {
    if (onGenerate) {
      onGenerate({
        language: selectedLanguage,
        orientation: selectedOrientation,
        visualStyle: selectedStyle,
        detailLevel: selectedDetail,
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
              stacked_bar_chart
            </span>
            <h2 className="text-[20px] font-semibold text-foreground tracking-tight">
              Customize Infographic
            </h2>
          </div>
          <ShadcnDialogClose asChild>
            <button className="w-10 h-10 flex items-center justify-center rounded-full text-muted-foreground hover:text-foreground hover:bg-accent transition cursor-pointer outline-none">
              <span className="google-symbols text-[24px]">close</span>
            </button>
          </ShadcnDialogClose>
        </div>

        {/* Content Body */}
        <div className="relative z-10 flex flex-col gap-6 py-6 overflow-y-auto max-h-[400px] no-scrollbar">
          {/* Custom Selectors - Language and Orientation */}
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
                    <span className="google-symbols text-[20px] text-muted-foreground">
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
                        <span className="google-symbols text-[16px] text-primary">
                          check
                        </span>
                      )}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* Orientation Selection */}
            <div className="flex flex-col gap-3">
              <label className="text-[13px] font-semibold text-muted-foreground uppercase tracking-wider">
                Choose orientation
              </label>
              <div className="flex h-[44px] items-center border border-border rounded-xl p-1 bg-card w-full sm:w-auto self-start">
                {(["Landscape", "Portrait", "Square"] as const).map((orient) => {
                  const isActive = selectedOrientation === orient
                  return (
                    <button
                      key={orient}
                      onClick={() => setSelectedOrientation(orient)}
                      className={`flex-1 sm:flex-initial h-full px-5 text-[13px] font-semibold capitalize rounded-lg transition-all cursor-pointer outline-none ${
                        isActive
                          ? "bg-primary text-primary-foreground shadow-sm"
                          : "text-muted-foreground hover:text-foreground hover:bg-accent/40"
                      }`}
                    >
                      {orient}
                    </button>
                  )
                })}
              </div>
            </div>
          </div>

          {/* Visual Style Carousel Section */}
          <div className="flex flex-col gap-3">
            <label className="text-[13px] font-semibold text-muted-foreground uppercase tracking-wider">
              Choose visual style
            </label>
            <div className="flex flex-row overflow-x-auto gap-3 pb-2 w-full no-scrollbar">
              {VISUAL_STYLES.map((style) => {
                const isActive = selectedStyle === style.id
                return (
                  <div
                    key={style.id}
                    onClick={() => setSelectedStyle(style.id)}
                    className={`border border-border rounded-2xl p-2.5 flex flex-col gap-2.5 cursor-pointer transition-all duration-200 select-none w-[120px] min-w-[120px] h-[130px] justify-between ${
                      isActive
                        ? "bg-primary/5 dark:bg-primary/10 shadow-xs"
                        : "bg-card hover:bg-accent/50"
                    }`}
                  >
                    <div className="w-full h-[70px] bg-muted/40 rounded-xl flex items-center justify-center border border-border/40 relative">
                      <span className={`google-symbols text-[30px] transition-colors ${
                        isActive ? "text-primary" : "text-muted-foreground/60"
                      }`}>
                        {style.icon}
                      </span>
                      {isActive && (
                        <div className="absolute top-1.5 right-1.5 w-4 h-4 bg-primary rounded-full flex items-center justify-center shadow-xs">
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="4.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className="w-2.5 h-2.5 text-primary-foreground"
                          >
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                        </div>
                      )}
                    </div>
                    <span className="text-[13px] font-semibold text-center text-foreground block truncate">
                      {style.label}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Level of Detail Selection */}
          <div className="flex flex-col gap-3">
            <label className="text-[13px] font-semibold text-muted-foreground uppercase tracking-wider">
              Level of detail
            </label>
            <div className="flex h-[44px] items-center border border-border rounded-xl p-1 bg-card w-full sm:w-auto self-start">
              {(["Concise", "Standard", "Detailed"] as const).map((lvl) => {
                const isActive = selectedDetail === lvl
                return (
                  <button
                    key={lvl}
                    onClick={() => setSelectedDetail(lvl)}
                    className={`flex h-full px-5 items-center justify-center text-[13px] font-semibold capitalize rounded-lg transition-all cursor-pointer outline-none ${
                      isActive
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground hover:bg-accent/40"
                    }`}
                  >
                    <span>{lvl}</span>
                    {lvl === "Detailed" && (
                      <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold ml-1.5 uppercase tracking-wide ${
                        isActive ? "bg-primary-foreground/20 text-primary-foreground" : "bg-primary/10 text-primary"
                      }`}>
                        BETA
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Focus Guidance Section */}
          <div className="flex flex-col gap-3">
            <label className="text-[13px] font-semibold text-muted-foreground uppercase tracking-wider">
              Describe the infographic you want to create
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
                  <li>Guide the style, color, or focus: "Use a blue color theme and highlight the 3 key stats."</li>
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
