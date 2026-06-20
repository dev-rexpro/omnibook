import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { GoogleGenAI } from "npm:@google/genai"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
}

Deno.serve(async (req) => {
  // Handle CORS preflight options request
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!
    const geminiApiKey = Deno.env.get("GEMINI_API_KEY")

    if (!geminiApiKey) {
      throw new Error("GEMINI_API_KEY is not configured in Supabase Edge Function environment")
    }

    const authHeader = req.headers.get("Authorization")
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing Authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    const body = await req.json()
    const { action, query, query_embedding, model_config, notebook_id, document_ids, document_id } = body

    // Initialize Supabase Client with the user's authorization header to respect RLS
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: authHeader,
        },
      },
    })

    // Action to automatically generate Title, Summary and Suggestions when the first file is completed
    if (action === "summarize_notebook") {
      if (!document_id || !notebook_id) {
        return new Response(JSON.stringify({ error: "Missing document_id or notebook_id" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        })
      }

      // Fetch first 10 chunks to get enough core context without hitting tokens limit
      const { data: chunks, error: chunksErr } = await supabase
        .from("document_chunks")
        .select("content")
        .eq("document_id", document_id)
        .limit(10)

      if (chunksErr || !chunks || chunks.length === 0) {
        throw new Error(chunksErr?.message || "No chunks found for the document to summarize")
      }

      const docText = chunks.map((c: any) => c.content).join("\n\n")

      const summarizePrompt = `You are a helpful AI assistant. Analyze the following document text from a user's notebook and generate:
1. A professional, concise title for the notebook based on the document contents (maximum 6 words).
2. A brief, premium, informative summary of the document (around 3-5 sentences).
3. Exactly 3 relevant suggested follow-up questions the user might want to ask about this document.

Document Text:
${docText}

You MUST return your response as a valid JSON object matching this schema:
{
  "title": "string",
  "summary": "string",
  "suggested_prompts": ["string", "string", "string"]
}`

      const ai = new GoogleGenAI({ apiKey: geminiApiKey })
      const genResponse = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: summarizePrompt,
        config: {
          responseMimeType: "application/json",
        }
      })

      const responseText = genResponse.text
      if (!responseText) {
        throw new Error("Model generated empty response")
      }

      return new Response(responseText, {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    // Default chat behavior
    if (!query || !query_embedding) {
      return new Response(JSON.stringify({ error: "Missing query or query_embedding" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    console.log("Edge Function received query:", query)
    console.log("Edge Function notebook_id:", notebook_id)
    console.log("Edge Function selected document_ids:", document_ids)
    console.log("Edge Function query_embedding dimension:", query_embedding?.length)

    let chunks: any[] | null = null
    let rpcError: any = null

    // 1. Try calling the RPC function with the new filter_document_ids parameter
    const rpcParams: any = {
      query_embedding: query_embedding,
      match_threshold: 0.1,
      match_count: 6,
      filter_notebook_id: notebook_id,
    }

    if (document_ids && document_ids.length > 0) {
      rpcParams.filter_document_ids = document_ids
    }

    const firstTry = await supabase.rpc("match_document_chunks", rpcParams)
    chunks = firstTry.data
    rpcError = firstTry.error

    // 2. Catch overloading/signature mismatch errors (e.g. database function hasn't been migrated yet)
    if (
      rpcError && 
      (rpcError.message?.includes("param") || 
       rpcError.message?.includes("signature") || 
       rpcError.message?.includes("does not exist") || 
       rpcError.message?.includes("positional") ||
       rpcError.code === "42883")
    ) {
      console.log("RPC signature mismatch on hosted DB, falling back to JS-side filtering. Error detail:", rpcError)
      
      // Fetch a larger count of 100 chunks from the notebook
      const fallbackTry = await supabase.rpc("match_document_chunks", {
        query_embedding: query_embedding,
        match_threshold: 0.1,
        match_count: 100,
        filter_notebook_id: notebook_id,
      })

      if (fallbackTry.error) {
        console.error("Fallback RPC Error:", fallbackTry.error)
        throw new Error(`Failed to match document chunks in fallback: ${fallbackTry.error.message}`)
      }

      const allChunks = fallbackTry.data || []
      
      // Filter by selected document IDs in Javascript
      if (document_ids && document_ids.length > 0) {
        chunks = allChunks
          .filter((c: any) => document_ids.includes(c.document_id))
          .slice(0, 6)
      } else {
        chunks = allChunks.slice(0, 6)
      }
      
      rpcError = null
    } else if (rpcError) {
      console.error("RPC Error detail:", rpcError)
      throw new Error(`Failed to match document chunks: ${rpcError.message}`)
    }

    // Resolve filenames for the matched chunks to build accurate citation metadata
    const matchedChunks = chunks || []
    const uniqueDocIds = [...new Set(matchedChunks.map((c: any) => c.document_id))]
    const documentMap: Record<string, string> = {}
    if (uniqueDocIds.length > 0) {
      const { data: docs } = await supabase
        .from("documents")
        .select("id, filename")
        .in("id", uniqueDocIds)
      if (docs) {
        docs.forEach((d: any) => {
          documentMap[d.id] = d.filename
        })
      }
    }

    // Build the citations list that will be sent to the client
    const citations = matchedChunks.map((c: any, idx: number) => ({
      index: idx + 1, // 1-indexed
      filename: documentMap[c.document_id] || "Unknown Source",
      content: c.content
    }))

    // Ground the response by compiling context with clear source labeling
    const contextText = matchedChunks && matchedChunks.length > 0
      ? matchedChunks.map((c: any, idx: number) => `[Source ${idx + 1} - from document "${documentMap[c.document_id] || "Unknown"}"]:\n${c.content}`).join("\n\n---\n\n")
      : "No relevant documents found in the active notebook."

    // Construct Master Prompt
    const masterPrompt = `You are a helpful AI assistant. You have access to the following documents in the user's notebook. Use the provided context to answer the user's query.
If the context does not contain enough information to answer, state that you cannot find the answer in the provided documents. Rely ONLY on the provided context. Do not make up facts.

You MUST include inline citations in your response referencing the sources. Whenever you state a fact or detail from a source in the context, append its source number at the end of the sentence or clause using brackets, e.g. [1], [2]. If multiple sources apply, output them next to each other like [1][2]. Do not combine them inside one bracket like [1,2]. The citation numbers MUST correspond to the 1-based source indices in the Context below.

Context:
${contextText}

User Query:
${query}

Answer:
At the very end of your answer, you MUST generate exactly 3 relevant follow-up questions that the user might want to ask next, matching the language of the conversation. Format them on a single final line starting with "[SUGGESTED_QUESTIONS]:" and separated by " | ".
Example:
[SUGGESTED_QUESTIONS]: question 1 | question 2 | question 3`

    // Initialize Google GenAI SDK
    const ai = new GoogleGenAI({ apiKey: geminiApiKey })
    const model = model_config?.model_name || "gemini-2.5-flash"
    const temperature = model_config?.temperature ?? 0.7

    // Stream generation content
    const responseStream = await ai.models.generateContentStream({
      model: model,
      contents: masterPrompt,
      config: {
        temperature: temperature,
      },
    })

    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder()
        let accumulated = ""
        try {
          // Send citations metadata chunk first
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ citations })}\n\n`))

          for await (const chunk of responseStream) {
            const text = chunk.text
            if (text) {
              accumulated += text
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text })}\n\n`))
            }
          }

          // Once the stream is finished, parse clean text and suggestions
          let cleanText = accumulated
          let suggested: string[] = []

          const delimiterIndex = accumulated.indexOf("[SUGGESTED_QUESTIONS]:")
          if (delimiterIndex !== -1) {
            cleanText = accumulated.substring(0, delimiterIndex).trim()
            const suggestedPart = accumulated.substring(delimiterIndex + "[SUGGESTED_QUESTIONS]:".length).trim()
            suggested = suggestedPart.split("|").map(q => q.trim()).filter(Boolean)
          }

          // Send final payload with cleaned text and suggestions list
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text: "", clean_text: cleanText, suggested })}\n\n`))
        } catch (err: any) {
          console.error("Streaming error:", err)
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: err.message })}\n\n`))
        } finally {
          controller.close()
        }
      },
    })

    return new Response(stream, {
      headers: {
        ...corsHeaders,
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
      },
    })

  } catch (err: any) {
    console.error("Edge function error:", err)
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  }
})
