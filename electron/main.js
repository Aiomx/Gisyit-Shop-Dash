const { app, BrowserWindow, ipcMain, shell } = require('electron');
const path = require('path');
const { spawn } = require('child_process');

let mainWindow;
let nextServer;
const isDev = process.env.NODE_ENV === 'development';
const PORT = 3000;
const isWin = process.platform === 'win32';
let windowStateHandlersAttached = false;

function attachWindowStateHandlers() {
    if (!mainWindow || windowStateHandlersAttached) return;
    windowStateHandlersAttached = true;

    const sendWindowState = (isMaximized) => {
        if (!mainWindow || mainWindow.isDestroyed()) return;
        mainWindow.webContents.send('window-state-changed', isMaximized);
    };

    mainWindow.on('maximize', () => sendWindowState(true));
    mainWindow.on('unmaximize', () => sendWindowState(false));
    mainWindow.on('closed', () => {
        windowStateHandlersAttached = false;
    });
}

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1400,
        height: 900,
        minWidth: 800,
        minHeight: 600,
        frame: false, // 禁用默认窗口框架，使用自定义控制器
        titleBarStyle: 'hidden',
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, 'preload.js'),
        },
        icon: path.join(__dirname, '../public/icon.png'),
        backgroundColor: '#0a0a0a',
        show: false,
    });

    // 窗口准备好后显示，避免白屏闪烁
    mainWindow.once('ready-to-show', () => {
        mainWindow.show();
    });

    // 开发模式连接本地 Next.js 服务器
    // 生产模式也使用本地服务器（Next.js 需要服务端渲染）
    const url = `http://localhost:${PORT}`;

    mainWindow.loadURL(url);

    if (isDev) {
        mainWindow.webContents.openDevTools();
    }

    // 处理外部链接
    mainWindow.webContents.setWindowOpenHandler(({ url }) => {
        shell.openExternal(url);
        return { action: 'deny' };
    });

    mainWindow.on('closed', () => {
        mainWindow = null;
    });

    attachWindowStateHandlers();
}

// 窗口控制 IPC 处理
ipcMain.on('window-minimize', () => {
    if (mainWindow) mainWindow.minimize();
});

ipcMain.on('window-maximize', () => {
    if (mainWindow) {
        if (mainWindow.isMaximized()) {
            mainWindow.unmaximize();
        } else {
            mainWindow.maximize();
        }
    }
});

ipcMain.on('window-close', () => {
    if (mainWindow) mainWindow.close();
});

ipcMain.handle('window-is-maximized', () => {
    return mainWindow ? mainWindow.isMaximized() : false;
});

// 监听窗口最大化状态变化
ipcMain.on('window-state-subscribe', (event) => {
    attachWindowStateHandlers();
    if (mainWindow && !mainWindow.isDestroyed()) {
        event.sender.send('window-state-changed', mainWindow.isMaximized());
    }
});

function killNextServer() {
    if (nextServer) {
        try {
            if (isWin) {
                spawn('taskkill', ['/pid', nextServer.pid, '/f', '/t']);
            } else {
                // Kill process group to ensure all child processes (Next.js, Webpack) are killed
                process.kill(-nextServer.pid, 'SIGTERM');
            }
        } catch (e) {
            console.error('Error killing Next.js server:', e);
        }
        nextServer = null;
    }
}

function startNextServer() {
    return new Promise((resolve, reject) => {
        const npmCmd = isWin ? 'npm.cmd' : 'npm';
        const script = isDev ? 'dev' : 'start';

        nextServer = spawn(npmCmd, ['run', script], {
            cwd: path.join(__dirname, '..'),
            env: { ...process.env, PORT: PORT.toString() },
            stdio: ['pipe', 'pipe', 'pipe'],
            detached: !isWin, // Create process group on non-Windows for clean kill
        });

        nextServer.stdout.on('data', (data) => {
            const output = data.toString();
            // Truncate overly long logs to prevent memory pressure in main process
            const logOutput = output.length > 1000 ? output.substring(0, 1000) + '...' : output;
            console.log(`Next.js: ${logOutput}`);
            
            // 检测 Next.js 启动完成
            if (output.includes('Ready') || output.includes('started server') || output.includes(`localhost:${PORT}`)) {
                resolve();
            }
        });

        nextServer.stderr.on('data', (data) => {
            const output = data.toString();
            // Also truncate stderr
            const logOutput = output.length > 1000 ? output.substring(0, 1000) + '...' : output;
            console.error(`Next.js Error: ${logOutput}`);
        });

        nextServer.on('error', (err) => {
            console.error('Failed to start Next.js server:', err);
            reject(err);
        });

        // 超时后也继续（防止检测不到启动信号）
        setTimeout(resolve, 8000);
    });
}

app.whenReady().then(async () => {
    try {
        console.log('Starting Next.js server...');
        await startNextServer();
        console.log('Next.js server started, creating window...');
        createWindow();
    } catch (err) {
        console.error('Failed to start:', err);
        app.quit();
    }

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

app.on('window-all-closed', () => {
    killNextServer();
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('before-quit', () => {
    killNextServer();
});
