import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { FloatingPanel } from './FloatingPanel';
import FileSelector from '../utils/fileSelector';
import './ReiToolsPanel.css';

export interface ReiToolsPanelProps {
  visible?: boolean;
  onClose?: () => void;
}

export const ReiToolsPanel: React.FC<ReiToolsPanelProps> = ({
  visible = true,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState('paramFocus');
  // const [nodes, setNodes] = useState([]);
  const [paramsList, setParamsList] = useState<any>([]);
  const [formValues, setFormValues] = useState<any>({});
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [isWideLayout, setIsWideLayout] = useState(false);

  // 预设管理相关状态
  const [selectedPreset, setSelectedPreset] = useState<any>(null);
  const [presetName, setPresetName] = useState<string>('');
  const [presetTitle, setPresetTitle] = useState<string>('');
  const [presetDescription, setPresetDescription] = useState<string>('');
  const [presetMessage, setPresetMessage] = useState<string>('');

  // 预设配置内容
  const [modelPaths, setModelPaths] = useState<string[]>([]);
  const [loraPaths, setLoraPaths] = useState<string[]>([]);
  const [modelLoaderNodes, setModelLoaderNodes] = useState<string[]>([
    'CheckpointLoaderSimple',
    'UNETLoader',
  ]);
  const [loraLoaderNodes, setLoraLoaderNodes] = useState<string[]>([
    'LoraLoader',
  ]);
  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
  };

  const savePreset = async () => {
    if (!presetName.trim()) {
      setPresetMessage('请输入预设名称');
      return;
    }

    setPresetMessage('正在保存...');

    try {
      // 构建预设内容
      const presetContent = {
        modelPaths: modelPaths,
        loraPaths: loraPaths,
        modelLoaderNodes: modelLoaderNodes,
        loraLoaderNodes: loraLoaderNodes,
      };

      const response = await fetch('/api/rei/presets/save', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: presetName.trim(),
          title: presetTitle.trim() || presetName.trim(),
          description: presetDescription.trim(),
          content: presetContent,
          version: '1.0',
          author: 'ReiTools User',
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      const result = await response.json();
      setPresetMessage(`预设 "${presetName}" 保存成功`);
    } catch (error) {
      setPresetMessage(
        `保存失败: ${error instanceof Error ? error.message : '未知错误'}`
      );
    }
  };

  const loadPreset = async (presetName: string) => {
    setPresetMessage('正在加载...');

    try {
      const response = await fetch(
        `/api/rei/presets/get/${encodeURIComponent(presetName)}`
      );
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const preset = await response.json();
      setSelectedPreset(preset);
      setPresetName(preset.name);
      setPresetTitle(preset.title || '');
      setPresetDescription(preset.description || '');
      setModelPaths(preset.content?.modelPaths || []);
      setLoraPaths(preset.content?.loraPaths || []);
      setModelLoaderNodes(
        preset.content?.modelLoaderNodes || [
          'CheckpointLoaderSimple',
          'UNETLoader',
        ]
      );
      setLoraLoaderNodes(preset.content?.loraLoaderNodes || ['LoraLoader']);
      setPresetMessage(`预设 "${preset.title || preset.name}" 加载成功`);
      refreshParamsList('preset update');
    } catch (error) {
      setPresetMessage(
        `加载预设失败: ${error instanceof Error ? error.message : '未知错误'}`
      );
    }
  };

  const showPresetSelector = async () => {
    setPresetMessage('正在获取预设列表...');

    try {
      const response = await fetch('/api/rei/presets/list');
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      const presetList = data.presets || [];

      if (presetList.length === 0) {
        setPresetMessage('暂无可用预设');
        return;
      }

      // 创建预设选择弹框
      const overlay = document.createElement('div');
      overlay.className = 'preset-selector-overlay';
      overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background-color: rgba(0, 0, 0, 0.7);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10000;
      `;

      const modal = document.createElement('div');
      modal.className = 'preset-selector-modal';
      modal.style.cssText = `
        background: #2b2b2b;
        border-radius: 8px;
        width: 80%;
        max-width: 600px;
        max-height: 80%;
        display: flex;
        flex-direction: column;
        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
        color: #ffffff;
      `;

      const header = document.createElement('div');
      header.style.cssText = `
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 16px 20px;
        border-bottom: 1px solid #404040;
        background: #333333;
        border-radius: 8px 8px 0 0;
      `;

      const title = document.createElement('h3');
      title.textContent = '选择预设';
      title.style.cssText = `
        margin: 0;
        font-size: 18px;
        font-weight: 600;
        color: #4CAF50;
      `;

      const closeButton = document.createElement('button');
      closeButton.textContent = '×';
      closeButton.style.cssText = `
        background: none;
        border: none;
        font-size: 24px;
        color: #ffffff;
        cursor: pointer;
        padding: 0;
        width: 30px;
        height: 30px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 4px;
        transition: background-color 0.2s;
      `;

      closeButton.addEventListener('click', () => {
        document.body.removeChild(overlay);
        setPresetMessage('');
      });

      closeButton.addEventListener('mouseover', () => {
        closeButton.style.backgroundColor = '#555555';
      });

      closeButton.addEventListener('mouseout', () => {
        closeButton.style.backgroundColor = 'transparent';
      });

      header.appendChild(title);
      header.appendChild(closeButton);

      const content = document.createElement('div');
      content.style.cssText = `
        flex: 1;
        overflow-y: auto;
        padding: 8px;
      `;

      presetList.forEach((preset: any) => {
        const item = document.createElement('div');
        item.style.cssText = `
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 16px;
          margin: 4px 0;
          background: #333333;
          border-radius: 6px;
          cursor: pointer;
          transition: all 0.2s;
          border: 2px solid transparent;
        `;

        item.addEventListener('mouseenter', () => {
          item.style.backgroundColor = '#3a3a3a';
          item.style.borderColor = '#4CAF50';
        });

        item.addEventListener('mouseleave', () => {
          item.style.backgroundColor = '#333333';
          item.style.borderColor = 'transparent';
        });

        const info = document.createElement('div');
        info.style.cssText = `flex: 1; min-width: 0;`;

        const name = document.createElement('div');
        name.style.cssText = `
          font-size: 16px;
          font-weight: 600;
          color: #ffffff;
          margin-bottom: 4px;
        `;
        name.textContent = preset.title || preset.name;

        const meta = document.createElement('div');
        meta.style.cssText = `
          font-size: 13px;
          color: #999999;
          line-height: 1.4;
        `;

        let metaText = `名称: ${preset.name}`;
        if (preset.description) {
          metaText += `\n描述: ${preset.description}`;
        }
        metaText += `\n更新: ${new Date(preset.updated_at).toLocaleString(
          'zh-CN'
        )}`;
        metaText += ` • 大小: ${Math.round(preset.size / 1024)}KB`;

        meta.style.whiteSpace = 'pre-line';
        meta.textContent = metaText;

        info.appendChild(name);
        info.appendChild(meta);

        const actions = document.createElement('div');
        actions.style.cssText = `
          display: flex;
          gap: 8px;
          margin-left: 16px;
        `;

        const loadBtn = document.createElement('button');
        loadBtn.textContent = '📤 加载';
        loadBtn.style.cssText = `
          background: #4CAF50;
          color: white;
          border: none;
          padding: 8px 16px;
          border-radius: 4px;
          cursor: pointer;
          font-size: 14px;
          font-weight: 500;
          transition: background-color 0.2s;
        `;

        loadBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          document.body.removeChild(overlay);
          loadPreset(preset.name);
        });

        loadBtn.addEventListener('mouseover', () => {
          loadBtn.style.backgroundColor = '#45a049';
        });

        loadBtn.addEventListener('mouseout', () => {
          loadBtn.style.backgroundColor = '#4CAF50';
        });

        const deleteBtn = document.createElement('button');
        deleteBtn.textContent = '🗑️';
        deleteBtn.style.cssText = `
          background: #f44336;
          color: white;
          border: none;
          padding: 8px 12px;
          border-radius: 4px;
          cursor: pointer;
          font-size: 14px;
          transition: background-color 0.2s;
        `;

        deleteBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          if (confirm(`确定要删除预设 "${preset.title || preset.name}" 吗？`)) {
            document.body.removeChild(overlay);
            deletePreset(preset.name);
          }
        });

        deleteBtn.addEventListener('mouseover', () => {
          deleteBtn.style.backgroundColor = '#d32f2f';
        });

        deleteBtn.addEventListener('mouseout', () => {
          deleteBtn.style.backgroundColor = '#f44336';
        });

        actions.appendChild(loadBtn);
        actions.appendChild(deleteBtn);

        item.appendChild(info);
        item.appendChild(actions);

        // 点击整个项目也可以加载预设
        item.addEventListener('click', () => {
          document.body.removeChild(overlay);
          loadPreset(preset.name);
        });

        content.appendChild(item);
      });

      modal.appendChild(header);
      modal.appendChild(content);
      overlay.appendChild(modal);

      // 阻止点击弹框时关闭
      modal.addEventListener('click', (e) => {
        e.stopPropagation();
      });

      // 点击遮罩层关闭
      overlay.addEventListener('click', () => {
        document.body.removeChild(overlay);
        setPresetMessage('');
      });

      document.body.appendChild(overlay);
      setPresetMessage('');
    } catch (error) {
      setPresetMessage(
        `获取预设列表失败: ${
          error instanceof Error ? error.message : '未知错误'
        }`
      );
    }
  };

  const deletePreset = async (presetName: string) => {
    if (!confirm(`确定要删除预设 "${presetName}" 吗？此操作无法撤销。`)) {
      return;
    }

    setPresetMessage('正在删除...');

    try {
      const response = await fetch(
        `/api/rei/presets/delete/${encodeURIComponent(presetName)}`,
        {
          method: 'DELETE',
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      setPresetMessage(`预设 "${presetName}" 删除成功`);

      // 如果删除的是当前选中的预设，清空表单
      if (selectedPreset && selectedPreset.name === presetName) {
        setSelectedPreset(null);
        setPresetName('');
        setPresetTitle('');
        setPresetDescription('');
        setModelPaths([]);
        setLoraPaths([]);
        setModelLoaderNodes(['CheckpointLoaderSimple', 'UNETLoader']);
        setLoraLoaderNodes(['LoraLoader']);
      }
    } catch (error) {
      setPresetMessage(
        `删除失败: ${error instanceof Error ? error.message : '未知错误'}`
      );
    }
  };

  const createNewPreset = () => {
    setSelectedPreset(null);
    setPresetName('');
    setPresetTitle('');
    setPresetDescription('');
    setModelPaths([]);
    setLoraPaths([]);
    setModelLoaderNodes(['CheckpointLoaderSimple', 'UNETLoader']);
    setLoraLoaderNodes(['LoraLoader']);
    setPresetMessage('');
  };

  // 获取ComfyUI画布上的所有节点类型
  const getCanvasNodeTypes = (): string[] => {
    try {
      const app = window.comfyUIAPP;
      if (app && app.graph && app.graph._nodes) {
        const nodeTypes = new Set<string>();
        app.graph._nodes.forEach((node: any) => {
          if (node.type) {
            nodeTypes.add(node.type);
          }
        });
        return Array.from(nodeTypes).sort();
      }
      return [];
    } catch (error) {
      console.error('获取画布节点类型失败:', error);
      return [];
    }
  };

  // 显示节点类型选择器
  const showNodeTypeSelector = (
    currentTypes: string[],
    onSelect: (nodeType: string) => void,
    title: string
  ) => {
    const canvasNodeTypes = getCanvasNodeTypes();

    if (canvasNodeTypes.length === 0) {
      setPresetMessage('当前画布上没有节点，请先添加一些节点到画布上');
      return;
    }

    // 创建节点选择弹框
    const overlay = document.createElement('div');
    overlay.className = 'node-selector-overlay';
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background-color: rgba(0, 0, 0, 0.7);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 10000;
    `;

    const modal = document.createElement('div');
    modal.className = 'node-selector-modal';
    modal.style.cssText = `
      background: #2b2b2b;
      border-radius: 8px;
      width: 80%;
      max-width: 500px;
      max-height: 70%;
      display: flex;
      flex-direction: column;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
      color: #ffffff;
    `;

    const header = document.createElement('div');
    header.style.cssText = `
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 16px 20px;
      border-bottom: 1px solid #404040;
      background: #333333;
      border-radius: 8px 8px 0 0;
    `;

    const titleElement = document.createElement('h3');
    titleElement.textContent = title;
    titleElement.style.cssText = `
      margin: 0;
      font-size: 18px;
      font-weight: 600;
      color: #4CAF50;
    `;

    const closeButton = document.createElement('button');
    closeButton.textContent = '×';
    closeButton.style.cssText = `
      background: none;
      border: none;
      font-size: 24px;
      color: #ffffff;
      cursor: pointer;
      padding: 0;
      width: 30px;
      height: 30px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 4px;
      transition: background-color 0.2s;
    `;

    closeButton.addEventListener('click', () => {
      document.body.removeChild(overlay);
    });

    closeButton.addEventListener('mouseover', () => {
      closeButton.style.backgroundColor = '#555555';
    });

    closeButton.addEventListener('mouseout', () => {
      closeButton.style.backgroundColor = 'transparent';
    });

    header.appendChild(titleElement);
    header.appendChild(closeButton);

    const content = document.createElement('div');
    content.style.cssText = `
      flex: 1;
      overflow-y: auto;
      padding: 8px;
    `;

    const info = document.createElement('div');
    info.style.cssText = `
      padding: 12px 16px;
      background: rgba(76, 175, 80, 0.1);
      border: 1px solid #4CAF50;
      border-radius: 6px;
      margin: 8px;
      font-size: 13px;
      color: #4CAF50;
    `;
    info.textContent = `在画布上找到 ${canvasNodeTypes.length} 种节点类型，点击选择要添加的类型：`;

    content.appendChild(info);

    canvasNodeTypes.forEach((nodeType: string) => {
      const isAlreadySelected = currentTypes.includes(nodeType);

      const item = document.createElement('div');
      item.style.cssText = `
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 12px 16px;
        margin: 4px 8px;
        background: ${isAlreadySelected ? 'rgba(76, 175, 80, 0.2)' : '#333333'};
        border-radius: 6px;
        cursor: ${isAlreadySelected ? 'default' : 'pointer'};
        transition: all 0.2s;
        border: 2px solid ${isAlreadySelected ? '#4CAF50' : 'transparent'};
      `;

      if (!isAlreadySelected) {
        item.addEventListener('mouseenter', () => {
          item.style.backgroundColor = '#3a3a3a';
          item.style.borderColor = '#4CAF50';
        });

        item.addEventListener('mouseleave', () => {
          item.style.backgroundColor = '#333333';
          item.style.borderColor = 'transparent';
        });
      }

      const nodeInfo = document.createElement('div');
      nodeInfo.style.cssText = `flex: 1; min-width: 0;`;

      const nodeName = document.createElement('div');
      nodeName.style.cssText = `
        font-size: 14px;
        font-weight: 600;
        color: #ffffff;
        margin-bottom: 2px;
      `;
      nodeName.textContent = nodeType;

      const nodeStatus = document.createElement('div');
      nodeStatus.style.cssText = `
        font-size: 12px;
        color: ${isAlreadySelected ? '#4CAF50' : '#999999'};
      `;
      nodeStatus.textContent = isAlreadySelected ? '已添加' : '点击添加';

      nodeInfo.appendChild(nodeName);
      nodeInfo.appendChild(nodeStatus);

      const addButton = document.createElement('button');
      addButton.textContent = isAlreadySelected ? '✓' : '+';
      addButton.style.cssText = `
        background: ${isAlreadySelected ? '#4CAF50' : '#666666'};
        color: white;
        border: none;
        padding: 8px 12px;
        border-radius: 4px;
        cursor: ${isAlreadySelected ? 'default' : 'pointer'};
        font-size: 14px;
        font-weight: bold;
        transition: background-color 0.2s;
        min-width: 40px;
      `;

      if (!isAlreadySelected) {
        addButton.addEventListener('click', (e) => {
          e.stopPropagation();
          document.body.removeChild(overlay);
          onSelect(nodeType);
        });

        addButton.addEventListener('mouseover', () => {
          addButton.style.backgroundColor = '#4CAF50';
        });

        addButton.addEventListener('mouseout', () => {
          addButton.style.backgroundColor = '#666666';
        });

        // 点击整个项目也可以添加
        item.addEventListener('click', () => {
          document.body.removeChild(overlay);
          onSelect(nodeType);
        });
      } else {
        addButton.disabled = true;
      }

      item.appendChild(nodeInfo);
      item.appendChild(addButton);
      content.appendChild(item);
    });

    modal.appendChild(header);
    modal.appendChild(content);
    overlay.appendChild(modal);

    // 阻止点击弹框时关闭
    modal.addEventListener('click', (e) => {
      e.stopPropagation();
    });

    // 点击遮罩层关闭
    overlay.addEventListener('click', () => {
      document.body.removeChild(overlay);
    });

    document.body.appendChild(overlay);
  };

  const refreshParamsList = useCallback(
    (by: string) => {
      console.log(
        '%c [ by ]-707',
        'font-size:13px; background:pink; color:#bf2c9f;',
        by,
        modelPaths
      );
      const nodes = window.comfyUIAPP?.graph._nodes;
      const primaryNodes = nodes.filter((n: any) => n.type === 'PrimitiveNode');
      // console.log(
      //   '%c [ primaryNode ]-28',
      //   'font-size:13px; background:pink; color:#bf2c9f;',
      //   primaryNodes
      // );
      const newList: any = [];
      const newFormValues: any = {};
      primaryNodes.forEach((primaryNode: any) => {
        if (
          primaryNode.outputs?.length > 0 &&
          primaryNode.outputs[0].links?.length > 0
        ) {
          const output = primaryNode.outputs[0];
          const links = output.links;
          links.forEach((linkId: any) => {
            const link = window.comfyUIAPP?.graph?.links[linkId];

            if (link) {
              const type = link.type;
              const downstreamNode = window.comfyUIAPP?.graph?.getNodeById(
                link.target_id
              );
              const targetSlot = downstreamNode.inputs[link.target_slot];
              const valueWidget = primaryNode.widgets.find(
                (w: any) => w.name === 'value'
              );
              let options = valueWidget?.options?.values || [];
              // console.log(
              //   '%c [ downstreamNode ]-52',
              //   'font-size:13px; background:pink; color:#bf2c9f;',
              //   downstreamNode
              // );
              // console.log(
              //   '%c [ modelLoaderNodes ]-747',
              //   'font-size:13px; background:pink; color:#bf2c9f;',
              //   modelLoaderNodes,
              //   modelPaths,
              //   loraLoaderNodes,
              //   loraPaths,
              //   downstreamNode.type,
              //   (Array.isArray(modelLoaderNodes) &&
              //     Array.isArray(modelPaths) &&
              //     modelPaths?.length > 0 &&
              //     modelLoaderNodes?.includes(downstreamNode.type)) ||
              //     (Array.isArray(loraLoaderNodes) &&
              //       Array.isArray(loraPaths) &&
              //       loraPaths?.length > 0 &&
              //       loraLoaderNodes?.includes(downstreamNode.type))
              // );

              if (
                (Array.isArray(modelLoaderNodes) &&
                  Array.isArray(modelPaths) &&
                  modelPaths?.length > 0 &&
                  modelLoaderNodes?.includes(downstreamNode.type)) ||
                (Array.isArray(loraLoaderNodes) &&
                  Array.isArray(loraPaths) &&
                  loraPaths?.length > 0 &&
                  loraLoaderNodes?.includes(downstreamNode.type))
              ) {
                options = options.filter((option: any) => {
                  if (!option.includes('\\') && !option.includes('/')) {
                    return true;
                  }

                  const validPath = modelPaths.find((modelPath: any) => {
                    const pathSplitter = modelPath.includes('\\') ? '\\' : '/';
                    const modelPathArray = modelPath.split(pathSplitter);

                    const newPath = modelPathArray.slice(1);
                    console.log(
                      '%c [ newPath.join("/") + "/" ]-763',
                      'font-size:13px; background:pink; color:#bf2c9f;',
                      newPath.join('/') + '/'
                    );
                    console.log(
                      '%c [  option.startsWith(newPath.join("\\") + "\\") ]-766',
                      'font-size:13px; background:pink; color:#bf2c9f;',
                      newPath.join('\\') + '\\'
                    );

                    return (
                      option.startsWith(newPath.join('/') + '/') ||
                      option.startsWith(newPath.join('\\') + '\\')
                    );
                  });
                  console.log(
                    '%c [ validPath ]-756',
                    'font-size:13px; background:pink; color:#bf2c9f;',
                    validPath
                  );

                  if (validPath) {
                    return true;
                  }
                  return false;
                });
                // console.log(
                //   '%c [ options ]-752',
                //   'font-size:13px; background:pink; color:#bf2c9f;',
                //   options
                // );
              }

              newList.push({
                target_id: link.target_id,
                target_slot: link.target_slot,
                id: link.origin_id,
                name: targetSlot?.localized_name || targetSlot?.name,
                type: type.toLowerCase() === 'string' ? valueWidget.type : type,
                title: downstreamNode.title,
                // downstreamNode,
                // primaryNode,
                comboOptions: options,
              });

              if (valueWidget) {
                newFormValues[
                  `${link.origin_id}_${link.target_id}_${link.target_slot}`
                ] = valueWidget.value;
              }
            }
          });
        }
      });

      setParamsList(newList);
      // console.log(
      //   '%c [ newList ]-86',
      //   'font-size:13px; background:pink; color:#bf2c9f;',
      //   newList
      // );
      setFormValues(newFormValues);
    },
    [modelPaths, loraPaths, modelLoaderNodes, loraLoaderNodes]
  );

  // 当预设相关状态变化时刷新参数列表
  useEffect(() => {
    refreshParamsList('preset update');
  }, [
    selectedPreset,
    modelPaths,
    loraPaths,
    modelLoaderNodes,
    loraLoaderNodes,
    refreshParamsList,
  ]);

  useEffect(() => {
    // return;
    Object.entries(formValues).forEach(([key, value]: any) => {
      const [id, targetId, targetSlot] = key.split('_');
      const primaryNode = window.comfyUIAPP?.graph?.getNodeById(id);

      if (primaryNode) {
        const valueWidget = primaryNode.widgets.find(
          (w: any) => w.name === 'value'
        );
        // console.log(
        //   '%c [ valueWidget ]-820',
        //   'font-size:13px; background:pink; color:#bf2c9f;',
        //   valueWidget
        // );
        // return;
        console.log(
          '%c [ window?.ReiToolsUI?.ReiToolsAPI?.widgetValueChange ]-849',
          'font-size:13px; background:pink; color:#bf2c9f;',
          window?.ReiToolsUI?.ReiToolsAPI?.widgetValueChange
        );

        if (
          valueWidget &&
          !window?.ReiToolsUI?.ReiToolsAPI?.widgetValueChange
        ) {
          valueWidget.value = value;
          if (valueWidget.callback) {
            valueWidget.callback(value, valueWidget, primaryNode);
          }
        }
      }
    });
    window.comfyUIAPP?.canvas.setDirty(true, true);
  }, [formValues]);

  // 拖拽处理函数
  const handleDragStart = (e: React.DragEvent, index: number) => {
    // 只有在拖拽手柄或者参数项标题区域时才允许拖拽
    const target = e.target as HTMLElement;
    if (
      target.closest('input') ||
      target.closest('textarea') ||
      target.closest('select')
    ) {
      e.preventDefault();
      return;
    }

    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', '');
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.stopPropagation();
    if (draggedIndex !== null && draggedIndex !== index) {
      e.dataTransfer.dropEffect = 'move';
      setDragOverIndex(index);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    // 只有当鼠标真的离开当前元素时才重置
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const x = e.clientX;
    const y = e.clientY;

    if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
      setDragOverIndex(null);
    }
  };

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    e.stopPropagation();

    if (draggedIndex === null || draggedIndex === dropIndex) {
      resetDragState();
      return;
    }

    const newParamsList = [...paramsList];
    const draggedItem = newParamsList[draggedIndex];

    // 计算正确的插入位置
    let targetIndex = dropIndex;

    // 如果拖拽的元素在目标位置之前，目标位置需要减1
    if (draggedIndex < dropIndex) {
      targetIndex = dropIndex - 1;
    }

    // 移除被拖拽的项目
    newParamsList.splice(draggedIndex, 1);

    // 在新位置插入
    newParamsList.splice(targetIndex, 0, draggedItem);

    console.log('Drag operation:', {
      from: draggedIndex,
      to: dropIndex,
      targetIndex,
      itemId: draggedItem.id,
    });

    setParamsList(newParamsList);
    resetDragState();
  };

  const resetDragState = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleDragEnd = (e: React.DragEvent) => {
    e.preventDefault();
    // 延迟重置状态，确保所有事件都已处理完成
    setTimeout(() => {
      resetDragState();
    }, 50);
  };
  // 监听面板尺寸变化
  const handleResize = (size: { width: number; height: number }) => {
    setIsWideLayout(size.width >= 500);
  };

  // 初始化时检查宽度
  useEffect(() => {
    setIsWideLayout(350 >= 500); // 初始宽度350px
  }, []);

  // 使用useEffect来动态更新全局API中的refreshParamsList函数
  useEffect(() => {
    if (window?.ReiToolsUI?.ReiToolsAPI) {
      window.ReiToolsUI.ReiToolsAPI.refreshParamsList = (by: string) => {
        refreshParamsList(by);
      };
    }
  }, [
    modelPaths,
    loraPaths,
    modelLoaderNodes,
    loraLoaderNodes,
    refreshParamsList,
  ]);

  return (
    <FloatingPanel
      title="ReiTools 工具面板"
      visible={visible}
      onClose={onClose}
      position={{ x: 50, y: 50 }}
      size={{ width: 350, height: 500 }}
      className="reitools-panel"
      onResize={handleResize}
    >
      <div className="reitools-tabs">
        <button
          className={`tab ${activeTab === 'paramFocus' ? 'active' : ''}`}
          onClick={() => handleTabChange('paramFocus')}
        >
          参数聚焦
        </button>
        <button
          className={`tab ${activeTab === 'presets' ? 'active' : ''}`}
          onClick={() => handleTabChange('presets')}
        >
          预设管理(测试)
        </button>
        {/* <button
          className={`tab ${activeTab === 'tools' ? 'active' : ''}`}
          onClick={() => handleTabChange('tools')}
        >
          工具
        </button> */}
        {/* <button
          className={`tab ${activeTab === 'config' ? 'active' : ''}`}
          onClick={() => handleTabChange('config')}
        >
          配置
        </button> */}
        <button
          className={`tab ${activeTab === 'info' ? 'active' : ''}`}
          onClick={() => handleTabChange('info')}
        >
          信息
        </button>
      </div>

      <div className="reitools-content">
        {activeTab === 'tools' && (
          <div className="tools-section">
            <h3>快捷工具</h3>
            <div className="tool-group">
              <button className="tool-button">📋 复制节点信息</button>
              <button className="tool-button">🔧 批量修改参数</button>
              <button className="tool-button">📂 导出配置</button>
              <button className="tool-button">📥 导入配置</button>
            </div>

            <h3>节点操作</h3>
            <div className="tool-group">
              <button className="tool-button">➕ 添加常用节点</button>
              <button className="tool-button">🔗 连接选中节点</button>
              <button className="tool-button">🗑️ 清理未连接节点</button>
            </div>
          </div>
        )}
        {activeTab === 'paramFocus' && (
          <div className="param-focus-section">
            <div className="info-section">介绍</div>
            <div className="button-group">
              <button
                className="refresh-button"
                onClick={() => refreshParamsList('refresh button')}
              >
                <span className="refresh-icon">🔄</span>
                刷新参数列表
              </button>
              <button
                className="run-button"
                onClick={() => {
                  window.comfyUIAPP?.queuePrompt(0);
                }}
              >
                <span className="run-icon">▶️</span>
                运行
              </button>
            </div>
            <div className={`params-list ${isWideLayout ? 'wide-layout' : ''}`}>
              {paramsList.map((param: any, index: number) => (
                <div
                  className={`param-item ${
                    draggedIndex === index ? 'dragging' : ''
                  } ${dragOverIndex === index ? 'drag-over' : ''}`}
                  key={`${param.id}_${param.target_id}_${param.target_slot}`}
                  draggable
                  onDragStart={(e) => handleDragStart(e, index)}
                  onDragOver={(e) => handleDragOver(e, index)}
                  onDragLeave={(e) => handleDragLeave(e)}
                  onDrop={(e) => handleDrop(e, index)}
                  onDragEnd={handleDragEnd}
                >
                  <div className="rei-drag-handle">⋮⋮</div>
                  {param.title} ({param.name})
                  {param.type.toLowerCase() === 'text' && (
                    <input
                      type="text"
                      className="param-text-input"
                      value={
                        formValues[
                          `${param.id}_${param.target_id}_${param.target_slot}`
                        ] || ''
                      }
                      onChange={(e) => {
                        setFormValues({
                          ...formValues,
                          [`${param.id}_${param.target_id}_${param.target_slot}`]:
                            e.target.value,
                        });
                      }}
                    />
                  )}
                  {(param.type.toLowerCase() === 'string' ||
                    param.type.toLowerCase() === 'customtext') && (
                    <textarea
                      className="param-input"
                      rows={isWideLayout ? 2 : 3}
                      value={
                        formValues[
                          `${param.id}_${param.target_id}_${param.target_slot}`
                        ] || ''
                      }
                      onChange={(e) => {
                        setFormValues({
                          ...formValues,
                          [`${param.id}_${param.target_id}_${param.target_slot}`]:
                            e.target.value,
                        });
                      }}
                    />
                  )}
                  {(param.type.toLowerCase() === 'int' ||
                    param.type.toLowerCase() === 'float') && (
                    <input
                      type="number"
                      step={param.type.toLowerCase() === 'float' ? '0.01' : '1'}
                      className="param-number-input"
                      value={
                        formValues[
                          `${param.id}_${param.target_id}_${param.target_slot}`
                        ] || ''
                      }
                      onChange={(e) => {
                        setFormValues({
                          ...formValues,
                          [`${param.id}_${param.target_id}_${param.target_slot}`]:
                            e.target.value,
                        });
                      }}
                    />
                  )}
                  {param.type.toLowerCase() === 'combo' && (
                    <select
                      className="param-select"
                      value={
                        formValues[
                          `${param.id}_${param.target_id}_${param.target_slot}`
                        ] || ''
                      }
                      onChange={(e) => {
                        setFormValues({
                          ...formValues,
                          [`${param.id}_${param.target_id}_${param.target_slot}`]:
                            e.target.value,
                        });
                      }}
                    >
                      {param.comboOptions.map((option: any) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'config' && (
          <div className="config-section">
            <h3>界面设置</h3>
            <div className="config-group">
              <label className="config-item">
                <input type="checkbox" />
                <span>启用快捷键</span>
              </label>
              <label className="config-item">
                <input type="checkbox" />
                <span>显示节点预览</span>
              </label>
              <label className="config-item">
                <input type="checkbox" />
                <span>自动保存</span>
              </label>
            </div>

            <h3>面板设置</h3>
            <div className="config-group">
              <label className="config-item">
                <span>默认位置：</span>
                <select>
                  <option>左上角</option>
                  <option>右上角</option>
                  <option>左下角</option>
                  <option>右下角</option>
                </select>
              </label>
              <label className="config-item">
                <span>透明度：</span>
                <input
                  type="range"
                  min="0.5"
                  max="1"
                  step="0.1"
                  defaultValue="1"
                />
              </label>
            </div>
          </div>
        )}

        {activeTab === 'presets' && (
          <div className="presets-section">
            <h3>预设管理</h3>

            {presetMessage && (
              <div
                className={`preset-message ${
                  presetMessage.includes('失败') ||
                  presetMessage.includes('错误')
                    ? 'error'
                    : 'success'
                }`}
              >
                {presetMessage}
              </div>
            )}

            <div className="preset-controls">
              <div className="preset-buttons">
                <button
                  className="preset-btn primary"
                  onClick={createNewPreset}
                >
                  📄 新建预设
                </button>
                {/* <button
                  className="preset-btn secondary"
                  onClick={getCurrentWorkflowAsPreset}
                >
                  🔄 导入当前工作流
                </button> */}
                <button
                  className="preset-btn secondary"
                  onClick={showPresetSelector}
                >
                  📤 加载预设
                </button>
                <button
                  className="preset-btn secondary"
                  onClick={() => {
                    setPresetName('');
                    setPresetTitle('');
                    setPresetDescription('');
                    setModelPaths([]);
                    setLoraPaths([]);
                    setModelLoaderNodes([
                      'CheckpointLoaderSimple',
                      'UNETLoader',
                    ]);
                    setLoraLoaderNodes(['LoraLoader']);
                    setPresetMessage('');
                  }}
                >
                  🔄 清空当前
                </button>
              </div>
            </div>

            <div className="preset-form">
              <div className="form-group">
                <label htmlFor="preset-name">预设名称:</label>
                <input
                  id="preset-name"
                  type="text"
                  value={presetName}
                  onChange={(e) => setPresetName(e.target.value)}
                  placeholder="输入预设名称（英文、数字、下划线）"
                  className="preset-input"
                />
              </div>

              <div className="form-group">
                <label htmlFor="preset-title">显示标题:</label>
                <input
                  id="preset-title"
                  type="text"
                  value={presetTitle}
                  onChange={(e) => setPresetTitle(e.target.value)}
                  placeholder="输入显示标题（可选）"
                  className="preset-input"
                />
              </div>

              <div className="form-group">
                <label htmlFor="preset-description">描述:</label>
                <textarea
                  id="preset-description"
                  value={presetDescription}
                  onChange={(e) => setPresetDescription(e.target.value)}
                  placeholder="输入预设描述（可选）"
                  className="preset-textarea"
                  rows={2}
                />
              </div>

              <div className="form-group">
                <label>模型加载限制路径:</label>
                <div className="path-list">
                  {modelPaths.map((path, index) => (
                    <div key={index} className="path-item">
                      <span className="path-text">{path}</span>
                      <button
                        type="button"
                        className="path-remove"
                        onClick={() =>
                          setModelPaths(
                            modelPaths.filter((_, i) => i !== index)
                          )
                        }
                        title="移除路径"
                      >
                        🗑️
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    className="path-add"
                    onClick={async () => {
                      try {
                        const result =
                          await FileSelector.selectModelDirectory();
                        if (!modelPaths.includes(result.path)) {
                          if (
                            !result.path.includes('\\') &&
                            !result.path.includes('/')
                          ) {
                            alert(
                              '请选择一个特定模型目录下的子文件下，目前模型目录下不在子文件夹下的文件会默认显示，无需添加'
                            );
                            return;
                          }
                          setModelPaths([...modelPaths, result.path]);
                        }
                      } catch (error) {
                        console.log('用户取消了路径选择');
                      }
                    }}
                  >
                    📁 添加模型路径
                  </button>
                </div>
              </div>

              <div className="form-group">
                <label>Lora加载限制路径:</label>
                <div className="path-list">
                  {loraPaths.map((path, index) => (
                    <div key={index} className="path-item">
                      <span className="path-text">{path}</span>
                      <button
                        type="button"
                        className="path-remove"
                        onClick={() =>
                          setLoraPaths(loraPaths.filter((_, i) => i !== index))
                        }
                        title="移除路径"
                      >
                        🗑️
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    className="path-add"
                    onClick={async () => {
                      try {
                        const result = await FileSelector.selectLoraDirectory();
                        if (!loraPaths.includes(result.path)) {
                          if (
                            !result.path.includes('\\') &&
                            !result.path.includes('/')
                          ) {
                            alert(
                              '请选择一个特定模型目录下的子文件下，目前模型目录下不在子文件夹下的文件会默认显示，无需添加'
                            );
                            return;
                          }
                          setLoraPaths([...loraPaths, result.path]);
                        }
                      } catch (error) {
                        console.log('用户取消了路径选择');
                      }
                    }}
                  >
                    📁 添加Lora路径
                  </button>
                </div>
              </div>

              <div className="form-group">
                <label>模型加载节点类型:</label>
                <div className="node-list">
                  {modelLoaderNodes.map((nodeType, index) => (
                    <div key={index} className="node-item">
                      <span className="node-text">{nodeType}</span>
                      <button
                        type="button"
                        className="node-remove"
                        onClick={() =>
                          setModelLoaderNodes(
                            modelLoaderNodes.filter((_, i) => i !== index)
                          )
                        }
                        title="移除节点类型"
                      >
                        🗑️
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    className="node-add"
                    onClick={() =>
                      showNodeTypeSelector(
                        modelLoaderNodes,
                        (nodeType) => {
                          if (!modelLoaderNodes.includes(nodeType)) {
                            setModelLoaderNodes([
                              ...modelLoaderNodes,
                              nodeType,
                            ]);
                            setPresetMessage(`已添加模型加载节点: ${nodeType}`);
                          }
                        },
                        '选择模型加载节点类型'
                      )
                    }
                  >
                    🎯 添加模型加载节点
                  </button>
                </div>
              </div>

              <div className="form-group">
                <label>Lora加载节点类型:</label>
                <div className="node-list">
                  {loraLoaderNodes.map((nodeType, index) => (
                    <div key={index} className="node-item">
                      <span className="node-text">{nodeType}</span>
                      <button
                        type="button"
                        className="node-remove"
                        onClick={() =>
                          setLoraLoaderNodes(
                            loraLoaderNodes.filter((_, i) => i !== index)
                          )
                        }
                        title="移除节点类型"
                      >
                        🗑️
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    className="node-add"
                    onClick={() =>
                      showNodeTypeSelector(
                        loraLoaderNodes,
                        (nodeType) => {
                          if (!loraLoaderNodes.includes(nodeType)) {
                            setLoraLoaderNodes([...loraLoaderNodes, nodeType]);
                            setPresetMessage(`已添加Lora加载节点: ${nodeType}`);
                          }
                        },
                        '选择Lora加载节点类型'
                      )
                    }
                  >
                    🎨 添加Lora加载节点
                  </button>
                </div>
              </div>

              <div className="form-actions">
                <button className="preset-btn primary" onClick={savePreset}>
                  💾 保存预设
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'info' && (
          <div className="info-section">
            <h3>关于 ReiTools</h3>
            <p>版本：1.5.1</p>
            <p>作者：natsurei</p>
            <p>
              这是一个用于 ComfyUI
              的增强工具集，提供了各种便捷的功能和界面改进。
            </p>

            <div className="links">
              <a
                href="https://github.com/x956606865/ComfyUI-ReiTools"
                target="_blank"
                rel="noopener noreferrer"
              >
                GitHub 仓库
              </a>
            </div>
          </div>
        )}
      </div>
    </FloatingPanel>
  );
};
