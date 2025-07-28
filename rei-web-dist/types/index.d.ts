export interface ComfyUIApp {
    graph: any;
    canvas: any;
    ui: any;
    extensionManager?: any;
    createNode?: (type: string) => any;
    [key: string]: any;
}
export interface ComfyUINode {
    id: string;
    type: string;
    pos: [number, number];
    size: [number, number];
    widgets?: any[];
    inputs?: any[];
    outputs?: any[];
}
export interface FloatingPanelProps {
    title?: string;
    visible?: boolean;
    position?: {
        x: number;
        y: number;
    };
    size?: {
        width: number;
        height: number;
    };
    onClose?: () => void;
    onMove?: (position: {
        x: number;
        y: number;
    }) => void;
    onResize?: (size: {
        width: number;
        height: number;
    }) => void;
    children?: any;
    className?: string;
    zIndex?: number;
}
export interface ReiToolsConfig {
    floatingPanel: {
        defaultPosition: {
            x: number;
            y: number;
        };
        defaultSize: {
            width: number;
            height: number;
        };
        minSize: {
            width: number;
            height: number;
        };
        maxSize: {
            width: number;
            height: number;
        };
    };
}
export interface FileSelectOptions {
    mode?: 'file' | 'directory' | 'both';
    title?: string;
    allowedExtensions?: string[];
    initialPath?: string;
    baseDir?: string;
}
export interface FileSelectResult {
    path: string;
    type: 'file' | 'directory';
    name: string;
}
export interface FileSelector {
    create: (options?: FileSelectOptions) => Promise<FileSelectResult>;
    selectFile: (allowedExtensions?: string[]) => Promise<FileSelectResult>;
    selectDirectory: (baseDir?: string) => Promise<FileSelectResult>;
    selectModelDirectory: () => Promise<FileSelectResult>;
    selectLoraDirectory: () => Promise<FileSelectResult>;
    selectSystemDirectory: (initialPath?: string) => Promise<FileSelectResult>;
    selectImage: () => Promise<FileSelectResult>;
    selectTextFile: () => Promise<FileSelectResult>;
    selectPythonFile: () => Promise<FileSelectResult>;
    fetchFileSystemData: (path?: string, showFiles?: boolean) => Promise<any>;
    fetchSystemFileSystemData: (path?: string, showFiles?: boolean) => Promise<any>;
}
declare global {
    interface Window {
        app?: ComfyUIApp;
        comfyUIAPP?: ComfyUIApp;
        React?: any;
        ReactDOM?: any;
        ReiToolsUI?: any;
        ReiFileSelector?: FileSelector;
        [key: string]: any;
    }
}
