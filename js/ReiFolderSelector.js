import { app } from '/scripts/app.js';

// 创建选择文件夹按钮
function createFolderSelectorButton(node, folderPathWidget) {
  const button = document.createElement('button');
  button.textContent = '📁 选择文件夹';
  button.style.cssText = `
        background: #4CAF50;
        color: white;
        border: none;
        padding: 8px 16px;
        border-radius: 4px;
        cursor: pointer;
        font-size: 14px;
        font-weight: 500;
        margin: 4px 0;
        transition: background-color 0.2s;
        width: 100%;
    `;

  button.addEventListener('mouseover', () => {
    if (!button.disabled) {
      button.style.backgroundColor = '#45a049';
    }
  });

  button.addEventListener('mouseout', () => {
    if (!button.disabled) {
      button.style.backgroundColor = '#4CAF50';
    }
  });

  //   button.addEventListener('click', async (e) => {
  //     e.preventDefault();
  //     e.stopPropagation();

  //     try {
  //       button.textContent = '⏳ 加载中...';
  //       button.disabled = true;
  //       button.style.backgroundColor = '#999';
  //       button.style.cursor = 'not-allowed';

  //       // 等待全局API加载
  //       let retryCount = 0;
  //       const maxRetries = 50; // 最多等待5秒

  //       while (!window.ReiFileSelector && retryCount < maxRetries) {
  //         await new Promise((resolve) => setTimeout(resolve, 100));
  //         retryCount++;
  //       }

  //       if (!window.ReiFileSelector) {
  //         throw new Error('文件选择器API未加载。请确保ReiTools UI已正确加载。');
  //       }

  //       console.log('[ReiFolderSelector] 使用全局文件选择器API');

  //       // 使用全局暴露的系统文件选择器（从系统根目录开始）
  //       const result = await window.ReiFileSelector.selectSystemDirectory();

  //       if (result && result.path) {
  //         // 更新文本框的值
  //         folderPathWidget.value = result.path;

  //         // 触发值变化事件，确保ComfyUI知道值已更改
  //         if (folderPathWidget.callback) {
  //           folderPathWidget.callback(result.path);
  //         }

  //         // 标记节点需要重新计算
  //         node.setDirtyCanvas(true, true);

  //         console.log('[ReiFolderSelector] 文件夹选择成功:', result.path);
  //       }
  //     } catch (error) {
  //       console.error('[ReiFolderSelector] 选择文件夹失败:', error);

  //       // 显示错误提示
  //       const errorMsg = error.message || '选择文件夹失败';
  //       button.textContent = `❌ ${errorMsg.length > 20 ? '选择失败' : errorMsg}`;
  //       button.style.backgroundColor = '#f44336';

  //       // 3秒后恢复按钮状态
  //       setTimeout(() => {
  //         button.textContent = '📁 选择文件夹';
  //         button.style.backgroundColor = '#4CAF50';
  //         button.disabled = false;
  //         button.style.cursor = 'pointer';
  //       }, 3000);

  //       return;
  //     }

  //     // 恢复按钮状态
  //     button.textContent = '📁 选择文件夹';
  //     button.style.backgroundColor = '#4CAF50';
  //     button.disabled = false;
  //     button.style.cursor = 'pointer';
  //   });

  return button;
}

