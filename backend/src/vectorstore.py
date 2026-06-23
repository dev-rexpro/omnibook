import os
import logging
from langchain_chroma import Chroma
from langchain_core.documents import Document
from typing import List, Optional

logger = logging.getLogger("backend.vectorstore")

def get_vectorstore(embedding_model, persist_dir: str = "chroma_db") -> Chroma:
    """
    Get or load the ChromaDB vector store.
    """
    return Chroma(
        persist_directory=persist_dir,
        embedding_function=embedding_model
    )

def add_documents_to_store(vectorstore: Chroma, documents: List[Document]):
    """
    Ingest new documents into the ChromaDB vector store.
    """
    if not documents:
        return
    vectorstore.add_documents(documents)
    logger.info(f"Successfully added {len(documents)} chunks to ChromaDB.")

def delete_document_from_store(vectorstore: Chroma, document_id: str):
    """
    Delete all chunks matching a document_id to prevent duplicate indexing.
    """
    try:
        # Chroma allows deletion by matching metadata filter in the client
        vectorstore.delete(where={"document_id": document_id})
        logger.info(f"Deleted existing chunks for document_id: {document_id}")
    except Exception as e:
        logger.warning(f"No existing chunks found or failed to delete document {document_id}: {e}")

def query_store(vectorstore: Chroma, query: str, notebook_id: str, document_ids: Optional[List[str]] = None, k: int = 6) -> List[Document]:
    """
    Query ChromaDB using metadata filters for notebook_id and document_ids.
    ChromaDB requires $and operator when combining multiple metadata fields.
    """
    # Build filter conditions list
    conditions = [{"notebook_id": notebook_id}]
    
    if document_ids:
        if len(document_ids) == 1:
            conditions.append({"document_id": document_ids[0]})
        else:
            conditions.append({"document_id": {"$in": document_ids}})

    # If only one condition, pass it directly; otherwise wrap in $and
    if len(conditions) == 1:
        filter_dict = conditions[0]
    else:
        filter_dict = {"$and": conditions}

    logger.info(f"Querying ChromaDB for query='{query}' with filter={filter_dict}")
    return vectorstore.similarity_search(query, k=k, filter=filter_dict)
