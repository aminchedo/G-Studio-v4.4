import { databaseService } from '@/services/databaseService';

describe('DatabaseService', () => {
  beforeEach(async () => {
    await databaseService.initialize();
    await databaseService.clearAll();
  });

  afterEach(async () => {
    await databaseService.clearAll();
  });

  describe('Initialization', () => {
    it('should initialize successfully', async () => {
      const initialized = await databaseService.initialize();
      expect(initialized).toBe(true);
    });

    it('should handle re-initialization', async () => {
      await databaseService.initialize();
      const reinitialized = await databaseService.initialize();
      expect(reinitialized).toBe(true);
    });
  });

  describe('File Operations', () => {
    const testFile = {
      id: 'test-file-1',
      name: 'test.ts',
      content: 'const test = 1;',
      language: 'typescript',
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    it('should save file successfully', async () => {
      const saved = await databaseService.saveFile(testFile);
      expect(saved).toBe(true);
    });

    it('should retrieve saved file', async () => {
      await databaseService.saveFile(testFile);
      const retrieved = await databaseService.getFile(testFile.id);
      
      expect(retrieved).toBeDefined();
      expect(retrieved?.name).toBe(testFile.name);
      expect(retrieved?.content).toBe(testFile.content);
    });

    it('should update existing file', async () => {
      await databaseService.saveFile(testFile);
      
      const updated = { ...testFile, content: 'const test = 2;' };
      await databaseService.saveFile(updated);
      
      const retrieved = await databaseService.getFile(testFile.id);
      expect(retrieved?.content).toBe('const test = 2;');
    });

    it('should delete file', async () => {
      await databaseService.saveFile(testFile);
      await databaseService.deleteFile(testFile.id);
      
      const retrieved = await databaseService.getFile(testFile.id);
      expect(retrieved).toBeNull();
    });

    it('should list all files', async () => {
      await databaseService.saveFile(testFile);
      await databaseService.saveFile({ ...testFile, id: 'test-file-2', name: 'test2.ts' });
      
      const files = await databaseService.getAllFiles();
      expect(files).toHaveLength(2);
    });
  });

  describe('Conversation Operations', () => {
    const testConversation = {
      id: 'conv-1',
      messages: [
        { role: 'user', content: 'Hello' },
        { role: 'assistant', content: 'Hi there!' }
      ],
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    it('should save conversation', async () => {
      const saved = await databaseService.saveConversation(testConversation);
      expect(saved).toBe(true);
    });

    it('should retrieve conversation', async () => {
      await databaseService.saveConversation(testConversation);
      const retrieved = await databaseService.getConversation(testConversation.id);
      
      expect(retrieved).toBeDefined();
      expect(retrieved?.messages).toHaveLength(2);
    });

    it('should list all conversations', async () => {
      await databaseService.saveConversation(testConversation);
      await databaseService.saveConversation({ ...testConversation, id: 'conv-2' });
      
      const conversations = await databaseService.getAllConversations();
      expect(conversations.length).toBeGreaterThanOrEqual(2);
    });

    it('should delete conversation', async () => {
      await databaseService.saveConversation(testConversation);
      await databaseService.deleteConversation(testConversation.id);
      
      const retrieved = await databaseService.getConversation(testConversation.id);
      expect(retrieved).toBeNull();
    });
  });

  describe('Project Operations', () => {
    const testProject = {
      id: 'project-1',
      name: 'Test Project',
      files: {
        'index.ts': { name: 'index.ts', content: 'export {}', language: 'typescript' }
      },
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    it('should save project', async () => {
      const saved = await databaseService.saveProject(testProject);
      expect(saved).toBe(true);
    });

    it('should retrieve project', async () => {
      await databaseService.saveProject(testProject);
      const retrieved = await databaseService.getProject(testProject.id);
      
      expect(retrieved).toBeDefined();
      expect(retrieved?.name).toBe(testProject.name);
      expect(retrieved?.files).toBeDefined();
    });

    it('should list all projects', async () => {
      await databaseService.saveProject(testProject);
      await databaseService.saveProject({ ...testProject, id: 'project-2', name: 'Project 2' });
      
      const projects = await databaseService.getAllProjects();
      expect(projects.length).toBeGreaterThanOrEqual(2);
    });

    it('should delete project', async () => {
      await databaseService.saveProject(testProject);
      await databaseService.deleteProject(testProject.id);
      
      const retrieved = await databaseService.getProject(testProject.id);
      expect(retrieved).toBeNull();
    });
  });

  describe('Search Operations', () => {
    beforeEach(async () => {
      await databaseService.saveFile({
        id: 'file1',
        name: 'component.tsx',
        content: 'export const Component = () => {}',
        language: 'typescript',
        createdAt: Date.now(),
        updatedAt: Date.now()
      });
      await databaseService.saveFile({
        id: 'file2',
        name: 'service.ts',
        content: 'export const service = {}',
        language: 'typescript',
        createdAt: Date.now(),
        updatedAt: Date.now()
      });
    });

    it('should search files by name', async () => {
      const results = await databaseService.searchFiles('component');
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].name).toContain('component');
    });

    it('should search files by content', async () => {
      const results = await databaseService.searchFiles('service', { searchContent: true });
      expect(results.length).toBeGreaterThan(0);
    });

    it('should filter by language', async () => {
      const results = await databaseService.searchFiles('', { language: 'typescript' });
      expect(results.every(f => f.language === 'typescript')).toBe(true);
    });
  });

  describe('Backup and Restore', () => {
    const testData = {
      files: [
        { id: 'f1', name: 'test1.ts', content: 'test1', language: 'typescript', createdAt: Date.now(), updatedAt: Date.now() }
      ],
      conversations: [
        { id: 'c1', messages: [], createdAt: Date.now(), updatedAt: Date.now() }
      ],
      projects: [
        { id: 'p1', name: 'Project 1', files: {}, createdAt: Date.now(), updatedAt: Date.now() }
      ]
    };

    it('should export all data', async () => {
      for (const file of testData.files) {
        await databaseService.saveFile(file);
      }

      const exported = await databaseService.exportAllData();
      expect(exported.files.length).toBeGreaterThan(0);
    });

    it('should import data', async () => {
      await databaseService.importAllData(testData);
      
      const file = await databaseService.getFile('f1');
      expect(file).toBeDefined();
    });

    it('should clear all data', async () => {
      await databaseService.saveFile(testData.files[0]);
      await databaseService.clearAll();
      
      const files = await databaseService.getAllFiles();
      expect(files).toHaveLength(0);
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid file ID', async () => {
      const result = await databaseService.getFile('');
      expect(result).toBeNull();
    });

    it('should handle corrupted data', async () => {
      const corrupted = { id: 'bad', invalid: 'data' };
      await expect(databaseService.saveFile(corrupted as any)).rejects.toThrow();
    });

    it('should handle database errors gracefully', async () => {
      await databaseService.clearAll();
      const files = await databaseService.getAllFiles();
      expect(Array.isArray(files)).toBe(true);
    });
  });
});
