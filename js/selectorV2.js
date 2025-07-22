import { app } from '/scripts/app.js';

const LGraphNode = LiteGraph.LGraphNode;
const refreshDropdown = () => {
  const selectors = app.graph.findNodesByType('ReiCustomSelectorV2');
  selectors.forEach((selector) => {
    selector.initGroupDropdown();
  });
};
app.registerExtension({
  name: 'ReiCustomSelectorV2',
  registerCustomNodes() {
    class ReiCustomSelectorV2 extends LGraphNode {
      canvas = app.canvas;
      constructor(title) {
        super(title);
        const node = this;
        this.title = 'Rei自定义选择器V2';
        this.addWidget(
          'COMBO',
          'Group',
          '-- No Options Selected --',
          (s, t, u, v, x) => {
            this.onSelectGroup();
            this.update();
          },
          {
            values: ['-- No Options Selected --'],
          }
        );
        this.addWidget(
          'COMBO',
          'Name',
          '-- No Options Selected --',
          (s, t, u, v, x) => {},
          {
            values: ['-- No Options Selected --'],
          }
        );
        // this.addInput('*', '*');
        this.addOutput('输出', 'string');

        this.onConnectionsChange = function (
          slotType, //1 = input, 2 = output
          slot,
          isChangeConnect,
          link_info,
          output
        ) {
          this.update();
        };

        this.clone = function () {
          // 在克隆前保存所有widget的值
          const widgetValues = this.widgets.map((widget) => ({
            name: widget.name,
            value: widget.value,
          }));

          const cloned = ReiCustomSelectorV2.prototype.clone.apply(this);

          // 克隆后恢复widget的值
          widgetValues.forEach((savedWidget, index) => {
            if (
              cloned.widgets[index] &&
              cloned.widgets[index].name === savedWidget.name
            ) {
              cloned.widgets[index].value = savedWidget.value;
            }
          });

          cloned.value = '';
          cloned.size = cloned.computeSize();

          // 延迟初始化下拉框以确保克隆的节点有正确的选项
          setTimeout(() => {
            cloned.initGroupDropdown();
          }, 0);

          return cloned;
        };

        this.onAdded = function (graph) {
          //   const groups = this.fetchGroups(graph);
          this.initGroupDropdown();
        };

        // 重写 serialize 和 configure 方法以确保 widget 值的持久化
        this.serialize = function () {
          const data = LGraphNode.prototype.serialize.call(this);
          // 显式保存 widget 值
          data.widgets_values = this.widgets.map((widget) => widget.value);
          return data;
        };

        this.configure = function (data) {
          LGraphNode.prototype.configure.call(this, data);
          // 恢复 widget 值
          if (
            data.widgets_values &&
            data.widgets_values.length === this.widgets.length
          ) {
            data.widgets_values.forEach((value, index) => {
              if (this.widgets[index]) {
                this.widgets[index].value = value;
              }
            });
          }
          // 配置完成后重新初始化下拉框以确保选项正确
          setTimeout(() => {
            this.initGroupDropdown();
          }, 0);
        };

        this.update = function () {
          if (!node.graph) {
            return;
          }
        };

        this.findOptions = function (graph, groupName) {
          const targetGroup = groupName;
          return graph._nodes.filter(
            (otherNode) =>
              otherNode.type === 'ReiCustomSelectorOptionV2' &&
              otherNode.widgets[1].value === targetGroup &&
              otherNode.widgets[0].value !== ''
          );
        };
        this.isVirtualNode = true;
        // 添加 getInputLink 方法以支持虚拟节点的数据输出
        this.getInputLink = function (slot) {
          // 获取当前选择的分组和名称
          const selectedGroup = this.widgets[0].value;
          const selectedName = this.widgets[1].value;

          if (
            !selectedGroup ||
            selectedGroup === '-- No Options Selected --' ||
            !selectedName ||
            selectedName === '-- No Options Selected --'
          ) {
            return null;
          }

          // 查找对应的选项节点
          const selectedOption = this.graph._nodes.find(
            (otherNode) =>
              otherNode.type === 'ReiCustomSelectorOptionV2' &&
              otherNode.widgets[1].value === selectedGroup &&
              otherNode.widgets[0].value === selectedName
          );

          if (
            selectedOption &&
            selectedOption.inputs &&
            selectedOption.inputs[0] &&
            selectedOption.inputs[0].link != null
          ) {
            // 返回选项节点的输入链接
            const link = this.graph.links[selectedOption.inputs[0].link];
            return link;
          }

          return null;
        };
      }

      fetchGroups() {
        const currentOptionNodes = app.graph._nodes.filter((otherNode) => {
          return (
            otherNode.type === 'ReiCustomSelectorOptionV2' &&
            otherNode.widgets[0].value !== ''
          );
        });

        const groups = Array.from(
          new Set(currentOptionNodes.map((option) => option.widgets[1].value))
        );
        return groups;
      }
      initGroupDropdown() {
        const groups = this.fetchGroups(app.graph);

        this.widgets[0].options.values = groups;
        if (
          groups.length > 0 &&
          (this.widgets[0].value === '-- No Options Selected --' ||
            !groups.includes(this.widgets[0].value))
        ) {
          this.widgets[0].value = groups[0];
        }
        this.computeSize();
        this.setDirtyCanvas(true, true);
        this.onSelectGroup();
      }
      onRemoved() {}
      onSelectGroup() {
        const group = this.widgets[0].value;

        const options = this.findOptions(app.graph, group);
        const names = options.map((option) => option.widgets[0].value);
        this.widgets[1].options.values = names;
        if (
          names.length > 0 &&
          (this.widgets[1].value === '-- No Options Selected --' ||
            !names.includes(this.widgets[1].value))
        ) {
          this.widgets[1].value = names[0];
        }
        this.computeSize();
        this.setDirtyCanvas(true, true);
      }
    }

    LiteGraph.registerNodeType(
      'ReiCustomSelectorV2',
      Object.assign(ReiCustomSelectorV2, {
        title: 'Rei自定义选择器V2',
      })
    );

    ReiCustomSelectorV2.category = 'ReiTool';
  },
  afterConfigureGraph() {
    refreshDropdown();
  },
});

