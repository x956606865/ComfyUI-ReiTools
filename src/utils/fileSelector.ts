/**
 * 文件选择器工具函数
 * 提供简单易用的API来打开文件选择器弹框
 */

interface FileSelectOptions {
  mode?: 'file' | 'directory' | 'both';
  title?: string;
  allowedExtensions?: string[];
  initialPath?: string;
  baseDir?: string; // 新增：指定base目录
}

interface FileSelectResult {
  path: string;
  type: 'file' | 'directory';
  name: string;
}

interface FileItem {
  name: string;
  path: string;
  type: 'file' | 'directory';
  size?: number;
  modified?: number;
  created?: number;
  children_count?: number;
  file_count?: number;
  dir_count?: number;
  extension?: string;
  icon?: string;
  category?: string;
  is_readable?: boolean;
  is_writable?: boolean;
}

interface DirectoryData {
  type: 'directory';
  name: string;
  path: string;
  parent_path: string | null;
  items: FileItem[];
  breadcrumbs: Array<{
    name: string;
    path: string;
    is_base?: boolean;
    base_dir?: string;
  }>;
  total_items: number;
  total_files: number;
  total_directories: number;
  base_path: string;
  base_dir?: string; // 新增：当前使用的base目录
  comfyui_root?: string; // 新增：ComfyUI根目录信息
  current_time: string;
}

/**
 * 获取ComfyUI文件系统数据
 */
export async function fetchFileSystemData(
  path: string = '',
  showFiles: boolean = true
) {
  try {
    const response = await fetch(
      `/api/rei/filesystem/browse?path=${encodeURIComponent(
        path
      )}&show_files=${showFiles}`
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || '获取目录内容失败');
    }

    return await response.json();
  } catch (error) {
    console.error('获取文件系统数据失败:', error);
    throw error;
  }
}

/**
 * 获取系统文件系统数据（从根目录开始）
 */
export async function fetchSystemFileSystemData(
  path: string = '',
  showFiles: boolean = true
) {
  try {
    const response = await fetch(
      `/api/rei/filesystem/browse-system?path=${encodeURIComponent(
        path
      )}&show_files=${showFiles}`
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || '获取系统目录内容失败');
    }

    return await response.json();
  } catch (error) {
    console.error('获取系统文件系统数据失败:', error);
    throw error;
  }
}

/**
 * 创建文件选择器Promise
 * 返回一个Promise，用户选择文件后resolve，取消时reject
 */
export function createFileSelector(
  options: FileSelectOptions = {}
): Promise<FileSelectResult> {
  const {
    mode = 'both',
    title = '选择文件',
    allowedExtensions = [],
    initialPath = '',
  } = options;

  return new Promise((resolve, reject) => {
    createNativeFileSelector(options, resolve, reject);
  });
}

/**
 * 创建系统文件选择器Promise（从系统根目录开始）
 * 返回一个Promise，用户选择文件后resolve，取消时reject
 */
export function createSystemFileSelector(
  options: FileSelectOptions = {}
): Promise<FileSelectResult> {
  const {
    mode = 'both',
    title = '选择文件',
    allowedExtensions = [],
    initialPath = '',
  } = options;

  return new Promise((resolve, reject) => {
    createNativeSystemFileSelector(options, resolve, reject);
  });
}

/**
 * 创建原生HTML版本的文件选择器
 */
