import os
import io
import json
import logging
from typing import List, Optional, Dict, Any
from fastapi import FastAPI, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
import httpx
from pypdf import PdfReader
import google.generativeai as genai
from dotenv import load_dotenv

# Import modular backend components
from src.embeddings import get_embedding_model
from src.vectorstore import get_vectorstore, add_documents_to_store, delete_document_from_store, query_store
from src.loader import split_text_to_documents
from src.rag import rewrite_query

# Load local environment variables if present
load_dotenv()

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("backend")

# Initialize environment variables
SUPABASE_URL = os.getenv("SUPABASE_URL") or os.getenv("VITE_SUPABASE_URL")
SUPABASE_ANON_KEY = os.getenv("SUPABASE_ANON_KEY") or os.getenv("VITE_SUPABASE_ANON_KEY")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

if not SUPABASE_URL or not SUPABASE_ANON_KEY:
    logger.warning("Supabase URL or Anon Key not configured in environment variables.")
if not GEMINI_API_KEY:
    logger.warning("GEMINI_API_KEY not configured in environment variables.")
else:
    genai.configure(api_key=GEMINI_API_KEY)

# Initialize FastAPI
app = FastAPI(title="Omnibook Chroma RAG Backend")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize ChromaDB Vector Store
logger.info("Initializing ChromaDB Vector Store...")
embedding_model = get_embedding_model()
vector_db = get_vectorstore(embedding_model)
logger.info("ChromaDB initialized successfully.")

class IngestRequest(BaseModel):
    notebook_id: str
    document_id: str
    filename: str
    storage_path: Optional[str] = None
    text_content: Optional[str] = None

class ChatRequest(BaseModel):
    query: str
    notebook_id: str
    document_ids: Optional[List[str]] = None
    llm_config: Optional[dict] = None
    chat_id: Optional[str] = None

def update_document_status(document_id: str, status: str, auth_header: str):
    url = f"{SUPABASE_URL}/rest/v1/documents?id=eq.{document_id}"
    headers = {
        "Authorization": auth_header,
        "apikey": SUPABASE_ANON_KEY,
        "Content-Type": "application/json"
    }
    try:
        response = httpx.patch(url, headers=headers, json={"status": status})
        response.raise_for_status()
        logger.info(f"Successfully updated document {document_id} status to '{status}' in Supabase.")
    except Exception as e:
        logger.error(f"Failed to update document status in Supabase: {e}")

def check_and_generate_notebook_guide(notebook_id: str, document_id: str, chunks: List[str], auth_header: str):
    url = f"{SUPABASE_URL}/rest/v1/notebooks?id=eq.{notebook_id}"
    headers = {
        "Authorization": auth_header,
        "apikey": SUPABASE_ANON_KEY
    }
    try:
        res = httpx.get(url, headers=headers)
        res.raise_for_status()
        notebooks = res.json()
        if not notebooks:
            return
        notebook = notebooks[0]
        
        title = notebook.get("title", "")
        summary = notebook.get("summary", "")
        
        if title == "Untitled notebook" or not summary:
            logger.info(f"Generating summary & guide for notebook: {notebook_id}")
            summary_text = "\n\n".join(chunks[:10])
            
            prompt = f"""You are a helpful AI assistant. Analyze the following document text from a user's notebook and generate:
1. A professional, concise title for the notebook based on the document contents (maximum 6 words).
2. A brief, premium, informative summary of the document (around 3-5 sentences).
3. Exactly 3 relevant suggested follow-up questions the user might want to ask about this document.

Document Text:
{summary_text}

You MUST return your response as a valid JSON object matching this schema:
{{
  "title": "string",
  "summary": "string",
  "suggested_prompts": ["string", "string", "string"]
}}"""
            
            model = genai.GenerativeModel("gemini-2.5-flash")
            ai_res = model.generate_content(
                prompt,
                generation_config={"response_mime_type": "application/json"}
            )
            
            if ai_res.text:
                guide_data = json.loads(ai_res.text)
                update_payload = {
                    "summary": guide_data.get("summary"),
                    "suggested_prompts": guide_data.get("suggested_prompts")
                }
                if title == "Untitled notebook":
                    update_payload["title"] = guide_data.get("title", "Untitled notebook")
                
                patch_url = f"{SUPABASE_URL}/rest/v1/notebooks?id=eq.{notebook_id}"
                patch_headers = {
                    "Authorization": auth_header,
                    "apikey": SUPABASE_ANON_KEY,
                    "Content-Type": "application/json"
                }
                httpx.patch(patch_url, headers=patch_headers, json=update_payload)
                logger.info(f"Notebook guide generated successfully for {notebook_id}")
    except Exception as e:
        logger.error(f"Error checking/generating notebook guide: {e}")

