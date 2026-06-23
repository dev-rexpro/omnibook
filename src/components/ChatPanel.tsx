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
import { getFileIcon } from "@/lib/utils"

const formatChatTimestamp = (dateString?: string) => {
  if (!dateString) return "Today"
  try {
    const date = new Date(dateString)
    const now = new Date()
    
    // Check if it's today
    const isToday = date.toDateString() === now.toDateString()
    
    // Check if it's yesterday
    const yesterday = new Date(now)
    yesterday.setDate(now.getDate() - 1)
    const isYesterday = date.toDateString() === yesterday.toDateString()
    
    const timeStr = date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    })
    
    if (isToday) {
      return `Today • ${timeStr}`
    } else if (isYesterday) {
      return `Yesterday • ${timeStr}`
    } else {
      const dateStr = date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      })
      return `${dateStr} • ${timeStr}`
    }
  } catch (e) {
    return "Today"
  }
}

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
              {getFileIcon(citation.filename)}
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
        <code key={index} className="bg-muted px-1.5 py-0.5 rounded font-mono text-[13px] text-zinc-900 dark:text-zinc-100 font-semibold">
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

  // Allow optional whitespace/spaces after language identifier before newline
  const codeBlockRegex = /```(\w*)[ \t]*\r?\n([\s\S]*?)```/g
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
      <div key={`code-${match.index}`} className="my-3 rounded-xl overflow-hidden border border-border/30 shadow-inner">
        {/* Code block header */}
        <div className="flex items-center justify-between bg-zinc-900 dark:bg-zinc-800 px-4 py-2">
          <span className="text-[11px] text-zinc-400 uppercase font-semibold select-none">{language || "code"}</span>
          <button
            onClick={() => navigator.clipboard.writeText(codeContent)}
            className="text-[11px] text-zinc-400 hover:text-zinc-200 flex items-center gap-1 transition cursor-pointer border-none bg-transparent outline-none"
          >
            <span className="google-symbols text-[14px]">content_copy</span>
            Copy
          </button>
        </div>
        <pre className="bg-zinc-950 dark:bg-zinc-900 text-zinc-100 p-4 font-mono text-[13px] overflow-x-auto">
          <code>{codeContent}</code>
        </pre>
      </div>
    )
    lastIndex = codeBlockRegex.lastIndex
  }

  const remainingText = text.substring(lastIndex)
  if (remainingText.trim() || elements.length === 0) {
    elements.push(...formatParagraphs(remainingText, citations))
  }

  return elements
}

const AILoadingAnimation = () => {
  const loadingSteps = [
    "Let me learn it...",
    "Scanning knowledge base...",
    "Vectorizing context...",
    "Retrieving relevant data...",
    "Synthesizing information...",
    "Formatting final response..."
  ]

  const [currentIndex, setCurrentIndex] = useState(0)
  const [triggerAnim, setTriggerAnim] = useState(true)

  useEffect(() => {
    const interval = setInterval(() => {
      setTriggerAnim(false)
      setTimeout(() => {
        setCurrentIndex((prev) => (prev + 1) % loadingSteps.length)
        setTriggerAnim(true)
      }, 50)
    }, 2000)

    return () => clearInterval(interval)
  }, [])

  return (
    <div className="flex items-center space-x-3 text-gray-800 dark:text-gray-200 select-none py-1.5 font-sans">
      <div className="flex items-center justify-center">
        <div className="terminal-cursor"></div>
      </div>
      <div 
        className={`text-[15px] font-medium tracking-wide font-sans text-gray-700 dark:text-zinc-300 ${
          triggerAnim ? "text-update" : "opacity-0"
        }`}
      >
        {loadingSteps[currentIndex]}
      </div>
    </div>
  )
}

interface ChatPanelProps {
  notebookTitle: string
  notebookCover?: string | null
  onCustomizeClick?: () => void
  isMobile?: boolean
  // Maintain props signature for App.tsx compatibility
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
    
