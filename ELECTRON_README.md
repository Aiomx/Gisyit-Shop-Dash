# Electron 桌面版本

## 快速开始

### 1. 安装依赖
```bash
cd dash
npm install
```

### 2. 开发模式运行
```bash
# 先启动 Next.js 开发服务器
npm run dev

# 在另一个终端启动 Electron
npm run electron:dev
```

### 3. 构建 Windows exe
```bash
npm run electron:build:win
```

构建完成后，exe 文件位于 `dist-electron/` 目录。

## 自定义窗口控制器

项目已配置自定义窗口控制器，替代 Electron 默认标题栏：

- **最小化**: 点击 `-` 按钮
- **最大化/还原**: 点击 `□` 按钮
- **关闭**: 点击 `×` 按钮
- **拖拽移动**: 拖拽标题栏区域可移动窗口

## 文件结构

```
dash/
├── electron/
│   ├── main.js      # Electron 主进程
│   └── preload.js   # 预加载脚本（暴露窗口控制 API）
├── src/
│   └── components/ui/
│       └── window-controls.tsx  # 自定义窗口控制器组件
```

## 注意事项

1. 生产环境需要先运行 `npm run build` 构建 Next.js
2. 图标文件需要放在 `public/` 目录：
   - `icon.png` (Linux)
   - `icon.ico` (Windows)
   - `icon.icns` (macOS)
