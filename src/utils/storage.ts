// 存储键名常量
const STORAGE_KEYS = {
  PANEL_CONFIG: 'reitools_panel_config',
  USER_PREFERENCES: 'reitools_user_preferences',
  WORKFLOW_TEMPLATES: 'reitools_workflow_templates',
};

// 面板配置类型
export interface PanelConfig {
  position: { x: number; y: number };
  size: { width: number; height: number };
  visible: boolean;
  activeTab: string;
}

// 用户偏好设置类型
export interface UserPreferences {
  enableShortcuts: boolean;
  showNodePreview: boolean;
  autoSave: boolean;
  defaultPosition: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  opacity: number;
}

// 默认配置
const DEFAULT_PANEL_CONFIG: PanelConfig = {
  position: { x: 50, y: 50 },
  size: { width: 350, height: 500 },
  visible: false,
  activeTab: 'tools',
};

const DEFAULT_USER_PREFERENCES: UserPreferences = {
  enableShortcuts: true,
  showNodePreview: true,
  autoSave: false,
  defaultPosition: 'top-left',
  opacity: 1.0,
};

// 通用存储函数
export const saveToStorage = (key: string, data: any): void => {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (error) {
    console.error('Failed to save to storage:', error);
  }
};

export const loadFromStorage = <T>(key: string, defaultValue: T): T => {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultValue;
  } catch (error) {
    console.error('Failed to load from storage:', error);
    return defaultValue;
  }
};

export const removeFromStorage = (key: string): void => {
  try {
    localStorage.removeItem(key);
  } catch (error) {
    console.error('Failed to remove from storage:', error);
  }
};

// 面板配置相关函数
export const savePanelConfig = (config: Partial<PanelConfig>): void => {
  const currentConfig = loadPanelConfig();
  const newConfig = { ...currentConfig, ...config };
  saveToStorage(STORAGE_KEYS.PANEL_CONFIG, newConfig);
};

export const loadPanelConfig = (): PanelConfig => {
  return loadFromStorage(STORAGE_KEYS.PANEL_CONFIG, DEFAULT_PANEL_CONFIG);
};

// 用户偏好设置相关函数
export const saveUserPreferences = (
  preferences: Partial<UserPreferences>
): void => {
  const currentPreferences = loadUserPreferences();
  const newPreferences = { ...currentPreferences, ...preferences };
  saveToStorage(STORAGE_KEYS.USER_PREFERENCES, newPreferences);
};

export const loadUserPreferences = (): UserPreferences => {
  return loadFromStorage(
    STORAGE_KEYS.USER_PREFERENCES,
    DEFAULT_USER_PREFERENCES
  );
};

// 工作流模板相关函数
export const saveWorkflowTemplate = (name: string, workflow: any): void => {
  const templates = loadWorkflowTemplates();
  templates[name] = {
    name,
    workflow,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  saveToStorage(STORAGE_KEYS.WORKFLOW_TEMPLATES, templates);
};

export const loadWorkflowTemplates = (): Record<string, any> => {
  return loadFromStorage(STORAGE_KEYS.WORKFLOW_TEMPLATES, {});
};

export const deleteWorkflowTemplate = (name: string): void => {
  const templates = loadWorkflowTemplates();
  delete templates[name];
  saveToStorage(STORAGE_KEYS.WORKFLOW_TEMPLATES, templates);
};

// 清理所有存储数据
export const clearAllStorageData = (): void => {
  Object.values(STORAGE_KEYS).forEach((key: string) => {
    removeFromStorage(key);
  });
};
