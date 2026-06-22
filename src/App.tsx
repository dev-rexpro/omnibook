import { useState, useEffect } from "react"
import { Header } from "@/components/Header"
import { LeftSidebar } from "@/components/LeftSidebar"
import { RightSidebar } from "@/components/RightSidebar"
import { ChatPanel } from "@/components/ChatPanel"
import { Footer } from "@/components/Footer"
import { CreateSourceDialog } from "@/components/CreateSourceDialog"
import { CustomizeAudioOverviewDialog } from "@/components/CustomizeAudioOverviewDialog"
import { CustomizeSlideDeckDialog } from "@/components/CustomizeSlideDeckDialog"
import { CustomizeInfographicDialog } from "@/components/CustomizeInfographicDialog"
import { CustomizeDataTableDialog } from "@/components/CustomizeDataTableDialog"
import { CustomizeNotebookDialog } from "@/components/CustomizeNotebookDialog"
import { CustomizeMindMapDialog } from "@/components/CustomizeMindMapDialog"
import { CustomizeFlashcardsDialog } from "@/components/CustomizeFlashcardsDialog"
import { CustomizeQuizDialog } from "@/components/CustomizeQuizDialog"
import { HomePage } from "@/components/HomePage"
import { AuthPage } from "@/components/AuthPage"
import { useAuthStore } from "@/store/useAuthStore"
import { useTheme } from "@/components/theme-provider"
import { useNotebookStore, type Citation } from "@/store/useNotebookStore"
import { getNotebookNotes, saveNotebookNotes } from "@/lib/db"
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
} from "@/components/ui/dropdown-menu"

