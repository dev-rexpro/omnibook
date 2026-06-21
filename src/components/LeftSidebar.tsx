import { useState } from "react"
import { useNotebookStore } from "@/store/useNotebookStore"
import { Checkbox } from "@/components/ui/checkbox"
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu"

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
  const { 
    documents, 
    deleteDocument, 
    renameDocument,
    currentNotebook,
    selectedDocumentIds,
    toggleDocumentSelection,
    setSelectedDocumentIds
  } = useNotebookStore()

  // State for inline renaming
  const [renamingDocId, setRenamingDocId] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState("")

  const handleRenameSubmit = async (id: string) => {
    if (!renameValue.trim()) {
      setRenamingDocId(null)
      return
    }
    try {
      await renameDocument(id, renameValue.trim())
    } catch (err) {
      console.error("Failed to rename document:", err)
    } finally {
      setRenamingDocId(null)
    }
  }

  // Helper to check if all completed documents are selected
  const completedDocs = documents.filter((d) => d.status !== "indexing" && d.status !== "error")
  const isAllSelected = completedDocs.length > 0 && completedDocs.every((d) => selectedDocumentIds.includes(d.id))

  const handleSelectAllToggle = () => {
    if (isAllSelected) {
      // Unselect all
      setSelectedDocumentIds([])
    } else {
      // Select all completed ones
      setSelectedDocumentIds(completedDocs.map((d) => d.id))
    }
  }

  if (isMobile) {
    return (
      <div className="w-full flex-1 overflow-y-auto px-4 py-6 flex flex-col items-center bg-background">
        <button
          id="btnAddSourceMobile"
          onClick={onAddSourceClick}
          className="w-full h-9 border border-border bg-card text-foreground rounded-full flex items-center justify-center gap-2 text-[13px] font-medium hover:bg-accent active:scale-[0.98] transition-all mb-5 shadow-sm cursor-pointer outline-none"
        >
          <span className="google-symbols text-[18px]">add</span>
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
                <span className="google-symbols text-[20px] text-zinc-500">language</span>
                <span className="google-symbols text-[20px] text-zinc-400">keyboard_arrow_down</span>
              </button>
              <button
                className="bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 text-foreground h-8 px-2 rounded-full flex items-center gap-1 hover:bg-slate-50 dark:hover:bg-zinc-900 text-[13px] font-medium transition-colors cursor-pointer outline-none"
              >
                <span className="google-symbols text-[20px] text-zinc-500">search_spark</span>
                <span className="google-symbols text-[20px] text-zinc-400">keyboard_arrow_down</span>
              </button>
            </div>
            <button
              className="w-8 h-8 rounded-full bg-black/5 dark:bg-white/5 text-muted-foreground/30 flex items-center justify-center cursor-not-allowed outline-none border-none"
              disabled
            >
              <span className="google-symbols text-[20px]">search</span>
            </button>
          </div>
        </div>

        {/* Documents List */}
        {currentNotebook && documents.length > 0 && (
          <div className="w-full flex flex-col gap-2 mb-6">
            <div className="w-full flex items-center justify-between mb-2 pl-1 pr-3">
              <h3 className="text-[12px] font-bold text-muted-foreground uppercase tracking-wider">
                Uploaded ({documents.length})
              </h3>
              {completedDocs.length > 0 && (
                <div className="flex items-center gap-1.5 select-none text-[12px] font-semibold text-muted-foreground">
                  <span>Select all</span>
                  <Checkbox 
                    checked={isAllSelected}
                    onCheckedChange={handleSelectAllToggle}
                  />
                </div>
              )}
            </div>
            
            {documents.map((doc) => {
              const isIndexing = doc.status === "indexing"
              const isError = doc.status === "error"
              const isSelected = selectedDocumentIds.includes(doc.id)

              return (
                <div
                  key={doc.id}
                  className={`w-full flex items-center justify-between p-3 border rounded-xl transition-all group ${
                    isIndexing
                      ? "bg-slate-50 dark:bg-zinc-900 border-slate-200 dark:border-zinc-800/80 opacity-75 cursor-default"
                      : isSelected 
                        ? "bg-[#fcfcfc] dark:bg-zinc-900 border-slate-300 dark:border-zinc-800 rounded-xl hover:bg-slate-50 dark:hover:bg-zinc-800/80" 
                        : "bg-slate-50/50 dark:bg-zinc-900/40 border-slate-200/50 dark:border-zinc-800/40 opacity-60 hover:opacity-85"
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    {/* Document Icon (Black / Light White) */}
                    <span className="google-symbols text-[20px] text-zinc-900 dark:text-zinc-100 flex-shrink-0 select-none">
                      {doc.filename.toLowerCase().endsWith(".pdf") ? "drive_pdf" : "description"}
                    </span>

                    {/* Document Title / Inline Edit */}
                    <div className="flex-1 min-w-0">
                      {renamingDocId === doc.id ? (
                        <input
                          type="text"
                          value={renameValue}
                          onChange={(e) => setRenameValue(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handleRenameSubmit(doc.id)
                            if (e.key === "Escape") setRenamingDocId(null)
                          }}
                          onBlur={() => handleRenameSubmit(doc.id)}
                          autoFocus
                          className="bg-background border border-border focus:ring-1 focus:ring-ring rounded px-2 py-0.5 text-[13px] text-foreground w-[160px] outline-none"
                        />
                      ) : (
                        <span 
                          className={`text-[13px] font-semibold truncate block ${
                            isError ? "text-destructive" : "text-foreground"
                          }`}
                          title={doc.filename}
                        >
                          {isIndexing ? `Indexing ${doc.filename}...` : isError ? `Failed: ${doc.filename}` : doc.filename}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions on right: more_vert (left) and checkbox (right) */}
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    {/* Actions Dropdown */}
                    {!isIndexing && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button
                            className="text-muted-foreground hover:text-foreground w-8 h-8 rounded-full flex items-center justify-center transition cursor-pointer outline-none bg-transparent hover:bg-accent border-none"
                            title="Source options"
                          >
                            <span className="google-symbols text-[18px]">more_vert</span>
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent
                          align="end"
                          className="bg-popover text-popover-foreground border border-border rounded-lg shadow-lg py-1 z-50 text-[13px] flex flex-col font-sans outline-none min-w-[160px] w-max whitespace-nowrap"
                        >
                          <DropdownMenuItem
                            onClick={() => {
                              setRenamingDocId(doc.id)
                              setRenameValue(doc.filename)
                            }}
                            className="flex items-center gap-2 px-3 py-2 hover:bg-accent hover:text-accent-foreground text-left w-full transition-colors outline-none cursor-pointer whitespace-nowrap"
                          >
                            <span className="google-symbols text-[16px]">edit</span>
                            <span>Rename source</span>
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => deleteDocument(doc.id)}
                            className="flex items-center gap-2 px-3 py-2 hover:bg-destructive/10 hover:text-destructive text-left w-full transition-colors outline-none cursor-pointer text-destructive/80 font-medium whitespace-nowrap"
                          >
                            <span className="google-symbols text-[16px] text-destructive">delete</span>
                            <span>Remove source</span>
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}

                    {/* Checkbox (Shadcn UI) */}
                    {!isIndexing && !isError ? (
                      <Checkbox 
                        checked={isSelected}
                        onCheckedChange={() => toggleDocumentSelection(doc.id)}
                      />
                    ) : (
                      isIndexing ? (
                        <span className="google-symbols text-[18px] text-zinc-950 dark:text-zinc-50 animate-spin select-none">
                          sync
                        </span>
                      ) : (
                        <span className="google-symbols text-[18px] text-destructive select-none">
                          warning
                        </span>
                      )
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Empty State */}
        {(!currentNotebook || documents.length === 0) && (
          <div className="flex-1 flex flex-col items-center justify-center text-center mt-8 pb-10">
            <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center mb-3">
              <span className="google-symbols text-[24px] text-muted-foreground/60 icon-fill">
                description
              </span>
            </div>
            <p className="text-[13px] font-semibold text-foreground">
              Saved sources will appear here
            </p>
            <p className="text-[12px] text-muted-foreground mt-1.5 px-4 leading-relaxed max-w-[280px] font-sans">
              Click Add source above to add PDFs, websites, text, videos, or audio files.
            </p>
          </div>
        )}
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
          <span className="google-symbols text-[20px]">dock_to_right</span>
        </button>
      </div>

      {/* Expanded Sidebar Content */}
      <div className="sidebar-content w-[360px] lg:w-[370px] flex-1 overflow-y-auto p-4 flex flex-col items-center">
        <button
          id="btnAddSource"
          onClick={onAddSourceClick}
          className="w-full h-9 border border-sidebar-border bg-sidebar text-sidebar-foreground rounded-full flex items-center justify-center gap-2 text-[13px] font-medium hover:bg-sidebar-accent active:scale-[0.98] transition-all mb-5 shadow-sm cursor-pointer outline-none"
        >
          <span className="google-symbols text-[18px]">add</span>
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
                <span className="google-symbols text-[20px] text-zinc-500">language</span>
                <span className="google-symbols text-[20px] text-zinc-400">keyboard_arrow_down</span>
              </button>
              <button
                className="bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 text-foreground h-8 px-2 rounded-full flex items-center gap-1 hover:bg-slate-50 dark:hover:bg-zinc-900 text-[13px] font-medium transition-colors cursor-pointer outline-none"
              >
                <span className="google-symbols text-[20px] text-zinc-500">search_spark</span>
                <span className="google-symbols text-[20px] text-zinc-400">keyboard_arrow_down</span>
              </button>
            </div>
            <button
              className="w-8 h-8 rounded-full bg-black/5 dark:bg-white/5 text-muted-foreground/30 flex items-center justify-center cursor-not-allowed outline-none"
              disabled
            >
              <span className="google-symbols text-[20px]">search</span>
            </button>
          </div>
        </div>

        {/* Documents List */}
        {currentNotebook && documents.length > 0 && (
          <div className="w-full flex flex-col gap-1.5 mb-6">
            <div className="w-full flex items-center justify-between mb-2.5 pl-1.5 pr-2.5">
              <h3 className="text-[11px] font-bold text-sidebar-foreground/60 uppercase tracking-wider">
                Uploaded ({documents.length})
              </h3>
              {completedDocs.length > 0 && (
                <div className="flex items-center gap-1.5 select-none text-[11px] font-semibold text-sidebar-foreground/75">
                  <span>Select all</span>
                  <Checkbox 
                    checked={isAllSelected}
                    onCheckedChange={handleSelectAllToggle}
                  />
                </div>
              )}
            </div>

            {documents.map((doc) => {
              const isIndexing = doc.status === "indexing"
              const isError = doc.status === "error"
              const isSelected = selectedDocumentIds.includes(doc.id)

              return (
                <div
                  key={doc.id}
                  className={`w-full flex items-center justify-between p-2.5 border rounded-xl transition-all group ${
                    isIndexing
                      ? "bg-sidebar-accent/5 border-sidebar-border/40 opacity-75 cursor-default"
                      : isSelected 
                        ? "bg-sidebar-accent/10 border-sidebar-border hover:bg-sidebar-accent/30" 
                        : "bg-sidebar-accent/5 border-sidebar-border/50 opacity-60 hover:opacity-85"
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    {/* Document Icon (Black / Light White) */}
                    <span className="google-symbols text-[20px] text-zinc-900 dark:text-zinc-100 flex-shrink-0 select-none">
                      {doc.filename.toLowerCase().endsWith(".pdf") ? "drive_pdf" : "description"}
                    </span>

                    {/* Document Title / Inline Rename Input */}
                    <div className="flex-1 min-w-0">
                      {renamingDocId === doc.id ? (
                        <input
                          type="text"
                          value={renameValue}
                          onChange={(e) => setRenameValue(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handleRenameSubmit(doc.id)
                            if (e.key === "Escape") setRenamingDocId(null)
                          }}
                          onBlur={() => handleRenameSubmit(doc.id)}
                          autoFocus
                          className="bg-background border border-border focus:ring-1 focus:ring-ring rounded px-1.5 py-0.5 text-[12px] text-foreground w-[160px] outline-none"
                        />
                      ) : (
                        <span 
                          className={`text-[13px] font-semibold truncate block ${
                            isError ? "text-destructive" : "text-sidebar-foreground"
                          }`}
                          title={doc.filename}
                        >
                          {isIndexing ? `Indexing ${doc.filename}...` : isError ? `Failed: ${doc.filename}` : doc.filename}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions on right: more_vert (left) and checkbox (right) */}
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    {/* Actions Dropdown */}
                    {!isIndexing && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button
                            className="opacity-0 group-hover:opacity-100 data-[state=open]:opacity-100 text-sidebar-foreground/60 hover:text-foreground w-7 h-7 rounded-full flex items-center justify-center transition cursor-pointer outline-none bg-transparent hover:bg-sidebar-accent border-none"
                            title="Source options"
                          >
                            <span className="google-symbols text-[18px]">more_vert</span>
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent
                          align="end"
                          className="bg-popover text-popover-foreground border border-border rounded-lg shadow-lg py-1 z-50 text-[13px] flex flex-col font-sans outline-none min-w-[160px] w-max whitespace-nowrap"
                        >
                          <DropdownMenuItem
                            onClick={() => {
                              setRenamingDocId(doc.id)
                              setRenameValue(doc.filename)
                            }}
                            className="flex items-center gap-2 px-3 py-2 hover:bg-accent hover:text-accent-foreground text-left w-full transition-colors outline-none cursor-pointer whitespace-nowrap"
                          >
                            <span className="google-symbols text-[16px]">edit</span>
                            <span>Rename source</span>
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => deleteDocument(doc.id)}
                            className="flex items-center gap-2 px-3 py-2 hover:bg-destructive/10 hover:text-destructive text-left w-full transition-colors outline-none cursor-pointer text-destructive/80 font-medium whitespace-nowrap"
                          >
                            <span className="google-symbols text-[16px] text-destructive">delete</span>
                            <span>Remove source</span>
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}

                    {/* Checkbox (Shadcn UI) */}
                    {!isIndexing && !isError ? (
                      <Checkbox 
                        checked={isSelected}
                        onCheckedChange={() => toggleDocumentSelection(doc.id)}
                      />
                    ) : (
                      isIndexing ? (
                        <span className="google-symbols text-[18px] text-zinc-950 dark:text-zinc-50 animate-spin select-none">
                          sync
                        </span>
                      ) : (
                        <span className="google-symbols text-[18px] text-destructive select-none">
                          warning
                        </span>
                      )
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Empty State */}
        {(!currentNotebook || documents.length === 0) && (
          <div className="flex-1 flex flex-col items-center justify-center text-center mt-4">
            <div className="w-10 h-10 rounded-xl bg-sidebar-accent flex items-center justify-center mb-3">
              <span className="google-symbols text-[24px] text-sidebar-foreground/60 icon-fill">
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
        )}
      </div>

      {/* Collapsed Sidebar Miniature Icons */}
      <div className="collapsed-icons absolute top-16 left-0 right-0 flex flex-col items-center gap-3 p-2 z-20 overflow-y-auto max-h-[calc(100vh-200px)] no-scrollbar pb-4">
        {/* Add source button */}
        <button
          id="btnAddSourceCollapsed"
          onClick={onAddSourceClick}
          className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-sidebar-accent text-sidebar-foreground transition-colors bg-sidebar cursor-pointer outline-none flex-shrink-0 relative group/tip"
          title="Add source"
        >
          <span className="google-symbols text-[22px]">add</span>
          <div className="absolute left-12 bg-zinc-900 text-white text-[12px] rounded px-2 py-1 whitespace-nowrap opacity-0 group-hover/tip:opacity-100 transition pointer-events-none z-30 font-sans">
            Add source
          </div>
        </button>

        {/* One icon per document, stacked below */}
        {documents.slice(0, 8).map((doc) => (
          <div
            key={doc.id}
            className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-sidebar-accent text-sidebar-foreground transition-colors cursor-default flex-shrink-0 relative group/tip"
          >
            {doc.status === "indexing" ? (
              <span className="google-symbols text-[20px] animate-spin text-sidebar-foreground/60">sync</span>
            ) : doc.status === "error" ? (
              <span className="google-symbols text-[20px] text-destructive">warning</span>
            ) : (
              <span className="google-symbols text-[20px] text-sidebar-foreground">
                {doc.filename.toLowerCase().endsWith(".pdf") ? "drive_pdf" : "description"}
              </span>
            )}
            {/* Filename tooltip on hover */}
            <div className="absolute left-12 bg-zinc-900 text-white text-[12px] rounded px-2 py-1 whitespace-nowrap opacity-0 group-hover/tip:opacity-100 transition pointer-events-none z-30 font-sans max-w-[180px] truncate">
              {doc.filename}
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
