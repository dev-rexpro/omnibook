import { useState } from "react"
import { useAuthStore } from "@/store/useAuthStore"

type AuthView = "signin" | "signup" | "forgot"

export function AuthPage() {
  const [view, setView] = useState<AuthView>("signin")
  
  // Input fields
  const [email, setEmail] = useState("")
  const [name, setName] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  
  // Password visibility toggles
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  // Local statuses
  const [formError, setFormError] = useState<string | null>(null)
  const [formSuccess, setFormSuccess] = useState<string | null>(null)
  const [showGoogleMock, setShowGoogleMock] = useState(false)

  // Mock Google custom input
  const [customGoogleEmail, setCustomGoogleEmail] = useState("")
  const [customGoogleName, setCustomGoogleName] = useState("")

  const { signIn, signUp, signInWithGoogle, isLoading, error: storeError, setError } = useAuthStore()

  const handleViewChange = (newView: AuthView) => {
    setView(newView)
    setFormError(null)
    setFormSuccess(null)
    setError(null)
  }

  const handleSignInSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError(null)
    setFormSuccess(null)

    if (!email || !password) {
      setFormError("Please fill in all fields")
      return
    }

    try {
      await signIn(email.trim().toLowerCase(), password)
    } catch (err: any) {
      // handled by store
    }
  }

  const handleSignUpSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError(null)
    setFormSuccess(null)

    if (!email || !name || !password || !confirmPassword) {
      setFormError("Please fill in all fields")
      return
    }

    if (password !== confirmPassword) {
      setFormError("Passwords do not match")
      return
    }

    if (password.length < 6) {
      setFormError("Password must be at least 6 characters long")
      return
    }

    try {
      await signUp(email.trim().toLowerCase(), name.trim(), password)
    } catch (err: any) {
      // handled by store
    }
  }

  const handleForgotPasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setFormError(null)
    setFormSuccess(null)

    if (!email) {
      setFormError("Please enter your email address")
      return
    }

    setFormSuccess(`We have sent a password reset link to ${email}`)
  }

  const handleGoogleAccountSelect = async (gEmail: string, gName: string, pictureUrl?: string) => {
    try {
      await signInWithGoogle(gEmail.toLowerCase(), gName, pictureUrl)
      setShowGoogleMock(false)
    } catch (err: any) {
      setFormError("Google Login mock failed")
    }
  }

  const handleCustomGoogleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!customGoogleEmail || !customGoogleName) return
    handleGoogleAccountSelect(
      customGoogleEmail.trim(),
      customGoogleName.trim(),
      `https://ui-avatars.com/api/?name=${encodeURIComponent(customGoogleName)}&background=0284c7&color=fff&bold=true`
    )
  }

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-background text-foreground overflow-y-auto py-12 px-4 font-sans">
      
      {/* ─── Header Logo & App Title ─── */}
      <div className="flex items-center gap-2.5 mb-6 select-none animate-in fade-in slide-in-from-bottom-2 duration-300">
        <div className="icon-container-active" style={{ width: 28, height: 28, minWidth: 28, minHeight: 28 }}>
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
            aria-hidden="true"
          >
            <rect width="12" height="20" x="6" y="2" rx="2" />
            <rect width="20" height="12" x="2" y="6" rx="2" />
          </svg>
        </div>
        <span className="text-[20px] font-bold tracking-tight text-foreground font-sans">
          OmnibookLM
        </span>
      </div>

      {/* ─── Card Container (strictly flat border, no shadow, clean shadcn style) ─── */}
      <div className="w-full max-w-[400px] bg-card text-card-foreground border border-border rounded-2xl p-6 md:p-8 flex flex-col gap-5 transition-all duration-300">
        
        {/* Sign In View */}
        {view === "signin" && (
          <>
            <div className="flex flex-col gap-1">
              <h2 className="text-[22px] font-bold tracking-tight text-foreground font-sans">
                Sign in
              </h2>
              <p className="text-[13px] text-muted-foreground font-sans leading-relaxed">
                Enter your email and password below to log into your account
              </p>
            </div>

            {(formError || storeError) && (
              <div className="bg-destructive/10 text-destructive text-[12px] font-medium px-3 py-2 rounded-lg border border-destructive/20 flex items-center gap-2 animate-pulse">
                <span className="material-symbols-outlined text-[16px]">error</span>
                <span>{formError || storeError}</span>
              </div>
            )}

            <form onSubmit={handleSignInSubmit} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[13px] font-semibold text-foreground tracking-wide font-sans">
                  Email
                </label>
                <input
                  type="email"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring focus-visible:border-ring outline-none disabled:cursor-not-allowed disabled:opacity-50 font-sans"
                  disabled={isLoading}
                  required
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <div className="flex justify-between items-center">
                  <label className="text-[13px] font-semibold text-foreground tracking-wide font-sans">
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={() => handleViewChange("forgot")}
                    className="text-[13px] text-muted-foreground hover:text-foreground font-sans cursor-pointer border-none bg-transparent outline-none p-0"
                  >
                    Forgot password?
                  </button>
                </div>
                <div className="relative flex items-center">
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder="********"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="flex h-9 w-full rounded-md border border-input bg-transparent pl-3 pr-9 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring focus-visible:border-ring outline-none disabled:cursor-not-allowed disabled:opacity-50 font-sans"
                    disabled={isLoading}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2.5 w-6 h-6 flex items-center justify-center text-muted-foreground hover:text-foreground cursor-pointer border-none bg-transparent outline-none p-0 transition"
                  >
                    <span className="material-symbols-outlined text-[18px] select-none">
                      {showPassword ? "visibility" : "visibility_off"}
                    </span>
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="inline-flex items-center justify-center rounded-md text-sm font-semibold transition-all focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring bg-zinc-950 text-zinc-50 dark:bg-zinc-50 dark:text-zinc-950 hover:opacity-90 active:scale-[0.98] h-9 px-4 py-2 border-none cursor-pointer outline-none mt-2 shadow-sm w-full gap-1.5 font-sans"
              >
                {isLoading ? (
                  <>
                    <span className="material-symbols-outlined text-[16px] animate-spin">sync</span>
                    Signing In...
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-[16px]">login</span>
                    Sign in
                  </>
                )}
              </button>
            </form>

            {/* Bottom Register Switch Link */}
            <div className="text-[13px] text-muted-foreground text-center font-sans">
              Don't have an account?{" "}
              <button
                onClick={() => handleViewChange("signup")}
                className="text-foreground font-semibold hover:underline cursor-pointer border-none bg-transparent p-0 outline-none"
              >
                Sign up
              </button>
            </div>
          </>
        )}

        {/* Create Account / Sign Up View */}
        {view === "signup" && (
          <>
            <div className="flex flex-col gap-1">
              <h2 className="text-[22px] font-bold tracking-tight text-foreground font-sans">
                Create an account
              </h2>
              <p className="text-[13px] text-muted-foreground font-sans leading-relaxed">
                Enter your email and password to create an account. Already have an account?{" "}
                <button
                  onClick={() => handleViewChange("signin")}
                  className="text-foreground font-semibold hover:underline cursor-pointer border-none bg-transparent p-0 outline-none"
                >
                  Sign In
                </button>
              </p>
            </div>

            {formError && (
              <div className="bg-destructive/10 text-destructive text-[12px] font-medium px-3 py-2 rounded-lg border border-destructive/20 flex items-center gap-2 animate-pulse">
                <span className="material-symbols-outlined text-[16px]">error</span>
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSignUpSubmit} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[13px] font-semibold text-foreground tracking-wide font-sans">
                  Full Name
                </label>
                <input
                  type="text"
                  placeholder="John Doe"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring focus-visible:border-ring outline-none disabled:cursor-not-allowed disabled:opacity-50 font-sans"
                  disabled={isLoading}
                  required
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[13px] font-semibold text-foreground tracking-wide font-sans">
                  Email
                </label>
                <input
                  type="email"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring focus-visible:border-ring outline-none disabled:cursor-not-allowed disabled:opacity-50 font-sans"
                  disabled={isLoading}
                  required
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[13px] font-semibold text-foreground tracking-wide font-sans">
                  Password
                </label>
                <div className="relative flex items-center">
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder="********"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="flex h-9 w-full rounded-md border border-input bg-transparent pl-3 pr-9 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring focus-visible:border-ring outline-none disabled:cursor-not-allowed disabled:opacity-50 font-sans"
                    disabled={isLoading}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2.5 w-6 h-6 flex items-center justify-center text-muted-foreground hover:text-foreground cursor-pointer border-none bg-transparent outline-none p-0 transition"
                  >
                    <span className="material-symbols-outlined text-[18px] select-none">
                      {showPassword ? "visibility" : "visibility_off"}
                    </span>
                  </button>
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[13px] font-semibold text-foreground tracking-wide font-sans">
                  Confirm Password
                </label>
                <div className="relative flex items-center">
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="********"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="flex h-9 w-full rounded-md border border-input bg-transparent pl-3 pr-9 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring focus-visible:border-ring outline-none disabled:cursor-not-allowed disabled:opacity-50 font-sans"
                    disabled={isLoading}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-2.5 w-6 h-6 flex items-center justify-center text-muted-foreground hover:text-foreground cursor-pointer border-none bg-transparent outline-none p-0 transition"
                  >
                    <span className="material-symbols-outlined text-[18px] select-none">
                      {showConfirmPassword ? "visibility" : "visibility_off"}
                    </span>
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="inline-flex items-center justify-center rounded-md text-sm font-semibold transition-all focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring bg-zinc-950 text-zinc-50 dark:bg-zinc-50 dark:text-zinc-950 hover:opacity-90 active:scale-[0.98] h-9 px-4 py-2 border-none cursor-pointer outline-none mt-2 shadow-sm w-full gap-1.5 font-sans"
              >
                {isLoading ? (
                  <>
                    <span className="material-symbols-outlined text-[16px] animate-spin">sync</span>
                    Creating Account...
                  </>
                ) : (
                  "Create Account"
                )}
              </button>
            </form>
          </>
        )}

        {/* Forgot Password View */}
        {view === "forgot" && (
          <>
            <div className="flex flex-col gap-1">
              <h2 className="text-[22px] font-bold tracking-tight text-foreground font-sans">
                Forgot Password
              </h2>
              <p className="text-[13px] text-muted-foreground font-sans leading-relaxed">
                Enter your registered email and we will send you a link to reset your password.
              </p>
            </div>

            {formError && (
              <div className="bg-destructive/10 text-destructive text-[12px] font-medium px-3 py-2 rounded-lg border border-destructive/20 flex items-center gap-2 animate-pulse">
                <span className="material-symbols-outlined text-[16px]">error</span>
                <span>{formError}</span>
              </div>
            )}

            {formSuccess && (
              <div className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[12px] font-medium px-3 py-2.5 rounded-lg border border-emerald-500/20 flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[16px]">check_circle</span>
                  <span>Reset link sent!</span>
                </div>
                <p className="text-[11px] text-muted-foreground mt-0.5 leading-normal">{formSuccess}</p>
              </div>
            )}

            <form onSubmit={handleForgotPasswordSubmit} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[13px] font-semibold text-foreground tracking-wide font-sans">
                  Email
                </label>
                <input
                  type="email"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring focus-visible:border-ring outline-none disabled:cursor-not-allowed disabled:opacity-50 font-sans"
                  disabled={isLoading}
                  required
                />
              </div>

              <button
                type="submit"
                className="inline-flex items-center justify-center rounded-md text-sm font-semibold transition-all focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring bg-zinc-950 text-zinc-50 dark:bg-zinc-50 dark:text-zinc-950 hover:opacity-90 active:scale-[0.98] h-9 px-4 py-2 border-none cursor-pointer outline-none mt-2 shadow-sm w-full gap-1.5 font-sans"
              >
                Continue
                <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
              </button>
            </form>

            {/* Back to sign in link */}
            <div className="text-[13px] text-muted-foreground text-center font-sans">
              Don't have an account?{" "}
              <button
                onClick={() => handleViewChange("signup")}
                className="text-foreground font-semibold hover:underline cursor-pointer border-none bg-transparent p-0 outline-none"
              >
                Sign up.
              </button>
              <div className="mt-2">
                <button
                  onClick={() => handleViewChange("signin")}
                  className="text-muted-foreground hover:text-foreground font-medium hover:underline cursor-pointer border-none bg-transparent p-0 outline-none"
                >
                  Back to Sign In
                </button>
              </div>
            </div>
          </>
        )}

        {/* Separator / Google OAuth Option */}
        {view !== "forgot" && (
          <>
            <div className="relative flex py-1 items-center">
              <div className="flex-grow border-t border-border"></div>
              <span className="flex-shrink mx-4 text-muted-foreground text-[10px] font-semibold uppercase tracking-wider select-none font-sans">
                Or continue with
              </span>
              <div className="flex-grow border-t border-border"></div>
            </div>

            {/* Third-party buttons matching Shadcn Admin style */}
            <div className="flex gap-2.5 w-full">
              <button
                onClick={() => setShowGoogleMock(true)}
                disabled={isLoading}
                className="flex-1 inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring border border-input bg-background hover:bg-accent hover:text-accent-foreground active:scale-[0.98] h-9 px-4 py-2 cursor-pointer outline-none shadow-sm gap-2 font-sans"
              >
                <svg className="w-[15px] h-[15px] select-none" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                Google
              </button>

              <button
                onClick={() => handleGoogleAccountSelect("github-mock-user@github.com", "GitHub Contributor")}
                disabled={isLoading}
                className="flex-1 inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring border border-input bg-background hover:bg-accent hover:text-accent-foreground active:scale-[0.98] h-9 px-4 py-2 cursor-pointer outline-none shadow-sm gap-2 font-sans"
              >
                <svg className="w-[15px] h-[15px] fill-current select-none" viewBox="0 0 24 24">
                  <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.166 6.839 9.489.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.603-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.464-1.11-1.464-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.831.092-.646.35-1.086.636-1.336-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.579.688.481C19.137 20.162 22 16.418 22 12c0-5.523-4.477-10-10-10z" />
                </svg>
                GitHub
              </button>
            </div>

            {/* Bottom Agreement Notice */}
            <div className="text-[12px] text-muted-foreground text-center leading-normal px-2 select-none font-sans mt-2">
              By clicking {view === "signin" ? "sign in" : "create account"}, you agree to our{" "}
              <a href="#" className="underline hover:text-foreground font-medium">Terms of Service</a>{" "}
              and{" "}
              <a href="#" className="underline hover:text-foreground font-medium">Privacy Policy</a>.
            </div>
          </>
        )}

      </div>

      {/* ─── Mock Google Login Overlay (border-only popup card) ─── */}
      {showGoogleMock && (
        <div className="fixed inset-0 bg-background/95 backdrop-blur-sm flex items-center justify-center z-[99999] transition-all duration-300 animate-in fade-in">
          <div className="w-[90%] max-w-[360px] bg-card text-card-foreground border border-border rounded-2xl p-6 flex flex-col gap-5 outline-none font-sans relative animate-in zoom-in-95">
            {/* Close Button */}
            <button
              onClick={() => setShowGoogleMock(false)}
              className="absolute top-4 right-4 w-7 h-7 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted cursor-pointer border-none bg-transparent outline-none transition"
            >
              <span className="material-symbols-outlined text-[16px]">close</span>
            </button>

            {/* Google Brand Header */}
            <div className="flex flex-col items-center gap-1.5 text-center select-none mt-2">
              <svg className="w-[24px] h-[24px]" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              <h3 className="text-[16px] font-bold text-foreground font-sans mt-1">Sign in with Google</h3>
              <p className="text-[12px] text-muted-foreground font-sans">to continue to OmnibookLM</p>
            </div>

            {/* List of Mock Accounts */}
            <div className="flex flex-col gap-2">
              {[
                { name: "John Doe", email: "john.doe@gmail.com", avatar: "JD", bg: "#0284c7" },
                { name: "Sarah Smith", email: "sarah.smith@gmail.com", avatar: "SS", bg: "#ec4899" }
              ].map((acc) => (
                <button
                  key={acc.email}
                  onClick={() => handleGoogleAccountSelect(acc.email, acc.name)}
                  className="flex items-center gap-3 w-full p-2.5 rounded-lg border border-border bg-card hover:bg-accent text-left transition cursor-pointer outline-none font-sans"
                >
                  <div
                    className="w-[30px] h-[30px] rounded-full flex items-center justify-center text-white text-[11px] font-bold select-none"
                    style={{ backgroundColor: acc.bg }}
                  >
                    {acc.avatar}
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[12px] font-semibold text-foreground leading-tight">{acc.name}</span>
                    <span className="text-[11px] text-muted-foreground leading-normal">{acc.email}</span>
                  </div>
                </button>
              ))}
            </div>

            {/* Separator */}
            <div className="relative flex py-0.5 items-center">
              <div className="flex-grow border-t border-border"></div>
              <span className="flex-shrink mx-3 text-muted-foreground text-[10px] font-semibold uppercase tracking-wider select-none font-sans">
                Or use custom email
              </span>
              <div className="flex-grow border-t border-border"></div>
            </div>

            {/* Form for custom mock Google user */}
            <form onSubmit={handleCustomGoogleSubmit} className="flex flex-col gap-3">
              <input
                type="text"
                placeholder="Google Profile Name"
                value={customGoogleName}
                onChange={(e) => setCustomGoogleName(e.target.value)}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring focus-visible:border-ring outline-none transition"
                required
              />
              <input
                type="email"
                placeholder="Google Email"
                value={customGoogleEmail}
                onChange={(e) => setCustomGoogleEmail(e.target.value)}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring focus-visible:border-ring outline-none transition"
                required
              />
              <button
                type="submit"
                className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring bg-zinc-950 text-zinc-50 dark:bg-zinc-50 dark:text-zinc-950 hover:opacity-90 active:scale-[0.98] h-9 px-4 py-2 border-none cursor-pointer outline-none w-full font-sans"
              >
                Sign In with custom Google
              </button>
            </form>

            <div className="text-[10px] text-muted-foreground text-center leading-normal px-2 select-none">
              To continue, Google will share your name, email address, language preference, and profile picture with OmnibookLM.
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
