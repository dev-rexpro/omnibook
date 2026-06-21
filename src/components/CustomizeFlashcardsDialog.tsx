import { useState } from "react"
import {
  Dialog as ShadcnDialog,
  DialogContent as ShadcnDialogContent,
  DialogClose as ShadcnDialogClose,
} from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"

interface CustomizeFlashcardsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onGenerate?: (config: {
    cardsCount: string
    difficulty: string
    focusText: string
  }) => void
}

export function CustomizeFlashcardsDialog({
  open,
  onOpenChange,
  onGenerate,
}: CustomizeFlashcardsDialogProps) {
  const [selectedCardsCount, setSelectedCardsCount] = useState("Standard")
  const [selectedDifficulty, setSelectedDifficulty] = useState("Medium")
  const [focusText, setFocusText] = useState("")

  const handleGenerate = () => {
    if (onGenerate) {
      onGenerate({
        cardsCount: selectedCardsCount,
        difficulty: selectedDifficulty,
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
              cards_star
            </span>
            <h2 className="text-[20px] font-semibold text-foreground tracking-tight animate-none">
              Customize Flashcards
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
          {/* Selectors Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
            {/* Number of Cards */}
            <div className="flex flex-col gap-3">
              <label className="text-[13px] font-semibold text-muted-foreground uppercase tracking-wider">
                Number of Cards
              </label>
              <div className="flex h-[44px] items-center border border-border rounded-xl p-1 bg-card w-full sm:w-auto self-start">
                {["Fewer", "Standard", "More"].map((option) => {
                  const isActive = selectedCardsCount === option
                  return (
                    <button
                      key={option}
                      onClick={() => setSelectedCardsCount(option)}
                      className={`flex h-full px-5 items-center justify-center text-[13px] font-semibold capitalize rounded-lg transition-all cursor-pointer outline-none ${
                        isActive
                          ? "bg-primary text-primary-foreground shadow-sm"
                          : "text-muted-foreground hover:text-foreground hover:bg-accent/40"
                      }`}
                    >
                      {option}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Level of Difficulty */}
            <div className="flex flex-col gap-3">
              <label className="text-[13px] font-semibold text-muted-foreground uppercase tracking-wider">
                Level of Difficulty
              </label>
              <div className="flex h-[44px] items-center border border-border rounded-xl p-1 bg-card w-full sm:w-auto self-start">
                {["Easy", "Medium", "Hard"].map((option) => {
                  const isActive = selectedDifficulty === option
                  return (
                    <button
                      key={option}
                      onClick={() => setSelectedDifficulty(option)}
                      className={`flex h-full px-5 items-center justify-center text-[13px] font-semibold capitalize rounded-lg transition-all cursor-pointer outline-none ${
                        isActive
                          ? "bg-primary text-primary-foreground shadow-sm"
                          : "text-muted-foreground hover:text-foreground hover:bg-accent/40"
                      }`}
                    >
                      {option}
                    </button>
                  )
                })}
              </div>
            </div>
          </div>

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
                  <li>The flashcards must be restricted to a specific source (e.g. "the article about Italy")</li>
                  <li>The flashcards must focus on a specific topic like "Newton’s second law"</li>
                  <li>The card fronts must be short (1-5 words) for memorization</li>
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