app.registerExtension({
  name: 'ReiCustomSelectorOptionV2',
  registerCustomNodes() {
    class ReiCustomSelectorOptionV2 extends LGraphNode {
      canvas = app.canvas;

      constructor(title) {
        super(title);
        this.title = 'Rei自定义选项V2';
        const node = this;

        this.addWidget(
          'text',
          'Name',
          '',
          (s, t, u, v, x) => {
            refreshDropdown();
          },
          {}
        );
        this.addWidget(
          'text',
          'Group',
          '',
          (s, t, u, v, x) => {
            refreshDropdown();
          },
          {}
        );

        this.addInput('文本输入', '*');

        this.clone = function () {
          // 在克隆前保存所有widget的值
          const widgetValues = this.widgets.map((widget) => ({
            name: widget.name,
            value: widget.value,
          }));

          const cloned = ReiCustomSelectorOptionV2.prototype.clone.apply(this);

          // 克隆后恢复widget的值
          widgetValues.forEach((savedWidget, index) => {
            if (
              cloned.widgets[index] &&
              cloned.widgets[index].name === savedWidget.name
            ) {
              cloned.widgets[index].value = savedWidget.value;
            }
          });

          cloned.size = cloned.computeSize();
          return cloned;
        };

        this.onAdded = function (graph) {
          //   this.validateName(graph);
          refreshDropdown();
        };

        // 重写 serialize 和 configure 方法以确保 widget 值的持久化
        this.serialize = function () {
          const data = LGraphNode.prototype.serialize.call(this);
          // 显式保存 widget 值
          data.widgets_values = this.widgets.map((widget) => widget.value);
          return data;
        };

        this.configure = function (data) {
          LGraphNode.prototype.configure.call(this, data);
          // 恢复 widget 值
          if (
            data.widgets_values &&
            data.widgets_values.length === this.widgets.length
          ) {
            data.widgets_values.forEach((value, index) => {
              if (this.widgets[index]) {
                this.widgets[index].value = value;
              }
            });
          }
        };

        this.findGetters = function (graph, checkForPreviousName) {
          //   const name = checkForPreviousName
          //     ? this.properties.previousName
          //     : this.widgets[0].value;
          //   return graph._nodes.filter(
          //     (otherNode) =>
          //       otherNode.type === 'GetNode' &&
          //       otherNode.widgets[0].value === name &&
          //       name !== ''
          //   );
        };

        // This node is purely frontend and does not impact the resulting prompt so should not be serialized
        this.isVirtualNode = true;
      }

      onRemoved() {
        setTimeout(refreshDropdown, 300);
        // refreshDropdown();
      }
    }

    LiteGraph.registerNodeType(
      'ReiCustomSelectorOptionV2',
      Object.assign(ReiCustomSelectorOptionV2, {
        title: 'Rei自定义选项V2',
      })
    );

    ReiCustomSelectorOptionV2.category = 'ReiTool';
  },
});
