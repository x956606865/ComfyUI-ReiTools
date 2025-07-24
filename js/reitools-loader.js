/**
 * ReiTools Loader for ComfyUI
 * 这个文件负责在ComfyUI中加载React组件
 */
import { app } from '/scripts/app.js';
window.comfyUIAPP = app;
(function () {
  'use strict';

  // 检查依赖
  function checkDependencies() {
    return new Promise((resolve, reject) => {
      // 检查React和ReactDOM是否可用
      if (typeof React === 'undefined' || typeof ReactDOM === 'undefined') {
        // 动态加载React依赖
        loadReactDependencies().then(resolve).catch(reject);
      } else {
        resolve();
      }
    });
  }

  // 加载React依赖
  function loadReactDependencies() {
    return new Promise((resolve, reject) => {
      console.log('Loading React dependencies...');

      const reactScript = document.createElement('script');
      reactScript.src = './rei-tools/react.production.min.js';
      reactScript.onload = () => {
        console.log('React loaded');

        const reactDOMScript = document.createElement('script');
        reactDOMScript.src = './rei-tools/react-dom.production.min.js';
        reactDOMScript.onload = () => {
          console.log('ReactDOM loaded');
          // 确保React和ReactDOM都已完全加载
          setTimeout(() => {
            if (window.React && window.ReactDOM) {
              resolve();
            } else {
              reject(new Error('React dependencies not properly loaded'));
            }
          }, 100);
        };
        reactDOMScript.onerror = (error) => {
          console.error('Failed to load ReactDOM:', error);
          reject(error);
        };
        document.head.appendChild(reactDOMScript);
      };
      reactScript.onerror = (error) => {
        console.error('Failed to load React:', error);
        reject(error);
      };
      document.head.appendChild(reactScript);
    });
  }

  // 加载ReiTools UI
  function loadReiToolsUI() {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = './rei-tools/reitools-ui.js';
      script.onload = () => {
        console.log('ReiTools UI loaded successfully');
        resolve();
      };
      script.onerror = (error) => {
        console.error('Failed to load ReiTools UI:', error);
        reject(error);
      };
      document.head.appendChild(script);
    });
  }

  // 等待ComfyUI加载完成
  function waitForComfyUI() {
    return new Promise((resolve) => {
      function check() {
        if (window.app && window.app.graph) {
          resolve();
        } else {
          setTimeout(check, 100);
        }
      }
      check();
    });
  }

  // 初始化ReiTools
  async function initReiTools() {
    try {
      console.log('Initializing ReiTools...');

      // 等待ComfyUI加载
      await waitForComfyUI();
      console.log('ComfyUI loaded');

      // 检查并加载依赖
      await checkDependencies();
      console.log('React dependencies loaded');

      // 加载ReiTools UI
      await loadReiToolsUI();

      // 初始化UI
      if (window.ReiToolsUI && window.ReiToolsUI.ReiToolsAPI) {
        window.ReiToolsUI.ReiToolsAPI.init();
        console.log('ReiTools initialized successfully');
      } else {
        throw new Error('ReiToolsUI not found');
      }
    } catch (error) {
      console.error('Failed to initialize ReiTools:', error);
    }
  }

  // 添加样式
  function addStyles() {
    const style = document.createElement('style');
    style.textContent = `
            /* ReiTools基础样式 */
            #reitools-panel-container * {
                box-sizing: border-box;
            }
            
            .reitools-hidden {
                display: none !important;
            }
            
            .reitools-loading {
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                background: rgba(0, 0, 0, 0.8);
                color: white;
                padding: 20px;
                border-radius: 8px;
                z-index: 99999;
            }
        `;
    document.head.appendChild(style);
  }

  // 页面加载完成后初始化
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      addStyles();
      initReiTools();
    });
  } else {
    addStyles();
    initReiTools();
  }

  // 导出全局API
  window.ReiToolsLoader = {
    init: initReiTools,
    version: '1.5.1',
  };
})();
app.registerExtension({
  name: 'Rei.ReiTools.Loader',
  nodeCreated(node, currentApp) {
    // if (typeof window.ReiToolsLoader.updateNode === 'function') {
    //   setTimeout(() => {
    //     window.ReiToolsLoader.updateNode(app.graph._nodes);
    //   }, 300);
    // }
    // const oldOnRemoved = node.onRemoved;
    // node.onRemoved = (...args) => {
    //   if (typeof oldOnRemoved === 'function') {
    //     oldOnRemoved(...args);
    //   }
    //   if (typeof window.ReiToolsLoader.updateNode === 'function') {
    //     window.ReiToolsLoader.updateNode(
    //       app.graph._nodes.filter((n) => n.id !== node.id)
    //     );
    //   }
    // };
  },
});
