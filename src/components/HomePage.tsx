import { useState } from "react"
import { useTheme } from "@/components/theme-provider"
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu"
import {
  Dialog as ShadcnDialog,
  DialogContent as ShadcnDialogContent,
} from "@/components/ui/dialog"
import { useAuthStore } from "@/store/useAuthStore"

interface Notebook {
  id: string
  title: string
  date: string
  sources: number
  cover?: string | null
}

interface HomePageProps {
  onCreateNotebook: () => void
  onOpenNotebook: (idOrTitle: string) => void
  myNotebooks: Notebook[]
  setMyNotebooks: React.Dispatch<React.SetStateAction<Notebook[]>>
}

interface FeaturedNotebook {
  id: string
  creator: string
  initials: string
  bgColor: string
  title: string
  date: string
  sources: number
}

const INITIAL_FEATURED: FeaturedNotebook[] = [
  {
    id: "feat-1",
    creator: "Sir Arthur Conan Doyle",
    initials: "SA",
    bgColor: "#5d4037",
    title: "Complete Sherlock Holmes & Game",
    date: "May 27, 2026",
    sources: 62,
  },
  {
    id: "feat-2",
    creator: "Australian Foreign Affairs",
    initials: "AF",
    bgColor: "#1565c0",
    title: "The United States in a changing world",
    date: "Feb 2, 2026",
    sources: 19,
  },
  {
    id: "feat-3",
    creator: "The Economist",
    initials: "TE",
    bgColor: "#c62828",
    title: "The World Ahead 2025",
    date: "Jul 7, 2025",
    sources: 70,
  },
]

