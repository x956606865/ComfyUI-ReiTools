import os
import folder_paths
import json

def get_config_path():
    comfyui_root_path = folder_paths.base_path
    return os.path.join(comfyui_root_path, 'env_config.json')

def load_config():
    """加载 JSON 配置文件"""
    config_path = get_config_path()
    config_data = {}
    if not os.path.exists(config_path):
        return config_data # 文件不存在，返回空字典
    
    try:
        with open(config_path, 'r', encoding='utf-8') as f:
            config_data = json.load(f)
    except json.JSONDecodeError:
        print(f"[ConfigManager] 警告: {config_path} 文件格式错误，无法解析。")
    return config_data

def save_config(data):
    """将数据写入 JSON 配置文件"""
    config_path = get_config_path()
    try:
        with open(config_path, 'w', encoding='utf-8') as f:
            # indent=4 让 JSON 文件格式化，易于阅读
            # ensure_ascii=False 确保中文字符能正确写入
            json.dump(data, f, indent=4, ensure_ascii=False)
    except IOError as e:
        print(f"[ConfigManager] 错误: 无法写入配置文件 {config_path}。错误信息: {e}")