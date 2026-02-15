/**
 * DatabaseContext - Refactored from class DatabaseService
 *
 * Provides IndexedDB operations via React Context and hooks
 * Full CRUD operations for projects, files, and conversations
 */

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  ReactNode,
} from "react";

// Types
export interface DatabaseProject {
  id: string;
  name: string;
  description: string;
  files: Record<string, unknown>;
  createdAt: number;
  updatedAt: number;
  tags: string[];
}

export interface DatabaseConversation {
  id: string;
  projectId?: string;
  title: string;
  messages: unknown[];
  createdAt: number;
  updatedAt: number;
  model: string;
}

export interface DatabaseFile {
  id: string;
  projectId: string;
  path: string;
  content: string;
  language: string;
  createdAt: number;
  updatedAt: number;
}

export interface DatabaseSnippet {
  id: string;
  name: string;
  code: string;
  language: string;
  tags: string[];
  createdAt: number;
  updatedAt: number;
}

interface DatabaseContextValue {
  isReady: boolean;
  error: Error | null;
  // Projects
  createProject: (
    project: Omit<DatabaseProject, "id" | "createdAt" | "updatedAt">,
  ) => Promise<DatabaseProject>;
  getProject: (id: string) => Promise<DatabaseProject | null>;
  getAllProjects: () => Promise<DatabaseProject[]>;
  updateProject: (
    id: string,
    updates: Partial<DatabaseProject>,
  ) => Promise<void>;
  deleteProject: (id: string) => Promise<void>;
  searchProjects: (query: string) => Promise<DatabaseProject[]>;
  // Conversations
  createConversation: (
    conv: Omit<DatabaseConversation, "id" | "createdAt" | "updatedAt">,
  ) => Promise<DatabaseConversation>;
  getConversation: (id: string) => Promise<DatabaseConversation | null>;
  getAllConversations: () => Promise<DatabaseConversation[]>;
  getConversationsByProject: (
    projectId: string,
  ) => Promise<DatabaseConversation[]>;
  updateConversation: (
    id: string,
    updates: Partial<DatabaseConversation>,
  ) => Promise<void>;
  deleteConversation: (id: string) => Promise<void>;
  saveConversation: (
    data: SaveConversationData,
  ) => Promise<DatabaseConversation>;
  // Files
  createFile: (
    file: Omit<DatabaseFile, "id" | "createdAt" | "updatedAt">,
  ) => Promise<DatabaseFile>;
  getFilesByProject: (projectId: string) => Promise<DatabaseFile[]>;
  updateFile: (id: string, updates: Partial<DatabaseFile>) => Promise<void>;
  deleteFile: (id: string) => Promise<void>;
  // Snippets
  createSnippet: (
    snippet: Omit<DatabaseSnippet, "id" | "createdAt" | "updatedAt">,
  ) => Promise<DatabaseSnippet>;
  getAllSnippets: () => Promise<DatabaseSnippet[]>;
  deleteSnippet: (id: string) => Promise<void>;
  // Utilities
  clearAllData: () => Promise<void>;
  exportData: () => Promise<string>;
  importData: (json: string) => Promise<void>;
}

interface SaveConversationData {
  messages: unknown[];
  projectState?: unknown;
  actions?: unknown[];
  timestamp?: number;
  projectId?: string;
  title?: string;
  model?: string;
}

// Helper functions
const generateId = (): string => Math.random().toString(36).substring(2, 15);

