import { app } from '/scripts/app.js';
import { api } from '/scripts/api.js';

class ReiConfigManager {
  constructor() {
    this.configs = {};
    this.configTypes = {}; // 存储每个配置项的类型信息
    this.currentEditingKey = null;
  }

  async loadConfigs() {
    console.log('开始加载配置...');
    try {
      // 并行加载配置数据和类型信息
      const [configResponse, typesResponse] = await Promise.all([
        api.fetchApi('/api/rei/config/get_all', { method: 'GET' }),
        api.fetchApi('/api/rei/config/get_types', { method: 'GET' }),
      ]);

      console.log('API 响应状态:', configResponse.status, typesResponse.status);

      if (configResponse.ok) {
        this.configs = await configResponse.json();
        console.log('成功加载配置:', this.configs);
        this.showMessage('配置加载成功', 'success');
      } else {
        this.configs = {};
        console.error('无法获取配置:', configResponse.statusText);
        this.showMessage(`加载配置失败: ${configResponse.statusText}`, 'error');
      }

      if (typesResponse.ok) {
        this.configTypes = await typesResponse.json();
        console.log('成功加载配置类型:', this.configTypes);
      } else {
        console.warn('类型信息加载失败，使用默认类型推断');
        this.configTypes = {};
      }

      this.renderConfigList();
    } catch (error) {
      console.error('加载配置失败:', error);
      this.configs = {};
      this.configTypes = {};
      this.showMessage(`加载配置失败: ${error.message}`, 'error');
      this.renderConfigList();
    }
  }

  async saveConfig(key, value, type) {
    if (!key.trim()) {
      this.showMessage('错误: 键名不能为空', 'error');
      return false;
    }

    console.log('保存配置:', { key, value, type });

    try {
      const formData = new FormData();
      formData.append('key', key);
      formData.append('value', value);
      // 发送真实的类型信息给后端
      formData.append('type', type);

      const response = await api.fetchApi('/api/rei/config/update', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        try {
          const errorData = await response.json();
          throw new Error(errorData.error || '保存失败');
        } catch (parseError) {
          throw new Error(`保存失败: HTTP ${response.status}`);
        }
      }

      // 更新本地配置
      let convertedValue = value;
      if (type === 'integer') convertedValue = parseInt(value);
      else if (type === 'float') convertedValue = parseFloat(value);
      else if (type === 'boolean')
        convertedValue = value.toLowerCase() === 'true';
      // token 类型保持为字符串

      this.configs[key] = convertedValue;
      this.configTypes[key] = type; // 保存类型信息
      this.renderConfigList();
      this.showMessage(`成功保存配置: ${key}`, 'success');
      return true;
    } catch (error) {
      this.showMessage(`保存配置失败: ${error.message}`, 'error');
      return false;
    }
  }

  async deleteConfig(key) {
    console.log('删除配置:', key);
    try {
      const formData = new FormData();
      formData.append('key', key);

      const response = await api.fetchApi('/api/rei/config/delete', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        try {
          const errorData = await response.json();
          throw new Error(errorData.error || '删除失败');
        } catch (parseError) {
          throw new Error(`删除失败: HTTP ${response.status}`);
        }
      }

      delete this.configs[key];
      delete this.configTypes[key]; // 同时删除类型信息
      this.renderConfigList();
      this.showMessage(`成功删除配置: ${key}`, 'success');
    } catch (error) {
      this.showMessage(`删除配置失败: ${error.message}`, 'error');
    }
  }

  showMessage(message, type = 'info') {
    // 在侧边栏顶部显示消息
    const container = document.getElementById('rei-config-container');
    if (!container) return;

    const messageEl = document.createElement('div');
    messageEl.className = `rei-config-message rei-config-message-${type}`;
    messageEl.textContent = message;
    messageEl.style.cssText = `
            padding: 8px 12px;
            margin-bottom: 10px;
            border-radius: 4px;
            font-size: 12px;
            ${type === 'success' ? 'background: #4CAF50; color: white;' : ''}
            ${type === 'error' ? 'background: #f44336; color: white;' : ''}
            ${type === 'info' ? 'background: #2196F3; color: white;' : ''}
        `;

    container.insertBefore(messageEl, container.firstChild);

    // 3秒后自动移除消息
    setTimeout(() => {
      if (messageEl.parentNode) {
        messageEl.parentNode.removeChild(messageEl);
      }
    }, 3000);
  }

