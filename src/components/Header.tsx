import { useState, useEffect, useRef } from "react"
import { useTheme } from "@/components/theme-provider"
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
} from "@/components/ui/dropdown-menu"
import { useAuthStore } from "@/store/useAuthStore"

interface HeaderProps {
  notebookTitle: string
  onTitleChange: (title: string) => void
  onLogoClick?: () => void
  onCreateNotebook?: () => void
}

export function Header({ notebookTitle, onTitleChange, onLogoClick, onCreateNotebook }: HeaderProps) {
  const { theme, setTheme } = useTheme()
  const { user, signOut } = useAuthStore()
  const [menuView, setMenuView] = useState<"main" | "theme">("main")
  const [dropdownOpen, setDropdownOpen] = useState(false)

  const [inputWidth, setInputWidth] = useState<number | string>("auto")
  const hiddenSpanRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (hiddenSpanRef.current) {
      setInputWidth(hiddenSpanRef.current.offsetWidth + 16)
    }
  }, [notebookTitle])

  const handleOpenChange = (open: boolean) => {
    setDropdownOpen(open)
    if (!open) {
      // reset to main menu on close
      setMenuView("main")
    }
  }

  return (
    <header className="h-[64px] flex-shrink-0 flex items-center justify-between px-5 bg-background text-foreground z-30">
      {/* Left: Logo & Title */}
      <div className="flex items-center gap-3 flex-grow min-w-0 mr-4">
        <a
          href="#"
          className="icon-container-active w-9 h-9 flex items-center justify-center rounded-full bg-black dark:bg-white text-white dark:text-black hover:opacity-90 transition flex-shrink-0"
          onClick={(e) => {
            e.preventDefault()
            if (onLogoClick) onLogoClick()
          }}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="lucide lucide-ratio"
            aria-hidden="true"
          >
            <rect width="12" height="20" x="6" y="2" rx="2" />
            <rect width="20" height="12" x="2" y="6" rx="2" />
          </svg>
        </a>
        <div className="flex items-center flex-1 text-[20px] gap-2 overflow-hidden px-2 whitespace-nowrap leading-[48px]">
          <div className="text-ellipsis whitespace-nowrap text-[22px] font-normal leading-[36px] text-foreground">
            <div className="relative flex items-center">
              <div
                ref={hiddenSpanRef}
                aria-hidden="true"
                className="invisible absolute pointer-events-none whitespace-pre text-[22px] leading-[36px]"
              >
                {notebookTitle || "Untitled notebook"}
              </div>
              <input
                id="title-input"
                type="text"
                value={notebookTitle}
                onChange={(e) => onTitleChange(e.target.value)}
                className="bg-transparent border border-transparent focus:border-gray-300 dark:focus:border-zinc-700 outline-none text-foreground text-[22px] leading-[36px] px-2 py-0.5 -mx-2 rounded-md transition-colors"
                style={{ width: inputWidth }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-1">
        <button
          id="create-notebook-btn"
          onClick={onCreateNotebook}
          className="min-w-max w-fit h-[32px] shrink-0 rounded-full bg-primary text-primary-foreground hover:opacity-90 transition px-[24px] text-[14px] font-medium flex items-center justify-center border-none outline-none cursor-pointer"
        >
          <span className="google-symbols text-[18px] mr-[8px] -ml-[8px]">add</span>
          <span>Create notebook</span>
        </button>

        <div className="flex items-center gap-2 ml-2 relative">
          <DropdownMenu open={dropdownOpen} onOpenChange={handleOpenChange}>
            <DropdownMenuTrigger asChild>
              <button
                id="btnSettings"
                className="settings-action h-[32px] px-3 border border-border bg-card dark:bg-muted/50 text-foreground rounded-full flex items-center gap-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground active:scale-[0.98] transition shadow-sm cursor-pointer outline-none"
              >
                <span className="google-symbols text-[18px]">settings</span>
                Settings
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              sideOffset={6}
              className="w-[180px] bg-popover text-popover-foreground border border-border rounded-lg shadow-lg py-1.5 z-50 text-[13px] flex flex-col font-sans outline-none"
            >
              {menuView === "main" ? (
                <div id="settingsMainMenu" className="flex flex-col w-full">
                  <button
                    id="btnChangeModel"
                    className="flex items-center justify-between px-3 py-1.5 hover:bg-accent hover:text-accent-foreground text-left w-full transition-colors outline-none cursor-pointer text-[13px] border-none bg-transparent"
                  >
                    <div className="flex items-center gap-2">
                      <span className="google-symbols text-[16px]">rule_settings</span>
                      <span>Change Model</span>
                    </div>
                  </button>
                  <button
                    id="btnSwitchTheme"
                    onClick={(e) => {
                      e.stopPropagation()
                      setMenuView("theme")
                    }}
                    className="flex items-center justify-between px-3 py-1.5 hover:bg-accent hover:text-accent-foreground text-left w-full transition-colors outline-none cursor-pointer text-[13px] border-none bg-transparent"
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
                <div id="settingsSubMenuTheme" className="flex flex-col w-full">
                  <button
                    id="btnBackToMainMenu"
                    onClick={(e) => {
                      e.stopPropagation()
                      setMenuView("main")
                    }}
                    className="flex items-center gap-2 px-3 py-1.5 hover:bg-accent hover:text-accent-foreground text-left w-full transition-colors border-b border-border mb-1 text-muted-foreground hover:text-foreground outline-none cursor-pointer text-[13px] border-none bg-transparent"
                  >
                    <span className="google-symbols text-[16px]">arrow_back</span>
                    <span className="font-medium">Back</span>
                  </button>

                  <button
                    className="theme-option flex items-center justify-between px-3 py-1.5 hover:bg-accent hover:text-accent-foreground text-left w-full transition-colors outline-none cursor-pointer text-[13px] border-none bg-transparent"
                    onClick={() => {
                      setTheme("light")
                      setDropdownOpen(false)
                    }}
                  >
                    <div className="flex items-center gap-2">
                      <span className="google-symbols text-[16px]">light_mode</span>
                      <span>Light</span>
                    </div>
                    {theme === "light" && (
                      <span className="check-icon google-symbols text-[16px] text-foreground">
                        check
                      </span>
                    )}
                  </button>

                  <button
                    className="theme-option flex items-center justify-between px-3 py-1.5 hover:bg-accent hover:text-accent-foreground text-left w-full transition-colors outline-none cursor-pointer text-[13px] border-none bg-transparent"
                    onClick={() => {
                      setTheme("dark")
                      setDropdownOpen(false)
                    }}
                  >
                    <div className="flex items-center gap-2">
                      <span className="google-symbols text-[16px]">dark_mode</span>
                      <span>Dark</span>
                    </div>
                    {theme === "dark" && (
                      <span className="check-icon google-symbols text-[16px] text-foreground">
                        check
                      </span>
                    )}
                  </button>

                  <button
                    className="theme-option flex items-center justify-between px-3 py-1.5 hover:bg-accent hover:text-accent-foreground text-left w-full transition-colors outline-none cursor-pointer text-[13px] border-none bg-transparent"
                    onClick={() => {
                      setTheme("system")
                      setDropdownOpen(false)
                    }}
                  >
                    <div className="flex items-center gap-2">
                      <span className="google-symbols text-[16px]">desktop_windows</span>
                      <span>System</span>
                    </div>
                    {theme === "system" && (
                      <span className="check-icon google-symbols text-[16px] text-foreground">
                        check
                      </span>
                    )}
                  </button>
                </div>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="flex items-center gap-1 ml-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="w-8 h-8 rounded-full border border-border overflow-hidden bg-card flex items-center justify-center hover:opacity-90 transition outline-none cursor-pointer p-0">
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
      </div>
    </header>
  )
}

