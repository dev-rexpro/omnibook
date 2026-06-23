from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_core.documents import Document
from typing import List

def split_text_to_documents(text: str, notebook_id: str, document_id: str, filename: str, chunk_size: int = 1000, chunk_overlap: int = 200) -> List[Document]:
    """
    Split raw text content into LangChain Document objects with metadata.
    """
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=chunk_size,
        chunk_overlap=chunk_overlap,
    )
    chunks = splitter.split_text(text)
    
    docs = []
    for idx, chunk in enumerate(chunks):
        docs.append(Document(
            page_content=chunk,
            metadata={
                "notebook_id": notebook_id,
                "document_id": document_id,
                "filename": filename,
                "chunk_index": idx
            }
        ))
    return docs
