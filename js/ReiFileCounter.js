import { app } from '/scripts/app.js';

// 更新文件后缀下拉框的函数
function updateExtensionDropdown(node) {
  if (!node) return;

  const directoryPathWidget = node.widgets?.find(
    (w) => w.name === 'directory_path'
  );
  const fileExtensionWidget = node.widgets?.find(
    (w) => w.name === 'file_extension'
  );

  if (!directoryPathWidget || !fileExtensionWidget) {
    console.error('[ReiFileCounter] 未找到必要的输入框');
    return;
  }

  if (!directoryPathWidget.value || !directoryPathWidget.value.trim()) {
    console.log('[ReiFileCounter] 目录路径为空，跳过更新');
    return;
  }

  console.log('[ReiFileCounter] 开始获取文件后缀列表...');

  // 调用API获取文件后缀列表
  fetch(
    `/api/rei/filesystem/get-extensions?path=${encodeURIComponent(
      directoryPathWidget.value
    )}`
  )
    .then((response) => {
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      return response.json();
    })
    .then((data) => {
      if (data.error) {
        throw new Error(data.error);
      }

      const extensions = data.extensions || [];
      const currentSelectedValue = fileExtensionWidget.value;
      fileExtensionWidget.options.values = Array.from(new Set(extensions));
      if (!fileExtensionWidget.options.values.includes(currentSelectedValue)) {
        fileExtensionWidget.value = fileExtensionWidget.options.values[0];
      }
      // 添加文件后缀选项
      //   extensions.forEach((ext) => {
      //     fileExtensionWidget.options[ext] = `.${ext}`;
      //   });

      console.log(`[ReiFileCounter] 成功加载 ${extensions.length} 个文件后缀`);
    })
    .catch((error) => {
      console.error('[ReiFileCounter] 获取文件后缀列表失败:', error);
    });
}