  renderConfigList() {
    const listContainer = document.getElementById('rei-config-list');
    if (!listContainer) return;

    if (Object.keys(this.configs).length === 0) {
      listContainer.innerHTML =
        '<div style="text-align: center; color: #999; padding: 20px; font-size: 14px;">暂无配置项</div>';
      return;
    }

    let html = '';
    for (const [key, value] of Object.entries(this.configs)) {
      // 优先使用保存的类型信息，否则使用 JavaScript 类型推断
      const configType =
        this.configTypes[key] ||
        (this.isTokenType(key, value) ? 'token' : typeof value);
      const isToken = configType === 'token';
      let displayValue;

      if (isToken) {
        // Token 类型显示为星号
        displayValue = '*'.repeat(Math.min(String(value).length, 12));
      } else if (configType === '3KeyGroup') {
        // 3KeyGroup 类型显示键组合
        try {
          const keyGroup = JSON.parse(String(value));
          const keys = [keyGroup.key1, keyGroup.key2, keyGroup.key3].filter(
            (k) => k
          );
          displayValue = `[${keys.join(', ')}]`;
        } catch (e) {
          displayValue = '[解析失败]';
        }
      } else {
        displayValue =
          String(value).length > 40
            ? String(value).substring(0, 40) + '...'
            : String(value);
      }

      html += `
                <div class="rei-config-item" style="
                    background: #3a3a3a;
                    border: 1px solid #555;
                    border-radius: 6px;
                    padding: 12px;
                    margin-bottom: 8px;
                    transition: background-color 0.2s;
                ">
                    <div style="display: flex; justify-content: between; align-items: flex-start;">
                        <div style="flex: 1; min-width: 0;">
                                                         <div style="font-weight: bold; color: #4CAF50; font-size: 13px; margin-bottom: 6px; word-break: break-all;">${key}</div>
                             <div style="color: #bbb; font-size: 11px; margin-bottom: 4px;">类型: ${this.getDisplayTypeName(
                               configType
                             )}${isToken ? ' 🔒' : ''}</div>
                             <div style="color: #ddd; font-size: 12px; word-break: break-all; line-height: 1.3;">${displayValue}</div>
                        </div>
                        <div style="display: flex; flex-direction: column; gap: 4px; margin-left: 12px;">
                                                                                      <button onclick="reiConfigManager.copyConfigValue('${key.replace(
                                                                                        /'/g,
                                                                                        "\\'"
                                                                                      )}');" style="
                                 background: #2196F3;
                                 border: none;
                                 color: white;
                                 padding: 6px 10px;
                                 border-radius: 3px;
                                 cursor: pointer;
                                 font-size: 11px;
                                 white-space: nowrap;
                                 transition: background-color 0.2s;
                              " title="复制配置值" 
                              onmouseover="this.style.background='#1976D2';"
                              onmouseout="this.style.background='#2196F3';">复制</button>
                            <button onclick="reiConfigManager.editConfig('${key.replace(
                              /'/g,
                              "\\'"
                            )}');" style="
                                background: #FF9800;
                                border: none;
                                color: white;
                                padding: 6px 10px;
                                border-radius: 3px;
                                cursor: pointer;
                                font-size: 11px;
                                white-space: nowrap;
                            ">编辑</button>
                            <button onclick="reiConfigManager.confirmDelete('${key.replace(
                              /'/g,
                              "\\'"
                            )}');" style="
                                background: #f44336;
                                border: none;
                                color: white;
                                padding: 6px 10px;
                                border-radius: 3px;
                                cursor: pointer;
                                font-size: 11px;
                                white-space: nowrap;
                            ">删除</button>
                        </div>
                    </div>
                </div>
            `;
    }

    listContainer.innerHTML = html;
  }

