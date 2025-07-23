import { ComfyUIApp, ComfyUINode } from '@/types';

// 获取ComfyUI应用实例
export const getComfyUIApp = (): ComfyUIApp | null => {
  return window.app || null;
};

// 检查ComfyUI是否已加载
export const isComfyUILoaded = (): boolean => {
  return !!(window.app && window.app.graph);
};

// 获取当前选中的节点
export const getSelectedNodes = (): ComfyUINode[] => {
  const app = getComfyUIApp();
  if (!app || !app.canvas) return [];

  const selectedNodes = app.canvas.selected_nodes || {};
  return Object.values(selectedNodes) as ComfyUINode[];
};

// 获取所有节点
export const getAllNodes = (): ComfyUINode[] => {
  const app = getComfyUIApp();
  if (!app || !app.graph) return [];

  return app.graph._nodes || [];
};

// 添加节点到画布
export const addNodeToCanvas = (
  nodeType: string,
  position?: { x: number; y: number }
) => {
  const app = getComfyUIApp();
  if (!app || !app.graph || !app.createNode) return null;

  const pos = position || { x: 100, y: 100 };
  return app.graph.add(app.createNode(nodeType), pos.x, pos.y);
};

// 连接两个节点
export const connectNodes = (
  outputNode: ComfyUINode,
  outputSlot: number,
  inputNode: ComfyUINode,
  inputSlot: number
) => {
  const app = getComfyUIApp();
  if (!app || !app.graph) return false;

  try {
    return app.graph.connect(
      outputNode.id,
      outputSlot,
      inputNode.id,
      inputSlot
    );
  } catch (error) {
    console.error('Failed to connect nodes:', error);
    return false;
  }
};

// 删除选中的节点
export const deleteSelectedNodes = () => {
  const app = getComfyUIApp();
  if (!app || !app.canvas) return;

  const selectedNodes = getSelectedNodes();
  selectedNodes.forEach((node) => {
    app.graph.remove(node);
  });

  app.canvas.selectNodes([]);
};

// 复制节点信息到剪贴板
export const copyNodeInfo = (node: ComfyUINode) => {
  const nodeInfo = {
    type: node.type,
    position: node.pos,
    size: node.size,
    widgets: node.widgets?.map((w) => ({ name: w.name, value: w.value })) || [],
    inputs: node.inputs?.map((i) => ({ name: i.name, type: i.type })) || [],
    outputs: node.outputs?.map((o) => ({ name: o.name, type: o.type })) || [],
  };

  const text = JSON.stringify(nodeInfo, null, 2);
  navigator.clipboard.writeText(text).catch(console.error);
};

// 导出工作流配置
export const exportWorkflow = () => {
  const app = getComfyUIApp();
  if (!app || !app.graph) return null;

  try {
    return app.graph.serialize();
  } catch (error) {
    console.error('Failed to export workflow:', error);
    return null;
  }
};

// 导入工作流配置
export const importWorkflow = (workflowData: any) => {
  const app = getComfyUIApp();
  if (!app || !app.graph) return false;

  try {
    app.graph.clear();
    app.graph.configure(workflowData);
    return true;
  } catch (error) {
    console.error('Failed to import workflow:', error);
    return false;
  }
};

// 清理未连接的节点
export const cleanupUnconnectedNodes = () => {
  const nodes = getAllNodes();
  const nodesToRemove: ComfyUINode[] = [];

  nodes.forEach((node) => {
    const hasInputConnections =
      node.inputs?.some((input) => input.link) || false;
    const hasOutputConnections =
      node.outputs?.some((output) => output.links && output.links.length > 0) ||
      false;

    if (!hasInputConnections && !hasOutputConnections) {
      nodesToRemove.push(node);
    }
  });

  const app = getComfyUIApp();
  if (app && app.graph) {
    nodesToRemove.forEach((node) => {
      app.graph.remove(node);
    });
  }

  return nodesToRemove.length;
};