async function createNativeFileSelector(
  options: FileSelectOptions,
  resolve: (result: FileSelectResult) => void,
  reject: (error: Error) => void
) {
  const {
    mode = 'both',
    title = '选择文件',
    allowedExtensions = [],
    initialPath = '',
  } = options;

  // 状态变量
  let currentPath = initialPath;
  let selectedItem: FileItem | null = null;
  let parentPath: string | null = null;

  // 创建遮罩层
  const overlay = document.createElement('div');
  overlay.className = 'file-selector-overlay';
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

  // 创建弹框
  const modal = document.createElement('div');
  modal.className = 'file-selector-modal';
  modal.style.cssText = `
    background: #2b2b2b;
    border-radius: 8px;
    width: 80%;
    max-width: 800px;
    height: 80%;
    max-height: 600px;
    display: flex;
    flex-direction: column;
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
    color: #ffffff;
  `;

  // 创建标题栏
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
    color: #ffffff;
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
    reject(new Error('用户取消选择'));
  });

  closeButton.addEventListener('mouseover', () => {
    closeButton.style.backgroundColor = '#555555';
  });

  closeButton.addEventListener('mouseout', () => {
    closeButton.style.backgroundColor = 'transparent';
  });

  header.appendChild(titleElement);
  header.appendChild(closeButton);

  // 创建工具栏
  const toolbar = document.createElement('div');
  toolbar.style.cssText = `
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px 20px;
    border-bottom: 1px solid #404040;
    background: #2a2a2a;
    flex-wrap: wrap;
    gap: 8px;
  `;

  const pathDisplay = document.createElement('div');
  pathDisplay.style.cssText = `
    font-size: 14px;
    color: #cccccc;
    flex: 1;
    min-width: 0;
  `;

  const backButton = document.createElement('button');
  backButton.textContent = '⬆️ 返回上级';
  backButton.style.cssText = `
    background: #444444;
    border: 1px solid #666666;
    color: #ffffff;
    padding: 6px 12px;
    border-radius: 4px;
    cursor: pointer;
    font-size: 14px;
    transition: all 0.2s;
  `;

  backButton.addEventListener('mouseover', () => {
    if (!backButton.disabled) {
      backButton.style.backgroundColor = '#555555';
      backButton.style.borderColor = '#4CAF50';
    }
  });

  backButton.addEventListener('mouseout', () => {
    if (!backButton.disabled) {
      backButton.style.backgroundColor = '#444444';
      backButton.style.borderColor = '#666666';
    }
  });

  toolbar.appendChild(pathDisplay);
  toolbar.appendChild(backButton);

  // 创建目录信息栏
  const infoBar = document.createElement('div');
  infoBar.style.cssText = `
    display: flex;
    align-items: center;
    gap: 16px;
    padding: 8px 20px;
    background: rgba(76, 175, 80, 0.1);
    border-bottom: 1px solid #404040;
    font-size: 12px;
    color: #cccccc;
  `;

  // 创建内容区域
  const content = document.createElement('div');
  content.style.cssText = `
    flex: 1;
    overflow-y: auto;
    padding: 8px;
  `;

  // 创建底部按钮区域
  const footer = document.createElement('div');
  footer.style.cssText = `
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 16px 20px;
    border-top: 1px solid #404040;
    background: #2a2a2a;
    border-radius: 0 0 8px 8px;
  `;

  const selectedInfo = document.createElement('div');
  selectedInfo.style.cssText = `
    font-size: 14px;
    color: #cccccc;
    flex: 1;
  `;

  const buttonGroup = document.createElement('div');
  buttonGroup.style.cssText = `
    display: flex;
    gap: 12px;
  `;

  const cancelButton = document.createElement('button');
  cancelButton.textContent = '取消';
  cancelButton.style.cssText = `
    background: #666666;
    color: #ffffff;
    border: none;
    padding: 8px 16px;
    border-radius: 4px;
    cursor: pointer;
    font-size: 14px;
    font-weight: 500;
    transition: background-color 0.2s;
  `;

  cancelButton.addEventListener('mouseover', () => {
    cancelButton.style.backgroundColor = '#777777';
  });

  cancelButton.addEventListener('mouseout', () => {
    cancelButton.style.backgroundColor = '#666666';
  });

  const confirmButton = document.createElement('button');
  confirmButton.textContent = '确认选择';
  confirmButton.style.cssText = `
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
  confirmButton.disabled = true;
  confirmButton.style.opacity = '0.5';
  confirmButton.style.cursor = 'not-allowed';

  confirmButton.addEventListener('mouseover', () => {
    if (!confirmButton.disabled) {
      confirmButton.style.backgroundColor = '#45a049';
    }
  });

  confirmButton.addEventListener('mouseout', () => {
    if (!confirmButton.disabled) {
      confirmButton.style.backgroundColor = '#4CAF50';
    }
  });

  buttonGroup.appendChild(cancelButton);
  buttonGroup.appendChild(confirmButton);
  footer.appendChild(selectedInfo);
  footer.appendChild(buttonGroup);

  // 事件处理
  cancelButton.addEventListener('click', () => {
    document.body.removeChild(overlay);
    reject(new Error('用户取消选择'));
  });

  confirmButton.addEventListener('click', () => {
    if (selectedItem) {
      document.body.removeChild(overlay);
      resolve({
        path: selectedItem.path,
        type: selectedItem.type,
        name: selectedItem.name,
      });
    }
  });

  // 格式化文件大小
  function formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  // 格式化修改时间
  function formatModifiedTime(timestamp: number): string {
    return new Date(timestamp * 1000).toLocaleString('zh-CN');
  }

  // 加载目录内容的函数
  async function loadDirectory(path: string) {
    content.innerHTML =
      '<div style="text-align: center; padding: 40px; color: #cccccc; font-size: 16px;">📂 加载中...</div>';
    pathDisplay.innerHTML = '加载中...';
    infoBar.innerHTML = '';

    // 重置选择状态
    selectedItem = null;
    selectedInfo.textContent = '';
    confirmButton.disabled = true;
    confirmButton.style.opacity = '0.5';
    confirmButton.style.cursor = 'not-allowed';

    try {
      const showFiles = mode === 'file' || mode === 'both';
      let url = `/api/rei/filesystem/browse?path=${encodeURIComponent(
        path
      )}&show_files=${showFiles}`;

      // 添加base_dir参数支持
      if (options.baseDir) {
        url += `&base_dir=${encodeURIComponent(options.baseDir)}`;
      }

      if (allowedExtensions.length > 0) {
        url += `&file_types=${allowedExtensions.join(',')}`;
      }

      const response = await fetch(url);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.error || `HTTP ${response.status}: ${response.statusText}`
        );
      }

      const data: DirectoryData = await response.json();

      if (data.type !== 'directory') {
        throw new Error('响应数据格式错误');
      }

      currentPath = data.path;
      parentPath = data.parent_path;

      // 更新路径显示
      pathDisplay.innerHTML = `
        <span style="color: #999;">当前路径:</span>
        <span style="color: #4CAF50; font-family: monospace; margin-left: 8px; font-weight: bold;">
          ${data.path || '根目录'}
        </span>
      `;

      // 更新目录信息
      infoBar.innerHTML = `
        <span>📂 ${data.total_directories} 个文件夹</span>
        <span>📄 ${data.total_files} 个文件</span>
        <span>📊 共 ${data.total_items} 项</span>
      `;

      // 更新返回按钮状态
      backButton.disabled = parentPath === null;
      backButton.style.opacity = parentPath === null ? '0.5' : '1';
      backButton.style.cursor = parentPath === null ? 'not-allowed' : 'pointer';

      // 清空内容区域
      content.innerHTML = '';

      if (data.items.length === 0) {
        content.innerHTML = `
          <div style="text-align: center; padding: 60px 20px; color: #999999;">
            <div style="font-size: 48px; margin-bottom: 16px;">📂</div>
            <div style="font-size: 16px; margin-bottom: 8px;">此目录为空</div>
            <div style="font-size: 14px; color: #666;">没有符合条件的文件或文件夹</div>
          </div>
        `;
        return;
      }

      // 渲染文件列表
      data.items.forEach((item: FileItem) => {
        const itemElement = document.createElement('div');
        itemElement.style.cssText = `
          display: flex;
          align-items: center;
          padding: 12px 16px;
          margin: 2px 0;
          border-radius: 6px;
          cursor: pointer;
          transition: all 0.2s;
          border: 2px solid transparent;
        `;

        itemElement.addEventListener('mouseenter', () => {
          if (!itemElement.classList.contains('selected')) {
            itemElement.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
          }
        });

        itemElement.addEventListener('mouseleave', () => {
          if (!itemElement.classList.contains('selected')) {
            itemElement.style.backgroundColor = 'transparent';
          }
        });

        const icon = document.createElement('div');
        icon.style.cssText = `
          font-size: 20px;
          margin-right: 12px;
          width: 24px;
          text-align: center;
        `;
        icon.textContent =
          item.icon || (item.type === 'directory' ? '📁' : '📄');

        const info = document.createElement('div');
        info.style.cssText = `flex: 1; min-width: 0;`;

        const name = document.createElement('div');
        name.style.cssText = `
          font-size: 14px;
          font-weight: 500;
          color: #ffffff;
          margin-bottom: 2px;
          word-break: break-word;
        `;
        name.textContent = item.name;

        const details = document.createElement('div');
        details.style.cssText = `
          font-size: 12px;
          color: #999999;
        `;

        if (item.type === 'directory') {
          let detailText = `${item.children_count || 0} 项`;
          if (item.file_count !== undefined && item.dir_count !== undefined) {
            detailText += ` (${item.dir_count} 文件夹, ${item.file_count} 文件)`;
          }
          details.innerHTML = detailText;
        } else {
          let detailText = formatFileSize(item.size || 0);
          if (item.extension) {
            detailText += ` <span style="color: #4CAF50; font-weight: 500; margin-left: 4px;">.${item.extension}</span>`;
          }
          if (item.modified) {
            detailText += ` • ${formatModifiedTime(item.modified)}`;
          }
          details.innerHTML = detailText;
        }

        info.appendChild(name);
        info.appendChild(details);

        // 添加权限警告
        if (item.is_readable === false) {
          const warning = document.createElement('div');
          warning.style.cssText = `
            font-size: 11px;
            color: #f44336;
            margin-top: 2px;
          `;
          warning.textContent = '⚠️ 无读取权限';
          info.appendChild(warning);
        }

        itemElement.appendChild(icon);
        itemElement.appendChild(info);

        // 点击事件
        itemElement.addEventListener('click', () => {
          // 移除其他选中状态
          content.querySelectorAll('.selected').forEach((el) => {
            el.classList.remove('selected');
            (el as HTMLElement).style.backgroundColor = 'transparent';
            (el as HTMLElement).style.borderColor = 'transparent';
          });

          // 设置当前选中
          itemElement.classList.add('selected');
          itemElement.style.backgroundColor = 'rgba(76, 175, 80, 0.2)';
          itemElement.style.borderColor = '#4CAF50';

          selectedItem = item;
          selectedInfo.textContent = `已选择: ${item.name} (${
            item.type === 'directory' ? '文件夹' : '文件'
          })`;

          // 检查选择是否有效
          const isValidSelection =
            mode === 'both' ||
            (mode === 'file' && item.type === 'file') ||
            (mode === 'directory' && item.type === 'directory');

          confirmButton.disabled = !isValidSelection;
          confirmButton.style.opacity = isValidSelection ? '1' : '0.5';
          confirmButton.style.cursor = isValidSelection
            ? 'pointer'
            : 'not-allowed';
        });

        // 双击事件
        itemElement.addEventListener('dblclick', () => {
          if (item.type === 'directory') {
            loadDirectory(item.path);
          } else if (mode === 'file' || mode === 'both') {
            document.body.removeChild(overlay);
            resolve({
              path: item.path,
              type: item.type,
              name: item.name,
            });
          }
        });

        content.appendChild(itemElement);
      });
    } catch (error) {
      content.innerHTML = `
        <div style="text-align: center; padding: 60px 20px; color: #f44336;">
          <div style="font-size: 48px; margin-bottom: 16px;">❌</div>
          <div style="font-size: 16px; margin-bottom: 8px;">加载失败</div>
          <div style="font-size: 14px; color: #999;">${
            error instanceof Error ? error.message : '未知错误'
          }</div>
          <button onclick="location.reload()" style="
            margin-top: 16px;
            background: #4CAF50;
            color: white;
            border: none;
            padding: 8px 16px;
            border-radius: 4px;
            cursor: pointer;
          ">重试</button>
        </div>
      `;

      pathDisplay.innerHTML = '<span style="color: #f44336;">加载失败</span>';
      infoBar.innerHTML = '';
    }
  }

  // 返回按钮事件
  backButton.addEventListener('click', () => {
    if (parentPath !== null) {
      loadDirectory(parentPath);
    }
  });

  // 组装弹框
  modal.appendChild(header);
  modal.appendChild(toolbar);
  modal.appendChild(infoBar);
  modal.appendChild(content);
  modal.appendChild(footer);
  overlay.appendChild(modal);

  // 阻止点击弹框时关闭
  modal.addEventListener('click', (e) => {
    e.stopPropagation();
  });

  // 点击遮罩层关闭
  overlay.addEventListener('click', () => {
    document.body.removeChild(overlay);
    reject(new Error('用户取消选择'));
  });

  // 添加到页面并加载初始目录
  document.body.appendChild(overlay);
  loadDirectory(currentPath);
}

/**
 * 创建原生HTML版本的系统文件选择器（从系统根目录开始）
 */
async function createNativeSystemFileSelector(
  options: FileSelectOptions,
  resolve: (result: FileSelectResult) => void,
  reject: (error: Error) => void
) {
  const {
    mode = 'both',
    title = '选择文件',
    allowedExtensions = [],
    initialPath = '',
  } = options;

  // 状态变量
  // 如果有initialPath，使用它作为起始路径，否则从系统根目录开始
  let currentPath = initialPath || '';
  let selectedItem: FileItem | null = null;
  let parentPath: string | null = null;

  // 创建遮罩层
  const overlay = document.createElement('div');
  overlay.className = 'file-selector-overlay';
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

  // 创建弹框
  const modal = document.createElement('div');
  modal.className = 'file-selector-modal';
  modal.style.cssText = `
    background: #2b2b2b;
    border-radius: 8px;
    width: 80%;
    max-width: 800px;
    height: 80%;
    max-height: 600px;
    display: flex;
    flex-direction: column;
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
    color: #ffffff;
  `;

  // 创建标题栏
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
    color: #ffffff;
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
    reject(new Error('用户取消选择'));
  });

  closeButton.addEventListener('mouseover', () => {
    closeButton.style.backgroundColor = '#555555';
  });

  closeButton.addEventListener('mouseout', () => {
    closeButton.style.backgroundColor = 'transparent';
  });

  header.appendChild(titleElement);
  header.appendChild(closeButton);

  // 创建工具栏
  const toolbar = document.createElement('div');
  toolbar.style.cssText = `
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px 20px;
    border-bottom: 1px solid #404040;
    background: #2a2a2a;
    flex-wrap: wrap;
    gap: 8px;
  `;

  const pathDisplay = document.createElement('div');
  pathDisplay.style.cssText = `
    font-size: 14px;
    color: #cccccc;
    flex: 1;
    min-width: 0;
  `;

  const backButton = document.createElement('button');
  backButton.textContent = '⬆️ 返回上级';
  backButton.style.cssText = `
    background: #444444;
    border: 1px solid #666666;
    color: #ffffff;
    padding: 6px 12px;
    border-radius: 4px;
    cursor: pointer;
    font-size: 14px;
    transition: all 0.2s;
  `;

  backButton.addEventListener('mouseover', () => {
    if (!backButton.disabled) {
      backButton.style.backgroundColor = '#555555';
      backButton.style.borderColor = '#4CAF50';
    }
  });

  backButton.addEventListener('mouseout', () => {
    if (!backButton.disabled) {
      backButton.style.backgroundColor = '#444444';
      backButton.style.borderColor = '#666666';
    }
  });

  toolbar.appendChild(pathDisplay);
  toolbar.appendChild(backButton);

  // 创建目录信息栏
  const infoBar = document.createElement('div');
  infoBar.style.cssText = `
    display: flex;
    align-items: center;
    gap: 16px;
    padding: 8px 20px;
    background: rgba(76, 175, 80, 0.1);
    border-bottom: 1px solid #404040;
    font-size: 12px;
    color: #cccccc;
  `;

  // 创建内容区域
  const content = document.createElement('div');
  content.style.cssText = `
    flex: 1;
    overflow-y: auto;
    padding: 8px;
  `;

  // 创建底部按钮区域
  const footer = document.createElement('div');
  footer.style.cssText = `
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 16px 20px;
    border-top: 1px solid #404040;
    background: #2a2a2a;
    border-radius: 0 0 8px 8px;
  `;

  const selectedInfo = document.createElement('div');
  selectedInfo.style.cssText = `
    font-size: 14px;
    color: #cccccc;
    flex: 1;
  `;

  const buttonGroup = document.createElement('div');
  buttonGroup.style.cssText = `
    display: flex;
    gap: 12px;
  `;

  const cancelButton = document.createElement('button');
  cancelButton.textContent = '取消';
  cancelButton.style.cssText = `
    background: #666666;
    color: #ffffff;
    border: none;
    padding: 8px 16px;
    border-radius: 4px;
    cursor: pointer;
    font-size: 14px;
    font-weight: 500;
    transition: background-color 0.2s;
  `;

  cancelButton.addEventListener('mouseover', () => {
    cancelButton.style.backgroundColor = '#777777';
  });

  cancelButton.addEventListener('mouseout', () => {
    cancelButton.style.backgroundColor = '#666666';
  });

  const confirmButton = document.createElement('button');
  confirmButton.textContent = '确认选择';
  confirmButton.style.cssText = `
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
  confirmButton.disabled = true;
  confirmButton.style.opacity = '0.5';
  confirmButton.style.cursor = 'not-allowed';

  confirmButton.addEventListener('mouseover', () => {
    if (!confirmButton.disabled) {
      confirmButton.style.backgroundColor = '#45a049';
    }
  });

  confirmButton.addEventListener('mouseout', () => {
    if (!confirmButton.disabled) {
      confirmButton.style.backgroundColor = '#4CAF50';
    }
  });

  buttonGroup.appendChild(cancelButton);
  buttonGroup.appendChild(confirmButton);
  footer.appendChild(selectedInfo);
  footer.appendChild(buttonGroup);

  // 事件处理
  cancelButton.addEventListener('click', () => {
    document.body.removeChild(overlay);
    reject(new Error('用户取消选择'));
  });

  confirmButton.addEventListener('click', () => {
    if (selectedItem) {
      document.body.removeChild(overlay);
      resolve({
        path: selectedItem.path,
        type: selectedItem.type,
        name: selectedItem.name,
      });
    }
  });

  // 格式化文件大小
  function formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  // 格式化修改时间
  function formatModifiedTime(timestamp: number): string {
    return new Date(timestamp * 1000).toLocaleString('zh-CN');
  }

  // 加载目录内容的函数
  async function loadDirectory(path: string) {
    content.innerHTML =
      '<div style="text-align: center; padding: 40px; color: #cccccc; font-size: 16px;">📂 加载中...</div>';
    pathDisplay.innerHTML = '加载中...';
    infoBar.innerHTML = '';

    // 重置选择状态
    selectedItem = null;
    selectedInfo.textContent = '';
    confirmButton.disabled = true;
    confirmButton.style.opacity = '0.5';
    confirmButton.style.cursor = 'not-allowed';

    try {
      const showFiles = mode === 'file' || mode === 'both';
      let url = `/api/rei/filesystem/browse-system?path=${encodeURIComponent(
        path
      )}&show_files=${showFiles}`;

      if (allowedExtensions.length > 0) {
        url += `&file_types=${allowedExtensions.join(',')}`;
      }

      const response = await fetch(url);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.error || `HTTP ${response.status}: ${response.statusText}`
        );
      }

      const data: DirectoryData = await response.json();

      if (data.type !== 'directory') {
        throw new Error('响应数据格式错误');
      }

      currentPath = data.path;
      parentPath = data.parent_path;

      // 更新路径显示
      pathDisplay.innerHTML = `
        <span style="color: #999;">当前路径:</span>
        <span style="color: #4CAF50; font-family: monospace; margin-left: 8px; font-weight: bold;">
          ${data.path || '系统根目录'}
        </span>
      `;

      // 更新目录信息
      infoBar.innerHTML = `
        <span>📂 ${data.total_directories} 个文件夹</span>
        <span>📄 ${data.total_files} 个文件</span>
        <span>📊 共 ${data.total_items} 项</span>
      `;

      // 更新返回按钮状态
      backButton.disabled = parentPath === null;
      backButton.style.opacity = parentPath === null ? '0.5' : '1';
      backButton.style.cursor = parentPath === null ? 'not-allowed' : 'pointer';

      // 清空内容区域
      content.innerHTML = '';

      if (data.items.length === 0) {
        content.innerHTML = `
          <div style="text-align: center; padding: 60px 20px; color: #999999;">
            <div style="font-size: 48px; margin-bottom: 16px;">📂</div>
            <div style="font-size: 16px; margin-bottom: 8px;">此目录为空</div>
            <div style="font-size: 14px; color: #666;">没有符合条件的文件或文件夹</div>
          </div>
        `;
        return;
      }

      // 渲染文件列表
      data.items.forEach((item: FileItem) => {
        const itemElement = document.createElement('div');
        itemElement.style.cssText = `
          display: flex;
          align-items: center;
          padding: 12px 16px;
          margin: 2px 0;
          border-radius: 6px;
          cursor: pointer;
          transition: all 0.2s;
          border: 2px solid transparent;
        `;

        itemElement.addEventListener('mouseenter', () => {
          if (!itemElement.classList.contains('selected')) {
            itemElement.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
          }
        });

        itemElement.addEventListener('mouseleave', () => {
          if (!itemElement.classList.contains('selected')) {
            itemElement.style.backgroundColor = 'transparent';
          }
        });

        const icon = document.createElement('div');
        icon.style.cssText = `
          font-size: 20px;
          margin-right: 12px;
          width: 24px;
          text-align: center;
        `;
        icon.textContent =
          item.icon || (item.type === 'directory' ? '📁' : '📄');

        const info = document.createElement('div');
        info.style.cssText = `flex: 1; min-width: 0;`;

        const name = document.createElement('div');
        name.style.cssText = `
          font-size: 14px;
          font-weight: 500;
          color: #ffffff;
          margin-bottom: 2px;
          word-break: break-word;
        `;
        name.textContent = item.name;

        const details = document.createElement('div');
        details.style.cssText = `
          font-size: 12px;
          color: #999999;
        `;

        if (item.type === 'directory') {
          let detailText = `${item.children_count || 0} 项`;
          if (item.file_count !== undefined && item.dir_count !== undefined) {
            detailText += ` (${item.dir_count} 文件夹, ${item.file_count} 文件)`;
          }
          details.innerHTML = detailText;
        } else {
          let detailText = formatFileSize(item.size || 0);
          if (item.extension) {
            detailText += ` <span style="color: #4CAF50; font-weight: 500; margin-left: 4px;">.${item.extension}</span>`;
          }
          if (item.modified) {
            detailText += ` • ${formatModifiedTime(item.modified)}`;
          }
          details.innerHTML = detailText;
        }

        info.appendChild(name);
        info.appendChild(details);

        // 添加权限警告
        if (item.is_readable === false) {
          const warning = document.createElement('div');
          warning.style.cssText = `
            font-size: 11px;
            color: #f44336;
            margin-top: 2px;
          `;
          warning.textContent = '⚠️ 无读取权限';
          info.appendChild(warning);
        }

        itemElement.appendChild(icon);
        itemElement.appendChild(info);

        // 点击事件
        itemElement.addEventListener('click', () => {
          // 移除其他选中状态
          content.querySelectorAll('.selected').forEach((el) => {
            el.classList.remove('selected');
            (el as HTMLElement).style.backgroundColor = 'transparent';
            (el as HTMLElement).style.borderColor = 'transparent';
          });

          // 设置当前选中
          itemElement.classList.add('selected');
          itemElement.style.backgroundColor = 'rgba(76, 175, 80, 0.2)';
          itemElement.style.borderColor = '#4CAF50';

          selectedItem = item;
          selectedInfo.textContent = `已选择: ${item.name} (${
            item.type === 'directory' ? '文件夹' : '文件'
          })`;

          // 检查选择是否有效
          const isValidSelection =
            mode === 'both' ||
            (mode === 'file' && item.type === 'file') ||
            (mode === 'directory' && item.type === 'directory');

          confirmButton.disabled = !isValidSelection;
          confirmButton.style.opacity = isValidSelection ? '1' : '0.5';
          confirmButton.style.cursor = isValidSelection
            ? 'pointer'
            : 'not-allowed';
        });

        // 双击事件
        itemElement.addEventListener('dblclick', () => {
          if (item.type === 'directory') {
            loadDirectory(item.path);
          } else if (mode === 'file' || mode === 'both') {
            document.body.removeChild(overlay);
            resolve({
              path: item.path,
              type: item.type,
              name: item.name,
            });
          }
        });

        content.appendChild(itemElement);
      });
    } catch (error) {
      content.innerHTML = `
        <div style="text-align: center; padding: 60px 20px; color: #f44336;">
          <div style="font-size: 48px; margin-bottom: 16px;">❌</div>
          <div style="font-size: 16px; margin-bottom: 8px;">加载失败</div>
          <div style="font-size: 14px; color: #999;">${
            error instanceof Error ? error.message : '未知错误'
          }</div>
          <button onclick="location.reload()" style="
            margin-top: 16px;
            background: #4CAF50;
            color: white;
            border: none;
            padding: 8px 16px;
            border-radius: 4px;
            cursor: pointer;
          ">重试</button>
        </div>
      `;

      pathDisplay.innerHTML = '<span style="color: #f44336;">加载失败</span>';
      infoBar.innerHTML = '';
    }
  }

  // 返回按钮事件
  backButton.addEventListener('click', () => {
    if (parentPath !== null) {
      loadDirectory(parentPath);
    }
  });

  // 组装弹框
  modal.appendChild(header);
  modal.appendChild(toolbar);
  modal.appendChild(infoBar);
  modal.appendChild(content);
  modal.appendChild(footer);
  overlay.appendChild(modal);

  // 阻止点击弹框时关闭
  modal.addEventListener('click', (e) => {
    e.stopPropagation();
  });

  // 点击遮罩层关闭
  overlay.addEventListener('click', () => {
    document.body.removeChild(overlay);
    reject(new Error('用户取消选择'));
  });

  // 添加到页面并加载初始目录
  document.body.appendChild(overlay);
  loadDirectory(currentPath);
}

