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
    version: '1.5.2',
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
  async setup() {
    // 确保 PrimitiveNode 已经存在
    if (!LiteGraph.Nodes.PrimitiveNode) {
      console.warn(
        'MyPlugin.PrimitiveNodeWatcher: PrimitiveNode not found. Skipping patch.'
      );
      return;
    }

    // 1. 保存原始的 onConnectionsChange 方法
    const original_onConnectionsChange =
      LiteGraph.Nodes.PrimitiveNode.prototype.onConnectionsChange;

    // 2. 重写 onConnectionsChange 方法
    LiteGraph.Nodes.PrimitiveNode.prototype.onConnectionsChange = function (
      type, // LiteGraph.INPUT 或 LiteGraph.OUTPUT
      slotIndex, // 发生变化的插槽索引
      isConnected, // true = 已连接, false = 已断开
      link_info, // 连接信息对象
      ioSlot // 插槽对象本身
    ) {
      // 3. 首先，调用原始方法，确保节点行为正常
      original_onConnectionsChange?.apply(this, arguments);
      setTimeout(() => {
        const valueWidget = this.widgets
          ? this.widgets.find((w) => w.name === 'value')
          : undefined;
        // console.log(
        //   '%c [ valueWidget ]-213',
        //   'font-size:13px; background:pink; color:#bf2c9f;',
        //   valueWidget
        // );

        if (valueWidget) {
          //   console.log(
          //     '%c [ valueWidget._ReiToolsPatched ]-221',
          //     'font-size:13px; background:pink; color:#bf2c9f;',
          //     valueWidget._ReiToolsPatched
          //   );
          //   console.log(
          //     '%c [ valueWidget ]-220',
          //     'font-size:13px; background:pink; color:#bf2c9f;',
          //     valueWidget
          //   );

          // 如果找到了 "value" 小部件，并且我们还没有包装过它的回调
          if (!valueWidget._ReiToolsPatched) {
            console.log(
              `[MyPlugin] Found 'value' widget on node '${this.title}'. Patching its callback.`
            );

            const originalWidgetCallback = valueWidget.callback;

            valueWidget.callback = (value, widget, node) => {
              //   console.log(
              //     '%c [ node ]-239',
              //     'font-size:13px; background:pink; color:#bf2c9f;',
              //     node
              //   );
              //   console.log(
              //     '%c [ value ]-239',
              //     'font-size:13px; background:pink; color:#bf2c9f;',
              //     value
              //   );
              // c. 首先，执行我们自己的自定义回调逻辑
              console.log(
                `%c[MyPlugin Callback]`,
                'background: #aa00ff; color: #fff; padding: 2px 5px; border-radius: 3px;',
                `Primitive value changed on node '${node.title}' to:`,
                value,
                typeof value
              );
              let r;
              if (originalWidgetCallback) {
                r = originalWidgetCallback.apply(widget, [value, widget, node]);
              }

              if (
                typeof window?.ReiToolsUI?.ReiToolsAPI?.refreshParamsList ===
                  'function' &&
                !window.ReiToolsUI.ReiToolsAPI
                  .stopWidgetCallbackCallParamRefresh
              ) {
                window.ReiToolsUI.ReiToolsAPI.stopWidgetCallbackCallParamRefresh = true;
                try {
                  window.ReiToolsUI.ReiToolsAPI.refreshParamsList(
                    'value widget change'
                  );
                } catch (e) {
                  console.error(e);
                } finally {
                  setTimeout(() => {
                    window.ReiToolsUI.ReiToolsAPI.stopParamsListCallWidgetCallback = false;
                  }, 200);
                }
              }
              return r;
              //   setTimeout(() => {
              //     if (
              //       typeof window?.ReiToolsUI?.ReiToolsAPI?.refreshParamsList ===
              //       'function'
              //     ) {
              //       window?.ReiToolsUI?.ReiToolsAPI.refreshParamsList();
              //     }
              //   }, 100);
            };

            // e. 设置一个标记，防止重复包装
            valueWidget._ReiToolsPatched = true;
          }
        }
      }, 300);

      console.log(
        `%c[PrimitiveNode Watcher]`,
        'color: #66d9ef',
        `Node '${this.title || 'Untitled'}' (ID: ${
          this.id
        }) connection changed!`
      );
      setTimeout(() => {
        if (
          typeof window?.ReiToolsUI?.ReiToolsAPI?.refreshParamsList ===
          'function'
        ) {
          window?.ReiToolsUI?.ReiToolsAPI.refreshParamsList(
            'primitive node link change'
          );
        }
      }, 300);
    };
  },
});