  editConfig(key) {
    const value = this.configs[key];
    // 优先使用保存的类型信息，否则使用 JavaScript 类型
    const type =
      this.configTypes[key] ||
      (this.isTokenType(key, value) ? 'token' : typeof value);

    // 设置键名并禁用键名输入框（编辑模式）
    const keyInput = document.getElementById('rei-config-key');
    keyInput.value = key;
    keyInput.disabled = true; // 编辑模式下禁用键名修改
    keyInput.style.opacity = '0.6'; // 视觉上表示禁用状态
    keyInput.style.cursor = 'not-allowed';

    // 设置类型并禁用类型选择器（编辑模式）
    const typeSelect = document.getElementById('rei-config-type');
    typeSelect.value = type;
    typeSelect.disabled = true; // 编辑模式下禁用类型修改
    typeSelect.style.opacity = '0.6'; // 视觉上表示禁用状态
    typeSelect.style.cursor = 'not-allowed';

    if (type === '3KeyGroup') {
      // 解析3KeyGroup数据
      try {
        const keyGroup = JSON.parse(String(value));
        setTimeout(() => {
          document.getElementById('rei-config-key1').value =
            keyGroup.key1 || '';
          document.getElementById('rei-config-key2').value =
            keyGroup.key2 || '';
          document.getElementById('rei-config-key3').value =
            keyGroup.key3 || '';
        }, 150); // 等待界面切换完成
      } catch (e) {
        console.error('解析3KeyGroup数据失败:', e);
      }
    } else {
      document.getElementById('rei-config-value').value = String(value);
    }

    this.currentEditingKey = key;
    this.showEditForm();
  }

  confirmDelete(key) {
    if (confirm(`确定要删除配置项 "${key}" 吗？`)) {
      this.deleteConfig(key);
    }
  }

  showEditForm() {
    console.log('显示编辑表单');
    const form = document.getElementById('rei-config-form');
    if (form) {
      form.style.display = 'block';

      // 自动滚动到编辑表单
      setTimeout(() => {
        form.scrollIntoView({
          behavior: 'smooth',
          block: 'start',
          inline: 'nearest',
        });
      }, 100); // 稍微延迟以确保表单已显示

      const keyInput = document.getElementById('rei-config-key');
      if (keyInput) {
        // 延迟聚焦，避免与滚动冲突
        setTimeout(() => {
          if (!keyInput.disabled) {
            keyInput.focus();
          }
        }, 200);
      }
      // 清除之前的验证提示
      const oldValidation = document.getElementById('rei-config-validation');
      if (oldValidation) {
        oldValidation.remove();
      }
      // 重置保存按钮状态
      const saveBtn = document.getElementById('rei-config-save');
      if (saveBtn) {
        saveBtn.disabled = false;
        saveBtn.style.opacity = '1';
      }

      // 绑定实时验证事件
      this.bindValidationEvents();
    } else {
      console.error('找不到表单元素');
    }
  }

  hideEditForm() {
    document.getElementById('rei-config-form').style.display = 'none';
    this.currentEditingKey = null;
    this.clearForm();
    // 清除验证提示
    const oldValidation = document.getElementById('rei-config-validation');
    if (oldValidation) {
      oldValidation.remove();
    }
  }

  clearForm() {
    // 重新启用键名输入框（新增模式）
    const keyInput = document.getElementById('rei-config-key');
    keyInput.value = '';
    keyInput.disabled = false; // 新增模式下允许输入键名
    keyInput.style.opacity = '1'; // 恢复正常透明度
    keyInput.style.cursor = 'text';

    document.getElementById('rei-config-value').value = '';

    // 重新启用类型选择器（新增模式）
    const typeSelect = document.getElementById('rei-config-type');
    typeSelect.value = 'string';
    typeSelect.disabled = false; // 新增模式下允许选择类型
    typeSelect.style.opacity = '1'; // 恢复正常透明度
    typeSelect.style.cursor = 'default';

    // 清空3KeyGroup选择器
    const key1Select = document.getElementById('rei-config-key1');
    const key2Select = document.getElementById('rei-config-key2');
    const key3Select = document.getElementById('rei-config-key3');

    if (key1Select) key1Select.value = '';
    if (key2Select) key2Select.value = '';
    if (key3Select) key3Select.value = '';
  }

