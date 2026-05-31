const { contextBridge, ipcRenderer } = require('electron');

// 暴露窗口控制 API 到渲染进程
contextBridge.exposeInMainWorld('electronAPI', {
    // 窗口控制
    minimize: () => ipcRenderer.send('window-minimize'),
    maximize: () => ipcRenderer.send('window-maximize'),
    close: () => ipcRenderer.send('window-close'),
    isMaximized: () => ipcRenderer.invoke('window-is-maximized'),

    // 监听窗口状态变化
    onWindowStateChange: (callback) => {
        ipcRenderer.send('window-state-subscribe');
        const handler = (_, isMaximized) => {
            callback(isMaximized);
        };
        ipcRenderer.on('window-state-changed', handler);
        return () => {
            ipcRenderer.removeListener('window-state-changed', handler);
        };
    },

    // 平台信息
    platform: process.platform,
    isElectron: true,
});