def fetch_chat_history(chat_id: str, auth_header: str) -> List[Dict[str, str]]:
    if not chat_id:
        return []
    url = f"{SUPABASE_URL}/rest/v1/messages?chat_id=eq.{chat_id}&order=created_at.asc"
    headers = {
        "Authorization": auth_header,
        "apikey": SUPABASE_ANON_KEY
    }
    try:
        logger.info(f"Fetching chat history from Supabase for chat_id={chat_id}")
        response = httpx.get(url, headers=headers)
        response.raise_for_status()
        messages = response.json()
        
        chat_history = []
        last_question = None
        
        for msg in messages:
            role = msg.get("role")
            content = msg.get("content", "")
            if role == "user":
                last_question = content
            elif role == "model" and last_question is not None:
                chat_history.append({
                    "question": last_question,
                    "answer": content
                })
                last_question = None
        return chat_history
    except Exception as e:
        logger.error(f"Failed to fetch chat history: {e}")
        return []

def process_ingestion(req: IngestRequest, auth_header: str):
    try:
        text = ""
        # 1. Download file from Storage if storage_path is provided
        if req.storage_path:
            download_url = f"{SUPABASE_URL}/storage/v1/object/authenticated/document-pdfs/{req.storage_path}"
            headers = {
                "Authorization": auth_header,
                "apikey": SUPABASE_ANON_KEY
            }
            logger.info(f"Downloading document from Supabase Storage: {req.storage_path}")
            res = httpx.get(download_url, headers=headers)
            res.raise_for_status()
            
            # Parse PDF
            pdf_file = io.BytesIO(res.content)
            reader = PdfReader(pdf_file)
            for page in reader.pages:
                page_text = page.extract_text()
                if page_text:
                    text += page_text + "\n"
        else:
            text = req.text_content or ""
            
        if not text.strip():
            raise ValueError("Extracted document text is empty.")
            
        # 2. Delete any existing chunks for this document in ChromaDB
        delete_document_from_store(vector_db, req.document_id)

        # 3. Chunk text and convert to LangChain Document objects
        langchain_docs = split_text_to_documents(
            text=text,
            notebook_id=req.notebook_id,
            document_id=req.document_id,
            filename=req.filename
        )
        
        # 4. Store in ChromaDB
        add_documents_to_store(vector_db, langchain_docs)
        
        # 5. Mark status completed in Supabase
        update_document_status(req.document_id, "completed", auth_header)
        logger.info(f"Document {req.document_id} ingested successfully.")
        
        # 6. Check and generate guide details
        check_and_generate_notebook_guide(req.notebook_id, req.document_id, [d.page_content for d in langchain_docs], auth_header)
        
    except Exception as e:
        logger.error(f"Ingestion process failed: {e}")
        update_document_status(req.document_id, "error", auth_header)
        raise e

@app.get("/health")
def health_check():
    return {"status": "healthy"}

@app.post("/ingest")
def ingest_document(req: IngestRequest, authorization: Optional[str] = Header(None)):
    if not authorization:
        raise HTTPException(status_code=401, detail="Missing Authorization header")
    
    try:
        process_ingestion(req, authorization)
        return {"status": "success", "message": "Document ingested successfully."}
    except Exception as e:
        logger.error(f"Ingestion failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/chat")