// 注册ComfyUI扩展
app.registerExtension({
  name: 'Rei.FolderSelector',

  nodeCreated(node) {
    if (node.comfyClass === 'ReiFolderSelector') {
      console.log('[ReiFolderSelector] 节点已创建');

      // 等待一个周期确保widgets已经初始化
      setTimeout(() => {
        // 查找输入框
        const folderPathWidget = node.widgets?.find(
          (w) => w.name === 'folder_path'
        );
        const initialDirectoryWidget = node.widgets?.find(
          (w) => w.name === 'initial_directory'
        );

        if (!folderPathWidget) {
          console.error('[ReiFolderSelector] 未找到folder_path输入框');
          return;
        }

        // 设置输入框为只读
        if (folderPathWidget.element) {
          folderPathWidget.element.readOnly = true;
          folderPathWidget.element.style.backgroundColor = '#f5f5f5';
          folderPathWidget.element.style.cursor = 'default';
        }

        // 创建按钮
        const button = createFolderSelectorButton(node, folderPathWidget);

        // 将按钮添加到节点
        if (node.widgets) {
          // 创建一个虚拟的widget来容纳按钮
          const buttonWidget = {
            name: 'folder_selector_button',
            type: 'button',
            element: button,
            options: {},
            value: null,
            callback: async () => {
              if (!window.ReiFileSelector) {
                throw new Error(
                  '文件选择器API未加载。请确保ReiTools UI已正确加载。'
                );
              }

              console.log('[ReiFolderSelector] 使用全局文件选择器API');

              // 获取initial_directory的值，优先从连线获取，其次从widget获取
              let initialPath = '';

              // 检查是否有连线连接到initial_directory输入
              if (node.inputs) {
                const initialDirectoryInput = node.inputs.find(
                  (input) => input.name === 'initial_directory'
                );
                if (
                  initialDirectoryInput &&
                  initialDirectoryInput.link !== null
                ) {
                  // 有连线，从上游节点获取值
                  const link = app.graph.links[initialDirectoryInput.link];
                  if (link) {
                    const upstreamNode = app.graph.getNodeById(link.origin_id);

                    let widgetName = 'value';

                    if (upstreamNode && upstreamNode.widgets) {
                      if (upstreamNode.type === 'ReiFolderSelector') {
                        widgetName = 'folder_path';
                      }
                      // 假设上游节点有一个名为'value'的widget
                      const valueWidget = upstreamNode.widgets.find(
                        (w) => w.name === widgetName
                      );
                      if (valueWidget) {
                        initialPath = valueWidget.value || '';
                        console.log(
                          '[ReiFolderSelector] 从连线获取initial_directory:',
                          initialPath
                        );
                      }
                    }
                  }
                } else {
                  // 没有连线，从widget获取值
                  initialPath = initialDirectoryWidget?.value || '';
                  console.log(
                    '[ReiFolderSelector] 从widget获取initial_directory:',
                    initialPath
                  );
                }
              }

              const result = await window.ReiFileSelector.selectSystemDirectory(
                initialPath
              );

              if (result && result.path) {
                // 更新文本框的值
                folderPathWidget.value = result.path;

                // 标记节点需要重新计算
                node.setDirtyCanvas(true, true);

                console.log('[ReiFolderSelector] 文件夹选择成功:', result.path);
              }
            },
          };

          node.widgets.push(buttonWidget);

          // 重新计算节点大小
          node.computeSize();
          node.setDirtyCanvas(true, true);
        }
      }, 100);
    }
  },

  beforeRegisterNodeDef(nodeType, nodeData, app) {
    if (nodeData.name === 'ReiFolderSelector') {
      // 自定义节点渲染
      const onDrawForeground = nodeType.prototype.onDrawForeground;
      nodeType.prototype.onDrawForeground = function (ctx) {
        if (onDrawForeground) {
          onDrawForeground.apply(this, arguments);
        }

        // 在节点上显示当前选中的路径
        const folderPathWidget = this.widgets?.find(
          (w) => w.name === 'folder_path'
        );
        if (
          folderPathWidget &&
          folderPathWidget.value &&
          folderPathWidget.value.trim() !== ''
        ) {
          ctx.save();
          ctx.fillStyle = '#4CAF50';
          ctx.font = '12px Arial';
          ctx.textAlign = 'left';

          const path = folderPathWidget.value;
          const maxLength = 30;
          const displayPath =
            path.length > maxLength ? '...' + path.slice(-maxLength) : path;

          ctx.fillText(`📁 ${displayPath}`, 10, this.size[1] - 10);
          ctx.restore();
        }
      };
    }
  },
});

export default {
  name: 'Rei.FolderSelector',
};
