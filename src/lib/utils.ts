import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function recursiveSplitText(text: string, chunkSize = 1000, chunkOverlap = 200): string[] {
  const separators = ["\n\n", "\n", " ", ""]
  
  function split(txt: string, seps: string[]): string[] {
    if (txt.length <= chunkSize) {
      return [txt]
    }
    
    const separator = seps[0]
    const nextSeps = seps.slice(1)
    
    const parts = txt.split(separator)
    const chunks: string[] = []
    let currentChunk = ""
    
    for (const part of parts) {
      if ((currentChunk + (currentChunk ? separator : "") + part).length > chunkSize) {
        if (currentChunk) {
          chunks.push(currentChunk)
          const overlapStart = Math.max(0, currentChunk.length - chunkOverlap)
          currentChunk = currentChunk.substring(overlapStart)
        }
        
        if (part.length > chunkSize) {
          if (nextSeps.length > 0) {
            const splitParts = split(part, nextSeps)
            for (const sp of splitParts) {
              if ((currentChunk + (currentChunk ? separator : "") + sp).length > chunkSize) {
                if (currentChunk) chunks.push(currentChunk)
                const overlapStart = Math.max(0, currentChunk.length - chunkOverlap)
                currentChunk = currentChunk.substring(overlapStart) + (currentChunk ? separator : "") + sp
              } else {
                currentChunk = currentChunk + (currentChunk ? separator : "") + sp
              }
            }
          } else {
            let offset = 0
            while (offset < part.length) {
              const subPart = part.substring(offset, offset + chunkSize)
              chunks.push(subPart)
              offset += chunkSize - chunkOverlap
            }
            currentChunk = ""
          }
        } else {
          currentChunk = part
        }
      } else {
        currentChunk = currentChunk + (currentChunk ? separator : "") + part
      }
    }
    
    if (currentChunk) {
      chunks.push(currentChunk)
    }
    
    return chunks
  }
  
  return split(text, separators)
}

export function getFileIcon(filename: string): string {
  const lower = filename.toLowerCase()
  if (lower.startsWith("website (") || lower.startsWith("http://") || lower.startsWith("https://")) {
    if (lower.includes("youtube.com") || lower.includes("youtu.be")) {
      return "play_circle"
    }
    return "language"
  }
  if (lower.startsWith("text snippet (")) {
    return "content_paste"
  }
  if (lower.endsWith(".pdf")) {
    return "drive_pdf"
  }
  if (lower.endsWith(".md")) {
    return "article"
  }
  if (lower.endsWith(".txt")) {
    return "description"
  }
  if (lower.endsWith(".docx") || lower.endsWith(".doc")) {
    return "description"
  }
  if (lower.endsWith(".mp3") || lower.endsWith(".wav") || lower.endsWith(".m4a") || lower.endsWith(".ogg")) {
    return "audio_file"
  }
  if (lower.endsWith(".mp4") || lower.endsWith(".mov") || lower.endsWith(".avi") || lower.endsWith(".webm")) {
    return "video_file"
  }
  return "description"
}


