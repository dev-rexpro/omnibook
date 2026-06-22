import { create } from "zustand"
import { supabase } from "@/lib/supabaseClient"

export interface Notebook {
  id: string
  title: string
  created_at: string
  cover?: string | null
  summary?: string | null
  suggested_prompts?: string[] | null
}

export interface DocumentFile {
  id: string
  notebook_id: string
  filename: string
  created_at: string
  storage_path?: string | null
  status?: "indexing" | "completed" | "error" | null
}

export interface Citation {
  index: number
  filename: string
  content: string
}

export interface Message {
  id: string
  sender: "user" | "ai"
  text: string
  suggestedPrompts?: string[]
  citations?: Citation[]
  created_at?: string
}

export interface ModelConfig {
  model_name: string
  temperature: number
}

interface NotebookState {
  notebooks: Notebook[]
  currentNotebook: Notebook | null
  documents: DocumentFile[]
  selectedDocumentIds: string[]
  chatHistory: Message[]
  activeChatId: string | null
  isProcessing: boolean
  isIngesting: boolean
  ingestionProgress: string
  modelConfig: ModelConfig

  loadNotebooks: () => Promise<void>
  createNotebook: () => Promise<Notebook | null>
  deleteNotebook: (id: string) => Promise<void>
  setCurrentNotebook: (notebook: Notebook | null) => Promise<void>
  updateNotebookTitle: (id: string, newTitle: string) => Promise<void>
  updateNotebookCover: (id: string, cover: string | null) => Promise<void>

  loadDocuments: (notebookId: string) => Promise<void>
  addDocument: (notebookId: string, filename: string, storagePath?: string) => Promise<DocumentFile | null>
  deleteDocument: (id: string) => Promise<void>
  renameDocument: (id: string, newFilename: string) => Promise<void>
  ingestDocument: (notebookId: string, filename: string, text: string, storagePath?: string) => Promise<void>
  generateNotebookGuide: (notebookId: string, docId: string) => Promise<void>

  loadChats: (notebookId: string) => Promise<void>
  loadMessages: (chatId: string) => Promise<void>

  setChatHistory: (history: Message[]) => void
  addMessage: (message: Message) => void
  clearChatHistory: () => Promise<void>

  setIsProcessing: (processing: boolean) => void
  setIsIngesting: (ingesting: boolean) => void
  setIngestionProgress: (progress: string) => void

  setModelConfig: (config: Partial<ModelConfig>) => void
  toggleDocumentSelection: (id: string) => void
  setSelectedDocumentIds: (ids: string[]) => void
}

