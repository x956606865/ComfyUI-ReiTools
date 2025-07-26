import json
from .utils import get_config_path, load_config, save_config

class ReiConfigManager:
    """
    配置管理节点 - 提供给前端侧边栏使用的 API
    """
    
    @classmethod
    def INPUT_TYPES(s):
        return {
            "required": {
                "action": (["get_all", "update", "delete", "add"],),
                "key": ("STRING", {"default": ""}),
                "value": ("STRING", {"default": "", "multiline": True}),
                "value_type": (["string", "integer", "float", "boolean"],),
            }
        }

    RETURN_TYPES = ("STRING",)
    RETURN_NAMES = ("result",)
    FUNCTION = "manage_config"
    CATEGORY = "ReiTools"
    OUTPUT_NODE = True

    def manage_config(self, action, key="", value="", value_type="string"):
        """
        管理配置的核心方法
        """
        try:
            if action == "get_all":
                # 获取所有配置
                config_data = load_config()
                result = json.dumps(config_data, ensure_ascii=False, indent=2)
                return {"ui": {"text": [f"当前配置:\n{result}"]}, "result": (result,)}
            
            elif action == "add" or action == "update":
                # 添加或更新配置
                if not key.strip():
                    error_msg = "错误: 键名不能为空"
                    return {"ui": {"text": [error_msg]}, "result": (error_msg,)}
                
                # 转换值类型
                converted_value = self._convert_value(value, value_type)
                if converted_value is None:
                    error_msg = f"错误: 无法将 '{value}' 转换为 {value_type} 类型"
                    return {"ui": {"text": [error_msg]}, "result": (error_msg,)}
                
                # 保存配置
                config_data = load_config()
                config_data[key] = converted_value
                save_config(config_data)
                
                success_msg = f"成功{'添加' if action == 'add' else '更新'}配置: {key} = {converted_value}"
                return {"ui": {"text": [success_msg]}, "result": (success_msg,)}
            
            elif action == "delete":
                # 删除配置
                if not key.strip():
                    error_msg = "错误: 键名不能为空"
                    return {"ui": {"text": [error_msg]}, "result": (error_msg,)}
                
                config_data = load_config()
                if key in config_data:
                    del config_data[key]
                    save_config(config_data)
                    success_msg = f"成功删除配置: {key}"
                    return {"ui": {"text": [success_msg]}, "result": (success_msg,)}
                else:
                    error_msg = f"错误: 配置键 '{key}' 不存在"
                    return {"ui": {"text": [error_msg]}, "result": (error_msg,)}
            
        except Exception as e:
            error_msg = f"操作失败: {str(e)}"
            return {"ui": {"text": [error_msg]}, "result": (error_msg,)}

    def _convert_value(self, value, value_type):
        """转换值类型"""
        try:
            if value_type == "string":
                return str(value)
            elif value_type == "integer":
                return int(value)
            elif value_type == "float":
                return float(value)
            elif value_type == "boolean":
                return value.lower() in ['true', '1', 't', 'y', 'yes']
        except ValueError:
            return None

NODE_CLASS_MAPPINGS = {
    "ReiConfigManager": ReiConfigManager
}

NODE_DISPLAY_NAME_MAPPINGS = {
    "ReiConfigManager": "Rei 配置管理器"
} 