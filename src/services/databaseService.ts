// Database Service using IndexedDB for local storage
// Provides full CRUD operations for projects, files, and conversations

export interface DatabaseProject {
  id: string;
  name: string;
  description: string;
  files: Record<string, any>;
  createdAt: number;
  updatedAt: number;
  tags: string[];
}

export interface DatabaseConversation {
  id: string;
  projectId?: string;
  title: string;
  messages: any[];
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

class DatabaseService {
  private dbName = 'GeminiIDEDatabase';
  private version = 1;
  private db: IDBDatabase | null = null;

  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Projects store
        if (!db.objectStoreNames.contains('projects')) {
          const projectStore = db.createObjectStore('projects', { keyPath: 'id' });
          projectStore.createIndex('name', 'name', { unique: false });
          projectStore.createIndex('createdAt', 'createdAt', { unique: false });
          projectStore.createIndex('tags', 'tags', { unique: false, multiEntry: true });
        }

        // Conversations store
        if (!db.objectStoreNames.contains('conversations')) {
          const convStore = db.createObjectStore('conversations', { keyPath: 'id' });
          convStore.createIndex('projectId', 'projectId', { unique: false });
          convStore.createIndex('createdAt', 'createdAt', { unique: false });
        }

        // Files store
        if (!db.objectStoreNames.contains('files')) {
          const fileStore = db.createObjectStore('files', { keyPath: 'id' });
          fileStore.createIndex('projectId', 'projectId', { unique: false });
          fileStore.createIndex('path', 'path', { unique: false });
        }

