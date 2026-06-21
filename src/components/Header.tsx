import { useState } from "react"
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

  const handleOpenChange = (open: boolean) => {
    setDropdownOpen(open)
    if (!open) {
      // reset to main menu on close
      setMenuView("main")
    }
  }

  return (
    <header className="h-[64px] flex-shrink-0 flex items-center justify-between px-[28px] bg-background text-foreground z-30">
      <div className="flex items-center gap-3">
        <a
          href="#"
          className="icon-container-active"
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
        <div className="flex items-center text-md font-semibold">
          <input
            type="text"
            value={notebookTitle}
            onChange={(e) => onTitleChange(e.target.value)}
            className="bg-transparent border-none outline-none focus:bg-muted hover:bg-muted/50 focus:ring-1 focus:ring-ring rounded px-2 py-1 transition text-[23px] font-medium text-foreground max-w-[160px] sm:max-w-[320px] md:max-w-[440px]"
            style={{ width: `${Math.max(8, notebookTitle.length + 1)}ch` }}
          />
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button
          id="btnCreateNotebook"
          onClick={onCreateNotebook}
          className="h-[34px] px-[18px] bg-zinc-950 text-zinc-50 border border-zinc-950 hover:opacity-90 dark:bg-zinc-50 dark:text-zinc-950 dark:border-zinc-50 rounded-full flex items-center gap-1.5 text-[13px] font-medium active:scale-[0.98] transition-all shadow-sm cursor-pointer outline-none font-sans"
        >
          <span className="google-symbols text-[18px]">add</span>
          Create notebook
        </button>
        <div className="flex items-center gap-2 relative">
          <DropdownMenu open={dropdownOpen} onOpenChange={handleOpenChange}>
            <DropdownMenuTrigger asChild>
              <button
                id="btnSettings"
                className="settings-action h-[34px] px-[18px] border border-border bg-background text-foreground rounded-full flex items-center gap-1.5 text-[13px] font-medium hover:bg-accent hover:text-accent-foreground active:scale-[0.98] transition-all shadow-sm cursor-pointer outline-none"
              >
                <span className="google-symbols text-[18px]">settings</span>
                Settings
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              sideOffset={6}
              className="w-[200px] bg-popover text-popover-foreground border border-border rounded-lg shadow-lg py-1.5 z-50 text-[14px] flex flex-col font-sans outline-none"
            >
              {menuView === "main" ? (
                <div id="settingsMainMenu" className="flex flex-col w-full">
                  <button
                    id="btnChangeModel"
                    className="flex items-center justify-between px-3 py-1.5 hover:bg-accent hover:text-accent-foreground text-left w-full transition-colors outline-none cursor-pointer"
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
                    className="flex items-center justify-between px-3 py-1.5 hover:bg-accent hover:text-accent-foreground text-left w-full transition-colors outline-none cursor-pointer"
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
                    className="flex items-center gap-2 px-3 py-1.5 hover:bg-accent hover:text-accent-foreground text-left w-full transition-colors border-b border-border mb-1 text-muted-foreground hover:text-foreground outline-none cursor-pointer"
                  >
                    <span className="google-symbols text-[16px]">arrow_back</span>
                    <span className="font-medium">Back</span>
                  </button>

                  <button
                    className="theme-option flex items-center justify-between px-3 py-1.5 hover:bg-accent hover:text-accent-foreground text-left w-full transition-colors outline-none cursor-pointer"
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
                    className="theme-option flex items-center justify-between px-3 py-1.5 hover:bg-accent hover:text-accent-foreground text-left w-full transition-colors outline-none cursor-pointer"
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
                    className="theme-option flex items-center justify-between px-3 py-1.5 hover:bg-accent hover:text-accent-foreground text-left w-full transition-colors outline-none cursor-pointer"
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
        <div className="flex items-center gap-3">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="w-[36px] h-[36px] rounded-full border border-border overflow-hidden bg-card flex items-center justify-center hover:opacity-90 transition outline-none cursor-pointer">
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
