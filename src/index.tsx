import { ReiToolsPanel } from './components/ReiToolsPanel';
import { FloatingPanel } from './components/FloatingPanel';
import { isComfyUILoaded } from './utils/comfyui';
import { loadPanelConfig, savePanelConfig } from './utils/storage';
import {
  selectDirectory,
  selectFile,
  FileSelector,
} from './utils/fileSelector';

// 全局状态管理
class ReiToolsManager {
  private panelContainer: HTMLDivElement | null = null;
  private isInitialized = false;
  private panelVisible = false;

  constructor() {
    this.init();
  }

  private init() {
    if (this.isInitialized) return;

    // 等待ComfyUI加载完成
    const checkComfyUI = () => {
      if (isComfyUILoaded()) {
        this.setupUI();
        // this.setupShortcuts();
        this.isInitialized = true;
      } else {
        setTimeout(checkComfyUI, 100);
      }
    };

    checkComfyUI();
  }

  private setupUI() {
    // 创建面板容器
    this.panelContainer = document.createElement('div');
    this.panelContainer.id = 'reitools-panel-container';
    this.panelContainer.style.position = 'fixed';
    this.panelContainer.style.top = '0';
    this.panelContainer.style.right = '0';
    this.panelContainer.style.width = '100%';
    this.panelContainer.style.height = '100%';
    this.panelContainer.style.pointerEvents = 'none';
    this.panelContainer.style.zIndex = '10000';

    document.body.appendChild(this.panelContainer);

    // 添加工具栏按钮
    this.addToolbarButton();

    // 加载保存的配置
    const config = loadPanelConfig();
    this.panelVisible = config.visible;
    // this.showPanel();
    this.renderPanel();
  }

  private addToolbarButton() {
    const button = document.createElement('button');
    button.innerHTML = '🔧 ReiTools';
    button.style.margin = '0 5px';
    button.style.padding = '5px 10px';
    button.style.backgroundColor = '#333';
    button.style.color = '#fff';
    button.style.border = '1px solid #555';
    button.style.borderRadius = '4px';
    button.style.cursor = 'pointer';
    button.style.fontSize = '12px';
    button.style.zIndex = '10000';
    button.style.position = 'fixed';
    button.style.bottom = '20px';
    button.style.right = '70px';
    button.style.width = '90px';
    button.style.height = '40px';
    button.id = 'reitools-toolbar-button';
    button.addEventListener('click', () => {
      this.togglePanel();
    });

    button.addEventListener('mouseenter', () => {
      button.style.backgroundColor = '#555';
    });

    button.addEventListener('mouseleave', () => {
      button.style.backgroundColor = '#333';
    });

    document.body.appendChild(button);
  }

  public togglePanel() {
    this.panelVisible = !this.panelVisible;
    savePanelConfig({ visible: this.panelVisible });
    this.renderPanel();
  }

  public showPanel() {
    this.panelVisible = true;
    savePanelConfig({ visible: this.panelVisible });
    this.renderPanel();
  }

  public hidePanel() {
    this.panelVisible = false;
    savePanelConfig({ visible: this.panelVisible });
    this.renderPanel();
  }

  private renderPanel() {
    if (!this.panelContainer) return;

    // 清空容器
    this.panelContainer.innerHTML = '';

    if (this.panelVisible) {
      // 检查React是否可用
      if (
        typeof window.React === 'undefined' ||
        typeof window.ReactDOM === 'undefined'
      ) {
        console.warn('React or ReactDOM not available, waiting...');
        // 显示加载状态
        const loadingDiv = document.createElement('div');
        loadingDiv.style.pointerEvents = 'auto';
        loadingDiv.innerHTML = `
          <div style="
            position: fixed; 
            top: 100px; 
            right: 100px; 
            background: #2a2a2a; 
            color: white; 
            padding: 20px; 
            border-radius: 8px;
            border: 1px solid #404040;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          ">
            <div>🔧 ReiTools 正在加载...</div>
            <div style="font-size: 12px; color: #999; margin-top: 8px;">等待 React 依赖加载完成</div>
          </div>
        `;
        this.panelContainer.appendChild(loadingDiv);

        // 延迟重试
        setTimeout(() => this.renderPanel(), 200);
        return;
      }

      // 创建React根元素
      const reactRoot = document.createElement('div');
      reactRoot.style.pointerEvents = 'auto';
      this.panelContainer.appendChild(reactRoot);

      try {
        // 使用全局React和ReactDOM
        const React = window.React;
        const ReactDOM = window.ReactDOM;

        const element = React.createElement(ReiToolsPanel, {
          visible: this.panelVisible,
          onClose: () => this.hidePanel(),
        });

        if (ReactDOM.createRoot) {
          // React 18+
          const root = ReactDOM.createRoot(reactRoot);
          root.render(element);
        } else {
          // React 17及以下
          ReactDOM.render(element, reactRoot);
        }

        console.log('ReiTools panel rendered successfully');
      } catch (error: any) {
        console.error('Failed to render React component:', error);
        // 显示错误信息
        reactRoot.innerHTML = `
          <div style="
            position: fixed; 
            top: 100px; 
            left: 100px; 
            background: #2a2a2a; 
            color: #ff6b6b; 
            padding: 20px; 
            border-radius: 8px;
            border: 1px solid #ff6b6b;
            font-family: monospace;
            max-width: 400px;
          ">
            <h3 style="margin: 0 0 10px 0; color: #ff6b6b;">ReiTools UI 加载错误</h3>
            <p style="margin: 0 0 10px 0;">React 组件渲染失败，请检查控制台获取详细信息。</p>
            <details style="margin-top: 10px;">
              <summary style="cursor: pointer;">错误详情</summary>
              <pre style="margin: 10px 0 0 0; font-size: 11px; overflow: auto;">${
                error?.message || '未知错误'
              }</pre>
            </details>
            <button onclick="this.parentElement.style.display='none'" style="
              background: #333; 
              border: 1px solid #555; 
              color: white; 
              padding: 5px 10px; 
              border-radius: 4px; 
              cursor: pointer;
              margin-top: 10px;
            ">关闭</button>
          </div>
        `;
      }
    }
  }
}

// 创建全局实例
let reiToolsManager: ReiToolsManager | null = null;

// 初始化函数
export const initReiTools = () => {
  if (!reiToolsManager) {
    reiToolsManager = new ReiToolsManager();
  }
  return reiToolsManager;
};

// 导出API供外部使用
export const ReiToolsAPI = {
  init: initReiTools,
  toggle: () => reiToolsManager?.togglePanel(),
  show: () => reiToolsManager?.showPanel(),
  hide: () => reiToolsManager?.hidePanel(),
  // 文件选择器API
  selectDirectory,
  selectFile,
  FileSelector,
};

// 导出组件供直接使用
export { ReiToolsPanel, FloatingPanel };
export * from './utils/comfyui';
export * from './utils/storage';
export * from './utils/fileSelector';

// 自动初始化（如果环境支持）
if (typeof window !== 'undefined') {
  // 设置全局API
  window.ReiToolsUI = ReiToolsAPI;

  // 设置文件选择器全局API（向后兼容）
  window.ReiFileSelector = FileSelector;

  // 当DOM加载完成后自动初始化
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initReiTools);
  } else {
    // DOM已经加载完成
    setTimeout(initReiTools, 100);
  }
}