// 创建文件计数器节点的动态下拉框
function createFileCounterNode(node) {
  console.log('[ReiFileCounter] 节点已创建');

  // 等待一个周期确保widgets已经初始化
  setTimeout(() => {
    // 查找输入框
    const directoryPathWidget = node.widgets?.find(
      (w) => w.name === 'directory_path'
    );
    const fileExtensionWidget = node.widgets?.find(
      (w) => w.name === 'file_extension'
    );
    const initialDirectoryWidget = node.widgets?.find(
      (w) => w.name === 'initial_directory'
    );

    if (!directoryPathWidget || !fileExtensionWidget) {
      console.error('[ReiFileCounter] 未找到必要的输入框');
      return;
    }

    // 设置目录路径输入框为只读
    if (directoryPathWidget.element) {
      directoryPathWidget.element.readOnly = true;
      directoryPathWidget.element.style.backgroundColor = '#f5f5f5';
      directoryPathWidget.element.style.cursor = 'default';
    }

    // 创建选择目录按钮
    const selectButton = document.createElement('button');
    selectButton.textContent = '📁 选择目录';
    selectButton.style.cssText = `
      background: #4CAF50;
      color: white;
      border: none;
      padding: 8px 16px;
      border-radius: 4px;
      cursor: pointer;
      font-size: 14px;
      font-weight: 500;
      margin: 4px 0;
      width: 100%;
      transition: background-color 0.2s;
    `;

    selectButton.addEventListener('mouseover', () => {
      if (!selectButton.disabled) {
        selectButton.style.backgroundColor = '#45a049';
      }
    });

    selectButton.addEventListener('mouseout', () => {
      if (!selectButton.disabled) {
        selectButton.style.backgroundColor = '#4CAF50';
      }
    });

    // 创建刷新按钮
    const refreshButton = document.createElement('button');
    refreshButton.textContent = '🔄 刷新后缀列表';
    refreshButton.style.cssText = `
      background: #2196F3;
      color: white;
      border: none;
      padding: 8px 16px;
      border-radius: 4px;
      cursor: pointer;
      font-size: 14px;
      font-weight: 500;
      margin: 4px 0;
      width: 100%;
      transition: background-color 0.2s;
    `;

    refreshButton.addEventListener('mouseover', () => {
      if (!refreshButton.disabled) {
        refreshButton.style.backgroundColor = '#1976D2';
      }
    });

    refreshButton.addEventListener('mouseout', () => {
      if (!refreshButton.disabled) {
        refreshButton.style.backgroundColor = '#2196F3';
      }
    });

    // 将按钮添加到节点
    if (node.widgets) {
      // 创建选择目录按钮widget
      const selectButtonWidget = {
        name: 'select_directory_button',
        type: 'button',
        element: selectButton,
        options: {},
        value: null,
        callback: async () => {
          try {
            selectButton.textContent = '⏳ 加载中...';
            selectButton.disabled = true;
            selectButton.style.backgroundColor = '#999';
            selectButton.style.cursor = 'not-allowed';

            // 等待全局API加载
            let retryCount = 0;
            const maxRetries = 50;

            while (!window.ReiFileSelector && retryCount < maxRetries) {
              await new Promise((resolve) => setTimeout(resolve, 100));
              retryCount++;
            }

            if (!window.ReiFileSelector) {
              throw new Error(
                '文件选择器API未加载。请确保ReiTools UI已正确加载。'
              );
            }

            console.log('[ReiFileCounter] 使用全局文件选择器API');

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
                  if (upstreamNode && upstreamNode.widgets) {
                    // 假设上游节点有一个名为'value'的widget
                    let widgetName = 'value';
                    if (upstreamNode.type === 'ReiFolderSelector') {
                      widgetName = 'folder_path';
                    }
                    const valueWidget = upstreamNode.widgets.find(
                      (w) => w.name === widgetName
                    );
                    if (valueWidget) {
                      initialPath = valueWidget.value || '';
                      console.log(
                        '[ReiFileCounter] 从连线获取initial_directory:',
                        initialPath
                      );
                    }
                  }
                }
              } else {
                // 没有连线，从widget获取值
                initialPath = initialDirectoryWidget?.value || '';
                console.log(
                  '[ReiFileCounter] 从widget获取initial_directory:',
                  initialPath
                );
              }
            }

            const result = await window.ReiFileSelector.selectSystemDirectory(
              initialPath
            );

            if (result && result.path) {
              // 更新目录路径
              directoryPathWidget.value = result.path;

              // 触发值变化事件
              if (directoryPathWidget.callback) {
                directoryPathWidget.callback(result.path);
              }

              // 标记节点需要重新计算
              node.setDirtyCanvas(true, true);

              console.log('[ReiFileCounter] 目录选择成功:', result.path);

              // 自动更新文件后缀列表
              setTimeout(() => {
                updateExtensionDropdown(node);
              }, 500);
            }
          } catch (error) {
            console.error('[ReiFileCounter] 选择目录失败:', error);

            const errorMsg = error.message || '选择目录失败';
            selectButton.textContent = `❌ ${
              errorMsg.length > 20 ? '选择失败' : errorMsg
            }`;
            selectButton.style.backgroundColor = '#f44336';

            setTimeout(() => {
              selectButton.textContent = '📁 选择目录';
              selectButton.style.backgroundColor = '#4CAF50';
              selectButton.disabled = false;
              selectButton.style.cursor = 'pointer';
            }, 3000);

            return;
          }

          // 恢复按钮状态
          selectButton.textContent = '📁 选择目录';
          selectButton.style.backgroundColor = '#4CAF50';
          selectButton.disabled = false;
          selectButton.style.cursor = 'pointer';
        },
      };

      // 创建刷新按钮widget
      const refreshButtonWidget = {
        name: 'refresh_extensions_button',
        type: 'button',
        element: refreshButton,
        options: {},
        value: null,
        callback: async () => {
          try {
            refreshButton.textContent = '⏳ 加载中...';
            refreshButton.disabled = true;
            refreshButton.style.backgroundColor = '#999';
            refreshButton.style.cursor = 'not-allowed';

            await updateExtensionDropdown(node);
          } catch (error) {
            console.error('[ReiFileCounter] 刷新后缀列表失败:', error);
          } finally {
            refreshButton.textContent = '🔄 刷新后缀列表';
            refreshButton.disabled = false;
            refreshButton.style.backgroundColor = '#2196F3';
            refreshButton.style.cursor = 'pointer';
          }
        },
      };

      node.widgets.push(selectButtonWidget);
      node.widgets.push(refreshButtonWidget);

      // 重新计算节点大小
      node.computeSize();
      node.setDirtyCanvas(true, true);
    }
  }, 100);
}