/**
 * 简化的文件选择函数
 */
export async function selectFile(
  allowedExtensions?: string[]
): Promise<FileSelectResult> {
  return createFileSelector({
    mode: 'file',
    title: '选择文件',
    allowedExtensions,
  });
}

/**
 * 简化的文件夹选择函数
 */
export async function selectDirectory(
  baseDir?: string
): Promise<FileSelectResult> {
  return createFileSelector({
    mode: 'directory',
    title: '选择文件夹',
    baseDir: baseDir,
  });
}

/**
 * 选择模型文件夹 (从models目录开始)
 */
export async function selectModelDirectory(): Promise<FileSelectResult> {
  return createFileSelector({
    mode: 'directory',
    title: '选择模型文件夹',
    baseDir: 'models',
  });
}

/**
 * 选择Lora文件夹 (从models目录开始)
 */
export async function selectLoraDirectory(): Promise<FileSelectResult> {
  return createFileSelector({
    mode: 'directory',
    title: '选择Lora文件夹',
    baseDir: 'models',
  });
}

/**
 * 选择系统文件夹 (从系统根目录开始，或从指定路径开始)
 */
export async function selectSystemDirectory(
  initialPath?: string
): Promise<FileSelectResult> {
  return createSystemFileSelector({
    mode: 'directory',
    title: '选择系统文件夹',
    initialPath: initialPath || '',
  });
}

/**
 * 选择图片文件
 */
export async function selectImage(): Promise<FileSelectResult> {
  return selectFile(['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp', 'svg']);
}

/**
 * 选择文本文件
 */
export async function selectTextFile(): Promise<FileSelectResult> {
  return selectFile(['txt', 'md', 'json', 'csv', 'log']);
}

/**
 * 选择Python文件
 */
export async function selectPythonFile(): Promise<FileSelectResult> {
  return selectFile(['py', 'pyw']);
}

// 导出主要API
export const FileSelector = {
  create: createFileSelector,
  selectFile,
  selectDirectory,
  selectModelDirectory,
  selectLoraDirectory,
  selectSystemDirectory,
  selectImage,
  selectTextFile,
  selectPythonFile,
  fetchFileSystemData,
  fetchSystemFileSystemData,
};

export default FileSelector;
