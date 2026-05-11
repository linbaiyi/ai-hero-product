export {};

declare global {
  interface Window {
    electronAPI?: {
      saveZipFile: (payload: {
        defaultPath?: string;
        data?: ArrayBuffer;
        sourcePath?: string;
      }) => Promise<{
        canceled: boolean;
        filePath?: string;
      }>;
    };
  }
}
