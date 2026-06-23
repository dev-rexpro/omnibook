import os
import logging
import google.generativeai as genai
from typing import List, Dict, Optional

logger = logging.getLogger("backend.rag")

def rewrite_query(question: str, chat_history: List[Dict[str, str]], gemini_api_key: Optional[str] = None) -> str:
    """
    Rewrite the user's question to resolve pronouns and context based on conversation history,
    creating a standalone retrieval-friendly search query.
    """
    if not chat_history:
        return question

    history_text = ""
    for turn in chat_history[-3:]:  # Last 3 turns for context
        history_text += f"User: {turn.get('question', '')}\n"
        history_text += f"Assistant: {turn.get('answer', '')[:150]}\n"

    rewrite_prompt = f"""Given the conversation history and a follow-up question, rewrite the question into a standalone search query that will retrieve relevant information from a document.

Rules:
- Make it self-contained (resolve "he", "it", "that" using history)
- Expand vague terms (e.g., "specialization" → "skills expertise field")
- Keep it concise (one line)
- Output ONLY the rewritten query, nothing else

Conversation History:
{history_text}

Follow-up Question: {question}

Standalone Search Query:"""

    try:
        api_key = gemini_api_key or os.getenv("GEMINI_API_KEY")
        if api_key:
            genai.configure(api_key=api_key)
            model = genai.GenerativeModel("gemini-2.5-flash")
            response = model.generate_content(
                rewrite_prompt,
                generation_config={"temperature": 0.0}
            )
            if response.text:
                rewritten = response.text.strip()
                logger.info(f"Query rewritten: '{question}' -> '{rewritten}'")
                return rewritten
    except Exception as e:
        logger.error(f"Error during query rewriting: {e}")
        
    return question
