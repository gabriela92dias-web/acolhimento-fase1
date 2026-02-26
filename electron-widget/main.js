const { app, BrowserWindow, screen, ipcMain, shell } = require('electron');
const path = require('path');

let win;
const BAR_HEIGHT = 36;

function createWindow() {
  const { width } = screen.getPrimaryDisplay().workAreaSize;

  win = new BrowserWindow({
    width: width,
    height: BAR_HEIGHT,
    x: 0,
    y: 0,
    frame: false,
    transparent: true,
    resizable: false,
    movable: false,
    alwaysOnTop: true,
    skipTaskbar: false,
    hasShadow: false,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
  });

  win.loadFile('widget.html');
  win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });

  win.on('blur', () => {
    win.setAlwaysOnTop(true);
  });
}

ipcMain.on('open-link', (event, url) => {
  shell.openExternal(url);
});

ipcMain.on('quit-app', () => {
  app.quit();
});

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  app.quit();
});