  async handleSave() {
    const key = document.getElementById('rei-config-key').value.trim();
    const type = document.getElementById('rei-config-type').value;
    let value;

    // 根据类型获取值
    if (type === '3KeyGroup') {
      const key1 = document.getElementById('rei-config-key1').value;
      const key2 = document.getElementById('rei-config-key2').value;
      const key3 = document.getElementById('rei-config-key3').value;

      // 将选中的键组合成JSON字符串
      value = JSON.stringify({
        key1: key1 || null,
        key2: key2 || null,
        key3: key3 || null,
      });
    } else {
      value = document.getElementById('rei-config-value').value;
    }

    // 验证类型匹配
    const validationResult = this.validateValueType(value, type);
    if (!validationResult.valid) {
      this.showMessage(`类型验证失败: ${validationResult.error}`, 'error');
      return;
    }

    const success = await this.saveConfig(key, value, type);
    if (success) {
      this.hideEditForm();
    }
  }

  handleCancel() {
    this.hideEditForm();
  }

  isTokenType(key, value) {
    // 检查是否在类型存储中标记为 token
    if (this.configTypes[key] === 'token') {
      return true;
    }

    // 通过键名模式判断（作为备用方案）
    const tokenPatterns = [
      /token/i,
      /key/i,
      /secret/i,
      /password/i,
      /pwd/i,
      /auth/i,
      /api_key/i,
      /apikey/i,
      /_key$/i,
      /_token$/i,
      /_secret$/i,
    ];

    return tokenPatterns.some((pattern) => pattern.test(key));
  }

  getDisplayTypeName(type) {
    // 将内部类型名转换为用户友好的显示名称
    const typeNames = {
      string: '字符串',
      integer: '整数',
      float: '浮点数',
      boolean: '布尔值',
      token: '令牌/密钥',
      '3KeyGroup': '三键组合',
    };
    return typeNames[type] || type;
  }

