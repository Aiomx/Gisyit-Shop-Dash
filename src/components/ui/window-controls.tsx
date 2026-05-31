"use client";

import { useEffect, useState } from "react";
import { Minus, Square, X, Copy } from "lucide-react";
import { cn } from "@/lib/utils";

interface WindowControlsProps {
    className?: string;
}

export function WindowControls({ className }: WindowControlsProps) {
    const [isMaximized, setIsMaximized] = useState(false);
    const [isElectron, setIsElectron] = useState(false);

    useEffect(() => {
        // 检测是否在 Electron 环境中
        const electronAPI = (window as any).electronAPI;
        if (electronAPI?.isElectron) {
            setIsElectron(true);

            // 获取初始最大化状态
            electronAPI.isMaximized().then(setIsMaximized);

            // 监听窗口状态变化
            const unsubscribe = electronAPI.onWindowStateChange((maximized: boolean) => {
                setIsMaximized(maximized);
            });

            return () => {
                if (typeof unsubscribe === "function") {
                    unsubscribe();
                }
            };
        }
    }, []);

    // 非 Electron 环境不渲染
    if (!isElectron) return null;

    const handleMinimize = () => {
        (window as any).electronAPI?.minimize();
    };

    const handleMaximize = () => {
        (window as any).electronAPI?.maximize();
    };

    const handleClose = () => {
        (window as any).electronAPI?.close();
    };

    return (
        <div
            className={cn(
                "flex items-center gap-0 select-none",
                className
            )}
            style={{ WebkitAppRegion: "no-drag" } as React.CSSProperties}
        >
            {/* 最小化按钮 */}
            <button
                onClick={handleMinimize}
                className="h-8 w-11 flex items-center justify-center hover:bg-muted/80 transition-colors"
                title="最小化"
            >
                <Minus className="h-4 w-4 text-muted-foreground" />
            </button>

            {/* 最大化/还原按钮 */}
            <button
                onClick={handleMaximize}
                className="h-8 w-11 flex items-center justify-center hover:bg-muted/80 transition-colors"
                title={isMaximized ? "还原" : "最大化"}
            >
                {isMaximized ? (
                    <Copy className="h-3.5 w-3.5 text-muted-foreground rotate-90" />
                ) : (
                    <Square className="h-3.5 w-3.5 text-muted-foreground" />
                )}
            </button>

            {/* 关闭按钮 */}
            <button
                onClick={handleClose}
                className="h-8 w-11 flex items-center justify-center hover:bg-red-500 hover:text-white transition-colors"
                title="关闭"
            >
                <X className="h-4 w-4 text-muted-foreground hover:text-white" />
            </button>
        </div>
    );
}

// 可拖拽标题栏组件
export function DraggableTitleBar({
    children,
    className
}: {
    children?: React.ReactNode;
    className?: string;
}) {
    const [isElectron, setIsElectron] = useState(false);

    useEffect(() => {
        setIsElectron(!!(window as any).electronAPI?.isElectron);
    }, []);

    if (!isElectron) return <>{children}</>;

    return (
        <div
            className={cn("flex items-center", className)}
            style={{ WebkitAppRegion: "drag" } as React.CSSProperties}
        >
            {children}
        </div>
    );
}