// Database initialization function
const initDatabase = (
  dbName: string,
  version: number,
): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(dbName, version);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      // Projects store
      if (!db.objectStoreNames.contains("projects")) {
        const projectStore = db.createObjectStore("projects", {
          keyPath: "id",
        });
        projectStore.createIndex("name", "name", { unique: false });
        projectStore.createIndex("createdAt", "createdAt", { unique: false });
        projectStore.createIndex("tags", "tags", {
          unique: false,
          multiEntry: true,
        });
      }

      // Conversations store
      if (!db.objectStoreNames.contains("conversations")) {
        const convStore = db.createObjectStore("conversations", {
          keyPath: "id",
        });
        convStore.createIndex("projectId", "projectId", { unique: false });
        convStore.createIndex("createdAt", "createdAt", { unique: false });
      }

      // Files store
      if (!db.objectStoreNames.contains("files")) {
        const fileStore = db.createObjectStore("files", { keyPath: "id" });
        fileStore.createIndex("projectId", "projectId", { unique: false });
        fileStore.createIndex("path", "path", { unique: false });
      }

      // Snippets store
      if (!db.objectStoreNames.contains("snippets")) {
        const snippetStore = db.createObjectStore("snippets", {
          keyPath: "id",
        });
        snippetStore.createIndex("language", "language", { unique: false });
        snippetStore.createIndex("tags", "tags", {
          unique: false,
          multiEntry: true,
        });
      }
    };
  });
};

// Generic database operations factory
const createDatabaseOperations = (db: IDBDatabase) => {
  const performTransaction = <T,>(
    storeName: string,
    mode: IDBTransactionMode,
    operation: (store: IDBObjectStore) => IDBRequest,
  ): Promise<T> => {
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([storeName], mode);
      const store = transaction.objectStore(storeName);
      const request = operation(store);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  };

  return { performTransaction };
};

// Context
const DatabaseContext = createContext<DatabaseContextValue | null>(null);

// Provider
interface DatabaseProviderProps {
  children: ReactNode;
  dbName?: string;
  version?: number;
}

