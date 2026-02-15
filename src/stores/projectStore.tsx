/**
 * Project Store - Zustand State Management
 *
 * STRATEGY: Add alongside existing useState, migrate gradually
 * This store manages project-level state (files, active file, etc.)
 */

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { FileData, Project, ProjectFile } from "@/mcp/runtime/types";

// ==================== STORE INTERFACE ====================

interface ProjectState {
  // Current project
  currentProject: Project | null;

  // Files (using Map for better performance)
  files: Map<string, FileData>;
  activeFile: string | null;
  openFiles: string[];

  // Actions
  createProject: (name: string, description?: string) => void;
  loadProject: (project: Project) => void;
  saveProject: () => void;

  // File actions
  createFile: (path: string, content?: string, language?: string) => void;
  updateFile: (path: string, content: string) => void;
  deleteFile: (path: string) => void;
  renameFile: (oldPath: string, newPath: string) => void;

  // Active file management
  setActiveFile: (path: string | null) => void;
  openFile: (path: string) => void;
  closeFile: (path: string) => void;

  // Utility
  getFile: (path: string) => FileData | undefined;
  hasFile: (path: string) => boolean;
  getAllFiles: () => Map<string, FileData>;
}

// ==================== HELPER FUNCTIONS ====================

function detectLanguage(path: string): string {
  const ext = path.split(".").pop()?.toLowerCase();
  const languageMap: Record<string, string> = {
    html: "html",
    htm: "html",
    css: "css",
    scss: "scss",
    sass: "sass",
    less: "less",
    js: "javascript",
    jsx: "javascript",
    ts: "typescript",
    tsx: "typescript",
    json: "json",
    md: "markdown",
    py: "python",
    java: "java",
    cpp: "cpp",
    c: "c",
    go: "go",
    rs: "rust",
    php: "php",
    rb: "ruby",
    swift: "swift",
    kt: "kotlin",
    xml: "xml",
    yaml: "yaml",
    yml: "yaml",
    sql: "sql",
    sh: "shell",
    bash: "shell",
  };
  return languageMap[ext || ""] || "plaintext";
}

function convertProjectFilesToMap(
  projectFiles: ProjectFile[],
): Map<string, FileData> {
  const map = new Map<string, FileData>();
  for (const file of projectFiles) {
    const fileData: FileData = {
      name: file.name,
      language: file.language,
      content: file.content,
      path: file.path,
      lastModified: file.lastModified,
      size: file.size,
      encoding: file.encoding || "utf-8",
      isModified: file.isModified || false,
      version: file.version || 1,
    };
    map.set(file.path, fileData);
  }
  return map;
}

function convertMapToProjectFiles(
  filesMap: Map<string, FileData>,
): ProjectFile[] {
  return Array.from(filesMap.values()).map((file) => ({
    name: file.name,
    path: file.path,
    content: file.content,
    language: file.language,
    lastModified: file.lastModified,
    size: file.size,
    encoding: file.encoding,
    isModified: file.isModified,
    version: file.version,
  }));
}

// ==================== STORE IMPLEMENTATION ====================

