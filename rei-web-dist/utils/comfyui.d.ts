import { ComfyUIApp, ComfyUINode } from '@/types';
export declare const getComfyUIApp: () => ComfyUIApp | null;
export declare const isComfyUILoaded: () => boolean;
export declare const getSelectedNodes: () => ComfyUINode[];
export declare const getAllNodes: () => ComfyUINode[];
export declare const addNodeToCanvas: (nodeType: string, position?: {
    x: number;
    y: number;
}) => any;
export declare const connectNodes: (outputNode: ComfyUINode, outputSlot: number, inputNode: ComfyUINode, inputSlot: number) => any;
export declare const deleteSelectedNodes: () => void;
export declare const copyNodeInfo: (node: ComfyUINode) => void;
export declare const exportWorkflow: () => any;
export declare const importWorkflow: (workflowData: any) => boolean;
export declare const cleanupUnconnectedNodes: () => number;