// 注册ComfyUI扩展
app.registerExtension({
  name: 'Rei.FileCounter',

  nodeCreated(node) {
    if (node.comfyClass === 'ReiFileCounter') {
      createFileCounterNode(node);

      // 监听目录路径变化，自动更新文件后缀列表
      const directoryPathWidget = node.widgets?.find(
        (w) => w.name === 'directory_path'
      );
      if (directoryPathWidget) {
        const originalCallback = directoryPathWidget.callback;
        directoryPathWidget.callback = function (value) {
          if (originalCallback) originalCallback.call(this, value);

          // 当目录路径改变时，自动更新文件后缀列表
          if (value && value.trim()) {
            setTimeout(() => {
              updateExtensionDropdown(node);
            }, 100);
          }
        };
      }

      // 监听连接变化
      const onConnectionsChange = node.onConnectionsChange;
      node.onConnectionsChange = function () {
        if (onConnectionsChange) onConnectionsChange.apply(this, arguments);

        // 当连接变化时，如果有目录路径，则更新文件后缀列表
        const directoryPathWidget = this.widgets?.find(
          (w) => w.name === 'directory_path'
        );
        if (
          directoryPathWidget &&
          directoryPathWidget.value &&
          directoryPathWidget.value.trim()
        ) {
          setTimeout(() => {
            updateExtensionDropdown(this);
          }, 100);
        }
      };
    }
  },

  beforeRegisterNodeDef(nodeType, nodeData, app) {
    if (nodeData.name === 'ReiFileCounter') {
      // 自定义节点渲染
      const onDrawForeground = nodeType.prototype.onDrawForeground;
      nodeType.prototype.onDrawForeground = function (ctx) {
        if (onDrawForeground) {
          onDrawForeground.apply(this, arguments);
        }

        // 在节点上显示当前选择的目录和文件数量
        const directoryPathWidget = this.widgets?.find(
          (w) => w.name === 'directory_path'
        );
        const fileExtensionWidget = this.widgets?.find(
          (w) => w.name === 'file_extension'
        );

        if (
          directoryPathWidget &&
          directoryPathWidget.value &&
          directoryPathWidget.value.trim() !== ''
        ) {
          ctx.save();
          ctx.fillStyle = '#4CAF50';
          ctx.font = '12px Arial';
          ctx.textAlign = 'left';

          const path = directoryPathWidget.value;
          const maxLength = 25;
          const displayPath =
            path.length > maxLength ? '...' + path.slice(-maxLength) : path;

          ctx.fillText(`📁 ${displayPath}`, 10, this.size[1] - 25);

          // 显示文件后缀信息
          if (
            fileExtensionWidget &&
            fileExtensionWidget.value &&
            fileExtensionWidget.value.trim() !== ''
          ) {
            ctx.fillStyle = '#2196F3';
            ctx.fillText(
              `📄 .${fileExtensionWidget.value}`,
              10,
              this.size[1] - 10
            );
          }

          ctx.restore();
        }
      };
    }
  },
});

export default {
  name: 'Rei.FileCounter',
};