    const placeholderMsg: Message = {
      id: aiMsgId,
      sender: "ai",
      text: "",
      created_at: new Date().toISOString(),
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
            llm_config: modelConfig,
            notebook_id: currentNotebook?.id,
            document_ids: selectedDocumentIds,
            chat_id: activeChatId,
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
              // Ignore partial JSON parse errors
            }
          }
        }
      }

      const fallbackSuggested = [
        "Dapatkah Anda merangkum argumen intinya?",
        "Apa saja metrik dan angka utamanya?",
        "Berikan konteks lebih detail tentang dokumen sumber ini.",
      ]
      
      const activeSuggested = finalSuggested.length > 0 ? finalSuggested : fallbackSuggested

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
                    citations: currentCitations !== undefined ? currentCitations : msg.citations,
                    created_at: modelMsg.created_at,
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
                citations: currentCitations !== undefined ? currentCitations : msg.citations,
                created_at: new Date().toISOString(),
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
        created_at: userMsg.created_at,
      }
      addMessage(newUserMsg)

      if (selectedDocumentIds.length === 0) {
        const fallbackAiMsgId = `ai-${Date.now()}`
        addMessage({
          id: fallbackAiMsgId,
          sender: "ai",
          text: "",
          created_at: new Date().toISOString(),
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
                      suggestedPrompts: fallbackSuggested,
                      created_at: modelMsg.created_at,
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
                      suggestedPrompts: fallbackSuggested,
                      created_at: new Date().toISOString(),
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
        created_at: new Date().toISOString(),
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
    <div className="w-full max-w-[840px] mx-auto flex flex-col gap-4 font-sans mb-8 animate-fade-in select-text">
      {/* Summary Text */}
      <div className="max-w-[720px] mx-auto text-foreground text-[15px] leading-relaxed select-text font-normal">
        {parseInlineMarkdown(currentNotebook.summary)}
      </div>

      {/* Action Bar */}
      <div className="max-w-[840px] mx-auto w-full flex items-center gap-2 mb-8">
        <button
          onClick={() => {
            if (onSaveToNote && currentNotebook?.summary) {
              onSaveToNote("Notebook Summary", currentNotebook.summary)
            }
          }}
          className="flex items-center gap-2 border border-brand-border rounded-full h-[40px] px-5 hover:bg-gray-50 dark:hover:bg-accent transition text-xs font-medium text-gray-600 dark:text-foreground mr-2 cursor-pointer outline-none bg-transparent"
        >
          <span className="google-symbols text-[18px]">keep</span>
          Save to note
        </button>
        <button
          onClick={() => {
            if (currentNotebook?.summary) {
              navigator.clipboard.writeText(currentNotebook.summary)
            }
          }}
          className="w-10 h-10 rounded-full hover:bg-gray-100 dark:hover:bg-accent flex items-center justify-center text-gray-600 dark:text-foreground transition cursor-pointer outline-none border-none bg-transparent"
          title="Copy"
        >
          <span className="google-symbols text-[20px]">copy_all</span>
        </button>
        <button className="w-10 h-10 rounded-full hover:bg-gray-100 dark:hover:bg-accent flex items-center justify-center text-gray-600 dark:text-foreground transition cursor-pointer outline-none border-none bg-transparent" title="Good summary">
          <span className="google-symbols text-[20px]">thumb_up</span>
        </button>
        <button className="w-10 h-10 rounded-full hover:bg-gray-100 dark:hover:bg-accent flex items-center justify-center text-gray-600 dark:text-foreground transition cursor-pointer outline-none border-none bg-transparent" title="Bad summary">
          <span className="google-symbols text-[20px]">thumb_down</span>
        </button>
      </div>

      {/* Suggested Prompts Stack */}
      {currentNotebook.suggested_prompts && currentNotebook.suggested_prompts.length > 0 && (
        <div className="max-w-[840px] mx-auto w-full flex flex-col gap-2 mb-6">
          {currentNotebook.suggested_prompts.map((prompt, pIdx) => (
            <button
              key={pIdx}
              onClick={() => handleSendMessage(prompt)}
              className="bg-muted hover:bg-accent transition px-4 py-3 rounded-2xl rounded-tr-sm text-left text-sm text-foreground self-start cursor-pointer border-none"
            >
              {prompt}
            </button>
          ))}
        </div>
      )}
    </div>
  )

  const chatMessagesList = chatHistory.length === 0 ? null : (
    <div className="w-full max-w-[840px] mx-auto flex flex-col gap-6 font-sans mb-8">
      {chatHistory.map((msg, index) => {
        const prevMsg = index > 0 ? chatHistory[index - 1] : null
        let showTimestamp = index === 0 || (msg.sender === "user" && prevMsg?.sender === "ai")
        
        if (!showTimestamp && msg.sender === "user" && prevMsg?.sender === "user") {
          const currentT = msg.created_at ? new Date(msg.created_at).getTime() : Date.now()
          const prevT = prevMsg.created_at ? new Date(prevMsg.created_at).getTime() : Date.now()
          if (currentT - prevT > 2 * 60 * 1000) {
            showTimestamp = true
          }
        }

        const timestampPill = showTimestamp && (
          <div className="flex items-center justify-center my-2 select-none">
            <span className="text-[12px] font-medium text-muted-foreground bg-muted/40 px-3 py-1 rounded-full">
              {formatChatTimestamp(msg.created_at)}
            </span>
          </div>
        )

        if (msg.sender === "user") {
          return (
            <div key={msg.id} className="w-full flex flex-col gap-2">
              {timestampPill}
              <div className="max-w-[840px] mx-auto w-full flex justify-end mb-4 pr-4 animate-fade-in">
                <div className="bg-[#edeffa] dark:bg-secondary text-foreground px-5 py-3 rounded-2xl rounded-tr-sm max-w-[85%] text-[15px] leading-relaxed">
                  {msg.text}
                </div>
              </div>
            </div>
          )
        }

        const isLatest = index === chatHistory.length - 1
        const isLoading = !msg.text && isProcessing && isLatest

        return (
          <div key={msg.id} className="w-full flex flex-col gap-2">
            {timestampPill}
            <div className="max-w-[840px] mx-auto w-full flex flex-col justify-start mb-4 animate-fade-in">
              <div className="bg-transparent text-foreground dark:text-foreground/90 px-1 py-3 w-[95%] text-[15px] leading-relaxed">
                {isLoading ? (
                  <AILoadingAnimation />
                ) : (
                  formatMessageText(msg.text, msg.citations)
                )}
              </div>

              {/* AI Action Row */}
              {msg.text && (!isProcessing || !isLatest) && (
                <div className="flex items-center gap-2 mt-2">
                  <button
                    onClick={() => {
                      if (onSaveToNote) {
                        const userMsg = chatHistory[index - 1]
                        const queryText = userMsg ? userMsg.text : "Saved Response"
                        onSaveToNote(queryText, msg.text, msg.citations)
                      }
                    }}
                    className="flex items-center gap-2 border border-brand-border rounded-full h-[32px] px-3 hover:bg-gray-50 dark:hover:bg-accent transition text-xs font-medium text-gray-700 dark:text-foreground ml-1 cursor-pointer outline-none bg-transparent"
                  >
                    <span className="google-symbols text-[16px]">keep_pin</span>
                    Save to note
                  </button>
                  <div className="flex-grow flex items-center gap-1">
                    <button
                      onClick={() => {
                        if (msg.text) {
                          navigator.clipboard.writeText(msg.text)
                        }
                      }}
                      className="w-8 h-8 rounded-full hover:bg-gray-100 dark:hover:bg-accent flex items-center justify-center text-gray-600 dark:text-foreground transition cursor-pointer outline-none border-none bg-transparent"
                      title="Copy"
                    >
                      <span className="google-symbols text-[18px]">copy_all</span>
                    </button>
                    <button className="w-8 h-8 rounded-full hover:bg-gray-100 dark:hover:bg-accent flex items-center justify-center text-gray-600 dark:text-foreground transition cursor-pointer outline-none border-none bg-transparent" title="Good summary">
                      <span className="google-symbols text-[18px]">thumb_up</span>
                    </button>
                    <button className="w-8 h-8 rounded-full hover:bg-gray-100 dark:hover:bg-accent flex items-center justify-center text-gray-600 dark:text-foreground transition cursor-pointer outline-none border-none bg-transparent" title="Bad summary">
                      <span className="google-symbols text-[18px]">thumb_down</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Suggested Prompts Stack */}
              {isLatest && !isProcessing && msg.suggestedPrompts && msg.suggestedPrompts.length > 0 && (
                <div className="w-full flex flex-col gap-2 mt-4 pl-1">
                  {msg.suggestedPrompts.map((prompt, pIdx) => (
                    <button
                      key={pIdx}
                      onClick={() => handleSendMessage(prompt)}
                      className="bg-muted hover:bg-accent transition px-4 py-3 rounded-2xl rounded-tr-sm text-left text-sm text-foreground self-start cursor-pointer border-none"
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )
      })}
      
      <div ref={chatEndRef} />
    </div>
  )

  const defaultCoverUrl = "https://lh3.googleusercontent.com/notebooklm/AKXwDQGtE50E7x9eTlsaBhtcU-lmBltnI3TnvfrY1G-GvzN0N8sY9_gebHQEsoD0WK79A_HS6aLIwBILWInJ3GfiAXlFXlgbzD0poN9Fb1DrOu-9t6EKlIUqz8iTIkm9kejZHvlgLz4rjoss6pDANzhcmdbgEgRLCcUFYoYIA6eshGlbuzCR"
  const activeCover = notebookCover || defaultCoverUrl

  if (isMobile) {
    return (
      <div className="w-full flex-1 flex flex-col bg-background overflow-hidden relative">
        {/* Mobile Header */}
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
          <div 
            className="w-full max-w-[640px] mx-auto mt-4 mb-8 relative rounded-2xl overflow-hidden bg-cover bg-center shadow-md flex flex-col justify-end text-white p-6 h-[220px] bg-gray-800 flex-shrink-0"
            style={{ backgroundImage: `linear-gradient(rgba(0, 0, 0, 0) 20%, rgba(0, 0, 0, 0.7) 80%), url(${activeCover})` }}
          >
            <button
              onClick={onCustomizeClick}
              className="absolute top-3 right-3 flex items-center gap-1.5 bg-black/40 hover:bg-black/60 transition px-4 py-1.5 rounded-full text-xs font-medium border border-white/20 cursor-pointer outline-none z-10"
            >
              <span className="google-symbols text-[16px]">photo_spark</span>
              Customize
            </button>
            <h2 className="text-[22px] sm:text-[26px] md:text-[28px] font-bold tracking-tight mb-1 leading-tight text-white select-text">
              {notebookTitle}
            </h2>
            <div className="flex items-center gap-1.5 text-[13px] font-medium text-white/70 select-none">
              <span>{getSourceCountText()}</span>
              <span>·</span>
              <span>{currentDate}</span>
            </div>
          </div>

          {notebookSummaryBlock}
          {chatMessagesList}
        </div>

        {/* Input box */}
        <div className="m-4 mt-0 bg-background border border-border rounded-2xl py-3 px-4 shadow-sm flex flex-row items-center gap-1 focus-within:ring-1 focus-within:ring-ring focus-within:border-ring transition-all min-h-[56px] flex-shrink-0">
          <textarea
            placeholder={isProcessing ? "Thinking..." : "Start typing..."}
            id="chat-input-mobile"
            className="flex-grow bg-transparent border-none outline-none resize-none overflow-hidden text-[16px] leading-[24px] text-foreground placeholder-muted-foreground font-sans"
            rows={1}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isProcessing}
          />
          <div className="flex items-center gap-2 flex-shrink-0">
            <div className="text-[12px] text-muted-foreground font-medium px-2 py-1 bg-muted rounded-full select-none">
              {getSourceCountText()}
            </div>
            <button
              onClick={handleSubmit}
              disabled={!inputValue.trim() || isProcessing}
              className={`w-10 h-10 rounded-full flex items-center justify-center transition active:scale-[0.97] outline-none border-none ${
                inputValue.trim() && !isProcessing
                  ? "bg-primary text-primary-foreground cursor-pointer pointer-events-auto hover:opacity-90"
                  : "bg-muted text-muted-foreground/40 cursor-default pointer-events-none"
              }`}
            >
              {isProcessing ? (
                <span className="google-symbols text-[24px] animate-spin">sync</span>
              ) : (
                <span className="google-symbols text-[24px]">arrow_forward</span>
              )}
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <section className="flex-1 bg-card border border-border rounded-2xl flex flex-col overflow-hidden relative shadow-sm min-w-[400px]">
      {/* Panel Header */}
      <div className="flex items-center justify-between h-12 border-b border-brand-border px-2 bg-card">
        <h2 className="text-base font-normal px-2 text-brand-text">Chat</h2>
        <div className="flex items-center gap-1 pr-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className="w-8 h-8 flex items-center justify-center flex-shrink-0 rounded-full hover:bg-gray-100 text-gray-600 transition cursor-pointer outline-none border-none bg-transparent"
                title="Configure notebook"
              >
                <span className="google-symbols text-[20px]">tune</span>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-popover border border-border rounded-lg shadow-lg py-1.5 z-50 text-[13px] flex flex-col font-sans outline-none min-w-[160px] w-max">
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
                className="w-8 h-8 flex items-center justify-center flex-shrink-0 rounded-full hover:bg-gray-100 text-gray-600 transition cursor-pointer outline-none bg-transparent border-none"
                title="Chat options"
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
      <div className="flex-1 overflow-y-auto p-4 flex flex-col relative bg-background/20 scroll-smooth" id="chat-container">
        <div 
          className="w-full max-w-[840px] mx-auto mb-6 relative rounded-2xl overflow-hidden bg-cover bg-center flex flex-col justify-end text-white p-6 h-[220px] bg-gray-800 flex-shrink-0"
          style={{ backgroundImage: `linear-gradient(rgba(0, 0, 0, 0) 20%, rgba(0, 0, 0, 0.7) 80%), url(${activeCover})` }}
        >
          <button
            onClick={onCustomizeClick}
            className="absolute top-3 right-3 flex items-center gap-1.5 bg-black/40 hover:bg-black/60 transition px-4 py-1.5 rounded-full text-xs font-medium border border-white/20 cursor-pointer outline-none z-10"
          >
            <span className="google-symbols text-[16px]">photo_spark</span>
            Customize
          </button>
          <h2 className="text-[28px] font-normal leading-tight mb-1 text-white select-text">
            {notebookTitle}
          </h2>
          <div className="flex items-center gap-1.5 text-sm text-gray-200 select-none">
            <span>{getSourceCountText()}</span>
            <span>·</span>
            <span>{currentDate}</span>
          </div>
        </div>

        {notebookSummaryBlock}
        {chatMessagesList}
      </div>

      {/* Input box */}
      <div className="m-4 mt-0 bg-background border border-border rounded-2xl py-3 px-4 shadow-sm flex flex-row items-center gap-1 focus-within:ring-1 focus-within:ring-ring focus-within:border-ring transition-all min-h-[56px] flex-shrink-0">
        <textarea
          placeholder={isProcessing ? "Thinking..." : "Start typing..."}
          id="chat-input"
          className="flex-grow bg-transparent border-none outline-none resize-none overflow-hidden text-[16px] leading-[24px] text-foreground placeholder-muted-foreground font-sans"
          rows={1}
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isProcessing}
        />
        <div className="flex items-center gap-2 flex-shrink-0">
          <div className="text-[12px] text-muted-foreground font-medium px-2 py-1 bg-muted rounded-full select-none">
            {getSourceCountText()}
          </div>
          <button
            onClick={handleSubmit}
            disabled={!inputValue.trim() || isProcessing}
            className={`w-10 h-10 rounded-full flex items-center justify-center transition active:scale-[0.97] outline-none border-none ${
              inputValue.trim() && !isProcessing
                ? "bg-primary text-primary-foreground cursor-pointer pointer-events-auto hover:opacity-90"
                : "bg-muted text-muted-foreground/40 cursor-default pointer-events-none"
            }`}
          >
            {isProcessing ? (
              <span className="google-symbols text-[24px] animate-spin">sync</span>
            ) : (
              <span className="google-symbols text-[24px]">arrow_forward</span>
            )}
          </button>
        </div>
      </div>
    </section>
  )
}
