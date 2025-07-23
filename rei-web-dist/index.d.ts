import { ReiToolsPanel } from './components/ReiToolsPanel';
import { FloatingPanel } from './components/FloatingPanel';
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
};
export { ReiToolsPanel, FloatingPanel };
export * from './utils/comfyui';
export * from './utils/storage';
