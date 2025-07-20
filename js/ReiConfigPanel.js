import { app } from '/scripts/app.js';
import { api } from '/scripts/api.js';

class ReiConfigManager {
  constructor() {
    this.configs = {};
    this.configTypes = {}; // 存储每个配置项的类型信息
    this.currentEditingKey = null;
  }

  // 加密功能
  async encryptToken(text, password) {
    try {
      const encoder = new TextEncoder();
      const data = encoder.encode(text);
      const passwordData = encoder.encode(password);

      // 使用密码生成密钥
      const key = await crypto.subtle.importKey(
        'raw',
        passwordData,
        { name: 'PBKDF2' },
        false,
        ['deriveKey']
      );

      // 生成随机盐
      const salt = crypto.getRandomValues(new Uint8Array(16));

      // 派生密钥
      const derivedKey = await crypto.subtle.deriveKey(
        {
          name: 'PBKDF2',
          salt: salt,
          iterations: 100000,
          hash: 'SHA-256',
        },
        key,
        { name: 'AES-GCM', length: 256 },
        false,
        ['encrypt']
      );

      // 生成随机IV
      const iv = crypto.getRandomValues(new Uint8Array(12));

      // 加密
      const encrypted = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv: iv },
        derivedKey,
        data
      );

      // 组合盐、IV和加密数据
      const result = new Uint8Array(
        salt.length + iv.length + encrypted.byteLength
      );
      result.set(salt, 0);
      result.set(iv, salt.length);
      result.set(new Uint8Array(encrypted), salt.length + iv.length);