        // Code snippets store
        if (!db.objectStoreNames.contains('snippets')) {
          const snippetStore = db.createObjectStore('snippets', { keyPath: 'id' });
          snippetStore.createIndex('language', 'language', { unique: false });
          snippetStore.createIndex('tags', 'tags', { unique: false, multiEntry: true });
        }
      };
    });
  }

  private ensureDB(): IDBDatabase {
    if (!this.db) throw new Error('Database not initialized. Call init() first.');
    return this.db;
  }

  // ===== PROJECTS =====

  async createProject(project: Omit<DatabaseProject, 'id' | 'createdAt' | 'updatedAt'>): Promise<DatabaseProject> {
    const db = this.ensureDB();
    const fullProject: DatabaseProject = {
      ...project,
      id: this.generateId(),
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['projects'], 'readwrite');
      const store = transaction.objectStore('projects');
      const request = store.add(fullProject);

      request.onsuccess = () => resolve(fullProject);
      request.onerror = () => reject(request.error);
    });
  }

  async getProject(id: string): Promise<DatabaseProject | null> {
    const db = this.ensureDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['projects'], 'readonly');
      const store = transaction.objectStore('projects');
      const request = store.get(id);

      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  }

  async getAllProjects(): Promise<DatabaseProject[]> {
    const db = this.ensureDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['projects'], 'readonly');
      const store = transaction.objectStore('projects');
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async updateProject(id: string, updates: Partial<DatabaseProject>): Promise<void> {
    const db = this.ensureDB();
    const project = await this.getProject(id);
    if (!project) throw new Error('Project not found');

    const updated = {
      ...project,
      ...updates,
      updatedAt: Date.now()
    };

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['projects'], 'readwrite');
      const store = transaction.objectStore('projects');
      const request = store.put(updated);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async deleteProject(id: string): Promise<void> {
    const db = this.ensureDB();

    // Also delete associated conversations and files
    await this.deleteConversationsByProject(id);
    await this.deleteFilesByProject(id);

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['projects'], 'readwrite');
      const store = transaction.objectStore('projects');
      const request = store.delete(id);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async searchProjects(query: string): Promise<DatabaseProject[]> {
    const projects = await this.getAllProjects();
    const lowerQuery = query.toLowerCase();
    
    return projects.filter(p => 
      p.name.toLowerCase().includes(lowerQuery) ||
      p.description.toLowerCase().includes(lowerQuery) ||
      p.tags.some(tag => tag.toLowerCase().includes(lowerQuery))
    );
  }

  // ===== CONVERSATIONS =====

  async createConversation(conversation: Omit<DatabaseConversation, 'id' | 'createdAt' | 'updatedAt'>): Promise<DatabaseConversation> {
    const db = this.ensureDB();
    const fullConversation: DatabaseConversation = {
      ...conversation,
      id: this.generateId(),
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['conversations'], 'readwrite');
      const store = transaction.objectStore('conversations');
      const request = store.add(fullConversation);

      request.onsuccess = () => resolve(fullConversation);
      request.onerror = () => reject(request.error);
    });
  }

  async getConversation(id: string): Promise<DatabaseConversation | null> {
    const db = this.ensureDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['conversations'], 'readonly');
      const store = transaction.objectStore('conversations');
      const request = store.get(id);

      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  }

  async getAllConversations(): Promise<DatabaseConversation[]> {
    const db = this.ensureDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['conversations'], 'readonly');
      const store = transaction.objectStore('conversations');
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async getConversationsByProject(projectId: string): Promise<DatabaseConversation[]> {
    const db = this.ensureDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['conversations'], 'readonly');
      const store = transaction.objectStore('conversations');
      const index = store.index('projectId');
      const request = index.getAll(projectId);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async updateConversation(id: string, updates: Partial<DatabaseConversation>): Promise<void> {
    const db = this.ensureDB();
    const conversation = await this.getConversation(id);
    if (!conversation) throw new Error('Conversation not found');

    const updated = {
      ...conversation,
      ...updates,
      updatedAt: Date.now()
    };

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['conversations'], 'readwrite');
      const store = transaction.objectStore('conversations');
      const request = store.put(updated);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async deleteConversation(id: string): Promise<void> {
    const db = this.ensureDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['conversations'], 'readwrite');
      const store = transaction.objectStore('conversations');
      const request = store.delete(id);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async deleteConversationsByProject(projectId: string): Promise<void> {
    const conversations = await this.getConversationsByProject(projectId);
    await Promise.all(conversations.map(c => this.deleteConversation(c.id)));
  }

  // Convenience method for saving conversations (creates or updates)
  async saveConversation(data: {
    messages: any[];
    projectState?: any;
    actions?: any[];
    timestamp?: number;
    projectId?: string;
    title?: string;
    model?: string;
  }): Promise<DatabaseConversation> {
    // Use the first user message as title if not provided
    const title = data.title || data.messages.find(m => m.role === 'user')?.content?.substring(0, 50) || 'New Conversation';
    const model = data.model || 'gemini-1.5-flash-latest';
    
    // Try to find existing conversation by projectId and title
    let existingConversation: DatabaseConversation | null = null;
    if (data.projectId) {
      const conversations = await this.getConversationsByProject(data.projectId);
      existingConversation = conversations.find(c => c.title === title) || null;
    }

    if (existingConversation) {
      // Update existing conversation
      const updated = {
        ...existingConversation,
        messages: data.messages,
        updatedAt: data.timestamp || Date.now(),
        model
      };
      await this.updateConversation(existingConversation.id, updated);
      return updated;
    } else {
      // Create new conversation
      return await this.createConversation({
        projectId: data.projectId,
        title,
        messages: data.messages,
        model
      });
    }
  }

  // ===== FILES =====

  async createFile(file: Omit<DatabaseFile, 'id' | 'createdAt' | 'updatedAt'>): Promise<DatabaseFile> {
    const db = this.ensureDB();
    const fullFile: DatabaseFile = {
      ...file,
      id: this.generateId(),
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['files'], 'readwrite');
      const store = transaction.objectStore('files');
      const request = store.add(fullFile);

      request.onsuccess = () => resolve(fullFile);
      request.onerror = () => reject(request.error);
    });
  }

  async getFilesByProject(projectId: string): Promise<DatabaseFile[]> {
    const db = this.ensureDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['files'], 'readonly');
      const store = transaction.objectStore('files');
      const index = store.index('projectId');
      const request = index.getAll(projectId);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async updateFile(id: string, updates: Partial<DatabaseFile>): Promise<void> {
    const db = this.ensureDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['files'], 'readwrite');
      const store = transaction.objectStore('files');
      const getRequest = store.get(id);

      getRequest.onsuccess = () => {
        const file = getRequest.result;
        if (!file) {
          reject(new Error('File not found'));
          return;
        }

        const updated = {
          ...file,
          ...updates,
          updatedAt: Date.now()
        };

        const putRequest = store.put(updated);
        putRequest.onsuccess = () => resolve();
        putRequest.onerror = () => reject(putRequest.error);
      };

      getRequest.onerror = () => reject(getRequest.error);
    });
  }

  async deleteFile(id: string): Promise<void> {
    const db = this.ensureDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['files'], 'readwrite');
      const store = transaction.objectStore('files');
      const request = store.delete(id);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async deleteFilesByProject(projectId: string): Promise<void> {
    const files = await this.getFilesByProject(projectId);
    await Promise.all(files.map(f => this.deleteFile(f.id)));
  }

  // Convenience method for saving files (creates or updates)
  async saveFile(file: { path: string; content: string; language: string; timestamp?: number }): Promise<void> {
    const db = this.ensureDB();
    
    // Try to find existing file by path
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['files'], 'readwrite');
      const store = transaction.objectStore('files');
      const index = store.index('path');
      const request = index.getAll(file.path);

      request.onsuccess = () => {
        const existingFiles = request.result;
        if (existingFiles.length > 0) {
          // Update existing file
          const existingFile = existingFiles[0];
          const updated = {
            ...existingFile,
            content: file.content,
            language: file.language,
            updatedAt: file.timestamp || Date.now()
          };
          const putRequest = store.put(updated);
          putRequest.onsuccess = () => resolve();
          putRequest.onerror = () => reject(putRequest.error);
        } else {
          // Create new file (using a default projectId since we don't have one)
          const newFile: DatabaseFile = {
            id: this.generateId(),
            projectId: 'default',
            path: file.path,
            content: file.content,
            language: file.language,
            createdAt: file.timestamp || Date.now(),
            updatedAt: file.timestamp || Date.now()
          };
          const addRequest = store.add(newFile);
          addRequest.onsuccess = () => resolve();
          addRequest.onerror = () => reject(addRequest.error);
        }
      };

      request.onerror = () => reject(request.error);
    });
  }

  // ===== CODE SNIPPETS =====

  async saveSnippet(snippet: { language: string; code: string; title: string; tags: string[] }): Promise<any> {
    const db = this.ensureDB();
    const fullSnippet = {
      ...snippet,
      id: this.generateId(),
      createdAt: Date.now()
    };

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['snippets'], 'readwrite');
      const store = transaction.objectStore('snippets');
      const request = store.add(fullSnippet);

      request.onsuccess = () => resolve(fullSnippet);
      request.onerror = () => reject(request.error);
    });
  }

  async getAllSnippets(): Promise<any[]> {
    const db = this.ensureDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['snippets'], 'readonly');
      const store = transaction.objectStore('snippets');
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async getSnippetsByLanguage(language: string): Promise<any[]> {
    const db = this.ensureDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['snippets'], 'readonly');
      const store = transaction.objectStore('snippets');
      const index = store.index('language');
      const request = index.getAll(language);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  // ===== UTILITY =====

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
  }

  async clearAll(): Promise<void> {
    const db = this.ensureDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['projects', 'conversations', 'files', 'snippets'], 'readwrite');
      
      const promises = [
        transaction.objectStore('projects').clear(),
        transaction.objectStore('conversations').clear(),
        transaction.objectStore('files').clear(),
        transaction.objectStore('snippets').clear()
      ];

      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  }

  async export(): Promise<{ projects: any[]; conversations: any[]; files: any[]; snippets: any[] }> {
    const [projects, conversations, files, snippets] = await Promise.all([
      this.getAllProjects(),
      this.getAllConversations(),
      this.db ? new Promise((resolve, reject) => {
        const transaction = this.db!.transaction(['files'], 'readonly');
        const store = transaction.objectStore('files');
        const request = store.getAll();
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      }) : Promise.resolve([]),
      this.getAllSnippets()
    ]);

    return { projects, conversations, files: files as any[], snippets };
  }

  async import(data: { projects?: any[]; conversations?: any[]; files?: any[]; snippets?: any[] }): Promise<void> {
    const db = this.ensureDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['projects', 'conversations', 'files', 'snippets'], 'readwrite');

      if (data.projects) {
        const projectStore = transaction.objectStore('projects');
        data.projects.forEach(p => projectStore.add(p));
      }

      if (data.conversations) {
        const convStore = transaction.objectStore('conversations');
        data.conversations.forEach(c => convStore.add(c));
      }

      if (data.files) {
        const fileStore = transaction.objectStore('files');
        data.files.forEach(f => fileStore.add(f));
      }

      if (data.snippets) {
        const snippetStore = transaction.objectStore('snippets');
        data.snippets.forEach(s => snippetStore.add(s));
      }

      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  }
}

export const databaseService = new DatabaseService();