export const useProjectStore = create<ProjectState>()(
  persist(
    (set, get) => ({
      // Initial state
      currentProject: null,
      files: new Map<string, FileData>(),
      activeFile: null,
      openFiles: [],

      // ==================== PROJECT ACTIONS ====================

      createProject: (name: string, description: string = "") => {
        const project: Project = {
          id: crypto.randomUUID(),
          name,
          description,
          created: new Date(),
          updated: new Date(),
          files: [],
          settings: {
            defaultLanguage: "javascript",
            autoSave: false,
            autoFormat: true,
            theme: "dark",
          },
        };
        set({
          currentProject: project,
          files: new Map<string, FileData>(),
          activeFile: null,
          openFiles: [],
        });
      },

      loadProject: (project: Project) => {
        const filesMap = convertProjectFilesToMap(project.files);
        set({
          currentProject: project,
          files: filesMap,
          activeFile: null,
          openFiles: [],
        });
      },

      saveProject: () => {
        const { currentProject, files } = get();
        if (currentProject) {
          const projectFiles = convertMapToProjectFiles(files);
          const updatedProject: Project = {
            ...currentProject,
            files: projectFiles,
            updated: new Date(),
          };

          // Save to localStorage
          try {
            localStorage.setItem(
              `gstudio-project-${currentProject.id}`,
              JSON.stringify({
                ...updatedProject,
                files: projectFiles,
              }),
            );
          } catch (error) {
            console.error("Failed to save project:", error);
          }

          set({ currentProject: updatedProject });
        }
      },

      // ==================== FILE ACTIONS ====================

      createFile: (path: string, content: string = "", language?: string) => {
        const { files, openFiles } = get();
        const newFiles = new Map(files);

        const fileData: FileData = {
          name: path.split("/").pop() || path,
          language: language || detectLanguage(path),
          content,
          path,
          lastModified: new Date(),
          size: content.length,
          encoding: "utf-8",
          isModified: false,
          version: 1,
        };

        newFiles.set(path, fileData);

        // Auto-open new file
        const newOpenFiles = [...openFiles, path];

        set({
          files: newFiles,
          activeFile: path,
          openFiles: newOpenFiles,
        });
      },

      updateFile: (path: string, content: string) => {
        const { files } = get();
        const newFiles = new Map(files);
        const existing = newFiles.get(path) as FileData | undefined;

        if (existing) {
          newFiles.set(path, {
            ...existing,
            content,
            lastModified: new Date(),
            size: content.length,
            isModified: true,
            version: Number(existing.version ?? 1) + 1,
          });
          set({ files: newFiles });
        }
      },

      deleteFile: (path: string) => {
        const { files, activeFile, openFiles } = get();
        const newFiles = new Map(files);
        newFiles.delete(path);

        // Remove from open files
        const newOpenFiles = openFiles.filter((f) => f !== path);

        // Update active file if deleted
        const newActiveFile =
          activeFile === path
            ? newOpenFiles.length > 0
              ? newOpenFiles[newOpenFiles.length - 1]
              : null
            : activeFile;

        set({
          files: newFiles,
          activeFile: newActiveFile,
          openFiles: newOpenFiles,
        });
      },

      renameFile: (oldPath: string, newPath: string) => {
        const { files, activeFile, openFiles } = get();
        const newFiles = new Map(files);
        const file = newFiles.get(oldPath) as FileData | undefined;

        if (file) {
          newFiles.delete(oldPath);
          newFiles.set(newPath, {
            ...file,
            name: newPath.split("/").pop() || newPath,
            path: newPath,
            language: detectLanguage(newPath),
            lastModified: new Date(),
          });

          // Update open files
          const newOpenFiles = openFiles.map((f) =>
            f === oldPath ? newPath : f,
          );

          // Update active file
          const newActiveFile = activeFile === oldPath ? newPath : activeFile;

          set({
            files: newFiles,
            activeFile: newActiveFile,
            openFiles: newOpenFiles,
          });
        }
      },

      // ==================== ACTIVE FILE MANAGEMENT ====================

      setActiveFile: (path: string | null) => {
        set({ activeFile: path });
      },

      openFile: (path: string) => {
        const { openFiles, files } = get();

        // Check if file exists
        if (!files.has(path)) {
          console.warn(`File not found: ${path}`);
          return;
        }

        // Add to open files if not already open
        if (!openFiles.includes(path)) {
          const newOpenFiles = [...openFiles, path];
          set({ openFiles: newOpenFiles, activeFile: path });
        } else {
          set({ activeFile: path });
        }
      },

      closeFile: (path: string) => {
        const { openFiles, activeFile } = get();
        const newOpenFiles = openFiles.filter((f) => f !== path);

        // Update active file if closed
        let newActiveFile = activeFile;
        if (activeFile === path) {
          if (newOpenFiles.length > 0) {
            // Set to last open file
            newActiveFile = newOpenFiles[newOpenFiles.length - 1] ?? null;
          } else {
            newActiveFile = null;
          }
        }

        set({ openFiles: newOpenFiles, activeFile: newActiveFile });
      },

      // ==================== UTILITY METHODS ====================

      getFile: (path: string) => {
        return get().files.get(path);
      },

      hasFile: (path: string) => {
        return get().files.has(path);
      },

      getAllFiles: () => {
        return get().files;
      },
    }),
    {
      name: "gstudio-project-storage",
      // Custom serialization for Map
      partialize: (state) => ({
        currentProject: state.currentProject,
        files: Array.from(state.files.entries()),
        activeFile: state.activeFile,
        openFiles: state.openFiles,
      }),
      // Custom deserialization for Map
      merge: (persistedState: any, currentState: ProjectState) => {
        return {
          ...currentState,
          ...persistedState,
          files: new Map(persistedState.files || []),
        };
      },
    },
  ),
);

// ==================== SELECTORS ====================

// Selector hooks for optimized re-renders
export const useActiveFile = () => useProjectStore((state) => state.activeFile);
export const useOpenFiles = () => useProjectStore((state) => state.openFiles);
export const useFiles = () => useProjectStore((state) => state.files);
export const useCurrentProject = () =>
  useProjectStore((state) => state.currentProject);

// Selector for specific file
export const useFile = (path: string) =>
  useProjectStore((state) => state.files.get(path));

// Selector for file actions
export const useFileActions = () =>
  useProjectStore((state) => ({
    createFile: state.createFile,
    updateFile: state.updateFile,
    deleteFile: state.deleteFile,
    renameFile: state.renameFile,
    openFile: state.openFile,
    closeFile: state.closeFile,
    setActiveFile: state.setActiveFile,
  }));

// Selector for project actions
export const useProjectActions = () =>
  useProjectStore((state) => ({
    createProject: state.createProject,
    loadProject: state.loadProject,
    saveProject: state.saveProject,
  }));
