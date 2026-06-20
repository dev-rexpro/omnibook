import { useState, useRef, useEffect } from "react"
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu"

interface Message {
  id: string
  sender: "user" | "ai"
  text: string
  type?: string
  suggestedPrompts?: string[]
}

interface ChatPanelProps {
  notebookTitle: string
  notebookCover?: string | null
  onCustomizeClick?: () => void
  isMobile?: boolean
  messages: Message[]
  onSendMessage?: (text: string) => void
  onPromptClick?: (text: string) => void
  onDeleteChatHistory?: () => void
  onSaveToNote?: (query: string, response: string) => void
}

export function ChatPanel({
  notebookTitle,
  notebookCover = null,
  onCustomizeClick,
  isMobile = false,
  messages,
  onSendMessage,
  onPromptClick,
  onDeleteChatHistory,
  onSaveToNote,
}: ChatPanelProps) {
  const currentDate = new Date().toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })

  const [inputValue, setInputValue] = useState("")
  const chatEndRef = useRef<HTMLDivElement>(null)

  // Scroll to bottom on message list update
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  const [chatStartedAt, setChatStartedAt] = useState<string | null>(null)

  // Track the actual real time the first message in the chat is generated
  useEffect(() => {
    if (messages.length === 0) {
      setChatStartedAt(null)
    } else if (!chatStartedAt) {
      const formattedTime = new Date().toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      })
      setChatStartedAt(`Today • ${formattedTime}`)
    }
  }, [messages, chatStartedAt])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!inputValue.trim()) return
    if (onSendMessage) {
      onSendMessage(inputValue)
    }
    setInputValue("")
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      if (inputValue.trim()) {
        if (onSendMessage) {
          onSendMessage(inputValue)
        }
        setInputValue("")
      }
    }
  }

  const renderBoldText = (text: string) => {
    const parts = text.split(/\*\*([\s\S]*?)\*\*/)
    return parts.map((part, index) => {
      if (index % 2 === 1) {
        return <strong key={index} className="font-semibold">{part}</strong>
      }
      return part
    })
  }

  const formatMessageText = (text: string) => {
    const paragraphs = text.split("\n\n")

    return paragraphs.map((para, pIdx) => {
      const lines = para.split("\n")
      const isList = lines.every(line => {
        const trimmed = line.trim()
        return trimmed.startsWith("•") || trimmed.startsWith("-") || trimmed.startsWith("*")
      })

      if (isList) {
        return (
          <ul key={pIdx} className="list-disc pl-5 flex flex-col gap-1.5 my-2">
            {lines.map((line, lIdx) => {
              const cleanLine = line.replace(/^[•\-*]\s*/, "")
              return <li key={lIdx}>{renderBoldText(cleanLine)}</li>
            })}
          </ul>
        )
      }

      return (
        <p key={pIdx} className="mb-2">
          {renderBoldText(para)}
        </p>
      )
    })
  }

  const chatMessagesList = messages.length === 0 ? null : (
    <div className="w-full max-w-[640px] mx-auto flex flex-col gap-6 font-sans mb-8">
      {/* Date divider */}
      <div className="flex items-center justify-center my-2">
        <span className="text-[12px] font-medium text-muted-foreground bg-muted/40 px-3 py-1 rounded-full">
          {chatStartedAt || "Today"}
        </span>
      </div>

      {messages.map((msg, index) => {
        if (msg.sender === "user") {
          return (
            <div key={msg.id} className="flex justify-end animate-fade-in">
              <div className="bg-accent text-accent-foreground text-[14px] font-medium px-4 py-2.5 rounded-[20px] rounded-tr-none shadow-xs max-w-[85%] select-text">
                {msg.text}
              </div>
            </div>
          )
        }

        return (
          <div key={msg.id} className="flex flex-col gap-3 max-w-full text-[14px] leading-relaxed text-foreground select-text animate-fade-in">
            {formatMessageText(msg.text)}

            {/* AI Action Row */}
            <div className="flex items-center gap-1 mt-2">
              <button
                onClick={() => {
                  if (onSaveToNote) {
                    const userMsg = messages[index - 1]
                    const queryText = userMsg ? userMsg.text : "Saved Response"
                    onSaveToNote(queryText, msg.text)
                  }
                }}
                className="bg-background border border-border text-foreground h-9 px-4 rounded-full flex items-center gap-1.5 hover:bg-accent text-[13px] font-medium transition shadow-xs cursor-pointer outline-none active:scale-[0.98]"
              >
                <span className="material-symbols-outlined text-[20px]">keep</span>
                <span>Save to note</span>
              </button>
              <button className="w-9 h-9 rounded-full bg-transparent flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent transition cursor-pointer outline-none active:scale-[0.98] border-none">
                <span className="material-symbols-outlined text-[20px]">copy_all</span>
              </button>
              <button className="w-9 h-9 rounded-full bg-transparent flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent transition cursor-pointer outline-none active:scale-[0.98] border-none">
                <span className="material-symbols-outlined text-[20px]">thumb_up</span>
              </button>
              <button className="w-9 h-9 rounded-full bg-transparent flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent transition cursor-pointer outline-none active:scale-[0.98] border-none">
                <span className="material-symbols-outlined text-[20px]">thumb_down</span>
              </button>
            </div>

            {/* Suggested Prompts Stack (only for latest AI message) */}
            {index === messages.length - 1 && msg.suggestedPrompts && msg.suggestedPrompts.length > 0 && (
              <div className="flex flex-col gap-2 mt-4 w-fit">
                {msg.suggestedPrompts.map((prompt, pIdx) => (
                  <button
                    key={pIdx}
                    onClick={() => onPromptClick && onPromptClick(prompt)}
                    className="bg-accent hover:bg-accent/80 text-[14px] text-accent-foreground font-medium px-4 py-2.5 rounded-[16px] text-left transition-colors cursor-pointer outline-none border-none w-fit max-w-full active:scale-[0.98]"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            )}
          </div>
        )
      })}
      
      <div ref={chatEndRef} />
    </div>
  )

  if (isMobile) {
    return (
      <div className="w-full flex-1 flex flex-col bg-background overflow-hidden relative">
        {/* Mobile Mini options header */}
        <div className="h-10 flex items-center justify-end px-4 flex-shrink-0 border-b border-border bg-background">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className="w-8 h-8 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent rounded-full transition cursor-pointer outline-none bg-transparent border-none"
              >
                <span className="material-symbols-outlined text-[20px]">more_vert</span>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              sideOffset={4}
              className="w-[200px] bg-popover text-popover-foreground border border-border rounded-lg shadow-lg py-1.5 z-50 text-[14px] flex flex-col font-sans outline-none"
            >
              <DropdownMenuItem
                onClick={onCustomizeClick}
                className="flex items-center px-3 py-1.5 hover:bg-accent hover:text-accent-foreground text-left w-full transition-colors outline-none cursor-pointer"
              >
                Customize notebook
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={onDeleteChatHistory}
                className="flex items-center px-3 py-1.5 hover:bg-accent hover:text-accent-foreground text-left w-full transition-colors outline-none cursor-pointer"
              >
                Delete chat history
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Content list */}
        <div className="flex-1 overflow-y-auto p-4 flex flex-col justify-start">
          {/* Notebook Cover Card */}
          <div 
            className={`w-full max-w-[640px] mx-auto mt-4 mb-8 relative rounded-2xl min-h-[180px] overflow-hidden group border transition-all duration-300 flex flex-col justify-between ${
              notebookCover 
                ? "border-border/40 bg-cover bg-center shadow-md" 
                : "bg-card hover:bg-accent border-transparent"
            }`}
            style={notebookCover ? { backgroundImage: `url(${notebookCover})` } : undefined}
          >
            {notebookCover && (
              <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-black/15 pointer-events-none z-0" />
            )}

            <div className="p-6 flex flex-col relative z-10 flex-1 justify-between">
              <div className="flex justify-between items-start w-full">
                {!notebookCover && (
                  <div className="cursor-pointer hover:scale-105 transition-transform w-max">
                    <span className="material-symbols-outlined text-[32px] text-foreground">
                      menu_book
                    </span>
                  </div>
                )}
                <div className={`h-[32px] ${notebookCover ? "ml-auto" : ""}`}>
                  <button
                    onClick={onCustomizeClick}
                    className={`backdrop-blur-md border h-[32px] px-4 rounded-full flex items-center gap-1.5 text-[13px] font-medium transition shadow-sm cursor-pointer outline-none relative z-10 active:scale-[0.97] ${
                      notebookCover 
                        ? "bg-black/45 border-white/20 text-white hover:bg-black/60 hover:border-white/30" 
                        : "bg-background/60 border-border text-foreground hover:bg-accent hover:text-accent-foreground"
                    }`}
                  >
                    <span className="material-symbols-outlined text-[16px]">auto_awesome</span>
                    Customize
                  </button>
                </div>
              </div>

              <div className="mt-6">
                <h1 className={`text-[29px] font-bold tracking-tight mb-1 leading-tight ${notebookCover ? "text-white" : "text-foreground"}`}>
                  {notebookTitle}
                </h1>
                <div className={`flex items-center gap-1.5 text-[13px] font-medium ${notebookCover ? "text-white/70" : "text-muted-foreground"}`}>
                <span>0 sources</span>
                <span>·</span>
                <span>{currentDate}</span>
              </div>
            </div>
          </div>
        </div>

        {chatMessagesList}
      </div>

        {/* Message Input Panel */}
        <div className="m-4 bg-background border border-border rounded-2xl py-3 px-4 flex flex-row items-center justify-between shadow-sm focus-within:ring-1 focus-within:ring-ring focus-within:border-ring transition-all min-h-[56px] flex-shrink-0">
          <form
            className="flex flex-row items-center flex-1 gap-2 min-w-0"
            onSubmit={handleSubmit}
          >
            <div className="flex flex-1 items-center px-2 min-w-0 min-h-[36px] relative">
              <textarea
                placeholder="Start typing..."
                className="w-full bg-transparent border-none outline-none resize-none overflow-hidden text-[15px] leading-5 text-foreground placeholder-muted-foreground h-5 max-h-[120px]"
                rows={1}
                autoComplete="off"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
              />
            </div>
            <div className="flex flex-row items-center flex-shrink-0 gap-3 align-self-end">
              <div className="flex items-center gap-1 text-[13px] text-muted-foreground font-medium px-1">
                <span className="material-symbols-outlined text-[18px]">description</span>
                <span>(0)</span>
              </div>
              <button
                type="submit"
                aria-label="Submit"
                disabled={!inputValue.trim()}
                className={`w-8 h-8 rounded-full flex items-center justify-center transition active:scale-[0.97] outline-none border-none ${
                  inputValue.trim()
                    ? "bg-zinc-950 text-zinc-50 dark:bg-zinc-50 dark:text-zinc-950 hover:opacity-90 cursor-pointer pointer-events-auto"
                    : "bg-muted text-muted-foreground/40 cursor-default pointer-events-none"
                }`}
              >
                <span className="material-symbols-outlined text-[20px]">arrow_forward</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    )
  }

  return (
    <section className="flex-1 bg-card border border-border rounded-2xl flex flex-col overflow-hidden relative shadow-sm min-w-[400px]">
      {/* Panel Header */}
      <div className="h-12 border-b border-border flex items-center justify-between px-4 flex-shrink-0 bg-card">
        <h2 className="text-[15px] font-semibold tracking-tight text-foreground">Chat</h2>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className="w-8 h-8 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent rounded-full transition cursor-pointer outline-none"
            >
              <span className="material-symbols-outlined text-[20px]">more_vert</span>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            sideOffset={4}
            className="w-[200px] bg-popover text-popover-foreground border border-border rounded-lg shadow-lg py-1.5 z-50 text-[14px] flex flex-col font-sans outline-none"
          >
            <DropdownMenuItem
              onClick={onCustomizeClick}
              className="flex items-center px-3 py-1.5 hover:bg-accent hover:text-accent-foreground text-left w-full transition-colors outline-none cursor-pointer"
            >
              Customize notebook
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={onDeleteChatHistory}
              className="flex items-center px-3 py-1.5 hover:bg-accent hover:text-accent-foreground text-left w-full transition-colors outline-none cursor-pointer"
            >
              Delete chat history
            </DropdownMenuItem>
            <div className="h-px bg-border my-1.5" />
            <div className="px-3 py-1 text-[12px] text-muted-foreground/80 italic select-none">
              Chat history is private to you.
            </div>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Main Chat Conversation List Area */}
      <div className="flex-1 overflow-y-auto p-4 flex flex-col relative bg-background/20">
        {/* Notebook Cover Card */}
        <div 
          className={`w-full max-w-[640px] mx-auto mt-0 mb-8 relative rounded-2xl min-h-[180px] overflow-hidden group border transition-all duration-300 flex flex-col justify-between ${
            notebookCover 
              ? "border-border/40 bg-cover bg-center shadow-md" 
              : "bg-card hover:bg-accent border-transparent"
          }`}
          style={notebookCover ? { backgroundImage: `url(${notebookCover})` } : undefined}
        >
          {/* Vignette Overlay (Transparan Hitam) */}
          {notebookCover && (
            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-black/15 pointer-events-none z-0" />
          )}

          {/* Landscape hover graphic */}
          {!notebookCover && (
            <div className="absolute -right-8 -bottom-14 opacity-0 group-hover:opacity-[0.08] pointer-events-none select-none text-foreground transition-opacity duration-300">
              <span
                className="material-symbols-outlined text-[220px] leading-none select-none"
                style={{ fontVariationSettings: "'wght' 500" }}
              >
                landscape_2
              </span>
            </div>
          )}

          <div className="p-6 flex flex-col relative z-10 flex-1 justify-between">
            <div className="flex justify-between items-start w-full">
              {!notebookCover && (
                <div className="cursor-pointer hover:scale-105 transition-transform w-max">
                  <span className="material-symbols-outlined text-[32px] text-foreground">
                    menu_book
                  </span>
                </div>
              )}
              <div className={`h-[32px] ${notebookCover ? "ml-auto" : ""}`}>
                <button
                  onClick={onCustomizeClick}
                  className={`backdrop-blur-md border h-[32px] px-4 rounded-full flex items-center gap-1.5 text-[13px] font-medium transition shadow-sm cursor-pointer outline-none relative z-10 active:scale-[0.97] ${
                    notebookCover 
                      ? "bg-black/45 border-white/20 text-white hover:bg-black/60 hover:border-white/30" 
                      : "bg-background/60 border-border text-foreground hover:bg-accent hover:text-accent-foreground"
                  }`}
                >
                  <span className="material-symbols-outlined text-[16px]">auto_awesome</span>
                  Customize
                </button>
              </div>
            </div>

            <div className="mt-6">
              <h1 className={`text-[29px] font-bold tracking-tight mb-1 leading-tight ${notebookCover ? "text-white" : "text-foreground"}`}>
                {notebookTitle}
              </h1>
              <div className={`flex items-center gap-1.5 text-[13px] font-medium ${notebookCover ? "text-white/70" : "text-muted-foreground"}`}>
                <span>0 sources</span>
                <span>·</span>
                <span>{currentDate}</span>
              </div>
            </div>
          </div>
        </div>

        {chatMessagesList}
      </div>

      {/* Message input panel */}
      <div className="m-4 mt-0 bg-background border border-border rounded-2xl py-3 px-4 flex flex-row items-center justify-between shadow-sm focus-within:ring-1 focus-within:ring-ring focus-within:border-ring transition-all min-h-[56px]">
        <form
          className="flex flex-row items-center flex-1 gap-2 min-w-0"
          onSubmit={handleSubmit}
        >
          <div className="flex flex-1 items-center px-2 min-w-0 min-h-[36px] relative">
            <textarea
              placeholder="Start typing..."
              className="w-full bg-transparent border-none outline-none resize-none overflow-hidden text-[15px] leading-5 text-foreground placeholder-muted-foreground h-5 max-h-[288px]"
              rows={1}
              autoComplete="off"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
            />
          </div>
          <div className="flex flex-row items-center flex-shrink-0 gap-3 align-self-end">
            <div className="text-[13px] text-muted-foreground font-medium tracking-wide px-1">
              0 sources
            </div>
            <button
              type="submit"
              aria-label="Submit"
              disabled={!inputValue.trim()}
              className={`w-8 h-8 rounded-full flex items-center justify-center transition active:scale-[0.97] outline-none border-none ${
                inputValue.trim()
                  ? "bg-zinc-950 text-zinc-50 dark:bg-zinc-50 dark:text-zinc-950 hover:opacity-90 cursor-pointer pointer-events-auto"
                  : "bg-muted text-muted-foreground/40 cursor-default pointer-events-none"
              }`}
            >
              <span className="material-symbols-outlined text-[20px]">arrow_forward</span>
            </button>
          </div>
        </form>
      </div>
    </section>
  )
}
