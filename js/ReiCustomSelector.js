import { app } from '/scripts/app.js';

// 辅助函数：从上游节点获取其 "name" widget 的值
function getUpstreamWidgetValue(node, inputName) {
  if (!node || !node.inputs) return null;
  const input = node.inputs.find((inp) => inp && inp.name === inputName);
  if (!input || input.link == null) return null;

  const link = app.graph.links[input.link];
  if (!link) return null;

  const upstreamNode = app.graph.getNodeById(link.origin_id);
  if (!upstreamNode || !upstreamNode.widgets) return null;

  const nameWidget = upstreamNode.widgets.find((w) => w && w.name === 'name');
  return nameWidget ? nameWidget.value : null;
}

// 核心函数：更新下拉框的选项
function updateSelectorOptions(node) {
  if (!node) return;

  // 找到我们的下拉框控件 (它现在从一开始就是下拉框了)
  const dropdownWidget = node.widgets.find(
    (w) => w && w.name === 'selected_option'
  );
  if (!dropdownWidget) return;

  const MAX_OPTIONS = 20;
  let lastConnectedIndex = 0;
  const optionNames = [];

  // 收集所有已连接的上游节点的名称
  if (node.inputs) {
    for (const input of node.inputs) {
      if (!input) continue;
      if (input.name.startsWith('option_') && input.link != null) {
        const index = parseInt(input.name.split('_')[1]);
        if (index > lastConnectedIndex) lastConnectedIndex = index;
        const optionName = getUpstreamWidgetValue(node, input.name);
        if (optionName) {
          optionNames.push(optionName);
        }
      }
    }
  }

  // 动态添加或移除输入槽位
  const targetInputCount = Math.min(lastConnectedIndex + 1, MAX_OPTIONS);
  const currentInputs = (node.inputs || []).filter(
    (i) => i && i.name.startsWith('option_')
  );
  const currentInputCount = currentInputs.length;

  if (currentInputCount > targetInputCount) {
    for (let i = currentInputCount; i > targetInputCount; i--) {
      const slotIndex = node.findInputSlot(`option_${i}`);
      if (slotIndex !== -1) node.removeInput(slotIndex);
    }
  } else if (currentInputCount < targetInputCount) {
    for (let i = currentInputCount + 1; i <= targetInputCount; i++) {
      node.addInput(`option_${i}`, 'REI_SELECTOR_OPTION_OBJECT');
    }
  }

  // 更新下拉框的选项列表
  const currentSelectedValue = dropdownWidget.value;
  const validOptions =
    optionNames.length > 0 ? optionNames : ['-- No Options Connected --'];
  dropdownWidget.options.values = validOptions;

  // 如果当前选中的值已失效，则自动选择第一个
  if (!validOptions.includes(currentSelectedValue)) {
    dropdownWidget.value = validOptions[0];
  }

  node.computeSize();
  node.setDirtyCanvas(true, true);
}

app.registerExtension({
  name: 'Rei.CustomSelector.CorrectApproach',
  nodeCreated(node) {
    // 当我们的主选择器节点被创建或加载时
    if (node.comfyClass === 'ReiCustomSelector') {
      // 立即更新一次，以防是加载已有工作流
      setTimeout(() => updateSelectorOptions(node), 0);

      // 每次连接变化时都更新
      const onConnectionsChange = node.onConnectionsChange;
      node.onConnectionsChange = function () {
        if (onConnectionsChange) onConnectionsChange.apply(this, arguments);
        updateSelectorOptions(this);
      };
    }

    // 当上游的选项节点被创建或加载时
    if (node.comfyClass === 'ReiSelectorOptionObject') {
      const nameWidget = node.widgets.find((w) => w.name === 'name');
      if (nameWidget) {
        const originalCallback = nameWidget.callback;
        // 当用户在选项节点中输入名字时
        nameWidget.callback = function (value) {
          if (originalCallback) originalCallback.call(this, value);
          // 找到所有连接到它的下游选择器节点并更新它们
          if (node.outputs && node.outputs[0] && node.outputs[0].links) {
            for (const linkId of node.outputs[0].links) {
              const link = app.graph.links[linkId];
              if (link) {
                const downstreamNode = app.graph.getNodeById(link.target_id);
                if (
                  downstreamNode &&
                  downstreamNode.comfyClass === 'ReiCustomSelector'
                ) {
                  updateSelectorOptions(downstreamNode);
                }
              }
            }
          }
        };
      }
    }
  },
});
