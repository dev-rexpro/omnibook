import { create } from "zustand"
import { supabase } from "@/lib/supabaseClient"

export interface User {
  id: string
  email: string
  name: string
  avatarUrl?: string
}

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
      const { data: { session }, error } = await supabase.auth.getSession()
      if (error) throw error
      
      if (session?.user) {
        const userMetadata = session.user.user_metadata
        set({
          user: {
            id: session.user.id,
            email: session.user.email || "",
            name: userMetadata.name || userMetadata.full_name || session.user.email?.split("@")[0] || "User",
            avatarUrl: userMetadata.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(userMetadata.name || "User")}&background=f4f4f5&color=09090b&bold=true`
          },
          isAuthenticated: true
        })
      } else {
        set({ user: null, isAuthenticated: false })
      }

      // Set up auth state change listener
      supabase.auth.onAuthStateChange((_event, session) => {
        if (session?.user) {
          const userMetadata = session.user.user_metadata
          set({
            user: {
              id: session.user.id,
              email: session.user.email || "",
              name: userMetadata.name || userMetadata.full_name || session.user.email?.split("@")[0] || "User",
              avatarUrl: userMetadata.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(userMetadata.name || "User")}&background=f4f4f5&color=09090b&bold=true`
            },
            isAuthenticated: true
          })
        } else {
          set({ user: null, isAuthenticated: false })
        }
      })

    } catch (err: any) {
      console.error("Failed to initialize session:", err)
      set({ user: null, isAuthenticated: false })
    } finally {
      set({ isLoading: false })
    }
  },

  signUp: async (email, name, password) => {
    set({ isLoading: true, error: null })
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name: name,
            full_name: name
          }
        }
      })
      if (error) throw error
      
      if (data.user) {
        set({
          user: {
            id: data.user.id,
            email: data.user.email || "",
            name: name,
            avatarUrl: `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=f4f4f5&color=09090b&bold=true`
          },
          isAuthenticated: true
        })
      }
    } catch (err: any) {
      set({ error: err.message || "Failed to register" })
      throw err
    } finally {
      set({ isLoading: false })
    }
  },

  signIn: async (email, password) => {
    set({ isLoading: true, error: null })
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      })
      if (error) throw error

      if (data.user) {
        const userMetadata = data.user.user_metadata
        set({
          user: {
            id: data.user.id,
            email: data.user.email || "",
            name: userMetadata.name || userMetadata.full_name || data.user.email?.split("@")[0] || "User",
            avatarUrl: userMetadata.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(userMetadata.name || "User")}&background=f4f4f5&color=09090b&bold=true`
          },
          isAuthenticated: true
        })
      }
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
      const devMockPassword = `GoogleAuthBypass123!_${email}`
      try {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password: devMockPassword
        })
        if (error) throw error
        
        if (data.user) {
          set({
            user: {
              id: data.user.id,
              email: data.user.email || "",
              name: data.user.user_metadata.name || name,
              avatarUrl: pictureUrl || data.user.user_metadata.avatar_url
            },
            isAuthenticated: true
          })
        }
      } catch (signInErr: any) {
        const { data, error } = await supabase.auth.signUp({
          email,
          password: devMockPassword,
          options: {
            data: {
              name,
              avatar_url: pictureUrl
            }
          }
        })
        if (error) throw error
        
        if (data.user) {
          set({
            user: {
              id: data.user.id,
              email: data.user.email || "",
              name,
              avatarUrl: pictureUrl
            },
            isAuthenticated: true
          })
        }
      }
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
      const { error } = await supabase.auth.signOut()
      if (error) throw error
      set({ user: null, isAuthenticated: false, error: null })
    } catch (err: any) {
      console.error("Sign out failed:", err)
      set({ user: null, isAuthenticated: false })
    } finally {
      set({ isLoading: false })
    }
  }
}))
