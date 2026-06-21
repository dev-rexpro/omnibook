import { useState, useRef, useEffect } from "react"
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu"
import { useNotebookStore } from "@/store/useNotebookStore"
import type { Message, Citation } from "@/store/useNotebookStore"
import { supabase } from "@/lib/supabaseClient"
import MODELS from "@/models.json"

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
      className="relative inline-block select-none"
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
              {citation.filename.toLowerCase().endsWith(".pdf") ? "drive_pdf" : "description"}
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

const parseInlineMarkdown = (text: string, citations?: Citation[]): React.ReactNode => {
  const parts = text.split(/`([^`]+)`/)
  return parts.map((part, index) => {
    if (index % 2 === 1) {
      return (
        <code key={index} className="bg-muted px-1.5 py-0.5 rounded font-mono text-[13px] text-pink-600 dark:text-pink-400 font-semibold">
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

interface ChatPanelProps {
  notebookTitle: string
  notebookCover?: string | null
  onCustomizeClick?: () => void
  isMobile?: boolean
  // Maintain props signature for App.tsx compatibility, though we prioritize Zustand store
  messages?: Message[]
  onSendMessage?: (text: string) => void
  onPromptClick?: (text: string) => void
  onDeleteChatHistory?: () => void
  onSaveToNote?: (query: string, response: string, citations?: Citation[]) => void
}

export function ChatPanel({
  notebookTitle,
  notebookCover = null,
  onCustomizeClick,
  isMobile = false,
  onSaveToNote,
}: ChatPanelProps) {
  const currentDate = new Date().toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })

  // Connect to Zustand Store
  const {
    chatHistory,
    addMessage,
    setChatHistory,
    clearChatHistory,
    isProcessing,
    setIsProcessing,
    documents,
    selectedDocumentIds,
    modelConfig,
    setModelConfig,
    currentNotebook,
    activeChatId,
  } = useNotebookStore()

  const getSourceCountText = () => {
    const total = documents.length
    const selected = selectedDocumentIds.length
    if (total === 0) return "0 sources"
    if (selected === total) {
      return `${total} source${total === 1 ? "" : "s"}`
    }
    return `${selected} of ${total} source${total === 1 ? "" : "s"}`
  }

  const [inputValue, setInputValue] = useState("")
  const chatEndRef = useRef<HTMLDivElement>(null)

  // Scroll to bottom on message list update
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [chatHistory])

  const [chatStartedAt, setChatStartedAt] = useState<string | null>(null)

  // Track the actual real time the first message in the chat is generated
  useEffect(() => {
    if (chatHistory.length === 0) {
      setChatStartedAt(null)
    } else if (!chatStartedAt) {
      const formattedTime = new Date().toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      })
      setChatStartedAt(`Today • ${formattedTime}`)
    }
  }, [chatHistory, chatStartedAt])

  const streamChat = async (queryText: string) => {
    const aiMsgId = `ai-${Date.now()}`
    
    // Add empty AI placeholder message
    const placeholderMsg: Message = {
      id: aiMsgId,
      sender: "ai",
      text: "",
    }
    addMessage(placeholderMsg)

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        throw new Error("You must be logged in to chat with your documents.")
      }

      const backendUrl = import.meta.env.VITE_BACKEND_URL || "http://localhost:8000"
      const response = await fetch(
        `${backendUrl}/chat`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            query: queryText,
            model_config: modelConfig,
            notebook_id: currentNotebook?.id,
            document_ids: selectedDocumentIds,
          }),
        }
      )

      if (!response.ok) {
        const errJson = await response.json().catch(() => ({}))
        throw new Error(errJson.error || `HTTP error! Status: ${response.status}`)
      }

      const reader = response.body?.getReader()
      const decoder = new TextDecoder()
      if (!reader) {
        throw new Error("Failed to read the streaming response body.")
      }

      let accumulatedText = ""
      let finalSuggested: string[] = []
      let currentCitations: Citation[] | undefined = undefined
      
      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunkText = decoder.decode(value)
        const lines = chunkText.split("\n")
        
        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const parsed = JSON.parse(line.substring(6))
              
              if (parsed.citations) {
                currentCitations = parsed.citations
              }

              if (parsed.clean_text !== undefined) {
                accumulatedText = parsed.clean_text
              } else if (parsed.text) {
                accumulatedText += parsed.text
              }
              
              if (parsed.suggested && parsed.suggested.length > 0) {
                finalSuggested = parsed.suggested
              } else if (parsed.error) {
                throw new Error(parsed.error)
              }
              
              // Stream text chunk by chunk into store state
              setChatHistory(
                useNotebookStore.getState().chatHistory.map((msg) =>
                  msg.id === aiMsgId 
                    ? { 
                        ...msg, 
                        text: accumulatedText,
                        suggestedPrompts: finalSuggested.length > 0 ? finalSuggested : undefined,
                        citations: currentCitations !== undefined ? currentCitations : msg.citations
                      } 
                    : msg
                )
              )
            } catch (jsonErr) {
              // Ignore parse errors from partial lines
            }
          }
        }
      }

      // Fallback suggestions in Indonesian if dynamic suggestions aren't resolved
      const fallbackSuggested = [
        "Dapatkah Anda merangkum argumen intinya?",
        "Apa saja metrik dan angka utamanya?",
        "Berikan konteks lebih detail tentang dokumen sumber ini.",
      ]
      
      const activeSuggested = finalSuggested.length > 0 ? finalSuggested : fallbackSuggested

      // Save the completed model response to Supabase Messages
      if (activeChatId) {
        const { data: modelMsg, error: modelMsgErr } = await supabase
          .from("messages")
          .insert({
            chat_id: activeChatId,
            role: "model",
            content: accumulatedText,
            citations: currentCitations || null
          })
          .select()
          .single()

        if (!modelMsgErr && modelMsg) {
          setChatHistory(
            useNotebookStore.getState().chatHistory.map((msg) =>
              msg.id === aiMsgId 
                ? { 
                    ...msg, 
                    id: modelMsg.id, 
                    text: modelMsg.content, 
                    suggestedPrompts: activeSuggested,
                    citations: currentCitations !== undefined ? currentCitations : msg.citations
                  } 
                : msg
            )
          )
          return
        }
      }

      setChatHistory(
        useNotebookStore.getState().chatHistory.map((msg) =>
          msg.id === aiMsgId 
            ? { 
                ...msg, 
                text: accumulatedText, 
                suggestedPrompts: activeSuggested,
                citations: currentCitations !== undefined ? currentCitations : msg.citations
              } 
            : msg
        )
      )

    } catch (err: any) {
      console.error(err)
      setChatHistory(
        useNotebookStore.getState().chatHistory.map((msg) =>
          msg.id === aiMsgId
            ? { ...msg, text: `An error occurred: ${err.message || "Failed to generate AI response"}` }
            : msg
        )
      )
    } finally {
      setIsProcessing(false)
    }
  }

  const handleSendMessage = async (text: string) => {
    if (!text.trim() || isProcessing) return

    if (!activeChatId) {
      addMessage({
        id: `err-${Date.now()}`,
        sender: "ai",
        text: "Cannot send message: no active chat session loaded."
      })
      return
    }

    setIsProcessing(true)

    try {
      // Save the user message to Supabase Messages
      const { data: userMsg, error: userMsgErr } = await supabase
        .from("messages")
        .insert({
          chat_id: activeChatId,
          role: "user",
          content: text.trim()
        })
        .select()
        .single()

      if (userMsgErr || !userMsg) {
        throw new Error(userMsgErr?.message || "Failed to save your message to the cloud.")
      }

      const newUserMsg: Message = {
        id: userMsg.id,
        sender: "user",
        text: userMsg.content,
      }
      addMessage(newUserMsg)

      // Fallback message if no source documents are uploaded or selected yet
      if (selectedDocumentIds.length === 0) {
        const fallbackAiMsgId = `ai-${Date.now()}`
        // Add empty AI placeholder message to show loader "Let me learn it..."
        addMessage({
          id: fallbackAiMsgId,
          sender: "ai",
          text: "",
        })

        setTimeout(async () => {
          const fallbackText = documents.length === 0
            ? `Saya senang sekali bisa membantu Anda! Agar saya bisa menjawab pertanyaan Anda dengan efektif, silakan unggah beberapa dokumen sumber di **Panel Sumber** sebelah kiri terlebih dahulu. Ini memungkinkan saya mendasari jawaban saya pada materi milik Anda sendiri.\n\nSubjek atau proyek apa yang sedang Anda kerjakan hari ini?`
            : `Semua dokumen sumber saat ini tidak dicentang. Silakan centang minimal satu dokumen di **Panel Sumber** sebelah kiri agar saya dapat mendasari jawaban saya pada materi Anda.`
          
          const fallbackSuggested = documents.length === 0 ? [
            "Di mana saya bisa mengunggah dokumen?",
            "Format file apa saja yang didukung?",
            "Bagaimana cara kerja NotebookLM?",
          ] : [
            "Bagaimana cara mencentang dokumen?",
            "Apakah bisa mencari di banyak dokumen?",
          ]

          const { data: modelMsg, error: modelMsgErr } = await supabase
            .from("messages")
            .insert({
              chat_id: activeChatId,
              role: "model",
              content: fallbackText
            })
            .select()
            .single()

          if (!modelMsgErr && modelMsg) {
            setChatHistory(
              useNotebookStore.getState().chatHistory.map((msg) =>
                msg.id === fallbackAiMsgId 
                  ? { 
                      id: modelMsg.id, 
                      sender: "ai", 
                      text: modelMsg.content, 
                      suggestedPrompts: fallbackSuggested 
                    } 
                  : msg
              )
            )
          } else {
            setChatHistory(
              useNotebookStore.getState().chatHistory.map((msg) =>
                msg.id === fallbackAiMsgId 
                  ? { 
                      id: fallbackAiMsgId, 
                      sender: "ai", 
                      text: fallbackText, 
                      suggestedPrompts: fallbackSuggested 
                    } 
                  : msg
              )
            )
          }
          setIsProcessing(false)
        }, 700)
        return
      }

      await streamChat(text.trim())

    } catch (err: any) {
      console.error(err)
      setIsProcessing(false)
      addMessage({
        id: `ai-err-${Date.now()}`,
        sender: "ai",
        text: `Failed to send message: ${err.message}`,
      })
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!inputValue.trim() || isProcessing) return
    handleSendMessage(inputValue)
    setInputValue("")
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      if (inputValue.trim() && !isProcessing) {
        handleSendMessage(inputValue)
        setInputValue("")
      }
    }
  }

  const notebookSummaryBlock = currentNotebook?.summary && (
    <div className="w-full max-w-[640px] mx-auto flex flex-col gap-4 font-sans mb-8 border-b border-border/40 pb-8 animate-fade-in select-text">
      {/* Summary Text */}
      <div className="text-[14px] leading-relaxed text-foreground select-text font-normal">
        {parseInlineMarkdown(currentNotebook.summary)}
      </div>

      {/* Actions Row */}
      <div className="flex items-center gap-1 mt-1">
        <button
          onClick={() => {
            if (onSaveToNote && currentNotebook?.summary) {
              onSaveToNote("Notebook Summary", currentNotebook.summary)
            }
          }}
          className="bg-background border border-border text-foreground h-9 px-4 rounded-full flex items-center gap-1.5 hover:bg-accent text-[13px] font-medium transition shadow-xs cursor-pointer active:scale-[0.98] outline-none"
        >
          <span className="google-symbols text-[20px]">keep</span>
          <span>Save to note</span>
        </button>
        <button
          onClick={() => {
            if (currentNotebook?.summary) {
              navigator.clipboard.writeText(currentNotebook.summary)
            }
          }}
          className="w-9 h-9 rounded-full bg-transparent flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent transition cursor-pointer outline-none active:scale-[0.98] border-none"
        >
          <span className="google-symbols text-[20px]">copy_all</span>
        </button>
        <button className="w-9 h-9 rounded-full bg-transparent flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent transition cursor-pointer outline-none active:scale-[0.98] border-none">
          <span className="google-symbols text-[20px]">thumb_up</span>
        </button>
        <button className="w-9 h-9 rounded-full bg-transparent flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent transition cursor-pointer outline-none active:scale-[0.98] border-none">
          <span className="google-symbols text-[20px]">thumb_down</span>
        </button>
      </div>

      {/* Suggested Prompts Stack */}
      {currentNotebook.suggested_prompts && currentNotebook.suggested_prompts.length > 0 && (
        <div className="flex flex-col gap-2 mt-2 w-fit">
          {currentNotebook.suggested_prompts.map((prompt, pIdx) => (
            <button
              key={pIdx}
              onClick={() => handleSendMessage(prompt)}
              className="bg-accent hover:bg-accent/80 text-[14px] text-accent-foreground font-medium px-4 py-2.5 rounded-[16px] text-left transition-all cursor-pointer outline-none border-none w-fit max-w-full active:scale-[0.98] opacity-0 animate-slide-in"
              style={{ animationDelay: `${pIdx * 120}ms` }}
            >
              {prompt}
            </button>
          ))}
        </div>
      )}
    </div>
  )

  const chatMessagesList = chatHistory.length === 0 ? null : (
    <div className="w-full max-w-[640px] mx-auto flex flex-col gap-6 font-sans mb-8">
      {/* Date divider */}
      <div className="flex items-center justify-center my-2">
        <span className="text-[12px] font-medium text-muted-foreground bg-muted/40 px-3 py-1 rounded-full">
          {chatStartedAt || "Today"}
        </span>
      </div>

      {chatHistory.map((msg, index) => {
        if (msg.sender === "user") {
          return (
            <div key={msg.id} className="flex justify-end animate-fade-in">
              <div className="bg-accent text-accent-foreground text-[14px] font-medium px-4 py-2.5 rounded-[20px] rounded-tr-none shadow-xs max-w-[85%] select-text">
                {msg.text}
              </div>
            </div>
          )
        }

        const isLatest = index === chatHistory.length - 1
        const isLoading = !msg.text && isProcessing && isLatest

        return (
          <div key={msg.id} className="flex flex-col gap-3 max-w-full text-[14px] leading-relaxed text-foreground select-text animate-fade-in">
            {isLoading ? (
              <div className="flex flex-col gap-2 py-1 select-none">
                <div className="flex items-center gap-3 text-zinc-500 dark:text-zinc-400">
                  {/* Elegant bounce loader dots */}
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-zinc-400 dark:bg-zinc-600 animate-bounce [animation-delay:-0.3s]"></span>
                    <span className="w-2 h-2 rounded-full bg-zinc-400 dark:bg-zinc-600 animate-bounce [animation-delay:-0.15s]"></span>
                    <span className="w-2 h-2 rounded-full bg-zinc-400 dark:bg-zinc-600 animate-bounce"></span>
                  </div>
                  <span className="text-[14px] font-medium animate-pulse tracking-wide font-sans">
                    Let me learn it...
                  </span>
                </div>
              </div>
            ) : (
              formatMessageText(msg.text, msg.citations)
            )}

            {/* AI Action Row */}
            {msg.text && (!isProcessing || !isLatest) && (
              <div className="flex items-center gap-1 mt-2 animate-fade-in">
                <button
                  onClick={() => {
                    if (onSaveToNote) {
                      const userMsg = chatHistory[index - 1]
                      const queryText = userMsg ? userMsg.text : "Saved Response"
                      onSaveToNote(queryText, msg.text, msg.citations)
                    }
                  }}
                  className="bg-background border border-border text-foreground h-9 px-4 rounded-full flex items-center gap-1.5 hover:bg-accent text-[13px] font-medium transition shadow-xs cursor-pointer active:scale-[0.98] outline-none"
                >
                  <span className="google-symbols text-[20px]">keep</span>
                  <span>Save to note</span>
                </button>
                <button
                  onClick={() => {
                    if (msg.text) {
                      navigator.clipboard.writeText(msg.text)
                    }
                  }}
                  className="w-9 h-9 rounded-full bg-transparent flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent transition cursor-pointer outline-none active:scale-[0.98] border-none"
                  title="Copy response"
                >
                  <span className="google-symbols text-[20px]">copy_all</span>
                </button>
                <button className="w-9 h-9 rounded-full bg-transparent flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent transition cursor-pointer outline-none active:scale-[0.98] border-none">
                  <span className="google-symbols text-[20px]">thumb_up</span>
                </button>
                <button className="w-9 h-9 rounded-full bg-transparent flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent transition cursor-pointer outline-none active:scale-[0.98] border-none">
                  <span className="google-symbols text-[20px]">thumb_down</span>
                </button>
              </div>
            )}

            {/* Suggested Prompts Stack (only for latest AI message and when processing is complete) */}
            {isLatest && !isProcessing && msg.suggestedPrompts && msg.suggestedPrompts.length > 0 && (
              <div className="flex flex-col gap-2 mt-4 w-fit">
                {msg.suggestedPrompts.map((prompt, pIdx) => (
                  <button
                    key={pIdx}
                    onClick={() => handleSendMessage(prompt)}
                    className="bg-accent hover:bg-accent/80 text-[14px] text-accent-foreground font-medium px-4 py-2.5 rounded-[16px] text-left transition-all cursor-pointer outline-none border-none w-fit max-w-full active:scale-[0.98] opacity-0 animate-slide-in"
                    style={{ animationDelay: `${pIdx * 120}ms` }}
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
        <div className="h-10 flex items-center justify-between px-4 flex-shrink-0 border-b border-border bg-background">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="h-7 px-2.5 rounded-full border border-border bg-background text-foreground text-[11px] font-medium flex items-center gap-1 hover:bg-accent active:scale-[0.98] transition cursor-pointer outline-none select-none whitespace-nowrap">
                <span>{MODELS.find(m => m.id === modelConfig.model_name)?.label ?? modelConfig.model_name}</span>
                <span className="google-symbols text-[13px] text-zinc-400">keyboard_arrow_down</span>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="bg-popover border border-border rounded-lg shadow-lg py-1 z-50 text-[13px] flex flex-col font-sans outline-none min-w-[160px] w-max">
              {MODELS.map((m) => (
                <DropdownMenuItem
                  key={m.id}
                  onClick={() => setModelConfig({ model_name: m.id })}
                  className="flex items-center justify-between gap-4 px-3 py-1.5 hover:bg-accent hover:text-accent-foreground text-left w-full transition-colors outline-none cursor-pointer whitespace-nowrap"
                >
                  <span>{m.label}</span>
                  {modelConfig.model_name === m.id && <span className="google-symbols text-[14px]">check</span>}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className="w-8 h-8 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent rounded-full transition cursor-pointer outline-none bg-transparent border-none"
              >
                <span className="google-symbols text-[20px]">more_vert</span>
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
                onClick={clearChatHistory}
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
            className={`w-full max-w-[640px] mx-auto mt-4 mb-8 relative rounded-2xl min-h-[180px] flex-shrink-0 overflow-hidden group border transition-all duration-300 flex flex-col ${
              notebookCover 
                ? "border-border/40 bg-cover bg-center shadow-md" 
                : "bg-card hover:bg-accent border-transparent"
            }`}
            style={notebookCover ? { backgroundImage: `url(${notebookCover})` } : undefined}
          >
            {notebookCover && (
              <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-black/15 pointer-events-none z-0" />
            )}

            <div className="p-6 flex flex-col relative z-10 min-h-[178px] justify-between">
              <div className="flex justify-between items-start w-full">
                {!notebookCover && (
                  <div className="cursor-pointer hover:scale-105 transition-transform w-max">
                    <span className="google-symbols text-[32px] text-foreground">
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
                    <span className="google-symbols text-[16px]">photo_spark</span>
                    Customize
                  </button>
                </div>
              </div>

              <div className="mt-6">
                <h1 className={`text-[22px] sm:text-[26px] md:text-[28px] font-bold tracking-tight mb-1 leading-tight ${notebookCover ? "text-white" : "text-foreground"}`}>
                  {notebookTitle}
                </h1>
                <div className={`flex items-center gap-1.5 text-[13px] font-medium ${notebookCover ? "text-white/70" : "text-muted-foreground"}`}>
                  <span>{getSourceCountText()}</span>
                  <span>·</span>
                  <span>{currentDate}</span>
                </div>
              </div>
            </div>
          </div>

          {notebookSummaryBlock}
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
                placeholder={isProcessing ? "Thinking..." : "Start typing..."}
                className="w-full bg-transparent border-none outline-none resize-none overflow-hidden text-[15px] leading-5 text-foreground placeholder-muted-foreground h-5 max-h-[120px]"
                rows={1}
                autoComplete="off"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={isProcessing}
              />
            </div>
            <div className="flex flex-row items-center flex-shrink-0 gap-3 align-self-end">
              <div className="flex items-center gap-1 text-[13px] text-muted-foreground font-medium px-1 select-none">
                <span className="google-symbols text-[18px]">description</span>
                <span>({selectedDocumentIds.length})</span>
              </div>
              <button
                type="submit"
                aria-label="Submit"
                disabled={!inputValue.trim() || isProcessing}
                className={`w-8 h-8 rounded-full flex items-center justify-center transition active:scale-[0.97] outline-none border-none ${
                  inputValue.trim() && !isProcessing
                    ? "bg-zinc-950 text-zinc-50 dark:bg-zinc-50 dark:text-zinc-950 hover:opacity-90 cursor-pointer pointer-events-auto"
                    : "bg-muted text-muted-foreground/40 cursor-default pointer-events-none"
                }`}
              >
                {isProcessing ? (
                  <span className="google-symbols text-[20px] animate-spin">sync</span>
                ) : (
                  <span className="google-symbols text-[20px]">arrow_forward</span>
                )}
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
        <div className="flex items-center gap-3">
          <h2 className="text-[15px] font-semibold tracking-tight text-foreground">Chat</h2>
        </div>

        {/* Right side: Model Selector + More options */}
        <div className="flex items-center gap-1">
          {/* Model Selector Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="h-7 px-2.5 rounded-full border border-border bg-background text-foreground text-[11px] font-medium flex items-center gap-1 hover:bg-accent active:scale-[0.98] transition cursor-pointer outline-none select-none whitespace-nowrap">
                <span>{MODELS.find(m => m.id === modelConfig.model_name)?.label ?? modelConfig.model_name}</span>
                <span className="google-symbols text-[14px] text-zinc-400">keyboard_arrow_down</span>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-popover border border-border rounded-lg shadow-lg py-1 z-50 text-[13px] flex flex-col font-sans outline-none min-w-[160px] w-max">
              {MODELS.map((m) => (
                <DropdownMenuItem
                  key={m.id}
                  onClick={() => setModelConfig({ model_name: m.id })}
                  className="flex items-center justify-between gap-4 px-3 py-1.5 hover:bg-accent hover:text-accent-foreground text-left w-full transition-colors outline-none cursor-pointer whitespace-nowrap"
                >
                  <span>{m.label}</span>
                  {modelConfig.model_name === m.id && <span className="google-symbols text-[14px]">check</span>}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* More options */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className="w-8 h-8 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent rounded-full transition cursor-pointer outline-none bg-transparent border-none"
              >
                <span className="google-symbols text-[20px]">more_vert</span>
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
                onClick={clearChatHistory}
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
      </div>

      {/* Main Chat Conversation List Area */}
      <div className="flex-1 overflow-y-auto p-4 flex flex-col relative bg-background/20">
        {/* Notebook Cover Card */}
        <div 
          className={`w-full max-w-[640px] mx-auto mt-0 mb-8 relative rounded-2xl min-h-[180px] flex-shrink-0 overflow-hidden group border transition-all duration-300 flex flex-col ${
            notebookCover 
              ? "border-border/40 bg-cover bg-center shadow-md" 
              : "bg-card hover:bg-accent border-transparent"
          }`}
          style={notebookCover ? { backgroundImage: `url(${notebookCover})` } : undefined}
        >
          {notebookCover && (
            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-black/15 pointer-events-none z-0" />
          )}

          {!notebookCover && (
            <div className="absolute -right-8 -bottom-14 opacity-0 group-hover:opacity-[0.08] pointer-events-none select-none text-foreground transition-opacity duration-300">
              <span
                className="google-symbols text-[220px] leading-none select-none"
                style={{ fontVariationSettings: "'wght' 500" }}
              >
                landscape_2
              </span>
            </div>
          )}

          <div className="p-6 flex flex-col relative z-10 min-h-[178px] justify-between">
            <div className="flex justify-between items-start w-full">
              {!notebookCover && (
                <div className="cursor-pointer hover:scale-105 transition-transform w-max">
                  <span className="google-symbols text-[32px] text-foreground">
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
                  <span className="google-symbols text-[16px]">photo_spark</span>
                  Customize
                </button>
              </div>
            </div>

            <div className="mt-6">
              <h1 className={`text-[22px] sm:text-[26px] md:text-[28px] font-bold tracking-tight mb-1 leading-tight ${notebookCover ? "text-white" : "text-foreground"}`}>
                {notebookTitle}
              </h1>
              <div className={`flex items-center gap-1.5 text-[13px] font-medium ${notebookCover ? "text-white/70" : "text-muted-foreground"}`}>
                <span>{getSourceCountText()}</span>
                <span>·</span>
                <span>{currentDate}</span>
              </div>
            </div>
          </div>
        </div>

        {notebookSummaryBlock}
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
              placeholder={isProcessing ? "Thinking..." : "Start typing..."}
              className="w-full bg-transparent border-none outline-none resize-none overflow-hidden text-[15px] leading-5 text-foreground placeholder-muted-foreground h-5 max-h-[288px]"
              rows={1}
              autoComplete="off"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isProcessing}
            />
          </div>
          <div className="flex flex-row items-center flex-shrink-0 gap-3 align-self-end">
            <div className="text-[13px] text-muted-foreground font-medium tracking-wide px-1 select-none">
              {getSourceCountText()}
            </div>
            <button
              type="submit"
              aria-label="Submit"
              disabled={!inputValue.trim() || isProcessing}
              className={`w-8 h-8 rounded-full flex items-center justify-center transition active:scale-[0.97] outline-none border-none ${
                inputValue.trim() && !isProcessing
                  ? "bg-zinc-950 text-zinc-50 dark:bg-zinc-50 dark:text-zinc-950 hover:opacity-90 cursor-pointer pointer-events-auto"
                  : "bg-muted text-muted-foreground/40 cursor-default pointer-events-none"
              }`}
            >
              {isProcessing ? (
                <span className="google-symbols text-[20px] animate-spin">sync</span>
              ) : (
                <span className="google-symbols text-[20px]">arrow_forward</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </section>
  )
}
