import { app, BrowserWindow, Menu, dialog, ipcMain, shell } from "electron";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const createWindow = () => {
  const mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    title: "AI 游戏英雄设计助手",
    backgroundColor: "#07080d",
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  mainWindow.setMenu(null);
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith("http://") || url.startsWith("https://")) {
      void shell.openExternal(url);
    }

    return { action: "deny" };
  });

  const devServerUrl = process.env.VITE_DEV_SERVER_URL;

  if (devServerUrl) {
    mainWindow.loadURL(devServerUrl);
  } else {
    mainWindow.loadFile(path.join(__dirname, "../dist/index.html"));
  }
};

ipcMain.handle(
  "save-zip-file",
  async (
    event,
    payload: {
      defaultPath?: string;
      data?: ArrayBuffer;
      sourcePath?: string;
    },
  ) => {
    const ownerWindow = BrowserWindow.fromWebContents(event.sender);
    const dialogOptions = {
      title: "保存项目资料包",
      defaultPath: payload.defaultPath || "hero_project.zip",
      filters: [{ name: "ZIP Archive", extensions: ["zip"] }],
    };
    const result = ownerWindow
      ? await dialog.showSaveDialog(ownerWindow, dialogOptions)
      : await dialog.showSaveDialog(dialogOptions);

    if (result.canceled || !result.filePath) {
      return { canceled: true };
    }

    if (payload.sourcePath) {
      await fs.copyFile(payload.sourcePath, result.filePath);
    } else if (payload.data) {
      await fs.writeFile(result.filePath, Buffer.from(payload.data));
    } else {
      throw new Error("No ZIP data or sourcePath provided");
    }

    return { canceled: false, filePath: result.filePath };
  },
);

app.whenReady().then(() => {
  Menu.setApplicationMenu(null);
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
