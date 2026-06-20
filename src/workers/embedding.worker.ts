import { pipeline, env } from "@xenova/transformers"
import { createClient } from "@supabase/supabase-js"

// Tell Transformers.js to not search for local files
env.allowLocalModels = false

let pipelineInstance: any = null

async function getPipeline(onProgress: (status: string) => void) {
  if (!pipelineInstance) {
    onProgress("loading_model")
    pipelineInstance = await pipeline("feature-extraction", "Xenova/all-MiniLM-L6-v2")
    onProgress("model_loaded")
  }
  return pipelineInstance
}

self.onmessage = async (e: MessageEvent) => {
  const { type, chunks, query, supabaseUrl, supabaseKey, documentId, accessToken } = e.data

  try {
    const pipe = await getPipeline((status) => {
      self.postMessage({ type: "status", status })
    })

    if (type === "embed") {
      if (!chunks || chunks.length === 0) {
        throw new Error("No chunks provided for embedding")
      }
      if (!supabaseUrl || !supabaseKey || !documentId) {
        throw new Error("Missing Supabase credentials or documentId in worker")
      }

      const total = chunks.length
      const records = []

      for (let i = 0; i < total; i++) {
        self.postMessage({ type: "progress", current: i + 1, total, status: "embedding" })
        const text = chunks[i]

        // Generate embedding using mean pooling and normalization
        const output = await pipe(text, { pooling: "mean", normalize: true })
        const embedding = Array.from(output.data) as number[]

        records.push({
          document_id: documentId,
          content: text,
          embedding: embedding
        })
      }

      self.postMessage({ type: "status", status: "saving_to_db" })

      // Initialize supabase client inside worker with auth headers for RLS access
      const supabase = createClient(supabaseUrl, supabaseKey, {
        global: {
          headers: {
            Authorization: accessToken ? `Bearer ${accessToken}` : "",
          },
        },
      })
      const { error } = await supabase.from("document_chunks").insert(records)

      if (error) {
        throw new Error(`Failed to save chunks to Supabase: ${error.message}`)
      }

      self.postMessage({ type: "success" })
    } 
    else if (type === "embed_query") {
      if (!query) {
        throw new Error("No query provided for embedding")
      }

      const output = await pipe(query, { pooling: "mean", normalize: true })
      const embedding = Array.from(output.data) as number[]

      self.postMessage({ type: "query_embedding_success", embedding })
    }
  } catch (err: any) {
    console.error("Worker error:", err)
    const errMsg = err?.message || String(err)
    const errStr = errMsg.toLowerCase()
    
    if (
      errStr.includes("memory") ||
      errStr.includes("oom") ||
      errStr.includes("allocation") ||
      errStr.includes("token") ||
      errStr.includes("range") ||
      errStr.includes("buffer") ||
      errStr.includes("heavy")
    ) {
      self.postMessage({ type: "ERROR", message: "Failed to process heavy document locally." })
    } else {
      self.postMessage({ type: "ERROR", message: errMsg || "Failed to process heavy document locally." })
    }
  }
}