def chat(req: ChatRequest, authorization: Optional[str] = Header(None)):
    if not authorization:
        raise HTTPException(status_code=401, detail="Missing Authorization header")
        
    # Model configuration
    model_name = "gemini-2.5-flash"
    temperature = 0.7
    if req.llm_config:
        model_name = req.llm_config.get("model_name", model_name)
        temperature = req.llm_config.get("temperature", temperature)

    # 1. Fetch chat history
    chat_history = []
    if req.chat_id:
        chat_history = fetch_chat_history(req.chat_id, authorization)
        
    # 2. Rewrite query using memory
    search_query = rewrite_query(req.query, chat_history, GEMINI_API_KEY)
    
    # 3. Query ChromaDB using search_query and document_ids filter
    try:
        matched_results = query_store(
            vectorstore=vector_db,
            query=search_query,
            notebook_id=req.notebook_id,
            document_ids=req.document_ids,
            k=6
        )
    except Exception as e:
        logger.error(f"Vector DB query failed: {e}")
        matched_results = []
        
    matched_chunks = []
    for doc in matched_results:
        matched_chunks.append({
            "content": doc.page_content,
            "document_id": doc.metadata.get("document_id"),
            "filename": doc.metadata.get("filename", "Unknown")
        })
            
    # Build citations list
    citations = []
    for idx, chunk in enumerate(matched_chunks):
        citations.append({
            "index": idx + 1,
            "filename": chunk["filename"],
            "content": chunk["content"]
        })
        
    # Compile context
    context_parts = []
    for idx, chunk in enumerate(matched_chunks):
        context_parts.append(f'[Source {idx + 1} - from document "{chunk["filename"]}"]:\n{chunk["content"]}')
    context_text = "\n\n---\n\n".join(context_parts) if context_parts else "No relevant documents found."
    
    # Interleave history for prompt
    history_text = ""
    for turn in chat_history:
        history_text += f"User: {turn['question']}\n"
        history_text += f"Assistant: {turn['answer']}\n"
    
    # Master prompt
    master_prompt = f"""You are a helpful AI assistant. You have access to the following documents in the user's notebook. Use the provided context and conversation history to answer the user's query.
If the context does not contain enough information to answer, state that you cannot find the answer in the provided documents. Rely ONLY on the provided context. Do not make up facts.

You MUST include inline citations in your response referencing the sources. Whenever you state a fact or detail from a source in the context, append its source number at the end of the sentence or clause using brackets, e.g. [1], [2]. If multiple sources apply, output them next to each other like [1][2]. Do not combine them inside one bracket like [1,2]. The citation numbers MUST correspond to the 1-based source indices in the Context below.

Conversation History:
{history_text if history_text else "(No previous history)"}

Context:
{context_text}

User Query:
{req.query}

Answer:
At the very end of your answer, you MUST generate exactly 3 relevant follow-up questions that the user might want to ask next, matching the language of the conversation. Format them on a single final line starting with "[SUGGESTED_QUESTIONS]:" and separated by " | ".
Example:
[SUGGESTED_QUESTIONS]: question 1 | question 2 | question 3"""

    is_groq = "llama-4" in model_name or "gpt-oss" in model_name.lower()
    is_gemini = "gemini" in model_name.lower()
    
    def event_generator():
        # 1. Yield citations first
        yield f"data: {json.dumps({'citations': citations})}\n\n"
        
        accumulated = ""
        try:
            if is_groq:
                # Direct streaming completions for Groq
                api_key = os.getenv("GROQ_API_KEY")
                if not api_key:
                    raise ValueError("GROQ_API_KEY is not configured in backend environment.")
                api_url = "https://api.groq.com/openai/v1/chat/completions"
                
                # Map model name
                actual_model = model_name
                if "llama-4" in model_name:
                    actual_model = "llama-3.3-70b-versatile"
                elif "gpt-oss" in model_name:
                    actual_model = "llama-3.3-70b-versatile"
                
                headers = {
                    "Authorization": f"Bearer {api_key}",
                    "Content-Type": "application/json"
                }
                payload = {
                    "model": actual_model,
                    "messages": [
                        {"role": "user", "content": master_prompt}
                    ],
                    "temperature": temperature,
                    "stream": True
                }
                with httpx.stream("POST", api_url, headers=headers, json=payload, timeout=60.0) as r:
                    r.raise_for_status()
                    for line in r.iter_lines():
                        if line.startswith("data: "):
                            data_str = line[6:].strip()
                            if data_str == "[DONE]":
                                break
                            try:
                                chunk = json.loads(data_str)
                                delta = chunk.get("choices", [{}])[0].get("delta", {})
                                content = delta.get("content", "")
                                if content:
                                    accumulated += content
                                    yield f"data: {json.dumps({'text': content})}\n\n"
                            except Exception as parse_err:
                                logger.error(f"Error parsing Groq chunk: {parse_err}")
            elif is_gemini:
                if not GEMINI_API_KEY:
                    raise HTTPException(status_code=500, detail="GEMINI_API_KEY is not configured on the server")
                model = genai.GenerativeModel(model_name)
                response = model.generate_content(
                    master_prompt,
                    generation_config={"temperature": temperature},
                    stream=True
                )
                for chunk in response:
                    text = chunk.text
                    if text:
                        accumulated += text
                        yield f"data: {json.dumps({'text': text})}\n\n"
            else:
                raise ValueError(f"Unsupported model config: {model_name}")
                
            # Extract suggested questions
            clean_text = accumulated
            suggested = []
            delimiter = "[SUGGESTED_QUESTIONS]:"
            if delimiter in accumulated:
                parts = accumulated.split(delimiter)
                clean_text = parts[0].strip()
                suggested_str = parts[1].strip()
                suggested = [q.strip() for q in suggested_str.split("|") if q.strip()]
                
            yield f"data: {json.dumps({'text': '', 'clean_text': clean_text, 'suggested': suggested})}\n\n"
        except Exception as e:
            logger.error(f"Error during stream generation: {e}")
            yield f"data: {json.dumps({'error': str(e)})}\n\n"
            
    return StreamingResponse(event_generator(), media_type="text/event-stream")