export const DatabaseProvider: React.FC<DatabaseProviderProps> = ({
  children,
  dbName = "GeminiIDEDatabase",
  version = 1,
}) => {
  const [db, setDb] = useState<IDBDatabase | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Initialize database
  useEffect(() => {
    initDatabase(dbName, version)
      .then((database) => {
        setDb(database);
        setIsReady(true);
      })
      .catch((err) => {
        setError(err);
        console.error("[Database] Initialization failed:", err);
      });
  }, [dbName, version]);

  // Helper to ensure database is ready
  const ensureDb = useCallback((): IDBDatabase => {
    if (!db) throw new Error("Database not initialized");
    return db;
  }, [db]);

  // ===== PROJECTS =====
  const createProject = useCallback(
    async (
      project: Omit<DatabaseProject, "id" | "createdAt" | "updatedAt">,
    ): Promise<DatabaseProject> => {
      const database = ensureDb();
      const fullProject: DatabaseProject = {
        ...project,
        id: generateId(),
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      return new Promise((resolve, reject) => {
        const transaction = database.transaction(["projects"], "readwrite");
        const store = transaction.objectStore("projects");
        const request = store.add(fullProject);

        request.onsuccess = () => resolve(fullProject);
        request.onerror = () => reject(request.error);
      });
    },
    [ensureDb],
  );

  const getProject = useCallback(
    async (id: string): Promise<DatabaseProject | null> => {
      const database = ensureDb();
      return new Promise((resolve, reject) => {
        const transaction = database.transaction(["projects"], "readonly");
        const store = transaction.objectStore("projects");
        const request = store.get(id);

        request.onsuccess = () => resolve(request.result || null);
        request.onerror = () => reject(request.error);
      });
    },
    [ensureDb],
  );

  const getAllProjects = useCallback(async (): Promise<DatabaseProject[]> => {
    const database = ensureDb();
    return new Promise((resolve, reject) => {
      const transaction = database.transaction(["projects"], "readonly");
      const store = transaction.objectStore("projects");
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }, [ensureDb]);

  const updateProject = useCallback(
    async (id: string, updates: Partial<DatabaseProject>): Promise<void> => {
      const database = ensureDb();
      const project = await getProject(id);
      if (!project) throw new Error("Project not found");

      const updated = { ...project, ...updates, updatedAt: Date.now() };

      return new Promise((resolve, reject) => {
        const transaction = database.transaction(["projects"], "readwrite");
        const store = transaction.objectStore("projects");
        const request = store.put(updated);

        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    },
    [ensureDb, getProject],
  );

  const deleteProject = useCallback(
    async (id: string): Promise<void> => {
      const database = ensureDb();

      // Delete associated conversations and files first
      const conversations = await getConversationsByProject(id);
      await Promise.all(conversations.map((c) => deleteConversation(c.id)));

      const files = await getFilesByProject(id);
      await Promise.all(files.map((f) => deleteFile(f.id)));

      return new Promise((resolve, reject) => {
        const transaction = database.transaction(["projects"], "readwrite");
        const store = transaction.objectStore("projects");
        const request = store.delete(id);

        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    },
    [ensureDb],
  );

  const searchProjects = useCallback(
    async (query: string): Promise<DatabaseProject[]> => {
      const projects = await getAllProjects();
      const lowerQuery = query.toLowerCase();

      return projects.filter(
        (p) =>
          p.name.toLowerCase().includes(lowerQuery) ||
          p.description.toLowerCase().includes(lowerQuery) ||
          p.tags.some((tag) => tag.toLowerCase().includes(lowerQuery)),
      );
    },
    [getAllProjects],
  );

  // ===== CONVERSATIONS =====
  const createConversation = useCallback(
    async (
      conv: Omit<DatabaseConversation, "id" | "createdAt" | "updatedAt">,
    ): Promise<DatabaseConversation> => {
      const database = ensureDb();
      const fullConv: DatabaseConversation = {
        ...conv,
        id: generateId(),
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      return new Promise((resolve, reject) => {
        const transaction = database.transaction(
          ["conversations"],
          "readwrite",
        );
        const store = transaction.objectStore("conversations");
        const request = store.add(fullConv);

        request.onsuccess = () => resolve(fullConv);
        request.onerror = () => reject(request.error);
      });
    },
    [ensureDb],
  );

  const getConversation = useCallback(
    async (id: string): Promise<DatabaseConversation | null> => {
      const database = ensureDb();
      return new Promise((resolve, reject) => {
        const transaction = database.transaction(["conversations"], "readonly");
        const store = transaction.objectStore("conversations");
        const request = store.get(id);

        request.onsuccess = () => resolve(request.result || null);
        request.onerror = () => reject(request.error);
      });
    },
    [ensureDb],
  );

  const getAllConversations = useCallback(async (): Promise<
    DatabaseConversation[]
  > => {
    const database = ensureDb();
    return new Promise((resolve, reject) => {
      const transaction = database.transaction(["conversations"], "readonly");
      const store = transaction.objectStore("conversations");
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }, [ensureDb]);

  const getConversationsByProject = useCallback(
    async (projectId: string): Promise<DatabaseConversation[]> => {
      const database = ensureDb();
      return new Promise((resolve, reject) => {
        const transaction = database.transaction(["conversations"], "readonly");
        const store = transaction.objectStore("conversations");
        const index = store.index("projectId");
        const request = index.getAll(projectId);

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
    },
    [ensureDb],
  );

  const updateConversation = useCallback(
    async (
      id: string,
      updates: Partial<DatabaseConversation>,
    ): Promise<void> => {
      const database = ensureDb();
      const conv = await getConversation(id);
      if (!conv) throw new Error("Conversation not found");

      const updated = { ...conv, ...updates, updatedAt: Date.now() };

      return new Promise((resolve, reject) => {
        const transaction = database.transaction(
          ["conversations"],
          "readwrite",
        );
        const store = transaction.objectStore("conversations");
        const request = store.put(updated);

        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    },
    [ensureDb, getConversation],
  );

  const deleteConversation = useCallback(
    async (id: string): Promise<void> => {
      const database = ensureDb();
      return new Promise((resolve, reject) => {
        const transaction = database.transaction(
          ["conversations"],
          "readwrite",
        );
        const store = transaction.objectStore("conversations");
        const request = store.delete(id);

        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    },
    [ensureDb],
  );

  const saveConversation = useCallback(
    async (data: SaveConversationData): Promise<DatabaseConversation> => {
      const title =
        data.title ||
        (
          data.messages.find((m: any) => m.role === "user") as any
        )?.content?.substring(0, 50) ||
        "New Conversation";
      const model = data.model || "gemini-1.5-flash-latest";

      let existingConv: DatabaseConversation | null = null;
      if (data.projectId) {
        const conversations = await getConversationsByProject(data.projectId);
        existingConv = conversations.find((c) => c.title === title) || null;
      }

      if (existingConv) {
        const updated = {
          ...existingConv,
          messages: data.messages,
          updatedAt: data.timestamp || Date.now(),
          model,
        };
        await updateConversation(existingConv.id, updated);
        return updated;
      }

      return createConversation({
        projectId: data.projectId,
        title,
        messages: data.messages,
        model,
      });
    },
    [createConversation, getConversationsByProject, updateConversation],
  );

  // ===== FILES =====
  const createFile = useCallback(
    async (
      file: Omit<DatabaseFile, "id" | "createdAt" | "updatedAt">,
    ): Promise<DatabaseFile> => {
      const database = ensureDb();
      const fullFile: DatabaseFile = {
        ...file,
        id: generateId(),
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      return new Promise((resolve, reject) => {
        const transaction = database.transaction(["files"], "readwrite");
        const store = transaction.objectStore("files");
        const request = store.add(fullFile);

        request.onsuccess = () => resolve(fullFile);
        request.onerror = () => reject(request.error);
      });
    },
    [ensureDb],
  );

  const getFilesByProject = useCallback(
    async (projectId: string): Promise<DatabaseFile[]> => {
      const database = ensureDb();
      return new Promise((resolve, reject) => {
        const transaction = database.transaction(["files"], "readonly");
        const store = transaction.objectStore("files");
        const index = store.index("projectId");
        const request = index.getAll(projectId);

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
    },
    [ensureDb],
  );

  const updateFile = useCallback(
    async (id: string, updates: Partial<DatabaseFile>): Promise<void> => {
      const database = ensureDb();
      return new Promise((resolve, reject) => {
        const transaction = database.transaction(["files"], "readwrite");
        const store = transaction.objectStore("files");
        const getRequest = store.get(id);

        getRequest.onsuccess = () => {
          const file = getRequest.result;
          if (!file) {
            reject(new Error("File not found"));
            return;
          }

          const updated = { ...file, ...updates, updatedAt: Date.now() };
          const putRequest = store.put(updated);
          putRequest.onsuccess = () => resolve();
          putRequest.onerror = () => reject(putRequest.error);
        };

        getRequest.onerror = () => reject(getRequest.error);
      });
    },
    [ensureDb],
  );

  const deleteFile = useCallback(
    async (id: string): Promise<void> => {
      const database = ensureDb();
      return new Promise((resolve, reject) => {
        const transaction = database.transaction(["files"], "readwrite");
        const store = transaction.objectStore("files");
        const request = store.delete(id);

        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    },
    [ensureDb],
  );

  // ===== SNIPPETS =====
  const createSnippet = useCallback(
    async (
      snippet: Omit<DatabaseSnippet, "id" | "createdAt" | "updatedAt">,
    ): Promise<DatabaseSnippet> => {
      const database = ensureDb();
      const fullSnippet: DatabaseSnippet = {
        ...snippet,
        id: generateId(),
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      return new Promise((resolve, reject) => {
        const transaction = database.transaction(["snippets"], "readwrite");
        const store = transaction.objectStore("snippets");
        const request = store.add(fullSnippet);

        request.onsuccess = () => resolve(fullSnippet);
        request.onerror = () => reject(request.error);
      });
    },
    [ensureDb],
  );

  const getAllSnippets = useCallback(async (): Promise<DatabaseSnippet[]> => {
    const database = ensureDb();
    return new Promise((resolve, reject) => {
      const transaction = database.transaction(["snippets"], "readonly");
      const store = transaction.objectStore("snippets");
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }, [ensureDb]);

  const deleteSnippet = useCallback(
    async (id: string): Promise<void> => {
      const database = ensureDb();
      return new Promise((resolve, reject) => {
        const transaction = database.transaction(["snippets"], "readwrite");
        const store = transaction.objectStore("snippets");
        const request = store.delete(id);

        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    },
    [ensureDb],
  );

  // ===== UTILITIES =====
  const clearAllData = useCallback(async (): Promise<void> => {
    const database = ensureDb();
    const stores = ["projects", "conversations", "files", "snippets"];

    await Promise.all(
      stores.map(
        (storeName) =>
          new Promise<void>((resolve, reject) => {
            const transaction = database.transaction([storeName], "readwrite");
            const store = transaction.objectStore(storeName);
            const request = store.clear();

            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
          }),
      ),
    );
  }, [ensureDb]);

  const exportData = useCallback(async (): Promise<string> => {
    const [projects, conversations, files, snippets] = await Promise.all([
      getAllProjects(),
      getAllConversations(),
      Promise.all(
        (await getAllProjects()).map((p) => getFilesByProject(p.id)),
      ).then((arr) => arr.flat()),
      getAllSnippets(),
    ]);

    return JSON.stringify(
      { projects, conversations, files, snippets },
      null,
      2,
    );
  }, [getAllProjects, getAllConversations, getFilesByProject, getAllSnippets]);

  const importData = useCallback(
    async (json: string): Promise<void> => {
      const data = JSON.parse(json);
      const database = ensureDb();

      // Import each type
      for (const project of data.projects || []) {
        await new Promise<void>((resolve, reject) => {
          const transaction = database.transaction(["projects"], "readwrite");
          const store = transaction.objectStore("projects");
          const request = store.put(project);
          request.onsuccess = () => resolve();
          request.onerror = () => reject(request.error);
        });
      }

      for (const conv of data.conversations || []) {
        await new Promise<void>((resolve, reject) => {
          const transaction = database.transaction(
            ["conversations"],
            "readwrite",
          );
          const store = transaction.objectStore("conversations");
          const request = store.put(conv);
          request.onsuccess = () => resolve();
          request.onerror = () => reject(request.error);
        });
      }

      for (const file of data.files || []) {
        await new Promise<void>((resolve, reject) => {
          const transaction = database.transaction(["files"], "readwrite");
          const store = transaction.objectStore("files");
          const request = store.put(file);
          request.onsuccess = () => resolve();
          request.onerror = () => reject(request.error);
        });
      }

      for (const snippet of data.snippets || []) {
        await new Promise<void>((resolve, reject) => {
          const transaction = database.transaction(["snippets"], "readwrite");
          const store = transaction.objectStore("snippets");
          const request = store.put(snippet);
          request.onsuccess = () => resolve();
          request.onerror = () => reject(request.error);
        });
      }
    },
    [ensureDb],
  );

  const value: DatabaseContextValue = {
    isReady,
    error,
    createProject,
    getProject,
    getAllProjects,
    updateProject,
    deleteProject,
    searchProjects,
    createConversation,
    getConversation,
    getAllConversations,
    getConversationsByProject,
    updateConversation,
    deleteConversation,
    saveConversation,
    createFile,
    getFilesByProject,
    updateFile,
    deleteFile,
    createSnippet,
    getAllSnippets,
    deleteSnippet,
    clearAllData,
    exportData,
    importData,
  };

  return (
    <DatabaseContext.Provider value={value}>
      {children}
    </DatabaseContext.Provider>
  );
};

// Hook
export const useDatabase = (): DatabaseContextValue => {
  const context = useContext(DatabaseContext);
  if (!context) {
    throw new Error("useDatabase must be used within a DatabaseProvider");
  }
  return context;
};

// Backward compatibility singleton (for non-React code)
let singletonDb: IDBDatabase | null = null;

export const initDatabaseSingleton = async (
  dbName = "GeminiIDEDatabase",
  version = 1,
): Promise<void> => {
  singletonDb = await initDatabase(dbName, version);
};

export const getDatabaseSingleton = (): IDBDatabase => {
  if (!singletonDb) throw new Error("Database not initialized");
  return singletonDb;
};

export default DatabaseContext;