      // 转换为 base64
      return btoa(String.fromCharCode(...result));
    } catch (error) {
      console.error('加密失败:', error);
      throw new Error('Token 加密失败');
    }
  }

  // 解密功能
  async decryptToken(encryptedText, password) {
    try {
      const encoder = new TextEncoder();
      const passwordData = encoder.encode(password);

      // 从 base64 解码
      const encryptedData = new Uint8Array(
        atob(encryptedText)
          .split('')
          .map((char) => char.charCodeAt(0))
      );

      // 提取盐、IV和加密数据
      const salt = encryptedData.slice(0, 16);
      const iv = encryptedData.slice(16, 28);
      const encrypted = encryptedData.slice(28);

      // 使用密码生成密钥
      const key = await crypto.subtle.importKey(
        'raw',
        passwordData,
        { name: 'PBKDF2' },
        false,
        ['deriveKey']
      );

      // 派生密钥
      const derivedKey = await crypto.subtle.deriveKey(
        {
          name: 'PBKDF2',
          salt: salt,
          iterations: 100000,
          hash: 'SHA-256',
        },
        key,
        { name: 'AES-GCM', length: 256 },
        false,
        ['decrypt']
      );

      // 解密
      const decrypted = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv: iv },
        derivedKey,
        encrypted
      );

      // 转换为字符串
      const decoder = new TextDecoder();
      return decoder.decode(decrypted);
    } catch (error) {
      console.error('解密失败:', error);
      throw new Error('Token 解密失败，请检查密码是否正确');
    }
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
      let finalValue = value;
      let isEncrypted = false;

      // 检查是否需要加密 token
      if (type === 'token') {
        const encryptionEnabled = document.getElementById(
          'rei-encryption-enabled'
        ).checked;
        const password = document.getElementById(
          'rei-encryption-password'
        ).value;

        if (encryptionEnabled) {
          if (!password) {
            this.showMessage('启用加密时必须输入密码', 'error');
            return false;
          }

          try {
            finalValue = await this.encryptToken(value, password);
            isEncrypted = true;
            console.log('Token 已加密');
          } catch (error) {
            this.showMessage(`加密失败: ${error.message}`, 'error');
            return false;
          }
        }
      }

      const formData = new FormData();
      formData.append('key', key);
      formData.append('value', finalValue);
      formData.append('type', type);
      formData.append('encrypted', isEncrypted ? 'true' : 'false');

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
      let convertedValue = finalValue; // 使用处理后的值（可能是加密后的）
      if (type === 'integer' && !isEncrypted) convertedValue = parseInt(value);
      else if (type === 'float' && !isEncrypted)
        convertedValue = parseFloat(value);
      else if (type === 'boolean' && !isEncrypted)
        convertedValue = value.toLowerCase() === 'true';
      // token 类型和加密的值保持为字符串

      this.configs[key] = convertedValue;
      // 更新类型信息为新的对象格式
      this.configTypes[key] = {
        type: type,
        encrypted: isEncrypted,
      };
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

  showInlineError(configKey, message) {
    // 在配置项附近显示浮动错误提示
    const configItems = document.querySelectorAll('.rei-config-item');
    let targetItem = null;

    // 查找对应的配置项
    for (const item of configItems) {
      const keyElement = item.querySelector('div[style*="font-weight: bold"]');
      if (keyElement && keyElement.textContent === configKey) {
        targetItem = item;
        break;
      }
    }

    if (!targetItem) return;

    // 移除该项的旧提示
    const oldTooltip = targetItem.querySelector('.rei-inline-error');
    if (oldTooltip) oldTooltip.remove();

    // 创建浮动提示
    const tooltip = document.createElement('div');
    tooltip.className = 'rei-inline-error';
    tooltip.textContent = message;
    tooltip.style.cssText = `
      position: absolute;
      background: #f44336;
      color: white;
      padding: 8px 12px;
      border-radius: 6px;
      font-size: 11px;
      line-height: 1.3;
      max-width: 250px;
      z-index: 10000;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      animation: popInError 0.3s ease-out;
      border: 1px solid #d32f2f;
      top: 50%;
      right: calc(100% + 10px);
      transform: translateY(-50%);
      white-space: normal;
      word-wrap: break-word;
    `;

    // 添加小箭头
    const arrow = document.createElement('div');
    arrow.style.cssText = `
      position: absolute;
      top: 50%;
      right: -6px;
      transform: translateY(-50%);
      width: 0;
      height: 0;
      border-left: 6px solid #f44336;
      border-top: 6px solid transparent;
      border-bottom: 6px solid transparent;
    `;
    tooltip.appendChild(arrow);

    // 设置配置项为相对定位
    targetItem.style.position = 'relative';
    targetItem.appendChild(tooltip);

    // 高亮配置项
    const originalBg = targetItem.style.background;
    targetItem.style.background = '#5a1a1a';
    targetItem.style.borderColor = '#f44336';
    targetItem.style.transform = 'scale(1.02)';
    targetItem.style.transition = 'all 0.3s ease';

    // 3秒后移除提示和高亮
    setTimeout(() => {
      if (tooltip.parentNode) {
        tooltip.style.animation = 'popOutError 0.3s ease-in';
        targetItem.style.background = originalBg;
        targetItem.style.borderColor = '#555';
        targetItem.style.transform = 'scale(1)';

        setTimeout(() => {
          if (tooltip.parentNode) tooltip.remove();
        }, 300);
      }
    }, 3000);
  }

  showMessage(message, type = 'info', scrollToTop = false) {
    // 1. 在侧边栏顶部显示消息
    const container = document.getElementById('rei-config-container');
    if (!container) return;

    // 移除旧的同类型消息，避免堆积
    const oldMessages = container.querySelectorAll(
      `.rei-config-message-${type}`
    );
    oldMessages.forEach((msg) => msg.remove());

    const messageEl = document.createElement('div');
    messageEl.className = `rei-config-message rei-config-message-${type}`;
    messageEl.textContent = message;
    messageEl.style.cssText = `
            padding: 8px 12px;
            margin-bottom: 10px;
            border-radius: 4px;
            font-size: 12px;
            position: relative;
            z-index: 1000;
            animation: slideInMessage 0.3s ease-out;
            ${type === 'success' ? 'background: #4CAF50; color: white;' : ''}
            ${
              type === 'error'
                ? 'background: #f44336; color: white; box-shadow: 0 2px 8px rgba(244, 67, 54, 0.3);'
                : ''
            }
            ${type === 'info' ? 'background: #2196F3; color: white;' : ''}
        `;

    container.insertBefore(messageEl, container.firstChild);

    // 2. 如果是重要消息（错误），自动滚动到顶部并高亮显示
    if (type === 'error' || scrollToTop) {
      container.scrollTo({
        top: 0,
        behavior: 'smooth',
      });

      // 高亮效果
      messageEl.style.animation = 'pulseError 0.6s ease-in-out 3';
    }

    // 3. 显示时长根据消息类型调整
    const duration = type === 'error' ? 5000 : 3000; // 错误消息显示更久

    setTimeout(() => {
      if (messageEl.parentNode) {
        messageEl.style.animation = 'slideOutMessage 0.3s ease-in';
        setTimeout(() => {
          if (messageEl.parentNode) {
            messageEl.parentNode.removeChild(messageEl);
          }
        }, 300);
      }
    }, duration);
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
      const typeInfo = this.configTypes[key];
      const configType =
        typeInfo?.type ||
        (this.isTokenType(key, value) ? 'token' : typeof value);
      const isToken = configType === 'token';
      const isEncrypted = typeInfo?.encrypted || false;
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
                             )}${
        isToken ? (isEncrypted ? ' 🔐' : ' 🔒') : ''
      }</div>
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
    // 优先使用保存的类型信息，否则使用 JavaScript 类型推断
    const typeInfo = this.configTypes[key];
    const type =
      typeInfo?.type || (this.isTokenType(key, value) ? 'token' : typeof value);
    const isEncrypted = typeInfo?.encrypted || false;

    // 检查加密配置项的编辑权限
    if (isEncrypted) {
      const encryptionEnabled = document.getElementById(
        'rei-encryption-enabled'
      ).checked;
      const password = document.getElementById('rei-encryption-password').value;

      if (!encryptionEnabled || !password) {
        // 显示就近提示和顶部消息
        this.showInlineError(key, '⚠️ 请先启用加密并输入密码才能编辑此配置项');
        this.showMessage(
          '⚠️ 无法编辑加密配置项：请先启用加密并输入密码',
          'error',
          true
        );
        return;
      }
    }

    // 对于加密的配置项，需要先验证解密是否成功
    if (isEncrypted && type === 'token') {
      const password = document.getElementById('rei-encryption-password').value;
      this.decryptToken(String(value), password)
        .then((decryptedValue) => {
          // 解密成功，继续显示编辑表单
          this.proceedWithEdit(key, type, value, decryptedValue);
        })
        .catch((error) => {
          console.error('解密失败:', error);
          // 显示就近提示和顶部消息
          this.showInlineError(key, '⚠️ 密码错误，无法解密此配置项');
          this.showMessage('⚠️ 解密失败，请检查密码是否正确', 'error', true);
          // 解密失败时不显示编辑表单
          return;
        });
    } else {
      // 非加密配置项直接显示编辑表单
      this.proceedWithEdit(key, type, value, value);
    }
  }

  proceedWithEdit(key, type, originalValue, displayValue) {
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
        const keyGroup = JSON.parse(String(originalValue));
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
      document.getElementById('rei-config-value').value = String(displayValue);
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
    const typeInfo = this.configTypes[key];
    if (typeInfo?.type === 'token') {
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
      const isEncrypted = configType?.encrypted || false;

      // 检查加密配置项的复制权限
      if (isEncrypted) {
        const encryptionEnabled = document.getElementById(
          'rei-encryption-enabled'
        ).checked;
        const password = document.getElementById(
          'rei-encryption-password'
        ).value;

        if (!encryptionEnabled || !password) {
          // 显示就近提示和顶部消息
          this.showInlineError(
            key,
            '⚠️ 请先启用加密并输入密码才能复制此配置项'
          );
          this.showMessage(
            '⚠️ 无法复制加密配置项：请先启用加密并输入密码',
            'error',
            true
          );
          return;
        }
      }

      let copyValue;

      if (configType?.type === '3KeyGroup') {
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
      } else if (isEncrypted && configType?.type === 'token') {
        // 对于加密的 token，解密后复制
        const password = document.getElementById(
          'rei-encryption-password'
        ).value;
        try {
          copyValue = await this.decryptToken(String(value), password);
        } catch (error) {
          console.error('解密失败:', error);
          this.showMessage('⚠️ 解密失败，请检查密码是否正确', 'error');
          return;
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
      const currentTypeValue = typeSelect.value; // 保存当前类型值
      const newValueInput = valueInput.cloneNode(true);
      const newTypeSelect = typeSelect.cloneNode(true);
      newTypeSelect.value = currentTypeValue; // 恢复类型值
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

    // 添加动画样式
    if (!document.getElementById('rei-config-animations')) {
      const styleEl = document.createElement('style');
      styleEl.id = 'rei-config-animations';
      styleEl.textContent = `
        @keyframes slideInMessage {
          from { transform: translateY(-20px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        @keyframes slideOutMessage {
          from { transform: translateY(0); opacity: 1; }
          to { transform: translateY(-20px); opacity: 0; }
        }
        @keyframes pulseError {
          0% { transform: scale(1); box-shadow: 0 2px 8px rgba(244, 67, 54, 0.3); }
          50% { transform: scale(1.02); box-shadow: 0 4px 16px rgba(244, 67, 54, 0.6); }
          100% { transform: scale(1); box-shadow: 0 2px 8px rgba(244, 67, 54, 0.3); }
        }
        @keyframes popInError {
          0% { transform: translateY(-50%) scale(0.8); opacity: 0; }
          50% { transform: translateY(-50%) scale(1.05); opacity: 0.9; }
          100% { transform: translateY(-50%) scale(1); opacity: 1; }
        }
        @keyframes popOutError {
          0% { transform: translateY(-50%) scale(1); opacity: 1; }
          100% { transform: translateY(-50%) scale(0.8); opacity: 0; }
        }
      `;
      document.head.appendChild(styleEl);
    }

    container.innerHTML = `
            <div style="margin-bottom: 16px;">
                <h3 style="margin: 0 0 12px 0; color: #fff; font-size: 16px;">配置管理器</h3>
                
                <!-- 加密设置 -->
                <div style="
                    background: #333;
                    border: 1px solid #555;
                    border-radius: 6px;
                    padding: 12px;
                    margin-bottom: 12px;
                ">
                    <h4 style="margin: 0 0 8px 0; color: #4CAF50; font-size: 13px;">🔐 Token 加密设置</h4>
                    <div style="display: flex; align-items: center; margin-bottom: 8px;">
                        <input type="checkbox" id="rei-encryption-enabled" style="margin-right: 8px;">
                        <label for="rei-encryption-enabled" style="color: #ccc; font-size: 12px;">启用 Token 加密存储</label>
                    </div>
                    <div id="rei-encryption-password-section" style="display: none;">
                        <label style="display: block; margin-bottom: 4px; color: #ccc; font-size: 11px;">加密密码:</label>
                        <input type="password" id="rei-encryption-password" placeholder="请输入加密密码" style="
                            width: 100%;
                            padding: 6px;
                            border: 1px solid #666;
                            background: #444;
                            color: white;
                            border-radius: 4px;
                            font-size: 12px;
                            box-sizing: border-box;
                        ">
                        <div style="color: #999; font-size: 10px; margin-top: 4px;">
                            ⚠️ 请牢记此密码，丢失后无法恢复加密的 Token
                        </div>
                    </div>
                </div>
                
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

      // 绑定加密设置事件
      const encryptionCheckbox = document.getElementById(
        'rei-encryption-enabled'
      );
      const passwordSection = document.getElementById(
        'rei-encryption-password-section'
      );

      if (encryptionCheckbox && passwordSection) {
        encryptionCheckbox.onchange = () => {
          if (encryptionCheckbox.checked) {
            passwordSection.style.display = 'block';
          } else {
            passwordSection.style.display = 'none';
            document.getElementById('rei-encryption-password').value = '';
          }
        };
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
