import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("electronAPI", {
  saveZipFile: (payload: {
    defaultPath?: string;
    data?: ArrayBuffer;
    sourcePath?: string;
  }) => ipcRenderer.invoke("save-zip-file", payload),
});
