import { ReiToolsPanel } from './components/ReiToolsPanel';
import { FloatingPanel } from './components/FloatingPanel';
import { selectDirectory, selectFile } from './utils/fileSelector';
declare class ReiToolsManager {
    private panelContainer;
    private isInitialized;
    private panelVisible;
    constructor();
    private init;
    private setupUI;
    private addToolbarButton;
    togglePanel(): void;
    showPanel(): void;
    hidePanel(): void;
    private renderPanel;
}
export declare const initReiTools: () => ReiToolsManager;
export declare const ReiToolsAPI: {
    init: () => ReiToolsManager;
    toggle: () => void | undefined;
    show: () => void | undefined;
    hide: () => void | undefined;
    selectDirectory: typeof selectDirectory;
    selectFile: typeof selectFile;
    FileSelector: {
        create: typeof import("./utils/fileSelector").createFileSelector;
        selectFile: typeof selectFile;
        selectDirectory: typeof selectDirectory;
        selectModelDirectory: typeof import("./utils/fileSelector").selectModelDirectory;
        selectLoraDirectory: typeof import("./utils/fileSelector").selectLoraDirectory;
        selectSystemDirectory: typeof import("./utils/fileSelector").selectSystemDirectory;
        selectImage: typeof import("./utils/fileSelector").selectImage;
        selectTextFile: typeof import("./utils/fileSelector").selectTextFile;
        selectPythonFile: typeof import("./utils/fileSelector").selectPythonFile;
        fetchFileSystemData: typeof import("./utils/fileSelector").fetchFileSystemData;
        fetchSystemFileSystemData: typeof import("./utils/fileSelector").fetchSystemFileSystemData;
    };
};
export { ReiToolsPanel, FloatingPanel };
export * from './utils/comfyui';
export * from './utils/storage';
export * from './utils/fileSelector';
