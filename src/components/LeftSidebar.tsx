import { useState, useRef, useEffect } from "react"
import { useNotebookStore } from "@/store/useNotebookStore"
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { getFileIcon } from "@/lib/utils"

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
    selectedDocumentIds,
    toggleDocumentSelection,
    setSelectedDocumentIds,
  } = useNotebookStore()

  // State for inline renaming
  const [renamingDocId, setRenamingDocId] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState("")

  const checkboxRef = useRef<HTMLInputElement>(null)

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

  useEffect(() => {
    if (checkboxRef.current) {
      const noneChecked = selectedDocumentIds.length === 0
      checkboxRef.current.indeterminate = !isAllSelected && !noneChecked
    }
  }, [isAllSelected, selectedDocumentIds])

  const handleSelectAllToggle = () => {
    if (isAllSelected) {
      setSelectedDocumentIds([])
    } else {
      setSelectedDocumentIds(completedDocs.map((d) => d.id))
    }
  }

  if (isMobile) {
    return (
      <div className="w-full flex-1 flex flex-col bg-background overflow-hidden relative">
        {/* Mobile Content Area */}
        <div className="sidebar-content flex-1 flex flex-col overflow-y-auto px-4 pt-4 pb-20">
          <button
            onClick={onAddSourceClick}
            className="w-full flex items-center justify-center gap-2 border border-brand-border rounded-full h-8 text-sm font-medium text-brand-text hover:bg-gray-50 transition mb-4 cursor-pointer outline-none"
          >
            <span className="google-symbols text-[18px]">add</span>
            Add sources
          </button>

          {/* Search Inputs Bar */}
          <div className="bg-muted dark:bg-card border border-border dark:border-sidebar-border rounded-2xl p-2 flex flex-col gap-2 mb-4">
            <textarea
              rows={1}
              id="search-input-left-mobile"
              className="w-full bg-transparent border-none outline-none resize-none text-sm p-2 text-foreground placeholder-muted-foreground"
              placeholder="Search the web for new sources"
            />
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-2">
                <button
                  className="flex items-center justify-center gap-1 bg-background dark:bg-sidebar border border-border dark:border-sidebar-border rounded-full h-8 px-3 hover:bg-gray-200 dark:hover:bg-accent transition text-sm text-foreground cursor-pointer outline-none"
                >
                  <span className="google-symbols text-[18px]">language</span>
                  <span className="google-symbols text-[18px]">keyboard_arrow_down</span>
                </button>
                <button
                  className="flex items-center justify-center gap-1 bg-background dark:bg-sidebar border border-border dark:border-sidebar-border rounded-full h-8 px-3 hover:bg-gray-200 dark:hover:bg-accent transition text-sm text-foreground cursor-pointer outline-none"
                >
                  <span className="google-symbols text-[18px]">search_spark</span>
                  <span className="google-symbols text-[18px]">keyboard_arrow_down</span>
                </button>
              </div>
              <button
                id="search-btn-left-mobile"
                className="w-8 h-8 rounded-full flex items-center justify-center bg-gray-200 dark:bg-accent text-muted-foreground/60 cursor-not-allowed border-none"
                disabled
              >
                <span className="google-symbols text-[20px]">search</span>
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between px-2 py-2 select-none">
            <span className="text-sm text-foreground">Select all</span>
            <input
              type="checkbox"
              checked={isAllSelected}
              onChange={handleSelectAllToggle}
              className="w-4 h-4 rounded border-brand-border accent-black text-black focus:ring-black cursor-pointer"
            />
          </div>

          {/* Uploaded Documents list */}
          {documents.map((doc) => {
            const isIndexing = doc.status === "indexing"
            const isError = doc.status === "error"
            const isSelected = selectedDocumentIds.includes(doc.id)

            return (
              <div
                key={doc.id}
                onClick={() => !isIndexing && !isError && toggleDocumentSelection(doc.id)}
                className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-muted cursor-pointer group transition"
              >
                <div className="flex items-center gap-3 overflow-hidden">
                  {isIndexing ? (
                    <span className="google-symbols text-zinc-950 dark:text-zinc-50 animate-spin select-none text-[20px]">
                      sync
                    </span>
                  ) : isError ? (
                    <span className="google-symbols text-destructive select-none text-[20px]">
                      warning
                    </span>
                  ) : (
                    <span className="google-symbols text-gray-700 dark:text-foreground mat-icon-filled text-[20px]">
                      {getFileIcon(doc.filename)}
                    </span>
                  )}

                  <div className="flex-1 min-w-0">
                    {renamingDocId === doc.id ? (
                      <input
                        type="text"
                        value={renameValue}
                        onChange={(e) => setRenameValue(e.target.value)}
                        onClick={(e) => e.stopPropagation()}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleRenameSubmit(doc.id)
                          if (e.key === "Escape") setRenamingDocId(null)
                        }}
                        onBlur={() => handleRenameSubmit(doc.id)}
                        autoFocus
                        className="bg-background border border-border focus:ring-1 focus:ring-ring rounded px-1.5 py-0.5 text-sm text-foreground w-[160px] outline-none"
                      />
                    ) : (
                      <span
                        className={`text-sm truncate block text-foreground ${isError ? "text-destructive" : ""}`}
                        title={doc.filename}
                      >
                        {isIndexing ? `Indexing ${doc.filename}...` : doc.filename}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                  {!isIndexing && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button
                          className="w-8 h-8 rounded-full hover:bg-gray-200 dark:hover:bg-accent flex items-center justify-center text-gray-600 dark:text-muted-foreground opacity-100 transition cursor-pointer outline-none bg-transparent border-none"
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

                  {!isIndexing && !isError && (
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleDocumentSelection(doc.id)}
                      className="source-checkbox w-4 h-4 rounded border-brand-border accent-black text-black focus:ring-black cursor-pointer"
                    />
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  return (
    <section
      id="panel-sources"
      className={`sidebar w-[320px] lg:w-[340px] flex-shrink-0 bg-sidebar text-sidebar-foreground border border-sidebar-border rounded-2xl flex flex-col overflow-hidden relative shadow-sm ${
        isCollapsed ? "collapsed" : ""
      }`}
    >
      {/* Header */}
      <div className="sidebar-header flex items-center justify-between h-12 border-b border-brand-border px-2">
        <h2 className="sidebar-title text-base font-normal px-2 text-brand-text">Sources</h2>
        <button
          onClick={onToggleCollapse}
          className="w-8 h-8 flex items-center justify-center flex-shrink-0 rounded-full hover:bg-gray-100 text-gray-600 transition cursor-pointer outline-none bg-transparent border-none"
          title="Collapse"
        >
          <span className="google-symbols text-[20px]">
            {isCollapsed ? "dock_to_left" : "dock_to_right"}
          </span>
        </button>
      </div>

      {/* Content */}
      <div className="sidebar-content flex-1 flex flex-col overflow-y-auto px-4 pt-4">
        <button
          onClick={onAddSourceClick}
          className="w-full flex items-center justify-center gap-2 border border-brand-border rounded-full h-8 text-sm font-medium text-brand-text hover:bg-gray-50 transition mb-4 cursor-pointer outline-none"
        >
          <span className="google-symbols text-[18px]">add</span>
          Add sources
        </button>

        <div
          className="bg-muted dark:bg-card border border-border dark:border-sidebar-border rounded-2xl p-2 flex flex-col gap-2 mb-4"
        >
          <textarea
            rows={1}
            id="search-input-left"
            className="w-full bg-transparent border-none outline-none resize-none text-sm p-2 text-foreground placeholder-muted-foreground"
            placeholder="Search the web for new sources"
          />
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2">
              <button
                className="flex items-center justify-center gap-1 bg-background dark:bg-sidebar border border-border dark:border-sidebar-border rounded-full h-8 px-3 hover:bg-gray-200 dark:hover:bg-accent transition text-sm text-foreground cursor-pointer outline-none"
              >
                <span className="google-symbols text-[18px]">language</span>
                <span className="google-symbols text-[18px]">keyboard_arrow_down</span>
              </button>
              <button
                className="flex items-center justify-center gap-1 bg-background dark:bg-sidebar border border-border dark:border-sidebar-border rounded-full h-8 px-3 hover:bg-gray-200 dark:hover:bg-accent transition text-sm text-foreground cursor-pointer outline-none"
              >
                <span className="google-symbols text-[18px]">search_spark</span>
                <span className="google-symbols text-[18px]">keyboard_arrow_down</span>
              </button>
            </div>
            <button
              id="search-btn-left"
              className="w-8 h-8 rounded-full flex items-center justify-center bg-gray-200 dark:bg-accent text-muted-foreground/60 cursor-not-allowed border-none"
              disabled
            >
              <span className="google-symbols text-[20px]">search</span>
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between px-2 py-2 select-none">
          <span className="text-sm text-foreground">Select all</span>
          <input
            type="checkbox"
            id="select-all-sources"
            ref={checkboxRef}
            checked={isAllSelected}
            onChange={handleSelectAllToggle}
            className="w-4 h-4 rounded border-brand-border accent-black text-black focus:ring-black cursor-pointer"
          />
        </div>

        {/* Uploaded Documents list */}
        {documents.map((doc) => {
          const isIndexing = doc.status === "indexing"
          const isError = doc.status === "error"
          const isSelected = selectedDocumentIds.includes(doc.id)

          return (
            <div
              key={doc.id}
              onClick={() => !isIndexing && !isError && toggleDocumentSelection(doc.id)}
              className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-muted cursor-pointer group transition"
            >
              <div className="flex items-center gap-3 overflow-hidden">
                {isIndexing ? (
                  <span className="google-symbols text-zinc-950 dark:text-zinc-50 animate-spin select-none text-[20px]">
                    sync
                  </span>
                ) : isError ? (
                  <span className="google-symbols text-destructive select-none text-[20px]">
                    warning
                  </span>
                ) : (
                  <span className="google-symbols text-gray-700 dark:text-foreground mat-icon-filled text-[20px]">
                    {getFileIcon(doc.filename)}
                  </span>
                )}

                <div className="flex-1 min-w-0">
                  {renamingDocId === doc.id ? (
                    <input
                      type="text"
                      value={renameValue}
                      onChange={(e) => setRenameValue(e.target.value)}
                      onClick={(e) => e.stopPropagation()}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleRenameSubmit(doc.id)
                        if (e.key === "Escape") setRenamingDocId(null)
                      }}
                      onBlur={() => handleRenameSubmit(doc.id)}
                      autoFocus
                      className="bg-background border border-border focus:ring-1 focus:ring-ring rounded px-1.5 py-0.5 text-sm text-foreground w-[160px] outline-none"
                    />
                  ) : (
                    <span
                      className={`text-sm truncate block text-foreground ${isError ? "text-destructive" : ""}`}
                      title={doc.filename}
                    >
                      {isIndexing ? `Indexing ${doc.filename}...` : doc.filename}
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                {!isIndexing && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button
                        className="w-8 h-8 rounded-full hover:bg-gray-200 dark:hover:bg-accent flex items-center justify-center text-gray-600 dark:text-muted-foreground opacity-0 group-hover:opacity-100 transition cursor-pointer outline-none bg-transparent border-none"
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

                {!isIndexing && !isError && (
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggleDocumentSelection(doc.id)}
                    className="source-checkbox w-4 h-4 rounded border-brand-border accent-black text-black focus:ring-black cursor-pointer"
                  />
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Collapsed Icons */}
      <TooltipProvider>
        <div className="collapsed-icons absolute top-16 left-0 right-0 flex flex-col items-center gap-4 p-2 z-20">
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={onAddSourceClick}
                className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-muted text-foreground transition-colors relative flex-shrink-0 cursor-pointer outline-none border-none bg-transparent"
              >
                <span className="google-symbols text-[22px]">add</span>
              </button>
            </TooltipTrigger>
            <TooltipContent side="right">
              <span>Add sources</span>
            </TooltipContent>
          </Tooltip>

          <div className="w-6 border-b border-sidebar-border my-1"></div>

          {documents.map((doc) => (
            <Tooltip key={doc.id}>
              <TooltipTrigger asChild>
                <div
                  onClick={() => toggleDocumentSelection(doc.id)}
                  className="w-10 h-10 text-gray-700 dark:text-foreground rounded-full flex items-center justify-center cursor-pointer hover:bg-gray-100 dark:hover:bg-muted transition relative flex-shrink-0"
                >
                  {doc.status === "indexing" ? (
                    <span className="google-symbols text-[20px] animate-spin text-sidebar-foreground/60 select-none">
                      sync
                    </span>
                  ) : doc.status === "error" ? (
                    <span className="google-symbols text-[20px] text-destructive select-none">
                      warning
                    </span>
                  ) : (
                    <span className="google-symbols text-[20px] mat-icon-filled">
                      {getFileIcon(doc.filename)}
                    </span>
                  )}
                </div>
              </TooltipTrigger>
              <TooltipContent side="right">
                <span className="max-w-[180px] truncate block">{doc.filename}</span>
              </TooltipContent>
            </Tooltip>
          ))}
        </div>
      </TooltipProvider>
    </section>
  )
}
