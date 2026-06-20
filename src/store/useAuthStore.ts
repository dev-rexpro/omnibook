import { create } from "zustand"
import {
  registerUser,
  authenticateUser,
  googleLoginOrRegister,
  saveSession,
  getSession,
  clearSession,
  type User
} from "@/lib/db"

interface AuthState {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  error: string | null
  setError: (error: string | null) => void
  initSession: () => Promise<void>
  signUp: (email: string, name: string, passwordHash: string) => Promise<void>
  signIn: (email: string, passwordHash: string) => Promise<void>
  signInWithGoogle: (email: string, name: string, pictureUrl?: string) => Promise<void>
  signOut: () => Promise<void>
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  error: null,

  setError: (error) => set({ error }),

  initSession: async () => {
    try {
      set({ isLoading: true })
      const sessionUser = await getSession()
      if (sessionUser) {
        set({ user: sessionUser, isAuthenticated: true })
      } else {
        set({ user: null, isAuthenticated: false })
      }
    } catch (err: any) {
      console.error("Failed to initialize session from IndexedDB:", err)
      set({ user: null, isAuthenticated: false })
    } finally {
      set({ isLoading: false })
    }
  },

  signUp: async (email, name, passwordHash) => {
    set({ isLoading: true, error: null })
    try {
      const newUser = await registerUser(email, name, passwordHash)
      await saveSession(newUser)
      set({ user: newUser, isAuthenticated: true })
    } catch (err: any) {
      set({ error: err.message || "Failed to register" })
      throw err
    } finally {
      set({ isLoading: false })
    }
  },

  signIn: async (email, passwordHash) => {
    set({ isLoading: true, error: null })
    try {
      const authUser = await authenticateUser(email, passwordHash)
      await saveSession(authUser)
      set({ user: authUser, isAuthenticated: true })
    } catch (err: any) {
      set({ error: err.message || "Failed to sign in" })
      throw err
    } finally {
      set({ isLoading: false })
    }
  },

  signInWithGoogle: async (email, name, pictureUrl) => {
    set({ isLoading: true, error: null })
    try {
      const authUser = await googleLoginOrRegister(email, name, pictureUrl)
      await saveSession(authUser)
      set({ user: authUser, isAuthenticated: true })
    } catch (err: any) {
      set({ error: err.message || "Google Authentication failed" })
      throw err
    } finally {
      set({ isLoading: false })
    }
  },

  signOut: async () => {
    set({ isLoading: true })
    try {
      await clearSession()
      set({ user: null, isAuthenticated: false, error: null })
    } catch (err: any) {
      console.error("Sign out session cleanup failed:", err)
      // fallback
      set({ user: null, isAuthenticated: false })
    } finally {
      set({ isLoading: false })
    }
  }
}))