  async copyConfigValue(key) {
    try {
      const value = this.configs[key];
      const configType = this.configTypes[key];

      let copyValue;

      if (configType === '3KeyGroup') {
        // 对于 3KeyGroup，复制格式化的键值对信息
        try {
          const keyGroup = JSON.parse(String(value));
          const keyValues = [];

          if (keyGroup.key1) {
            keyValues.push(
              `${keyGroup.key1}: ${this.configs[keyGroup.key1] || ''}`
            );
          }
          if (keyGroup.key2) {
            keyValues.push(
              `${keyGroup.key2}: ${this.configs[keyGroup.key2] || ''}`
            );
          }
          if (keyGroup.key3) {
            keyValues.push(
              `${keyGroup.key3}: ${this.configs[keyGroup.key3] || ''}`
            );
          }

          copyValue = keyValues.join('\n');
        } catch (e) {
          copyValue = String(value);
        }
      } else {
        // 其他类型直接复制原值
        copyValue = String(value);
      }

      // 使用现代浏览器的 Clipboard API
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(copyValue);
      } else {
        // 备用方案：使用传统的 document.execCommand
        const textArea = document.createElement('textarea');
        textArea.value = copyValue;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }

      this.showMessage(`已复制 "${key}" 的值到剪贴板`, 'success');
      console.log(`复制配置值: ${key} = ${copyValue}`);
    } catch (error) {
      console.error('复制失败:', error);
      this.showMessage(`复制失败: ${error.message}`, 'error');
    }
  }

  validate3KeyGroup() {
    const key1 = document.getElementById('rei-config-key1')?.value || '';
    const key2 = document.getElementById('rei-config-key2')?.value || '';
    const key3 = document.getElementById('rei-config-key3')?.value || '';

    // 至少需要选择一个键
    if (!key1 && !key2 && !key3) {
      return { valid: false, error: '请至少选择一个键' };
    }

    // 检查是否有重复的键
    const selectedKeys = [key1, key2, key3].filter((key) => key);
    const uniqueKeys = [...new Set(selectedKeys)];

    if (selectedKeys.length !== uniqueKeys.length) {
      return { valid: false, error: '不能选择重复的键' };
    }

    return { valid: true };
  }

  validateValueType(value, type) {
    if (!value.trim() && type !== 'string' && type !== '3KeyGroup') {
      return { valid: false, error: '值不能为空' };
    }

    switch (type) {
      case 'string':
      case 'token':
        return { valid: true };

      case '3KeyGroup':
        // 验证3KeyGroup类型
        return this.validate3KeyGroup();

      case 'integer':
        // 更严格的整数验证
        const trimmedValue = value.trim();
        if (!/^-?\d+$/.test(trimmedValue)) {
          return { valid: false, error: `"${value}" 不是有效的整数` };
        }
        const intValue = parseInt(trimmedValue);
        if (isNaN(intValue)) {
          return { valid: false, error: `"${value}" 不是有效的整数` };
        }
        return { valid: true };

      case 'float':
        // 更严格的浮点数验证
        const trimmedFloatValue = value.trim();
        if (!/^-?\d*\.?\d+([eE][-+]?\d+)?$/.test(trimmedFloatValue)) {
          return { valid: false, error: `"${value}" 不是有效的浮点数` };
        }
        const floatValue = parseFloat(trimmedFloatValue);
        if (isNaN(floatValue)) {
          return { valid: false, error: `"${value}" 不是有效的浮点数` };
        }
        return { valid: true };

      case 'boolean':
        const lowerValue = value.toLowerCase().trim();
        const validBooleans = [
          'true',
          'false',
          '1',
          '0',
          't',
          'f',
          'y',
          'n',
          'yes',
          'no',
        ];
        if (!validBooleans.includes(lowerValue)) {
          return {
            valid: false,
            error: `"${value}" 不是有效的布尔值。请使用: true/false, 1/0, yes/no`,
          };
        }
        return { valid: true };

      default:
        return { valid: false, error: '未知的数据类型' };
    }
  }

  bindValidationEvents() {
    const valueInput = document.getElementById('rei-config-value');
    const typeSelect = document.getElementById('rei-config-type');

    if (valueInput && typeSelect) {
      console.log('绑定验证事件');

      // 移除之前的事件监听器（如果存在）
      const newValueInput = valueInput.cloneNode(true);
      const newTypeSelect = typeSelect.cloneNode(true);
      valueInput.parentNode.replaceChild(newValueInput, valueInput);
      typeSelect.parentNode.replaceChild(newTypeSelect, typeSelect);

      // 绑定新的事件监听器
      const validateInput = () => {
        console.log('触发验证');
        this.showInputValidation();
      };

      const typeChangeHandler = () => {
        this.handleTypeChange();
        this.bind3KeyGroupEvents(); // 绑定3KeyGroup下拉框事件
        validateInput();
      };

      newValueInput.addEventListener('input', validateInput);
      newValueInput.addEventListener('blur', validateInput);
      newTypeSelect.addEventListener('change', typeChangeHandler);

      // 初始化界面
      this.handleTypeChange();
      this.bind3KeyGroupEvents(); // 初始绑定3KeyGroup事件

      // 立即执行一次验证
      setTimeout(() => this.showInputValidation(), 100);
    } else {
      console.error('找不到验证元素');
    }
  }

  bind3KeyGroupEvents() {
    // 为3KeyGroup下拉框绑定事件
    const key1Select = document.getElementById('rei-config-key1');
    const key2Select = document.getElementById('rei-config-key2');
    const key3Select = document.getElementById('rei-config-key3');

    const validateInput = () => {
      console.log('3KeyGroup键选择变化，触发验证');
      this.showInputValidation();
    };

    [key1Select, key2Select, key3Select].forEach((select) => {
      if (select) {
        // 移除旧的事件监听器
        const newSelect = select.cloneNode(true);
        select.parentNode.replaceChild(newSelect, select);

        // 绑定新的事件监听器
        newSelect.addEventListener('change', validateInput);
      }
    });
  }

  handleTypeChange() {
    const typeSelect = document.getElementById('rei-config-type');
    const valueInput = document.getElementById('rei-config-value');
    const keyGroupDiv = document.getElementById('rei-config-3keygroup');

    if (!typeSelect || !valueInput || !keyGroupDiv) return;

    const selectedType = typeSelect.value;

    if (selectedType === '3KeyGroup') {
      // 显示键组选择器，隐藏普通输入框
      valueInput.style.display = 'none';
      keyGroupDiv.style.display = 'block';

      // 填充可用的键选项
      this.populateKeyOptions();
    } else {
      // 显示普通输入框，隐藏键组选择器
      valueInput.style.display = 'block';
      keyGroupDiv.style.display = 'none';
    }
  }

  populateKeyOptions() {
    const key1Select = document.getElementById('rei-config-key1');
    const key2Select = document.getElementById('rei-config-key2');
    const key3Select = document.getElementById('rei-config-key3');

    if (!key1Select || !key2Select || !key3Select) return;

    // 获取所有非3KeyGroup类型的配置键
    const availableKeys = Object.keys(this.configs).filter((key) => {
      return this.configTypes[key] !== '3KeyGroup';
    });

    // 清空并填充选项
    [key1Select, key2Select, key3Select].forEach((select) => {
      select.innerHTML = '<option value="">-- 选择键 --</option>';
      availableKeys.forEach((key) => {
        const option = document.createElement('option');
        option.value = key;
        option.textContent = key;
        select.appendChild(option);
      });
    });
  }

  showInputValidation() {
    const valueInput = document.getElementById('rei-config-value');
    const typeSelect = document.getElementById('rei-config-type');
    const saveBtn = document.getElementById('rei-config-save');

    if (!typeSelect || !saveBtn) return;

    const type = typeSelect.value;

    console.log('执行验证:', { type });

    // 移除旧的验证提示
    const oldValidation = document.getElementById('rei-config-validation');
    if (oldValidation) {
      oldValidation.remove();
    }

    let validation;

    if (type === '3KeyGroup') {
      // 3KeyGroup 类型直接验证键组合
      validation = this.validate3KeyGroup();
    } else {
      // 其他类型验证值
      if (!valueInput) return;
      const value = valueInput.value;

      // 如果值为空且类型是字符串，则认为是有效的
      if (!value.trim() && type === 'string') {
        saveBtn.disabled = false;
        saveBtn.style.opacity = '1';
        return;
      }

      validation = this.validateValueType(value, type);
    }
    console.log('验证结果:', validation);

    // 创建验证提示元素
    const validationEl = document.createElement('div');
    validationEl.id = 'rei-config-validation';
    validationEl.style.cssText = `
      margin-top: 8px;
      padding: 6px 8px;
      border-radius: 4px;
      font-size: 12px;
      ${
        validation.valid
          ? 'background: #4CAF50; color: white;'
          : 'background: #f44336; color: white;'
      }
    `;
    validationEl.textContent = validation.valid
      ? '✓ 值格式正确'
      : validation.error;

    // 插入到值输入框后面
    valueInput.parentNode.appendChild(validationEl);

    // 控制保存按钮状态
    saveBtn.disabled = !validation.valid;
    saveBtn.style.opacity = validation.valid ? '1' : '0.5';
  }

  renderSidebar(container) {
    container.id = 'rei-config-container';
    container.style.cssText = `
            padding: 16px;
            height: 100%;
            overflow-y: auto;
            box-sizing: border-box;
        `;

    container.innerHTML = `
            <div style="margin-bottom: 16px;">
                <h3 style="margin: 0 0 12px 0; color: #fff; font-size: 16px;">配置管理器</h3>
                
                <!-- 重要提醒 -->
                <div style="
                    background: #FF9800;
                    color: white;
                    padding: 8px 12px;
                    border-radius: 4px;
                    margin-bottom: 8px;
                    font-size: 12px;
                    line-height: 1.4;
                    border-left: 4px solid #F57C00;
                ">
                    <strong>⚠️ 重要提醒</strong><br/>
                    修改环境配置后，请按键盘 <kbd style="background: rgba(255,255,255,0.2); padding: 2px 6px; border-radius: 3px; font-weight: bold;">R</kbd> 刷新节点以使配置生效
                </div>
                
                <!-- 安全提醒 -->
                <div style="
                    background: #f44336;
                    color: white;
                    padding: 8px 12px;
                    border-radius: 4px;
                    margin-bottom: 12px;
                    font-size: 12px;
                    line-height: 1.4;
                    border-left: 4px solid #d32f2f;
                ">
                    <strong>🔒 安全警告</strong><br/>
                    请勿将包含令牌/密钥的配置文件分享给他人！<br/>
                    文件位置：<code style="background: rgba(255,255,255,0.2); padding: 1px 4px; border-radius: 2px;">ComfyUI根目录/env_config.json</code><br/>
                    分享此文件可能导致您的 API 密钥泄露和账户安全风险。
                </div>
                
                <div style="display: flex; gap: 8px; margin-bottom: 16px;">
                    <button id="rei-config-refresh" style="
                        background: #4CAF50;
                        border: none;
                        color: white;
                        padding: 8px 12px;
                        border-radius: 4px;
                        cursor: pointer;
                        font-size: 12px;
                        flex: 1;
                    ">刷新</button>
                    <button id="rei-config-add" style="
                        background: #2196F3;
                        border: none;
                        color: white;
                        padding: 8px 12px;
                        border-radius: 4px;
                        cursor: pointer;
                        font-size: 12px;
                        flex: 1;
                    ">新增</button>
                </div>
            </div>
            
            <div id="rei-config-list" style="margin-bottom: 16px;">
                <!-- 配置列表 -->
            </div>
            
            <div id="rei-config-form" style="
                display: none;
                background: #333;
                border: 1px solid #555;
                border-radius: 6px;
                padding: 16px;
                margin-top: 16px;
            ">
                <h4 style="margin: 0 0 12px 0; color: #fff; font-size: 14px;">编辑配置</h4>
                
                <div style="margin-bottom: 12px;">
                    <label style="display: block; margin-bottom: 6px; color: #ccc; font-size: 12px;">键名:</label>
                    <input id="rei-config-key" type="text" style="
                        width: 100%;
                        padding: 8px;
                        border: 1px solid #666;
                        background: #444;
                        color: white;
                        border-radius: 4px;
                        box-sizing: border-box;
                        font-size: 13px;
                    ">
                </div>
                
                <div style="margin-bottom: 12px;">
                    <label style="display: block; margin-bottom: 6px; color: #ccc; font-size: 12px;">类型:</label>
                                         <select id="rei-config-type" style="
                         width: 100%;
                         padding: 8px;
                         border: 1px solid #666;
                         background: #444;
                         color: white;
                         border-radius: 4px;
                         font-size: 13px;
                     ">
                         <option value="string">字符串</option>
                         <option value="integer">整数</option>
                         <option value="float">浮点数</option>
                         <option value="boolean">布尔值</option>
                         <option value="token">令牌/密钥</option>
                         <option value="3KeyGroup">三键组合</option>
                     </select>
                </div>
                
                                 <div style="margin-bottom: 16px;">
                     <label style="display: block; margin-bottom: 6px; color: #ccc; font-size: 12px;">值:</label>
                     
                     <!-- 普通值输入框 -->
                     <textarea id="rei-config-value" style="
                         width: 100%;
                         height: 80px;
                         padding: 8px;
                         border: 1px solid #666;
                         background: #444;
                         color: white;
                         border-radius: 4px;
                         resize: vertical;
                         box-sizing: border-box;
                         font-size: 13px;
                         font-family: monospace;
                     "></textarea>
                     
                     <!-- 3KeyGroup 选择器 -->
                     <div id="rei-config-3keygroup" style="display: none;">
                         <div style="margin-bottom: 8px;">
                             <label style="display: block; margin-bottom: 4px; color: #ccc; font-size: 11px;">键1:</label>
                             <select id="rei-config-key1" style="
                                 width: 100%;
                                 padding: 6px;
                                 border: 1px solid #666;
                                 background: #444;
                                 color: white;
                                 border-radius: 4px;
                                 font-size: 12px;
                             ">
                                 <option value="">-- 选择键 --</option>
                             </select>
                         </div>
                         <div style="margin-bottom: 8px;">
                             <label style="display: block; margin-bottom: 4px; color: #ccc; font-size: 11px;">键2:</label>
                             <select id="rei-config-key2" style="
                                 width: 100%;
                                 padding: 6px;
                                 border: 1px solid #666;
                                 background: #444;
                                 color: white;
                                 border-radius: 4px;
                                 font-size: 12px;
                             ">
                                 <option value="">-- 选择键 --</option>
                             </select>
                         </div>
                         <div style="margin-bottom: 8px;">
                             <label style="display: block; margin-bottom: 4px; color: #ccc; font-size: 11px;">键3:</label>
                             <select id="rei-config-key3" style="
                                 width: 100%;
                                 padding: 6px;
                                 border: 1px solid #666;
                                 background: #444;
                                 color: white;
                                 border-radius: 4px;
                                 font-size: 12px;
                             ">
                                 <option value="">-- 选择键 --</option>
                             </select>
                         </div>
                     </div>
                 </div>
                
                <div style="display: flex; gap: 8px;">
                    <button id="rei-config-save" style="
                        background: #4CAF50;
                        border: none;
                        color: white;
                        padding: 8px 16px;
                        border-radius: 4px;
                        cursor: pointer;
                        font-size: 12px;
                        flex: 1;
                    ">保存</button>
                    <button id="rei-config-cancel" style="
                        background: #666;
                        border: none;
                        color: white;
                        padding: 8px 16px;
                        border-radius: 4px;
                        cursor: pointer;
                        font-size: 12px;
                        flex: 1;
                    ">取消</button>
                </div>
            </div>
        `;

    // 绑定事件 - 添加调试信息
    setTimeout(() => {
      const refreshBtn = document.getElementById('rei-config-refresh');
      const addBtn = document.getElementById('rei-config-add');
      const saveBtn = document.getElementById('rei-config-save');
      const cancelBtn = document.getElementById('rei-config-cancel');

      if (refreshBtn) {
        refreshBtn.onclick = () => {
          console.log('刷新按钮被点击');
          this.loadConfigs();
        };
      } else {
        console.error('找不到刷新按钮');
      }

      if (addBtn) {
        addBtn.onclick = () => {
          console.log('新增按钮被点击');
          this.clearForm();
          this.showEditForm();
        };
      } else {
        console.error('找不到新增按钮');
      }

      if (saveBtn) {
        saveBtn.onclick = () => {
          console.log('保存按钮被点击');
          this.handleSave();
        };
      } else {
        console.error('找不到保存按钮');
      }

      if (cancelBtn) {
        cancelBtn.onclick = () => {
          console.log('取消按钮被点击');
          this.handleCancel();
        };
      } else {
        console.error('找不到取消按钮');
      }

      // 初始加载配置
      this.loadConfigs();
    }, 100);
  }
}

