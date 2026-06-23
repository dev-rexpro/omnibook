from langchain_huggingface import HuggingFaceEmbeddings

def get_embedding_model():
    """
    HuggingFace embedding model using "sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2".
    Provides 384-dimensional embeddings for multilingual text.
    """
    embeddings = HuggingFaceEmbeddings(
        model_name="sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2"
    )
    return embeddings
