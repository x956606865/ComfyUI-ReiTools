import React, { useEffect, useMemo, useState } from 'react';
import { FloatingPanel } from './FloatingPanel';
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
  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
  };

  // if (typeof window.ReiToolsLoader.updateNode !== 'function') {
  //   window.ReiToolsLoader.updateNode = (nodes: any) => {
  //     setNodes(nodes);
  //   };
  // }
  const refreshParamsList = () => {
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
            // console.log(
            //   '%c [ downstreamNode ]-52',
            //   'font-size:13px; background:pink; color:#bf2c9f;',
            //   downstreamNode
            // );

            const targetSlot = downstreamNode.inputs[link.target_slot];
            const valueWidget = primaryNode.widgets.find(
              (w: any) => w.name === 'value'
            );
            newList.push({
              target_id: link.target_id,
              target_slot: link.target_slot,
              id: link.origin_id,
              name: targetSlot?.localized_name || targetSlot?.name,
              type: type.toLowerCase() === 'string' ? valueWidget.type : type,
              title: downstreamNode.title,
              downstreamNode,
              primaryNode,
              comboOptions: valueWidget?.options?.values || [],
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
  };
  useEffect(() => {
    Object.entries(formValues).forEach(([key, value]: any) => {
      const [id, targetId, targetSlot] = key.split('_');
      const primaryNode = window.comfyUIAPP?.graph?.getNodeById(id);

      if (primaryNode) {
        const valueWidget = primaryNode.widgets.find(
          (w: any) => w.name === 'value'
        );
        if (valueWidget) {
          valueWidget.value = value;
        }
        if (valueWidget.callback) {
          valueWidget.callback(value, valueWidget, primaryNode);
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
              <button className="refresh-button" onClick={refreshParamsList}>
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
        {/* 
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
        )} */}

        {activeTab === 'info' && (
          <div className="info-section">
            <h3>关于 ReiTools</h3>
            <p>版本：1.4.2</p>
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