// 创建全局实例
const reiConfigManager = new ReiConfigManager();
window.reiConfigManager = reiConfigManager;

// 注册侧边栏标签页
app.registerExtension({
  name: 'Rei.ConfigManager.Sidebar',
  setup() {
    console.log('注册 Rei 配置管理器侧边栏...');

    // 检查 extensionManager 是否存在
    if (!app.extensionManager) {
      console.error('app.extensionManager 不存在');
      return;
    }

    if (!app.extensionManager.registerSidebarTab) {
      console.error('registerSidebarTab 方法不存在');
      return;
    }

    try {
      app.extensionManager.registerSidebarTab({
        id: 'reiConfigManager',
        icon: 'pi pi-file-edit',
        title: 'Rei 配置',
        tooltip: 'Rei 配置管理器 (ENV)',
        type: 'custom',
        render: (el) => {
          console.log('渲染侧边栏内容...');
          reiConfigManager.renderSidebar(el);

          // 尝试自定义图标文字
          setTimeout(() => {
            const tabButton = document.querySelector(
              '[data-tab-id="reiConfigManager"]'
            );
            if (tabButton) {
              const iconEl = tabButton.querySelector('i');
              if (iconEl) {
                iconEl.textContent = 'ENV';
                iconEl.style.fontFamily = 'monospace';
                iconEl.style.fontSize = '10px';
                iconEl.style.fontWeight = 'bold';
                iconEl.style.fontStyle = 'normal';
              }
            }
          }, 500);
        },
      });
      console.log('侧边栏标签页注册成功');
    } catch (error) {
      console.error('注册侧边栏标签页失败:', error);
    }
  },
});
