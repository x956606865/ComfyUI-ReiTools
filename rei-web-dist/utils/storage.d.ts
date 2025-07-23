export interface PanelConfig {
    position: {
        x: number;
        y: number;
    };
    size: {
        width: number;
        height: number;
    };
    visible: boolean;
    activeTab: string;
}
export interface UserPreferences {
    enableShortcuts: boolean;
    showNodePreview: boolean;
    autoSave: boolean;
    defaultPosition: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
    opacity: number;
}
export declare const saveToStorage: (key: string, data: any) => void;
export declare const loadFromStorage: <T>(key: string, defaultValue: T) => T;
export declare const removeFromStorage: (key: string) => void;
export declare const savePanelConfig: (config: Partial<PanelConfig>) => void;
export declare const loadPanelConfig: () => PanelConfig;
export declare const saveUserPreferences: (preferences: Partial<UserPreferences>) => void;
export declare const loadUserPreferences: () => UserPreferences;
export declare const saveWorkflowTemplate: (name: string, workflow: any) => void;
export declare const loadWorkflowTemplates: () => Record<string, any>;
export declare const deleteWorkflowTemplate: (name: string) => void;
export declare const clearAllStorageData: () => void;
