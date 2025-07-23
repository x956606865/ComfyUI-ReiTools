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
declare global {
    interface Window {
        app?: ComfyUIApp;
        comfyUIAPP?: ComfyUIApp;
        React?: any;
        ReactDOM?: any;
        ReiToolsUI?: any;
        [key: string]: any;
    }
}
