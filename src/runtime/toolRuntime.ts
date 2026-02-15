/**
 * Tool runtime - browser stub.
 * FileOperations is used by filesystemAdapter; provide a minimal export for compilation.
 */

export const FileOperations = {
  async readFile(
    _path: string,
  ): Promise<{ success: boolean; content?: string; error?: string }> {
    return { success: false, error: "FileOperations not available in browser" };
  },
  async writeFile(
    _path: string,
    _content: string,
  ): Promise<{ success: boolean; error?: string }> {
    return { success: false, error: "FileOperations not available in browser" };
  },
};