export const useNotebookStore = create<NotebookState>((set, get) => ({
  notebooks: [],
  currentNotebook: null,
  documents: [],
  selectedDocumentIds: [],
  chatHistory: [],
  activeChatId: null,
  isProcessing: false,
  isIngesting: false,
  ingestionProgress: "",
  modelConfig: {
    model_name: "gemini-2.5-flash",
    temperature: 0.7,
  },

  loadNotebooks: async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data, error } = await supabase
      .from("notebooks")
      .select("*")
      .order("created_at", { ascending: false })

    if (!error && data) {
      set({ notebooks: data })
    }
  },

  createNotebook: async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null

    const { data, error } = await supabase
      .from("notebooks")
      .insert({
        title: "Untitled notebook",
        user_id: user.id,
      })
      .select()
      .single()

    if (!error && data) {
      set((state) => ({ notebooks: [data, ...state.notebooks] }))
      return data
    }
    return null
  },

  deleteNotebook: async (id) => {
    const { error } = await supabase.from("notebooks").delete().eq("id", id)
    if (!error) {
      set((state) => {
        const notebooks = state.notebooks.filter((n) => n.id !== id)
        const currentNotebook = state.currentNotebook?.id === id ? null : state.currentNotebook
        return { notebooks, currentNotebook }
      })
    }
  },

  setCurrentNotebook: async (notebook) => {
    set({ currentNotebook: notebook, documents: [], selectedDocumentIds: [], chatHistory: [], activeChatId: null })
    if (notebook) {
      await get().loadDocuments(notebook.id)
      await get().loadChats(notebook.id)
    }
  },

  updateNotebookTitle: async (id, newTitle) => {
    const { error } = await supabase
      .from("notebooks")
      .update({ title: newTitle })
      .eq("id", id)

    if (!error) {
      set((state) => ({
        notebooks: state.notebooks.map((n) => (n.id === id ? { ...n, title: newTitle } : n)),
        currentNotebook:
          state.currentNotebook?.id === id
            ? { ...state.currentNotebook, title: newTitle }
            : state.currentNotebook,
      }))
    }
  },

  updateNotebookCover: async (id, cover) => {
    const { error } = await supabase
      .from("notebooks")
      .update({ cover })
      .eq("id", id)

    if (!error) {
      set((state) => ({
        notebooks: state.notebooks.map((n) => (n.id === id ? { ...n, cover } : n)),
        currentNotebook:
          state.currentNotebook?.id === id
            ? { ...state.currentNotebook, cover }
            : state.currentNotebook,
      }))
    }
  },

  loadDocuments: async (notebookId) => {
    const { data, error } = await supabase
      .from("documents")
      .select("*")
      .eq("notebook_id", notebookId)
      .order("created_at", { ascending: true })

    if (!error && data) {
      // By default, select all documents that are completed
      const completedDocIds = data
        .filter((d) => d.status !== "indexing")
        .map((d) => d.id)

      set({ 
        documents: data,
        selectedDocumentIds: completedDocIds
      })
      
      // DEBUG: Log the chunk counts for each document in the console
      for (const doc of data) {
        const { count, error: chunkErr } = await supabase
          .from("document_chunks")
          .select("*", { count: "exact", head: true })
          .eq("document_id", doc.id)
        console.log(`[DEBUG] Document "${doc.filename}" has ${count} chunks in public.document_chunks. Error:`, chunkErr)
      }
    }
  },

  addDocument: async (notebookId, filename, storagePath) => {
    const { data, error } = await supabase
      .from("documents")
      .insert({ notebook_id: notebookId, filename, storage_path: storagePath || null, status: "completed" })
      .select()
      .single()

    if (!error && data) {
      set((state) => ({ 
        documents: [...state.documents, data],
        selectedDocumentIds: [...state.selectedDocumentIds, data.id]
      }))
      return data
    }
    return null
  },

  deleteDocument: async (id) => {
    const doc = get().documents.find((d) => d.id === id)
    if (doc?.storage_path) {
      try {
        await supabase.storage.from("document-pdfs").remove([doc.storage_path])
      } catch (err) {
        console.error("Failed to delete PDF from storage bucket:", err)
      }
    }

    const { error } = await supabase.from("documents").delete().eq("id", id)
    if (!error) {
      set((state) => ({
        documents: state.documents.filter((d) => d.id !== id),
        selectedDocumentIds: state.selectedDocumentIds.filter((dId) => dId !== id),
      }))
    }
  },

  renameDocument: async (id, newFilename) => {
    const { error } = await supabase
      .from("documents")
      .update({ filename: newFilename })
      .eq("id", id)

    if (!error) {
      set((state) => ({
        documents: state.documents.map((d) =>
          d.id === id ? { ...d, filename: newFilename } : d
        )
      }))
    } else {
      throw new Error(`Failed to rename document: ${error.message}`)
    }
  },

  ingestDocument: async (notebookId, filename, text, storagePath) => {
    const { data: doc, error } = await supabase
      .from("documents")
      .insert({ 
        notebook_id: notebookId, 
        filename, 
        storage_path: storagePath || null, 
        status: "indexing" 
      })
      .select()
      .single()

    if (error || !doc) {
      throw new Error(error?.message || "Failed to create document record in database.")
    }

    set((state) => ({
      documents: [...state.documents, doc]
    }))

    try {
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token

      if (!token) {
        throw new Error("Missing access token. Please login again.")
      }

      const backendUrl = import.meta.env.VITE_BACKEND_URL || "http://localhost:8000"

      const response = await fetch(`${backendUrl}/ingest`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          notebook_id: notebookId,
          document_id: doc.id,
          filename: filename,
          storage_path: storagePath || null,
          text_content: text || null
        })
      })

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}))
        throw new Error(errData.detail || "Failed to process ingestion on backend.")
      }

      // Success: update document status to completed in local store state
      set((state) => ({
        documents: state.documents.map((d) =>
          d.id === doc.id ? { ...d, status: "completed" } : d
        ),
        selectedDocumentIds: [...state.selectedDocumentIds, doc.id]
      }))

      // Reload notebooks to fetch updated summaries and suggested prompts generated by backend
      await get().loadNotebooks()
      const updatedNotebook = get().notebooks.find((n) => n.id === notebookId)
      if (updatedNotebook) {
        set({ currentNotebook: updatedNotebook })
      }

    } catch (err: any) {
      console.error("Ingestion failed:", err)
      await supabase
        .from("documents")
        .update({ status: "error" })
        .eq("id", doc.id)

      set((state) => ({
        documents: state.documents.map((d) =>
          d.id === doc.id ? { ...d, status: "error" } : d
        )
      }))
    }
  },

  generateNotebookGuide: async (notebookId, docId) => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-chat`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${session.access_token}`,
            "apikey": import.meta.env.VITE_SUPABASE_ANON_KEY,
          },
          body: JSON.stringify({
            action: "summarize_notebook",
            notebook_id: notebookId,
            document_id: docId,
          }),
        }
      )

      if (!response.ok) {
        throw new Error(`Failed to generate notebook guide: ${response.statusText}`)
      }

      const data = await response.json()
      const { title, summary, suggested_prompts } = data

      // Preserve title if user already updated it
      const current = get().currentNotebook
      const shouldUpdateTitle = !current || current.title === "Untitled notebook" || current.title.trim() === ""

      const updatePayload: any = {
        summary,
        suggested_prompts,
      }
      if (shouldUpdateTitle) {
        updatePayload.title = title
      }

      const { error: updateErr } = await supabase
        .from("notebooks")
        .update(updatePayload)
        .eq("id", notebookId)

      if (!updateErr) {
        set((state) => ({
          notebooks: state.notebooks.map((n) =>
            n.id === notebookId ? { ...n, ...updatePayload } : n
          ),
          currentNotebook: state.currentNotebook?.id === notebookId
            ? { ...state.currentNotebook, ...updatePayload }
            : state.currentNotebook
        }))
      }
    } catch (err) {
      console.error("Failed to generate notebook guide:", err)
    }
  },

  loadChats: async (notebookId) => {
    const { data: chats, error } = await supabase
      .from("chats")
      .select("*")
      .eq("notebook_id", notebookId)
      .order("created_at", { ascending: true })

    if (error) {
      console.error("Failed to load chats:", error)
      return
    }

    let activeChatId = null
    if (chats && chats.length > 0) {
      activeChatId = chats[0].id
    } else {
      const { data: newChat, error: newChatErr } = await supabase
        .from("chats")
        .insert({ notebook_id: notebookId, title: "Default Chat" })
        .select()
        .single()

      if (newChatErr) {
        console.error("Failed to create default chat:", newChatErr)
      } else if (newChat) {
        activeChatId = newChat.id
      }
    }

    set({ activeChatId })

    if (activeChatId) {
      await get().loadMessages(activeChatId)
    }
  },

  loadMessages: async (chatId) => {
    const { data: messages, error } = await supabase
      .from("messages")
      .select("*")
      .eq("chat_id", chatId)
      .order("created_at", { ascending: true })

    if (!error && messages) {
      const mapped: Message[] = messages.map((m: any) => ({
        id: m.id,
        sender: m.role === "model" ? "ai" : "user",
        text: m.content,
        citations: m.citations || undefined,
        created_at: m.created_at,
      }))
      set({ chatHistory: mapped })
    }
  },

  setChatHistory: (history) => set({ chatHistory: history }),

  addMessage: (message) => set((state) => ({ chatHistory: [...state.chatHistory, message] })),

  clearChatHistory: async () => {
    const { activeChatId } = get()
    if (activeChatId) {
      const { error } = await supabase.from("messages").delete().eq("chat_id", activeChatId)
      if (error) {
        console.error("Failed to delete messages from DB:", error)
      }
    }
    set({ chatHistory: [] })
  },

  setIsProcessing: (processing) => set({ isProcessing: processing }),

  setIsIngesting: (ingesting) => set({ isIngesting: ingesting }),

  setIngestionProgress: (progress) => set({ ingestionProgress: progress }),

  setModelConfig: (config) =>
    set((state) => ({
      modelConfig: { ...state.modelConfig, ...config },
    })),

  toggleDocumentSelection: (id) =>
    set((state) => {
      const selected = state.selectedDocumentIds.includes(id)
        ? state.selectedDocumentIds.filter((dId) => dId !== id)
        : [...state.selectedDocumentIds, id]
      return { selectedDocumentIds: selected }
    }),

  setSelectedDocumentIds: (ids) =>
    set({ selectedDocumentIds: ids }),
}))
