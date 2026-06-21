import os
import io
import json
import logging
import math
from typing import List, Optional, Dict, Any
from fastapi import FastAPI, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
import httpx
from pypdf import PdfReader
from sentence_transformers import SentenceTransformer
import google.generativeai as genai
from dotenv import load_dotenv

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

# Pure Python Simple Vector DB to avoid ChromaDB compiler dependency issues on Windows/Python 3.13
class SimpleVectorDB:
    def __init__(self, file_path: str = "vector_db.json"):
        self.file_path = file_path
        if not os.path.exists(self.file_path):
            self.save_data([])

    def load_data(self) -> List[Dict[str, Any]]:
        try:
            if os.path.exists(self.file_path):
                with open(self.file_path, "r", encoding="utf-8") as f:
                    return json.load(f)
        except Exception as e:
            logger.error(f"Error loading vector DB: {e}")
        return []

    def save_data(self, data: List[Dict[str, Any]]):
        try:
            with open(self.file_path, "w", encoding="utf-8") as f:
                json.dump(data, f, ensure_ascii=False, indent=2)
        except Exception as e:
            logger.error(f"Error saving vector DB: {e}")

    def add_documents(self, notebook_id: str, document_id: str, filename: str, ids: List[str], documents: List[str], embeddings: List[List[float]]):
        data = self.load_data()
        
        # Remove old chunks for this document if they exist (prevents duplicates)
        data = [item for item in data if item.get("document_id") != document_id]
        
        for cid, doc, emb in zip(ids, documents, embeddings):
            data.append({
                "id": cid,
                "notebook_id": notebook_id,
                "document_id": document_id,
                "filename": filename,
                "content": doc,
                "embedding": emb
            })
        self.save_data(data)

    def query(self, notebook_id: str, query_embedding: List[float], n_results: int = 6, document_ids: Optional[List[str]] = None) -> List[Dict[str, Any]]:
        data = self.load_data()
        
        # 1. Filter by notebook_id
        filtered = [item for item in data if item.get("notebook_id") == notebook_id]
        
        # 2. Filter by document_ids if provided
        if document_ids:
            filtered = [item for item in filtered if item.get("document_id") in document_ids]
            
        if not filtered:
            return []
            
        # 3. Calculate cosine similarity
        results = []
        for item in filtered:
            emb = item.get("embedding")
            if not emb:
                continue
            
            # Cosine similarity calculation
            dot_product = sum(x * y for x, y in zip(query_embedding, emb))
            magnitude_q = math.sqrt(sum(x * x for x in query_embedding))
            magnitude_e = math.sqrt(sum(x * x for x in emb))
            
            if magnitude_q == 0 or magnitude_e == 0:
                similarity = 0.0
            else:
                similarity = dot_product / (magnitude_q * magnitude_e)
                
            results.append({
                "chunk": item,
                "similarity": similarity
            })
            
        # 4. Sort by similarity descending
        results.sort(key=lambda x: x["similarity"], reverse=True)
        
        # 5. Format to return clean list
        return [res["chunk"] for res in results[:n_results]]

# Initialize FastAPI
app = FastAPI(title="Omnibook Hybrid RAG Backend")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize our Simple Vector Database
vector_db = SimpleVectorDB()

# Initialize SentenceTransformer model (all-MiniLM-L6-v2 produces 384-dimensional embeddings)
logger.info("Loading SentenceTransformer model 'all-MiniLM-L6-v2'...")
embedding_model = SentenceTransformer("all-MiniLM-L6-v2")
logger.info("Model loaded successfully.")

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
    model_config: Optional[dict] = None

def split_text(text: str, chunk_size: int = 1000, chunk_overlap: int = 200) -> List[str]:
    chunks = []
    start = 0
    while start < len(text):
        end = min(start + chunk_size, len(text))
        if end < len(text):
            boundary = text.rfind("\n\n", start + chunk_size // 2, end)
            if boundary == -1:
                boundary = text.rfind("\n", start + chunk_size // 2, end)
            if boundary == -1:
                boundary = text.rfind(". ", start + chunk_size // 2, end)
            if boundary == -1:
                boundary = text.rfind(" ", start + chunk_size // 2, end)
            
            if boundary != -1:
                end = boundary + 1
        
        chunk = text[start:end].strip()
        if chunk:
            chunks.append(chunk)
        start = end - chunk_overlap
        if start >= len(text) - chunk_overlap:
            break
    return chunks

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
            
        # 2. Chunk text
        chunks = split_text(text)
        if not chunks:
            raise ValueError("No valid text chunks generated.")
            
        # 3. Store in SimpleVectorDB
        ids = [f"{req.document_id}_chunk_{i}" for i in range(len(chunks))]
        embeddings = [embedding.tolist() for embedding in embedding_model.encode(chunks)]
        
        vector_db.add_documents(
            notebook_id=req.notebook_id,
            document_id=req.document_id,
            filename=req.filename,
            ids=ids,
            documents=chunks,
            embeddings=embeddings
        )
        
        # 4. Mark status completed
        update_document_status(req.document_id, "completed", auth_header)
        logger.info(f"Document {req.document_id} ingested successfully.")
        
        # 5. Check and generate guide details
        check_and_generate_notebook_guide(req.notebook_id, req.document_id, chunks, auth_header)
        
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
    if not GEMINI_API_KEY:
        raise HTTPException(status_code=500, detail="GEMINI_API_KEY is not configured on the server")
        
    # Get query embedding
    query_embedding = embedding_model.encode(req.query).tolist()
    
    # Query SimpleVectorDB
    try:
        matched_results = vector_db.query(
            notebook_id=req.notebook_id,
            query_embedding=query_embedding,
            n_results=6,
            document_ids=req.document_ids
        )
    except Exception as e:
        logger.error(f"Vector DB query failed: {e}")
        matched_results = []
        
    matched_chunks = []
    for item in matched_results:
        matched_chunks.append({
            "content": item["content"],
            "document_id": item["document_id"],
            "filename": item["filename"]
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
    
    # Master prompt
    master_prompt = f"""You are a helpful AI assistant. You have access to the following documents in the user's notebook. Use the provided context to answer the user's query.
If the context does not contain enough information to answer, state that you cannot find the answer in the provided documents. Rely ONLY on the provided context. Do not make up facts.

You MUST include inline citations in your response referencing the sources. Whenever you state a fact or detail from a source in the context, append its source number at the end of the sentence or clause using brackets, e.g. [1], [2]. If multiple sources apply, output them next to each other like [1][2]. Do not combine them inside one bracket like [1,2]. The citation numbers MUST correspond to the 1-based source indices in the Context below.

Context:
{context_text}

User Query:
{req.query}

Answer:
At the very end of your answer, you MUST generate exactly 3 relevant follow-up questions that the user might want to ask next, matching the language of the conversation. Format them on a single final line starting with "[SUGGESTED_QUESTIONS]:" and separated by " | ".
Example:
[SUGGESTED_QUESTIONS]: question 1 | question 2 | question 3"""

    # Model configuration
    model_name = "gemini-2.5-flash"
    temperature = 0.7
    if req.model_config:
        model_name = req.model_config.get("model_name", model_name)
        temperature = req.model_config.get("temperature", temperature)
        
    model = genai.GenerativeModel(model_name)
    
    def event_generator():
        # 1. Yield citations first
        yield f"data: {json.dumps({'citations': citations})}\n\n"
        
        accumulated = ""
        try:
            # Generate content stream using GenerativeModel
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
