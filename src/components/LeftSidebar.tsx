
interface LeftSidebarProps {
  isCollapsed: boolean
  onToggleCollapse: () => void
  onAddSourceClick: () => void
  isMobile?: boolean
}

export function LeftSidebar({
  isCollapsed,
  onToggleCollapse,
  onAddSourceClick,
  isMobile = false,
}: LeftSidebarProps) {
  if (isMobile) {
    return (
      <div className="w-full flex-1 overflow-y-auto px-4 py-6 flex flex-col items-center bg-background">
        <button
          id="btnAddSourceMobile"
          onClick={onAddSourceClick}
          className="w-full h-9 border border-border bg-card text-foreground rounded-full flex items-center justify-center gap-2 text-[13px] font-medium hover:bg-accent active:scale-[0.98] transition-all mb-5 shadow-sm cursor-pointer outline-none"
        >
          <span className="material-symbols-outlined text-[18px]">add</span>
          Add sources
        </button>

        {/* Search The Web Inputs */}
        <div className="w-full bg-[#f9f9f9] dark:bg-zinc-900/50 border border-border rounded-[16px] p-2 flex flex-col gap-2 mb-6 transition-all focus-within:ring-1 focus-within:ring-ring focus-within:border-ring">
          <div className="flex-1 relative pt-[2px] pb-[4px] px-[7px]">
            <textarea
              rows={1}
              placeholder="Search the web for new sources"
              className="w-full bg-transparent border-none outline-none text-[14px] text-foreground placeholder-muted-foreground font-sans resize-none h-8 leading-[20px] p-0 align-top"
            />
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1">
              <button
                className="bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 text-foreground h-8 px-2 rounded-full flex items-center gap-1 hover:bg-slate-50 dark:hover:bg-zinc-900 text-[13px] font-medium transition-colors cursor-pointer outline-none"
              >
                <span className="material-symbols-outlined text-[20px] text-zinc-500">language</span>
                <span className="material-symbols-outlined text-[20px] text-zinc-400">keyboard_arrow_down</span>
              </button>
              <button
                className="bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 text-foreground h-8 px-2 rounded-full flex items-center gap-1 hover:bg-slate-50 dark:hover:bg-zinc-900 text-[13px] font-medium transition-colors cursor-pointer outline-none"
              >
                <span className="material-symbols-outlined text-[20px] text-zinc-500">search_spark</span>
                <span className="material-symbols-outlined text-[20px] text-zinc-400">keyboard_arrow_down</span>
              </button>
            </div>
            <button
              className="w-8 h-8 rounded-full bg-black/5 dark:bg-white/5 text-muted-foreground/30 flex items-center justify-center cursor-not-allowed outline-none border-none"
              disabled
            >
              <span className="material-symbols-outlined text-[20px]">search</span>
            </button>
          </div>
        </div>

        {/* Empty State */}
        <div className="flex-1 flex flex-col items-center justify-center text-center mt-8 pb-10">
          <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center mb-3">
            <span className="material-symbols-outlined text-[24px] text-muted-foreground/60 icon-fill">
              description
            </span>
          </div>
          <p className="text-[13px] font-semibold text-foreground">
            Saved sources will appear here
          </p>
          <p className="text-[12px] text-muted-foreground mt-1.5 px-4 leading-relaxed max-w-[280px] font-sans">
            Click Add source above to add PDFs, websites, text, videos, or audio files. Or import a file directly from Google Drive.
          </p>
        </div>
      </div>
    )
  }

  return (
    <section
      id="sidebarSources"
      className={`sidebar w-[360px] lg:w-[370px] flex-shrink-0 bg-sidebar text-sidebar-foreground border border-sidebar-border rounded-2xl flex flex-col relative shadow-sm overflow-hidden ${
        isCollapsed ? "collapsed" : ""
      }`}
    >
      {/* Sidebar Header */}
      <div className="sidebar-header h-12 border-b border-sidebar-border flex items-center justify-between px-4 flex-shrink-0 bg-sidebar z-10 relative">
        <h2 className="text-[15px] font-semibold tracking-tight text-sidebar-foreground sidebar-title">
          Sources
        </h2>
        <button
          id="btnToggleSources"
          onClick={onToggleCollapse}
          className="w-8 h-8 flex items-center justify-center text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent rounded-full transition flex-shrink-0 z-10 bg-sidebar cursor-pointer outline-none"
        >
          <span className="material-symbols-outlined text-[20px]">dock_to_right</span>
        </button>
      </div>

      {/* Expanded Sidebar Content */}
      <div className="sidebar-content w-[360px] lg:w-[370px] flex-1 overflow-y-auto p-4 flex flex-col items-center">
        <button
          id="btnAddSource"
          onClick={onAddSourceClick}
          className="w-full h-9 border border-sidebar-border bg-sidebar text-sidebar-foreground rounded-full flex items-center justify-center gap-2 text-[13px] font-medium hover:bg-sidebar-accent active:scale-[0.98] transition-all mb-5 shadow-sm cursor-pointer outline-none"
        >
          <span className="material-symbols-outlined text-[18px]">add</span>
          Add sources
        </button>

        {/* Search The Web Inputs */}
        <div className="w-full bg-[#f9f9f9] dark:bg-zinc-900/50 border border-border rounded-[16px] p-2 flex flex-col gap-2 mb-6 transition-all focus-within:ring-1 focus-within:ring-ring focus-within:border-ring">
          <div className="flex-1 relative pt-[2px] pb-[4px] px-[7px]">
            <textarea
              rows={1}
              placeholder="Search the web for new sources"
              className="w-full bg-transparent border-none outline-none text-[14px] text-foreground placeholder-muted-foreground resize-none h-8 leading-[20px] p-0 align-top"
            />
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1">
              <button
                className="bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 text-foreground h-8 px-2 rounded-full flex items-center gap-1 hover:bg-slate-50 dark:hover:bg-zinc-900 text-[13px] font-medium transition-colors cursor-pointer outline-none"
              >
                <span className="material-symbols-outlined text-[20px] text-zinc-500">language</span>
                <span className="material-symbols-outlined text-[20px] text-zinc-400">keyboard_arrow_down</span>
              </button>
              <button
                className="bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 text-foreground h-8 px-2 rounded-full flex items-center gap-1 hover:bg-slate-50 dark:hover:bg-zinc-900 text-[13px] font-medium transition-colors cursor-pointer outline-none"
              >
                <span className="material-symbols-outlined text-[20px] text-zinc-500">search_spark</span>
                <span className="material-symbols-outlined text-[20px] text-zinc-400">keyboard_arrow_down</span>
              </button>
            </div>
            <button
              className="w-8 h-8 rounded-full bg-black/5 dark:bg-white/5 text-muted-foreground/30 flex items-center justify-center cursor-not-allowed outline-none"
              disabled
            >
              <span className="material-symbols-outlined text-[20px]">search</span>
            </button>
          </div>
        </div>

        {/* Empty State */}
        <div className="flex-1 flex flex-col items-center justify-center text-center mt-4">
          <div className="w-10 h-10 rounded-xl bg-sidebar-accent flex items-center justify-center mb-3">
            <span className="material-symbols-outlined text-[24px] text-sidebar-foreground/60 icon-fill">
              description
            </span>
          </div>
          <p className="text-[13px] font-semibold text-sidebar-foreground">
            Saved sources will appear here
          </p>
          <p className="text-[13px] text-sidebar-foreground/60 mt-1.5 px-4 leading-relaxed">
            Click Add source above to add PDFs, websites, text, videos, or audio files.
          </p>
        </div>
      </div>

      {/* Collapsed Sidebar Miniature Icons */}
      <div className="collapsed-icons absolute top-16 left-0 right-0 flex flex-col items-center gap-4 p-2 z-20">
        <button
          id="btnAddSourceCollapsed"
          onClick={onAddSourceClick}
          className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-sidebar-accent text-sidebar-foreground transition-colors bg-sidebar cursor-pointer outline-none"
        >
          <span className="material-symbols-outlined text-[22px]">add</span>
        </button>
      </div>
    </section>
  )
}