export function App() {
  // Auth state from store
  const { isAuthenticated, isLoading: isAuthLoading, initSession, user, signOut } = useAuthStore()
  const { theme, setTheme } = useTheme()
  const [mobileMenuView, setMobileMenuView] = useState<"main" | "theme">("main")
  const [mobileDropdownOpen, setMobileDropdownOpen] = useState(false)

  const handleMobileOpenChange = (open: boolean) => {
    setMobileDropdownOpen(open)
    if (!open) {
      setMobileMenuView("main")
    }
  }

  // Restore session on mount
  useEffect(() => {
    initSession()
  }, [initSession])

  // Page routing state
  const [currentPage, setCurrentPage] = useState<"home" | "notebook">("home")
  const [loadingTitle, setLoadingTitle] = useState<string | null>(null)

  // Zustand Notebook Store integration
  const {
    notebooks,
    currentNotebook,
    loadNotebooks,
    createNotebook,
    deleteNotebook,
    setCurrentNotebook,
    updateNotebookTitle,
    updateNotebookCover
  } = useNotebookStore()

  // Load notebooks when user session is initialized
  useEffect(() => {
    if (user) {
      loadNotebooks()
    }
  }, [user, loadNotebooks])

  const notebookTitle = currentNotebook?.title || "Untitled notebook"
  const notebookCover = currentNotebook?.cover || null

  // Local state for notes (persisted locally in IndexedDB keyed by notebook id)
  const [notes, setNotes] = useState<any[]>([])
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null)

  // Load notebook specific notes when active notebook switches
  useEffect(() => {
    if (currentNotebook?.id) {
      getNotebookNotes(currentNotebook.id)
        .then((storedNotes) => {
          setNotes(storedNotes || [])
        })
        .catch((err) => {
          console.error("Failed to load notebook notes:", err)
          setNotes([])
        })
    } else {
      setNotes([])
    }
    setSelectedNoteId(null)
  }, [currentNotebook?.id])

  // Save notes back to IndexedDB on notes change
  useEffect(() => {
    if (currentNotebook?.id) {
      saveNotebookNotes(currentNotebook.id, notes).catch((err) => {
        console.error("Failed to save notebook notes to IndexedDB:", err)
      })
    }
  }, [notes, currentNotebook?.id])

  // HomePage component compatibility mapping
  const myNotebooks = notebooks.map((nb) => ({
    id: nb.id,
    title: nb.title,
    cover: nb.cover || null,
    date: new Date(nb.created_at).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }),
    sources: 0, // dynamic source counter loads once notebook is selected
  }))

  const setMyNotebooksWrapper = (updaterOrValue: any) => {
    if (typeof updaterOrValue === "function") {
      const dummyPrev = notebooks.map((n) => ({ id: n.id, title: n.title, cover: n.cover || null }))
      const updated = updaterOrValue(dummyPrev)

      // Handle delete notebook
      if (updated.length < dummyPrev.length) {
        const deletedId = dummyPrev.find((n) => !updated.some((u: any) => u.id === n.id))?.id
        if (deletedId) {
          deleteNotebook(deletedId)
        }
      }
      // Handle title updates
      else {
        const edited = updated.find((u: any, idx: number) => u.title !== dummyPrev[idx]?.title)
        if (edited) {
          updateNotebookTitle(edited.id, edited.title)
        }
      }
    }
  }

  // Handlers for dynamic state sync
  const handleTitleChange = (newTitle: string) => {
    if (currentNotebook) {
      updateNotebookTitle(currentNotebook.id, newTitle)
    }
  }

  const handleCoverChange = (newCover: string | null) => {
    if (currentNotebook) {
      updateNotebookCover(currentNotebook.id, newCover)
    }
  }

  const [isLeftCollapsed, setIsLeftCollapsed] = useState(false)
  const [isRightCollapsed, setIsRightCollapsed] = useState(false)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isAudioDialogOpen, setIsAudioDialogOpen] = useState(false)
  const [isSlideDialogOpen, setIsSlideDialogOpen] = useState(false)
  const [isInfographicDialogOpen, setIsInfographicDialogOpen] = useState(false)
  const [isDataTableDialogOpen, setIsDataTableDialogOpen] = useState(false)
  const [isNotebookDialogOpen, setIsNotebookDialogOpen] = useState(false)
  const [isMindMapDialogOpen, setIsMindMapDialogOpen] = useState(false)
  const [isFlashcardsDialogOpen, setIsFlashcardsDialogOpen] = useState(false)
  const [isQuizDialogOpen, setIsQuizDialogOpen] = useState(false)
  const [activeMobileTab, setActiveMobileTab] = useState<"sources" | "chat" | "studio">("sources")

  const handleSaveToNote = (queryText: string, responseText: string, citations?: Citation[]) => {
    const cleanTitle = queryText.startsWith("Generate a ")
      ? queryText.replace("Generate a ", "")
      : queryText.startsWith("Generate an ")
        ? queryText.replace("Generate an ", "")
        : queryText

    const title = cleanTitle.charAt(0).toUpperCase() + cleanTitle.slice(1)

    const newNote = {
      id: `note-${Date.now()}`,
      title: title,
      content: responseText,
      createdAt: new Date().toISOString(),
      citations: citations || [],
    }

    setNotes((prev) => [...prev, newNote])
  }

  const generateChatMock = (item: string) => {
    const userMsgText = `Generate a ${item}`
    let aiMsgText = ""
    let prompts: string[] = []

    if (item === "Quiz") {
      aiMsgText =
        "I'd love to help you create a quiz! To make it really effective and tailored to what you're studying, I first need some material to work with.\n\nNotebookLM is unique because it grounds everything in the **sources** you provide. Once you upload some content, I can generate a quiz that tests your knowledge on those specific details.\n\n**Here’s how to get started:**\n• **Upload your own:** Head over to the **Source Panel** on the left and add PDFs, Google Docs, website links, or even YouTube videos.\n• **Discover new ones:** If you don't have files handy, use the **\"Fast Research\"** or **\"Deep Research\"** options in the source panel to find information on the web.\n\nOnce your sources are in, just let me know, and I can generate a multiple-choice quiz or even flashcards in the **Studio Panel**!\n\nWhat subject are you currently working on? I can help you find some great sources to start with if you'd like!"
      prompts = [
        "I am working on a history project.",
        "How do I use Fast Research to find sources?",
        "Can you make a quiz from a YouTube video?",
      ]
    } else if (item === "Audio Overview") {
      aiMsgText =
        "I'd love to help you generate an Audio Overview! This will create a high-quality conversation between two virtual hosts discussing your documents.\n\n**Settings available:**\n• Choose language (English, Indonesian, etc.)\n• Audio length (Short, Medium, Long)\n• Host focus area\n\nOnce you customize the settings, click Generate in the dialog to start producing the podcast!"
      prompts = [
        "Can I download the audio file?",
        "How long does audio generation take?",
        "How do I customize the host focus?",
      ]
    } else if (item === "Slide Deck") {
      aiMsgText =
        "I'd love to help you build a Slide Deck! I will synthesize your sources into structured presentation slides with key topics and key takeaways.\n\n**Slide Deck format details:**\n• Slide outline based on active sources\n• Visual styling matching your custom covers\n• Slide notes ready for presenting\n\nTo begin, open the Customize Slide Deck dialog, select your presentation template, and click Generate!"
      prompts = [
        "Can I export slides to Google Slides?",
        "How many slides can I generate?",
        "What presentation templates are available?",
      ]
    } else if (item === "Infographic") {
      aiMsgText =
        "I'd love to help you create an Infographic! I will compile your sources and design a beautiful format matching your selection.\n\nTo begin, ensure you have uploaded documents in the left panel, and then click Customize or Generate on the Infographic card."
      prompts = [
        "What is the typical format of an Infographic?",
        "How do I select sources for this output?",
        "Can I convert it to a source note?",
      ]
    } else if (item === "Data Table") {
      aiMsgText =
        "I'd love to help you create a Data Table! I will extract facts, metrics, and comparisons from your sources and format them into a structured database.\n\nTo begin, ensure you have uploaded documents in the left panel, and click Generate."
      prompts = [
        "What columns will the table have?",
        "Can I export the table to CSV?",
        "How do I filter the data?",
      ]
    } else {
      aiMsgText = `I'd love to help you create a ${item}! I will compile your sources and design a beautiful format matching your selection.\n\nTo begin, ensure you have uploaded documents in the left panel, and then click Customize or Generate on the ${item} card.`
      prompts = [
        `What is the typical format of a ${item}?`,
        "How do I select sources for this output?",
        "Can I convert it to a source note?",
      ]
    }

    const { addMessage } = useNotebookStore.getState()

    const newUserMsg = {
      id: `user-sidebar-${Date.now()}`,
      sender: "user" as const,
      text: userMsgText,
      type: item.toLowerCase().replace(" ", "_"),
    }

    const newAiMsg = {
      id: `ai-sidebar-${Date.now()}`,
      sender: "ai" as const,
      text: aiMsgText,
      type: item.toLowerCase().replace(" ", "_"),
      suggestedPrompts: prompts,
    }

    addMessage(newUserMsg)
    addMessage(newAiMsg)
    setActiveMobileTab("chat")
  }

  const handleRightSidebarCardClick = (item: string) => {
    if (item === "Audio Overview") {
      setIsAudioDialogOpen(true)
    } else if (item === "Slide Deck") {
      setIsSlideDialogOpen(true)
    } else if (item === "Infographic") {
      setIsInfographicDialogOpen(true)
    } else if (item === "Data Table") {
      setIsDataTableDialogOpen(true)
    } else if (item === "Mind Map") {
      setIsMindMapDialogOpen(true)
    } else if (item === "Flashcards") {
      setIsFlashcardsDialogOpen(true)
    } else if (item === "Quiz") {
      setIsQuizDialogOpen(true)
    } else {
      generateChatMock(item)
    }
  }

  const handleAddNote = () => {
    let newNote
    if (notes.length === 0) {
      newNote = {
        id: "note-1",
        title: "Initiating Your AI Video Synthesis Project",
        content:
          "I'd love to help you create a video overview! To get started, I just need some source material to work with. Since your notebook is currently empty, the best first step is to upload some content in the source panel on the left.\n\nYou can upload:\n• PDFs or Google Docs\n• Website links or YouTube videos\n• Plain text snippets\n\nOnce you've added your sources, I can synthesize that information into a narrated slide presentation with AI-generated visuals. If you don't have files ready, I can even help you find",
        createdAt: new Date(Date.now() - 37 * 60 * 1000).toISOString(),
      }
    } else if (notes.length === 1) {
      newNote = {
        id: "note-2",
        title: "New Note",
        content: "Write your note content here...",
        createdAt: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
      }
    } else {
      newNote = {
        id: `note-${Date.now()}`,
        title: `New Note ${notes.length + 1}`,
        content: "Write your note content here...",
        createdAt: new Date().toISOString(),
      }
    }
    setNotes((prev) => [...prev, newNote])
  }

  const handleDeleteNote = (id: string) => {
    setNotes((prev) => prev.filter((note) => note.id !== id))
    if (selectedNoteId === id) {
      setSelectedNoteId(null)
    }
  }

  const startLoading = (title: string, destination: "home" | "notebook") => {
    setLoadingTitle(title)
    setTimeout(() => {
      setSelectedNoteId(null)
      setCurrentPage(destination)
      setLoadingTitle(null)
    }, 1200)
  }

  const handleCreateNotebook = async () => {
    const newNb = await createNotebook()
    if (newNb) {
      setCurrentNotebook(newNb)
      startLoading("Untitled notebook", "notebook")
    }
  }

  const handleOpenNotebook = (idOrTitle: string) => {
    const nb = notebooks.find((n) => n.id === idOrTitle || n.title === idOrTitle)
    if (nb) {
      setCurrentNotebook(nb)
      startLoading(nb.title, "notebook")
    } else {
      const existing = notebooks.find((n) => n.title === idOrTitle)
      if (existing) {
        setCurrentNotebook(existing)
        startLoading(existing.title, "notebook")
      } else {
        createNotebook().then((newNb) => {
          if (newNb) {
            if (idOrTitle !== "Untitled notebook") {
              updateNotebookTitle(newNb.id, idOrTitle).then(() => {
                setCurrentNotebook({ ...newNb, title: idOrTitle })
                startLoading(idOrTitle, "notebook")
              })
            } else {
              setCurrentNotebook(newNb)
              startLoading("Untitled notebook", "notebook")
            }
          }
        })
      }
    }
  }

  const handleNavigateToHome = () => {
    setCurrentPage("home")
  }

  // ─── Initializing Session ───
  if (isAuthLoading) {
    return (
      <div className="fixed inset-0 bg-background flex flex-col items-center justify-center z-[9999] select-none">
        <div className="flex flex-col items-center gap-6 text-center">
          <div className="relative w-16 h-16 flex items-center justify-center">
            <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-zinc-950 border-r-zinc-950 dark:border-t-zinc-50 dark:border-r-zinc-50 animate-spin" />
            <div className="w-8 h-8 rounded-full bg-zinc-950 dark:bg-zinc-50 flex items-center justify-center">
              <span className="google-symbols text-[16px] text-zinc-50 dark:text-zinc-950 animate-pulse">
                sync
              </span>
            </div>
          </div>
          <div className="space-y-1">
            <h3 className="text-[14px] font-semibold text-foreground tracking-wide font-sans">
              Initializing OmnibookLM
            </h3>
            <p className="text-[12px] text-muted-foreground font-sans">
              Please wait...
            </p>
          </div>
        </div>
      </div>
    )
  }

  // ─── Unauthenticated Auth Page ───
  if (!isAuthenticated) {
    return <AuthPage />
  }

  // ─── Authenticated Render ───
  return (
    <>
      {currentPage === "home" ? (
        <HomePage
          onCreateNotebook={handleCreateNotebook}
          onOpenNotebook={handleOpenNotebook}
          myNotebooks={myNotebooks}
          setMyNotebooks={setMyNotebooksWrapper}
        />
      ) : (
        <div className="font-sans h-screen flex flex-col overflow-hidden relative bg-background text-foreground">
          {/* Mobile Workspaces View */}
          <div className="md:hidden flex flex-col h-screen bg-background text-foreground overflow-hidden relative">
            {/* Mobile Header Row 1 */}
            <header className="h-[56px] px-4 flex items-center justify-between bg-background flex-shrink-0">
              <div className="flex items-center gap-2 min-w-0">
                <a
                  href="#"
                  className="icon-container-active w-7 h-7 flex-shrink-0 flex items-center justify-center cursor-pointer"
                  onClick={(e) => {
                    e.preventDefault()
                    handleNavigateToHome()
                  }}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="lucide lucide-ratio"
                  >
                    <rect width="12" height="20" x="6" y="2" rx="2" />
                    <rect width="20" height="12" x="2" y="6" rx="2" />
                  </svg>
                </a>
                <span className="text-[16px] font-bold truncate max-w-[150px] font-sans">
                  {notebookTitle}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <DropdownMenu open={mobileDropdownOpen} onOpenChange={handleMobileOpenChange}>
                  <DropdownMenuTrigger asChild>
                    <button 
                      className="w-8 h-8 flex items-center justify-center text-muted-foreground hover:text-foreground rounded-full transition cursor-pointer outline-none bg-transparent border-none"
                    >
                      <span className="google-symbols text-[20px]">settings</span>
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    align="end"
                    sideOffset={6}
                    className="w-[200px] bg-popover text-popover-foreground border border-border rounded-lg shadow-lg py-1.5 z-50 text-[14px] flex flex-col font-sans outline-none"
                  >
                    {mobileMenuView === "main" ? (
                      <div className="flex flex-col w-full">
                        <button
                          onClick={() => {
                            setMobileDropdownOpen(false)
                            setIsNotebookDialogOpen(true)
                          }}
                          className="flex items-center justify-between px-3 py-1.5 hover:bg-accent hover:text-accent-foreground text-left w-full transition-colors outline-none cursor-pointer border-none bg-transparent text-[14px] font-sans"
                        >
                          <div className="flex items-center gap-2">
                            <span className="google-symbols text-[16px]">rule_settings</span>
                            <span>Change Model</span>
                          </div>
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            setMobileMenuView("theme")
                          }}
                          className="flex items-center justify-between px-3 py-1.5 hover:bg-accent hover:text-accent-foreground text-left w-full transition-colors outline-none cursor-pointer border-none bg-transparent text-[14px] font-sans"
                        >
                          <div className="flex items-center gap-2">
                            <span className="google-symbols text-[16px]">tonality</span>
                            <span>Switch Theme</span>
                          </div>
                          <span className="google-symbols text-[16px] text-muted-foreground">
                            chevron_right
                          </span>
                        </button>
                      </div>
                    ) : (
                      <div className="flex flex-col w-full">
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            setMobileMenuView("main")
                          }}
                          className="flex items-center gap-2 px-3 py-1.5 hover:bg-accent hover:text-accent-foreground text-left w-full transition-colors border-b border-border mb-1 text-muted-foreground hover:text-foreground outline-none cursor-pointer border-none bg-transparent text-[14px] font-sans"
                        >
                          <span className="google-symbols text-[16px]">arrow_back</span>
                          <span className="font-medium">Back</span>
                        </button>

                        <button
                          className="flex items-center justify-between px-3 py-1.5 hover:bg-accent hover:text-accent-foreground text-left w-full transition-colors outline-none cursor-pointer border-none bg-transparent text-[14px] font-sans"
                          onClick={() => {
                            setTheme("light")
                            setMobileDropdownOpen(false)
                          }}
                        >
                          <div className="flex items-center gap-2">
                            <span className="google-symbols text-[16px]">light_mode</span>
                            <span>Light</span>
                          </div>
                          {theme === "light" && (
                            <span className="google-symbols text-[16px] text-foreground">
                              check
                            </span>
                          )}
                        </button>

                        <button
                          className="flex items-center justify-between px-3 py-1.5 hover:bg-accent hover:text-accent-foreground text-left w-full transition-colors outline-none cursor-pointer border-none bg-transparent text-[14px] font-sans"
                          onClick={() => {
                            setTheme("dark")
                            setMobileDropdownOpen(false)
                          }}
                        >
                          <div className="flex items-center gap-2">
                            <span className="google-symbols text-[16px]">dark_mode</span>
                            <span>Dark</span>
                          </div>
                          {theme === "dark" && (
                            <span className="google-symbols text-[16px] text-foreground">
                              check
                            </span>
                          )}
                        </button>

                        <button
                          className="flex items-center justify-between px-3 py-1.5 hover:bg-accent hover:text-accent-foreground text-left w-full transition-colors outline-none cursor-pointer border-none bg-transparent text-[14px] font-sans"
                          onClick={() => {
                            setTheme("system")
                            setMobileDropdownOpen(false)
                          }}
                        >
                          <div className="flex items-center gap-2">
                            <span className="google-symbols text-[16px]">desktop_windows</span>
                            <span>System</span>
                          </div>
                          {theme === "system" && (
                            <span className="google-symbols text-[16px] text-foreground">
                              check
                            </span>
                          )}
                        </button>
                      </div>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="w-[32px] h-[32px] rounded-full border border-border overflow-hidden bg-card flex items-center justify-center hover:opacity-90 transition outline-none cursor-pointer p-0">
                      <img
                        src={user?.avatarUrl || "https://ui-avatars.com/api/?name=User&background=f4f4f5&color=09090b&bold=true"}
                        className="w-full h-full object-cover"
                        alt="User Profile"
                      />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    align="end"
                    sideOffset={6}
                    className="w-[200px] bg-popover text-popover-foreground border border-border rounded-lg shadow-lg py-2 z-50 flex flex-col font-sans outline-none text-[13px]"
                  >
                    <div className="px-3 py-1.5 border-b border-border flex flex-col select-none">
                      <span className="font-semibold text-foreground truncate">{user?.name || "User"}</span>
                      <span className="text-[11px] text-muted-foreground truncate">{user?.email || ""}</span>
                    </div>
                    <button
                      onClick={() => signOut()}
                      className="flex items-center gap-2.5 px-3 py-2 hover:bg-destructive/10 hover:text-destructive text-left w-full transition-colors outline-none cursor-pointer text-destructive font-sans border-none bg-transparent text-[13px]"
                    >
                      <span className="google-symbols text-[16px]">logout</span>
                      <span>Sign Out</span>
                    </button>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </header>

            {/* Mobile Header Row 2 */}
            <div className="h-[48px] px-4 flex items-center justify-between bg-background flex-shrink-0">
              <button 
                onClick={handleCreateNotebook}
                className="h-[32px] px-4 bg-zinc-950 text-zinc-50 border border-zinc-950 dark:bg-zinc-50 dark:text-zinc-950 dark:border-zinc-50 rounded-full flex items-center gap-1.5 text-[12px] font-semibold active:scale-[0.98] transition-all shadow-sm cursor-pointer outline-none font-sans"
              >
                <span className="google-symbols text-[16px]">add</span>
                Create notebook
              </button>
            </div>

            {/* Mobile Tab Navigation Row 3 */}
            <nav className="h-[48px] flex border-b border-border bg-background flex-shrink-0 select-none">
              {(["sources", "chat", "studio"] as const).map((tab) => {
                const isActive = activeMobileTab === tab
                const label = tab.charAt(0).toUpperCase() + tab.slice(1)
                return (
                  <button
                    key={tab}
                    onClick={() => setActiveMobileTab(tab)}
                    className="flex-1 flex flex-col items-center justify-center text-[14px] font-semibold relative cursor-pointer outline-none border-none bg-transparent transition-colors font-sans text-foreground"
                  >
                    <span className={isActive ? "text-foreground" : "text-muted-foreground hover:text-foreground"}>
                      {label}
                    </span>
                    {isActive && (
                      <div className="absolute bottom-0 left-[20%] right-[20%] h-[3px] bg-primary rounded-t-full" />
                    )}
                  </button>
                )
              })}
            </nav>

            {/* Mobile Content Area */}
            <div className="flex-1 overflow-hidden relative flex flex-col bg-background">
              {activeMobileTab === "sources" && (
                <LeftSidebar
                  isCollapsed={false}
                  onToggleCollapse={() => {}}
                  onAddSourceClick={() => setIsDialogOpen(true)}
                  isMobile={true}
                />
              )}

              {activeMobileTab === "chat" && (
                <ChatPanel
                  notebookTitle={notebookTitle}
                  notebookCover={notebookCover}
                  onCustomizeClick={() => setIsNotebookDialogOpen(true)}
                  isMobile={true}
                  onSaveToNote={handleSaveToNote}
                />
              )}

              {activeMobileTab === "studio" && (
                <RightSidebar
                  isCollapsed={false}
                  onToggleCollapse={() => {}}
                  notes={notes}
                  selectedNoteId={selectedNoteId}
                  onNoteSelect={setSelectedNoteId}
                  onAddNoteClick={handleAddNote}
                  onDeleteNote={handleDeleteNote}
                  onChevronClick={handleRightSidebarCardClick}
                  isMobile={true}
                />
              )}
            </div>
          </div>

          {/* Desktop Workspaces Header */}
          <div className="hidden md:block">
            <Header
              notebookTitle={notebookTitle}
              onTitleChange={handleTitleChange}
              onLogoClick={handleNavigateToHome}
              onCreateNotebook={handleCreateNotebook}
            />
          </div>

          {/* Main desktop dashboard content area */}
          <main className="hidden md:flex flex-1 flex-row gap-4 px-4 pb-[2px] overflow-hidden bg-background text-foreground">
            <LeftSidebar
              isCollapsed={isLeftCollapsed}
              onToggleCollapse={() => setIsLeftCollapsed(!isLeftCollapsed)}
              onAddSourceClick={() => setIsDialogOpen(true)}
            />

            <ChatPanel
              notebookTitle={notebookTitle}
              notebookCover={notebookCover}
              onCustomizeClick={() => setIsNotebookDialogOpen(true)}
              onSaveToNote={handleSaveToNote}
            />

            <RightSidebar
              isCollapsed={isRightCollapsed}
              onToggleCollapse={() => setIsRightCollapsed(!isRightCollapsed)}
              notes={notes}
              selectedNoteId={selectedNoteId}
              onNoteSelect={setSelectedNoteId}
              onAddNoteClick={handleAddNote}
              onDeleteNote={handleDeleteNote}
              onChevronClick={handleRightSidebarCardClick}
            />
          </main>

          {/* Desktop Footer notice */}
          <div className="hidden md:block">
            <Footer />
          </div>

          {/* Upload files / Sources dialog overlay */}
          <CreateSourceDialog open={isDialogOpen} onOpenChange={setIsDialogOpen} />

          {/* Audio overview customization dialog overlay */}
          <CustomizeAudioOverviewDialog
            open={isAudioDialogOpen}
            onOpenChange={setIsAudioDialogOpen}
            onGenerate={() => generateChatMock("Audio Overview")}
          />

          {/* Slide deck customization dialog overlay */}
          <CustomizeSlideDeckDialog
            open={isSlideDialogOpen}
            onOpenChange={setIsSlideDialogOpen}
            onGenerate={() => generateChatMock("Slide Deck")}
          />

          {/* Infographic customization dialog overlay */}
          <CustomizeInfographicDialog
            open={isInfographicDialogOpen}
            onOpenChange={setIsInfographicDialogOpen}
            onGenerate={() => generateChatMock("Infographic")}
          />

          {/* Data table customization dialog overlay */}
          <CustomizeDataTableDialog
            open={isDataTableDialogOpen}
            onOpenChange={setIsDataTableDialogOpen}
            onGenerate={() => generateChatMock("Data Table")}
          />

          {/* Notebook customization dialog overlay */}
          <CustomizeNotebookDialog
            open={isNotebookDialogOpen}
            onOpenChange={setIsNotebookDialogOpen}
            notebookTitle={notebookTitle}
            onTitleChange={handleTitleChange}
            notebookCover={notebookCover}
            onCoverChange={handleCoverChange}
          />

          {/* Mind map customization dialog overlay */}
          <CustomizeMindMapDialog
            open={isMindMapDialogOpen}
            onOpenChange={setIsMindMapDialogOpen}
            onGenerate={() => generateChatMock("Mind Map")}
          />

          {/* Flashcards customization dialog overlay */}
          <CustomizeFlashcardsDialog
            open={isFlashcardsDialogOpen}
            onOpenChange={setIsFlashcardsDialogOpen}
            onGenerate={() => generateChatMock("Flashcards")}
          />

          {/* Quiz customization dialog overlay */}
          <CustomizeQuizDialog
            open={isQuizDialogOpen}
            onOpenChange={setIsQuizDialogOpen}
            onGenerate={() => generateChatMock("Quiz")}
          />
        </div>
      )}

      {/* Loading Overlay */}
      {loadingTitle && (
        <div className="fixed inset-0 bg-background/95 backdrop-blur-md flex flex-col items-center justify-center z-[9999] transition-all duration-300">
          <div className="flex flex-col items-center gap-6 max-w-sm px-6 text-center animate-fade-in">
            {/* Elegant Spinner & Book Icon */}
            <div className="relative w-16 h-16 flex items-center justify-center">
              {/* Outer spinning ring */}
              <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-zinc-950 border-r-zinc-950 dark:border-t-zinc-50 dark:border-r-zinc-50 animate-spin" />
              {/* Inner pulsing icon */}
              <div className="w-9 h-9 rounded-full bg-zinc-950 dark:bg-zinc-50 flex items-center justify-center animate-pulse">
                <span className="google-symbols text-[18px] text-zinc-50 dark:text-zinc-950 select-none">
                  menu_book
                </span>
              </div>
            </div>
            
            {/* Loading text with loading animation */}
            <div className="space-y-1.5">
              <h3 className="text-[15px] font-semibold text-foreground tracking-wide font-sans animate-pulse">
                Load {loadingTitle}...
              </h3>
              <p className="text-[12px] text-muted-foreground font-sans">
                Preparing your workspace
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export default App
