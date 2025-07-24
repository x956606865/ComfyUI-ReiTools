import React, { useState, useEffect, useCallback } from 'react';
import './FileSelector.css';

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
  breadcrumbs: Array<{ name: string; path: string }>;
  total_items: number;
  total_files: number;
  total_directories: number;
  base_path: string;
  current_time: string;
}

interface FileSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (path: string, type: 'file' | 'directory') => void;
  mode: 'file' | 'directory' | 'both';
  title?: string;
  allowedExtensions?: string[];
}

const FileSelector: React.FC<FileSelectorProps> = ({
  isOpen,
  onClose,
  onSelect,
  mode = 'both',
  title = '选择文件',
  allowedExtensions = [],
}) => {
  const [currentPath, setCurrentPath] = useState<string>('');
  const [items, setItems] = useState<FileItem[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [selectedItem, setSelectedItem] = useState<FileItem | null>(null);
  const [parentPath, setParentPath] = useState<string | null>(null);
  const [breadcrumbs, setBreadcrumbs] = useState<
    Array<{ name: string; path: string }>
  >([]);
  const [directoryInfo, setDirectoryInfo] = useState<{
    name: string;
    total_files: number;
    total_directories: number;
  } | null>(null);

  // 获取目录内容
  const fetchDirectoryContents = useCallback(
    async (path: string = '') => {
      setLoading(true);
      setError('');

      try {
        const showFiles = mode === 'file' || mode === 'both';
        let url = `/api/rei/filesystem/browse?path=${encodeURIComponent(
          path
        )}&show_files=${showFiles}`;

        // 添加文件类型过滤
        if (allowedExtensions.length > 0) {
          url += `&file_types=${allowedExtensions.join(',')}`;
        }

        const response = await fetch(url);

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || '获取目录内容失败');
        }

        const data: DirectoryData = await response.json();

        if (data.type !== 'directory') {
          // 如果访问的是文件，返回其父目录
          const parentDir = path.split('/').slice(0, -1).join('/');
          await fetchDirectoryContents(parentDir);
          return;
        }

        setItems(data.items);
        setCurrentPath(data.path);
        setParentPath(data.parent_path);
        setBreadcrumbs(data.breadcrumbs || []);
        setDirectoryInfo({
          name: data.name,
          total_files: data.total_files,
          total_directories: data.total_directories,
        });
        setSelectedItem(null);
      } catch (err) {
        console.error('获取目录内容失败:', err);
        setError(err instanceof Error ? err.message : '获取目录内容失败');
      } finally {
        setLoading(false);
      }
    },
    [mode, allowedExtensions]
  );

  // 组件挂载时加载根目录
  useEffect(() => {
    if (isOpen) {
      fetchDirectoryContents('');
    }
  }, [isOpen, fetchDirectoryContents]);

  // 处理双击事件
  const handleDoubleClick = (item: FileItem) => {
    if (item.type === 'directory') {
      fetchDirectoryContents(item.path);
    } else if (mode === 'file' || mode === 'both') {
      onSelect(item.path, item.type);
      onClose();
    }
  };

  // 处理单击选择
  const handleItemSelect = (item: FileItem) => {
    setSelectedItem(item);
  };

  // 处理返回上级目录
  const handleGoBack = () => {
    fetchDirectoryContents(parentPath || '');
  };

  // 处理确认选择
  const handleConfirm = () => {
    if (!selectedItem) return;

    // 检查模式匹配
    if (mode === 'file' && selectedItem.type !== 'file') return;
    if (mode === 'directory' && selectedItem.type !== 'directory') return;

    onSelect(selectedItem.path, selectedItem.type);
    onClose();
  };

  // 格式化文件大小
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // 格式化修改时间
  const formatModifiedTime = (timestamp: number): string => {
    return new Date(timestamp * 1000).toLocaleString('zh-CN');
  };

  // 获取文件图标
  const getFileIcon = (item: FileItem): string => {
    if (item.type === 'directory') {
      return '📁';
    }

    // 优先使用后端提供的图标
    if (item.icon) {
      return item.icon;
    }

    // 后备方案：根据扩展名判断
    const extension =
      item.extension || item.name.split('.').pop()?.toLowerCase();
    switch (extension) {
      case 'png':
      case 'jpg':
      case 'jpeg':
      case 'gif':
      case 'webp':
        return '🖼️';
      case 'txt':
      case 'md':
        return '📄';
      case 'json':
        return '📋';
      case 'py':
        return '🐍';
      case 'js':
      case 'ts':
        return '📜';
      default:
        return '📄';
    }
  };

  // 处理面包屑点击
  const handleBreadcrumbClick = (path: string) => {
    fetchDirectoryContents(path);
  };

  if (!isOpen) return null;

  return (
    <div className="file-selector-overlay">
      <div className="file-selector-modal">
        <div className="file-selector-header">
          <h3>{title}</h3>
          <button className="close-button" onClick={onClose}>
            ×
          </button>
        </div>

        <div className="file-selector-toolbar">
          <div className="breadcrumb-nav">
            <button
              className="breadcrumb-item root"
              onClick={() => handleBreadcrumbClick('')}
              disabled={loading}
            >
              🏠 {directoryInfo?.name || 'ComfyUI'}
            </button>
            {breadcrumbs.map((crumb, index) => (
              <React.Fragment key={crumb.path}>
                <span className="breadcrumb-separator">/</span>
                <button
                  className="breadcrumb-item"
                  onClick={() => handleBreadcrumbClick(crumb.path)}
                  disabled={loading}
                >
                  {crumb.name}
                </button>
              </React.Fragment>
            ))}
          </div>

          <div className="toolbar-actions">
            {parentPath !== null && (
              <button
                className="back-button"
                onClick={handleGoBack}
                disabled={loading}
              >
                ⬆️ 返回上级
              </button>
            )}
          </div>
        </div>

        {directoryInfo && (
          <div className="directory-info">
            <span className="info-item">
              📂 {directoryInfo.total_directories} 个文件夹
            </span>
            <span className="info-item">
              📄 {directoryInfo.total_files} 个文件
            </span>
          </div>
        )}

        <div className="file-selector-content">
          {loading && <div className="loading-message">加载中...</div>}

          {error && <div className="error-message">错误: {error}</div>}

          {!loading && !error && (
            <div className="file-list">
              {items.length === 0 ? (
                <div className="empty-message">
                  此目录为空或没有符合条件的文件
                </div>
              ) : (
                items.map((item) => (
                  <div
                    key={item.path}
                    className={`file-item ${
                      selectedItem?.path === item.path ? 'selected' : ''
                    }`}
                    onClick={() => handleItemSelect(item)}
                    onDoubleClick={() => handleDoubleClick(item)}
                  >
                    <div className="file-item-icon">{getFileIcon(item)}</div>
                    <div className="file-item-info">
                      <div className="file-item-name">{item.name}</div>
                      <div className="file-item-details">
                        {item.type === 'directory' ? (
                          <span>
                            {item.children_count || 0} 项
                            {item.file_count !== undefined &&
                              item.dir_count !== undefined && (
                                <span className="detailed-count">
                                  {' '}
                                  ({item.dir_count} 文件夹, {item.file_count}{' '}
                                  文件)
                                </span>
                              )}
                          </span>
                        ) : (
                          <>
                            <span>{formatFileSize(item.size || 0)}</span>
                            {item.extension && (
                              <span className="file-extension">
                                .{item.extension}
                              </span>
                            )}
                            {item.modified && (
                              <span>
                                {' '}
                                • {formatModifiedTime(item.modified)}
                              </span>
                            )}
                          </>
                        )}
                      </div>
                      {!item.is_readable && (
                        <div className="file-warning">⚠️ 无读取权限</div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        <div className="file-selector-footer">
          <div className="selected-info">
            {selectedItem && (
              <span>
                已选择: {selectedItem.name} (
                {selectedItem.type === 'directory' ? '文件夹' : '文件'})
              </span>
            )}
          </div>

          <div className="action-buttons">
            <button className="cancel-button" onClick={onClose}>
              取消
            </button>
            <button
              className="confirm-button"
              onClick={handleConfirm}
              disabled={
                !selectedItem ||
                (mode === 'file' && selectedItem.type !== 'file') ||
                (mode === 'directory' && selectedItem.type !== 'directory')
              }
            >
              确认选择
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FileSelector;
