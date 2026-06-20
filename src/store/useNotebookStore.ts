import { create } from "zustand"
import { supabase } from "@/lib/supabaseClient"
import { recursiveSplitText } from "@/lib/utils"

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
    set((state) => ({
      notebooks: state.notebooks.map((n) => (n.id === id ? { ...n, cover } : n)),
      currentNotebook:
        state.currentNotebook?.id === id
          ? { ...state.currentNotebook, cover }
          : state.currentNotebook,
    }))
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
    const chunks = recursiveSplitText(text, 1000, 200)
    if (chunks.length === 0) {
      throw new Error("No text content found to embed.")
    }

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

      const worker = new Worker(
        new URL("../workers/embedding.worker.ts", import.meta.url),
        { type: "module" }
      )

      worker.postMessage({
        type: "embed",
        chunks,
        supabaseUrl: import.meta.env.VITE_SUPABASE_URL,
        supabaseKey: import.meta.env.VITE_SUPABASE_ANON_KEY,
        documentId: doc.id,
        accessToken: token
      })

      worker.onmessage = async (event) => {
        const data = event.data
        if (data.type === "success") {
          await supabase
            .from("documents")
            .update({ status: "completed" })
            .eq("id", doc.id)

          const isFirstCompleted = get().documents.filter((d) => d.status === "completed").length === 0

          set((state) => ({
            documents: state.documents.map((d) =>
              d.id === doc.id ? { ...d, status: "completed" } : d
            ),
            selectedDocumentIds: [...state.selectedDocumentIds, doc.id]
          }))
          worker.terminate()

          if (isFirstCompleted) {
            await get().generateNotebookGuide(notebookId, doc.id)
          }
        } else if (data.type === "error" || data.type === "ERROR") {
          const errMsg = data.message || data.error || "An error occurred during ingestion"
          console.error("Worker indexing failed:", errMsg)
          await supabase
            .from("documents")
            .update({ status: "error" })
            .eq("id", doc.id)

          set((state) => ({
            documents: state.documents.map((d) =>
              d.id === doc.id ? { ...d, status: "error" } : d
            )
          }))
          worker.terminate()
        }
      }

      worker.onerror = async (err) => {
        console.error("Worker indexing crashed:", err)
        await supabase
          .from("documents")
          .update({ status: "error" })
          .eq("id", doc.id)

        set((state) => ({
          documents: state.documents.map((d) =>
            d.id === doc.id ? { ...d, status: "error" } : d
          )
        }))
        worker.terminate()
      }
    } catch (err: any) {
      console.error("Failed to start worker:", err)
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
