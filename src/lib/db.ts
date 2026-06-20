const DB_NAME = "omnibook_db"
const DB_VERSION = 3

export interface User {
  email: string
  name: string
  avatarUrl?: string
  createdAt?: string
}

function initDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve(request.result)

    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains("users")) {
        db.createObjectStore("users", { keyPath: "email" })
      }
      if (!db.objectStoreNames.contains("sessions")) {
        db.createObjectStore("sessions", { keyPath: "id" })
      }
      if (!db.objectStoreNames.contains("notebooks")) {
        db.createObjectStore("notebooks", { keyPath: "email" })
      }
      if (!db.objectStoreNames.contains("notebook_notes")) {
        db.createObjectStore("notebook_notes", { keyPath: "notebookId" })
      }
    };
  })
}

let dbPromise: Promise<IDBDatabase> | null = null

function getDB(): Promise<IDBDatabase> {
  if (!dbPromise) {
    dbPromise = initDB()
  }
  return dbPromise
}

// ─── User Store Actions ───

export async function registerUser(email: string, name: string, passwordHash: string): Promise<User> {
  const db = await getDB()
  return new Promise((resolve, reject) => {
    const transaction = db.transaction("users", "readwrite")
    const store = transaction.objectStore("users")
    
    // Check if user exists
    const checkRequest = store.get(email)
    
    checkRequest.onsuccess = () => {
      if (checkRequest.result) {
        reject(new Error("Email already registered"))
        return
      }

      const avatarName = encodeURIComponent(name)
      const avatarUrl = `https://ui-avatars.com/api/?name=${avatarName}&background=f4f4f5&color=09090b&bold=true`
      
      const newUser = {
        email,
        name,
        passwordHash, // simple mock hashing or cleartext in mock state
        avatarUrl,
        createdAt: new Date().toISOString()
      }

      const addRequest = store.add(newUser)
      addRequest.onsuccess = () => {
        resolve({ email, name, avatarUrl })
      }
      addRequest.onerror = () => {
        reject(addRequest.error)
      }
    }
    
    checkRequest.onerror = () => reject(checkRequest.error)
  })
}

export async function authenticateUser(email: string, passwordHash: string): Promise<User> {
  const db = await getDB()
  return new Promise((resolve, reject) => {
    const transaction = db.transaction("users", "readonly")
    const store = transaction.objectStore("users")
    const request = store.get(email)

    request.onsuccess = () => {
      const user = request.result
      if (!user) {
        reject(new Error("User not found"))
        return
      }
      if (user.passwordHash !== passwordHash) {
        reject(new Error("Incorrect password"))
        return
      }
      resolve({
        email: user.email,
        name: user.name,
        avatarUrl: user.avatarUrl,
        createdAt: user.createdAt
      })
    }

    request.onerror = () => reject(request.error)
  })
}

export async function googleLoginOrRegister(email: string, name: string, pictureUrl?: string): Promise<User> {
  const db = await getDB()
  return new Promise((resolve, reject) => {
    const transaction = db.transaction("users", "readwrite")
    const store = transaction.objectStore("users")
    const request = store.get(email)

    request.onsuccess = () => {
      const existingUser = request.result
      const avatarUrl = pictureUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=f4f4f5&color=09090b&bold=true`

      if (existingUser) {
        // Log in existing
        resolve({
          email: existingUser.email,
          name: existingUser.name,
          avatarUrl: existingUser.avatarUrl || avatarUrl,
          createdAt: existingUser.createdAt
        })
      } else {
        // Register new Google user
        const newUser = {
          email,
          name,
          passwordHash: "google-auth-external-provider",
          avatarUrl,
          createdAt: new Date().toISOString()
        }
        const addRequest = store.add(newUser)
        addRequest.onsuccess = () => {
          resolve({ email, name, avatarUrl })
        }
        addRequest.onerror = () => reject(addRequest.error)
      }
    }

    request.onerror = () => reject(request.error)
  })
}

// ─── Session Persistence ───

export async function saveSession(user: User): Promise<void> {
  const db = await getDB()
  return new Promise((resolve, reject) => {
    const transaction = db.transaction("sessions", "readwrite")
    const store = transaction.objectStore("sessions")
    
    const sessionObj = {
      id: "active_session",
      user,
      expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7).toISOString() // 7 days
    }
    
    const request = store.put(sessionObj)
    request.onsuccess = () => resolve()
    request.onerror = () => reject(request.error)
  })
}

export async function getSession(): Promise<User | null> {
  const db = await getDB()
  return new Promise((resolve, reject) => {
    const transaction = db.transaction("sessions", "readonly")
    const store = transaction.objectStore("sessions")
    const request = store.get("active_session")

    request.onsuccess = () => {
      const session = request.result
      if (!session) {
        resolve(null)
        return
      }
      
      // Check expiration
      if (new Date(session.expiresAt).getTime() < Date.now()) {
        // Session expired, clean up
        const delTrans = db.transaction("sessions", "readwrite")
        delTrans.objectStore("sessions").delete("active_session")
        resolve(null)
        return
      }
      
      resolve(session.user)
    }

    request.onerror = () => reject(request.error)
  })
}

export async function clearSession(): Promise<void> {
  const db = await getDB()
  return new Promise((resolve, reject) => {
    const transaction = db.transaction("sessions", "readwrite")
    const store = transaction.objectStore("sessions")
    const request = store.delete("active_session")

    request.onsuccess = () => resolve()
    request.onerror = () => reject(request.error)
  })
}

// ─── Notebook Persistence per User ───

export async function getNotebooks(email: string): Promise<any[]> {
  const db = await getDB()
  return new Promise((resolve, reject) => {
    const transaction = db.transaction("notebooks", "readonly")
    const store = transaction.objectStore("notebooks")
    const request = store.get(email)

    request.onsuccess = () => {
      const record = request.result
      resolve(record ? record.notebooks : [])
    }
    request.onerror = () => reject(request.error)
  })
}

export async function saveNotebooks(email: string, notebooks: any[]): Promise<void> {
  const db = await getDB()
  return new Promise((resolve, reject) => {
    const transaction = db.transaction("notebooks", "readwrite")
    const store = transaction.objectStore("notebooks")
    const request = store.put({ email, notebooks })

    request.onsuccess = () => resolve()
    request.onerror = () => reject(request.error)
  })
}

export async function getNotebookNotes(notebookId: string): Promise<any[]> {
  const db = await getDB()
  return new Promise((resolve, reject) => {
    const transaction = db.transaction("notebook_notes", "readonly")
    const store = transaction.objectStore("notebook_notes")
    const request = store.get(notebookId)

    request.onsuccess = () => {
      const record = request.result
      resolve(record ? record.notes : [])
    }
    request.onerror = () => reject(request.error)
  })
}

export async function saveNotebookNotes(notebookId: string, notes: any[]): Promise<void> {
  const db = await getDB()
  return new Promise((resolve, reject) => {
    const transaction = db.transaction("notebook_notes", "readwrite")
    const store = transaction.objectStore("notebook_notes")
    const request = store.put({ notebookId, notes })

    request.onsuccess = () => resolve()
    request.onerror = () => reject(request.error)
  })
}