export function HomePage({ onCreateNotebook, onOpenNotebook, myNotebooks, setMyNotebooks }: HomePageProps) {
  const { theme, setTheme } = useTheme()
  const { user, signOut } = useAuthStore()
  const [activeTab, setActiveTab] = useState<"all" | "my" | "featured">("all")
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid")
  const [menuView, setMenuView] = useState<"main" | "theme">("main")
  const [dropdownOpen, setDropdownOpen] = useState(false)

  // Stateful notebooks
  const [featuredNotebooks] = useState<FeaturedNotebook[]>(INITIAL_FEATURED)

  // Delete confirmation
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null)

  // Edit title
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingTitle, setEditingTitle] = useState("")

  const handleSettingsOpenChange = (open: boolean) => {
    setDropdownOpen(open)
    if (!open) setMenuView("main")
  }

  const handleDeleteNotebook = (id: string) => {
    setMyNotebooks(prev => prev.filter(nb => nb.id !== id))
    setDeleteTargetId(null)
  }

  const handleStartEdit = (nb: Notebook) => {
    setEditingId(nb.id)
    setEditingTitle(nb.title)
  }

  const handleSaveEdit = () => {
    if (editingId && editingTitle.trim()) {
      setMyNotebooks(prev =>
        prev.map(nb => nb.id === editingId ? { ...nb, title: editingTitle.trim() } : nb)
      )
    }
    setEditingId(null)
    setEditingTitle("")
  }

  // Visibility flags
  const showFeatured = activeTab === "all" || activeTab === "featured"
  const showMy = activeTab === "all" || activeTab === "my"

  // ─── Reusable card renderers ───

  const renderFeaturedGridCard = (nb: FeaturedNotebook) => (
    <div
      key={nb.id}
      onClick={() => onOpenNotebook(nb.title)}
      className="home-notebook-card group bg-card border border-border rounded-2xl p-4 flex flex-col cursor-pointer hover:bg-accent hover:border-accent transition-all duration-200 min-h-[180px] relative"
    >
      <div className="flex items-start justify-between mb-auto">
        <div
          className="w-[36px] h-[36px] rounded-full flex items-center justify-center flex-shrink-0 text-white text-[13px] font-bold font-sans select-none"
          style={{ backgroundColor: nb.bgColor }}
        >
          {nb.initials}
        </div>
      </div>
      <div className="mt-4">
        <h3 className="text-[14px] font-semibold text-foreground leading-snug mb-1 font-sans line-clamp-2">
          {nb.title}
        </h3>
        <span className="text-[12px] text-muted-foreground font-medium font-sans">
          {nb.date} · {nb.sources} sources
        </span>
      </div>
    </div>
  )

  const renderMyGridCard = (nb: Notebook) => (
    <div
      key={nb.id}
      onClick={() => onOpenNotebook(nb.id)}
      className={`home-notebook-card group border rounded-2xl p-4 flex flex-col cursor-pointer transition-all duration-200 min-h-[180px] relative justify-between ${
        nb.cover 
          ? "border-border/40 bg-cover bg-center shadow-sm" 
          : "bg-card hover:bg-accent border-border"
      }`}
      style={nb.cover ? { backgroundImage: `url(${nb.cover})` } : undefined}
    >
      {nb.cover && (
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-black/10 pointer-events-none z-0 rounded-2xl" />
      )}

      <div className="flex items-start justify-between mb-auto relative z-10 w-full">
        <span className={`material-symbols-outlined text-[28px] ${nb.cover ? "text-white" : "text-foreground"}`}>
          menu_book
        </span>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              onClick={(e) => e.stopPropagation()}
              className={`w-7 h-7 rounded-full flex items-center justify-center transition-all cursor-pointer outline-none border-none bg-transparent opacity-0 group-hover:opacity-100 ${
                nb.cover 
                  ? "text-white hover:bg-white/20" 
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              }`}
            >
              <span className="material-symbols-outlined text-[18px]">more_vert</span>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            sideOffset={4}
            className="w-[180px] bg-popover text-popover-foreground border border-border rounded-lg shadow-lg py-1.5 z-50 text-[13px] flex flex-col font-sans outline-none"
          >
            <DropdownMenuItem
              onClick={(e) => { e.stopPropagation(); handleStartEdit(nb) }}
              className="flex items-center gap-2.5 px-3 py-2 hover:bg-accent hover:text-accent-foreground text-left w-full transition-colors outline-none cursor-pointer font-sans"
            >
              <span className="material-symbols-outlined text-[18px] text-muted-foreground">edit</span>
              <span>Edit title</span>
            </DropdownMenuItem>
            <div className="h-px bg-border my-1" />
            <DropdownMenuItem
              onClick={(e) => { e.stopPropagation(); setDeleteTargetId(nb.id) }}
              className="flex items-center gap-2.5 px-3 py-2 hover:bg-destructive/10 hover:text-destructive text-left w-full transition-colors outline-none cursor-pointer text-destructive font-sans"
            >
              <span className="material-symbols-outlined text-[18px]">delete</span>
              <span>Delete</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <div className="mt-4 relative z-10">
        <h3 className={`text-[14px] font-semibold leading-snug mb-1 font-sans line-clamp-2 ${nb.cover ? "text-white" : "text-foreground"}`}>
          {nb.title}
        </h3>
        <span className={`text-[12px] font-medium font-sans ${nb.cover ? "text-white/70" : "text-muted-foreground"}`}>
          {nb.date} · {nb.sources} sources
        </span>
      </div>
    </div>
  )

  const renderMyListRow = (nb: Notebook) => (
    <div
      key={nb.id}
      onClick={() => onOpenNotebook(nb.id)}
      className="flex md:grid md:grid-cols-[1fr_120px_140px_100px_40px] items-center justify-between md:justify-start px-4 py-3 border-b border-border hover:bg-accent/50 cursor-pointer transition-colors group gap-2"
    >
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <span className="material-symbols-outlined text-[22px] text-foreground flex-shrink-0">menu_book</span>
        <div className="flex flex-col min-w-0">
          <span className="text-[14px] font-medium text-foreground truncate font-sans">
            {nb.title}
          </span>
          <span className="md:hidden text-[12px] text-muted-foreground font-sans mt-0.5">
            {nb.sources} sources · {nb.date}
          </span>
        </div>
      </div>
      <span className="hidden md:inline text-[13px] text-foreground font-sans">{nb.sources} Sources</span>
      <span className="hidden md:inline text-[13px] text-foreground font-sans">{nb.date}</span>
      <span className="hidden md:inline text-[13px] text-foreground font-sans">Owner</span>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            onClick={(e) => e.stopPropagation()}
            className="w-7 h-7 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-all cursor-pointer outline-none border-none bg-transparent flex-shrink-0"
          >
            <span className="material-symbols-outlined text-[18px]">more_vert</span>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
          sideOffset={4}
          className="w-[180px] bg-popover text-popover-foreground border border-border rounded-lg shadow-lg py-1.5 z-50 text-[13px] flex flex-col font-sans outline-none"
        >
          <DropdownMenuItem
            onClick={(e) => { e.stopPropagation(); handleStartEdit(nb) }}
            className="flex items-center gap-2.5 px-3 py-2 hover:bg-accent hover:text-accent-foreground text-left w-full transition-colors outline-none cursor-pointer font-sans"
          >
            <span className="material-symbols-outlined text-[18px] text-muted-foreground">edit</span>
            <span>Edit title</span>
          </DropdownMenuItem>
          <div className="h-px bg-border my-1" />
          <DropdownMenuItem
            onClick={(e) => { e.stopPropagation(); setDeleteTargetId(nb.id) }}
            className="flex items-center gap-2.5 px-3 py-2 hover:bg-destructive/10 hover:text-destructive text-left w-full transition-colors outline-none cursor-pointer text-destructive font-sans"
          >
            <span className="material-symbols-outlined text-[18px]">delete</span>
            <span>Delete</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )

  const renderFeaturedListRow = (nb: FeaturedNotebook) => (
    <div
      key={nb.id}
      onClick={() => onOpenNotebook(nb.title)}
      className="flex md:grid md:grid-cols-[1fr_120px_140px_40px_100px_40px] items-center justify-between md:justify-start px-4 py-3 border-b border-border hover:bg-accent/50 cursor-pointer transition-colors group gap-2"
    >
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <div
          className="w-[24px] h-[24px] rounded-full flex items-center justify-center flex-shrink-0 text-white text-[9px] font-bold font-sans select-none"
          style={{ backgroundColor: nb.bgColor }}
        >
          {nb.initials}
        </div>
        <div className="flex flex-col min-w-0">
          <span className="text-[14px] font-medium text-foreground truncate font-sans">
            {nb.title}
          </span>
          <span className="md:hidden text-[12px] text-muted-foreground font-sans mt-0.5">
            {nb.sources} sources · {nb.date}
          </span>
        </div>
      </div>
      <span className="hidden md:inline text-[13px] text-foreground font-sans">{nb.sources} Sources</span>
      <span className="hidden md:inline text-[13px] text-foreground font-sans">{nb.date}</span>
      <span className="hidden md:inline material-symbols-outlined text-[18px] text-muted-foreground">language</span>
      <span className="hidden md:inline text-[13px] text-foreground font-sans">Reader</span>
      <span className="w-7 h-7 flex-shrink-0 md:inline"></span>
    </div>
  )

  return (
    <div className="home-page h-screen flex flex-col overflow-hidden bg-background text-foreground">
      {/* ─── Header ─── */}
      <header className="h-[56px] md:h-[64px] flex-shrink-0 flex items-center justify-between px-4 md:px-[28px] bg-background text-foreground z-30 border-b border-transparent">
        <div className="flex items-center gap-2 min-w-0">
          <div className="icon-container-active w-7 h-7 md:w-8 md:h-8 flex-shrink-0 flex items-center justify-center">
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
              className="lucide lucide-ratio md:w-[18px] md:h-[18px]"
            >
              <rect width="12" height="20" x="6" y="2" rx="2" />
              <rect width="20" height="12" x="2" y="6" rx="2" />
            </svg>
          </div>
          <span className="text-[16px] md:text-[18px] font-bold md:font-semibold tracking-tight text-foreground select-none font-sans truncate">
            OmnibookLM
          </span>
        </div>

        <div className="flex items-center gap-2 md:gap-3">
          {/* Settings Dropdown */}
          <DropdownMenu open={dropdownOpen} onOpenChange={handleSettingsOpenChange}>
            <DropdownMenuTrigger asChild>
              <button
                className="w-8 h-8 md:w-auto md:h-[34px] md:px-[14px] md:border md:border-border bg-transparent md:bg-background text-muted-foreground md:text-foreground rounded-full flex items-center justify-center md:justify-start gap-1.5 text-[13px] font-medium hover:text-foreground md:hover:bg-accent md:hover:text-accent-foreground active:scale-[0.98] transition-all md:shadow-sm cursor-pointer outline-none border-none md:border-solid"
              >
                <span className="material-symbols-outlined text-[20px] md:text-[18px]">settings</span>
                <span className="hidden md:inline">Settings</span>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              sideOffset={6}
              className="w-[200px] bg-popover text-popover-foreground border border-border rounded-lg shadow-lg py-1.5 z-50 text-[14px] flex flex-col font-sans outline-none"
            >
              {menuView === "main" ? (
                <div className="flex flex-col w-full">
                  <button
                    onClick={(e) => { e.stopPropagation(); setMenuView("theme") }}
                    className="flex items-center justify-between px-3 py-1.5 hover:bg-accent hover:text-accent-foreground text-left w-full transition-colors outline-none cursor-pointer"
                  >
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-[16px]">tonality</span>
                      <span>Switch Theme</span>
                    </div>
                    <span className="material-symbols-outlined text-[16px] text-muted-foreground">chevron_right</span>
                  </button>
                </div>
              ) : (
                <div className="flex flex-col w-full">
                  <button
                    onClick={(e) => { e.stopPropagation(); setMenuView("main") }}
                    className="flex items-center gap-2 px-3 py-1.5 hover:bg-accent hover:text-accent-foreground text-left w-full transition-colors border-b border-border mb-1 text-muted-foreground hover:text-foreground outline-none cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[16px]">arrow_back</span>
                    <span className="font-medium">Back</span>
                  </button>
                  {(["light", "dark", "system"] as const).map((t) => (
                    <button
                      key={t}
                      className="flex items-center justify-between px-3 py-1.5 hover:bg-accent hover:text-accent-foreground text-left w-full transition-colors outline-none cursor-pointer"
                      onClick={() => { setTheme(t); setDropdownOpen(false) }}
                    >
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-[16px]">
                          {t === "light" ? "light_mode" : t === "dark" ? "dark_mode" : "desktop_windows"}
                        </span>
                        <span className="capitalize">{t}</span>
                      </div>
                      {theme === t && (
                        <span className="material-symbols-outlined text-[16px] text-foreground">check</span>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Avatar Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="w-[32px] h-[32px] md:w-[36px] md:h-[36px] rounded-full border border-border overflow-hidden bg-card flex items-center justify-center hover:opacity-90 transition outline-none cursor-pointer p-0">
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
                <span className="material-symbols-outlined text-[16px]">logout</span>
                <span>Sign Out</span>
              </button>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {/* ─── Main Scrollable Content ─── */}
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-[1280px] mx-auto px-4 sm:px-10 pt-4 pb-16">

          {/* ─── Filter & Action Bar ─── */}
          <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
            {/* Left: Tabs */}
            <div className="w-full md:w-auto flex items-center gap-1 bg-muted rounded-full p-1 max-w-full overflow-x-auto no-scrollbar">
              {([
                { key: "all" as const, label: "All" },
                { key: "my" as const, label: "My notebooks" },
                { key: "featured" as const, label: "Featured notebooks" },
              ]).map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`flex-1 md:flex-initial text-center h-[32px] px-[16px] rounded-full text-[13px] font-medium transition-all cursor-pointer outline-none border-none font-sans whitespace-nowrap ${
                    activeTab === tab.key
                      ? "bg-background text-foreground shadow-sm"
                      : "bg-transparent text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Right: Actions */}
            <div className="flex items-center gap-2 flex-wrap">
              <button className="w-[36px] h-[36px] rounded-full border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent transition cursor-pointer outline-none bg-background">
                <span className="material-symbols-outlined text-[20px]">search</span>
              </button>
              <div className="flex items-center border border-border rounded-full overflow-hidden bg-background">
                <button
                  onClick={() => setViewMode("grid")}
                  className={`w-[36px] h-[36px] flex items-center justify-center transition cursor-pointer outline-none border-none ${
                    viewMode === "grid" ? "bg-accent text-foreground" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <span className="material-symbols-outlined text-[18px]">grid_view</span>
                </button>
                <button
                  onClick={() => setViewMode("list")}
                  className={`w-[36px] h-[36px] flex items-center justify-center transition cursor-pointer outline-none border-none ${
                    viewMode === "list" ? "bg-accent text-foreground" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <span className="material-symbols-outlined text-[18px]">view_list</span>
                </button>
              </div>
              <button className="h-[36px] px-[14px] border border-border bg-background text-foreground rounded-full flex items-center gap-1 text-[13px] font-medium hover:bg-accent transition cursor-pointer outline-none">
                Most recent
                <span className="material-symbols-outlined text-[16px]">arrow_drop_down</span>
              </button>
              <button
                onClick={onCreateNotebook}
                className="h-[36px] px-[18px] bg-zinc-950 text-zinc-50 dark:bg-zinc-50 dark:text-zinc-950 rounded-full flex items-center gap-1.5 text-[13px] font-semibold hover:opacity-90 active:scale-[0.98] transition-all cursor-pointer outline-none border-none font-sans shadow-sm"
              >
                <span className="material-symbols-outlined text-[18px]">add</span>
                Create new
              </button>
            </div>
          </div>

          {/* ═══════ GRID VIEW ═══════ */}
          {viewMode === "grid" ? (
            <>
              {showFeatured && (
                <section className="home-featured-section mb-2">
                  <h2 className="text-[16px] font-semibold text-foreground mb-4 font-sans">
                    Featured notebooks
                  </h2>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                    {featuredNotebooks.map(renderFeaturedGridCard)}
                  </div>
                  {activeTab === "all" && (
                    <div className="flex justify-end mb-4 mt-3">
                      <button className="h-[34px] px-[16px] border border-border bg-background text-foreground rounded-full flex items-center gap-1 text-[13px] font-medium hover:bg-accent transition cursor-pointer outline-none font-sans">
                        See all
                        <span className="material-symbols-outlined text-[16px]">chevron_right</span>
                      </button>
                    </div>
                  )}
                </section>
              )}

              {showMy && (
                <section className="home-recent-section mt-4">
                  <h2 className="text-[16px] font-semibold text-foreground mb-4 font-sans">
                    {activeTab === "my" ? "My notebooks" : "Recent notebooks"}
                  </h2>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                    <div
                      onClick={onCreateNotebook}
                      className="home-notebook-card group bg-card border-2 border-dashed border-border rounded-2xl flex flex-col items-center justify-center cursor-pointer hover:bg-accent hover:border-accent transition-all duration-200 min-h-[180px]"
                    >
                      <div className="w-[44px] h-[44px] rounded-full bg-muted flex items-center justify-center mb-3 group-hover:bg-background transition-colors">
                        <span className="material-symbols-outlined text-[24px] text-muted-foreground group-hover:text-foreground transition-colors">
                          add
                        </span>
                      </div>
                      <span className="text-[14px] font-medium text-foreground font-sans text-center px-2">
                        Create new notebook
                      </span>
                    </div>
                    {myNotebooks.map(renderMyGridCard)}
                  </div>
                </section>
              )}
            </>
          ) : (
            /* ═══════ LIST VIEW ═══════ */
            <>
              {showMy && (
                <section className="home-recent-section mb-10">
                  <h2 className="text-[16px] font-semibold text-foreground mb-4 font-sans">
                    {activeTab === "my" ? "My notebooks" : "Recent notebooks"}
                  </h2>
                  <div className="w-full">
                    <div className="hidden md:grid grid-cols-[1fr_120px_140px_100px_40px] items-center px-4 py-2 text-[12px] font-semibold text-muted-foreground uppercase tracking-wider font-sans border-b border-border">
                      <span>Title</span>
                      <span>Sources</span>
                      <span>Created</span>
                      <span>Role</span>
                      <span></span>
                    </div>
                    {myNotebooks.map(renderMyListRow)}
                  </div>
                </section>
              )}

              {showFeatured && (
                <section className="home-featured-section mb-6">
                  <h2 className="text-[16px] font-semibold text-foreground mb-4 font-sans">
                    Featured notebooks
                  </h2>
                  <div className="w-full">
                    <div className="hidden md:grid grid-cols-[1fr_120px_140px_40px_100px_40px] items-center px-4 py-2 text-[12px] font-semibold text-muted-foreground uppercase tracking-wider font-sans border-b border-border">
                      <span>Title</span>
                      <span>Sources</span>
                      <span>Created</span>
                      <span></span>
                      <span>Role</span>
                      <span></span>
                    </div>
                    {featuredNotebooks.map(renderFeaturedListRow)}
                  </div>
                  {activeTab === "all" && (
                    <div className="flex justify-end mb-4 mt-3">
                      <button className="h-[34px] px-[16px] border border-border bg-background text-foreground rounded-full flex items-center gap-1 text-[13px] font-medium hover:bg-accent transition cursor-pointer outline-none font-sans">
                        See all
                        <span className="material-symbols-outlined text-[16px]">chevron_right</span>
                      </button>
                    </div>
                  )}
                </section>
              )}
            </>
          )}

        </div>
      </main>

      {/* ─── Delete Confirmation Dialog ─── */}
      <ShadcnDialog open={deleteTargetId !== null} onOpenChange={(open) => { if (!open) setDeleteTargetId(null) }}>
        <ShadcnDialogContent
          showCloseButton={false}
          className="bg-popover text-popover-foreground rounded-[24px] border border-border shadow-2xl w-[90%] max-w-[360px] p-6 flex flex-col gap-4 outline-none z-50 font-sans"
        >
          <div className="flex flex-col gap-1.5">
            <h3 className="text-[17px] font-bold text-foreground tracking-tight">
              Delete notebook?
            </h3>
            <p className="text-[13px] text-muted-foreground leading-relaxed">
              This will permanently delete this notebook and all its contents. You won't be able to recover it.
            </p>
          </div>
          <div className="flex items-center justify-end gap-2.5 mt-2">
            <button
              onClick={() => setDeleteTargetId(null)}
              className="h-9 px-4 rounded-full text-[13px] font-semibold bg-muted hover:bg-accent text-foreground transition cursor-pointer outline-none border-none"
            >
              Cancel
            </button>
            <button
              onClick={() => { if (deleteTargetId) handleDeleteNotebook(deleteTargetId) }}
              className="h-9 px-4 rounded-full text-[13px] font-semibold bg-zinc-950 text-zinc-50 dark:bg-zinc-50 dark:text-zinc-950 hover:opacity-90 transition cursor-pointer outline-none border-none"
            >
              Delete
            </button>
          </div>
        </ShadcnDialogContent>
      </ShadcnDialog>

      {/* ─── Edit Title Dialog ─── */}
      <ShadcnDialog open={editingId !== null} onOpenChange={(open) => { if (!open) { setEditingId(null); setEditingTitle("") } }}>
        <ShadcnDialogContent
          showCloseButton={false}
          className="bg-popover text-popover-foreground rounded-[24px] border border-border shadow-2xl w-[90%] max-w-[400px] p-6 flex flex-col gap-4 outline-none z-50 font-sans"
        >
          <div className="flex flex-col gap-1.5">
            <h3 className="text-[17px] font-bold text-foreground tracking-tight">
              Edit notebook title
            </h3>
          </div>
          <input
            type="text"
            value={editingTitle}
            onChange={(e) => setEditingTitle(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") handleSaveEdit() }}
            className="w-full h-10 px-3 border border-border rounded-xl bg-background text-foreground text-[14px] outline-none focus:ring-1 focus:ring-ring focus:border-ring transition font-sans"
            autoFocus
            placeholder="Notebook title"
          />
          <div className="flex items-center justify-end gap-2.5 mt-1">
            <button
              onClick={() => { setEditingId(null); setEditingTitle("") }}
              className="h-9 px-4 rounded-full text-[13px] font-semibold bg-muted hover:bg-accent text-foreground transition cursor-pointer outline-none border-none"
            >
              Cancel
            </button>
            <button
              onClick={handleSaveEdit}
              className="h-9 px-4 rounded-full text-[13px] font-semibold bg-zinc-950 text-zinc-50 dark:bg-zinc-50 dark:text-zinc-950 hover:opacity-90 transition cursor-pointer outline-none border-none"
            >
              Save
            </button>
          </div>
        </ShadcnDialogContent>
      </ShadcnDialog>
    </div>
  )
}
