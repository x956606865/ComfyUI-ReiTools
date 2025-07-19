import json
from .utils import load_config

class Rei3KeyGroupLoader:
    """
    3KeyGroup 配置加载器
    从 3KeyGroup 类型的配置中加载三个键对应的值
    """
    
    @classmethod
    def INPUT_TYPES(cls):
        # 获取所有 3KeyGroup 类型的配置键
        try:
            import os
            import folder_paths
            
            # 加载类型信息
            type_file_path = os.path.join(folder_paths.base_path, "config_types.json")
            try:
                with open(type_file_path, 'r', encoding='utf-8') as f:
                    type_data = json.loads(f.read())
            except:
                type_data = {}
            
            # 获取所有 3KeyGroup 类型的配置键
            group_keys = [key for key, config_type in type_data.items() if config_type == '3KeyGroup']
            
            if not group_keys:
                group_keys = ["-- 没有 3KeyGroup 配置 --"]
                
        except Exception as e:
            print(f"[Rei3KeyGroupLoader] 获取配置失败: {e}")
            group_keys = ["-- 获取配置失败 --"]
        
        return {
            "required": {
                "group_key": (group_keys,),
            }
        }

    RETURN_TYPES = ("STRING", "STRING", "STRING")
    RETURN_NAMES = ("value1", "value2", "value3")
    FUNCTION = "load_key_group"
    CATEGORY = "Rei Tools"

    def load_key_group(self, group_key: str) -> tuple:
        """
        加载 3KeyGroup 配置并返回三个键对应的值
        """
        try:
            # 获取配置数据
            config_data = load_config()
            
            if group_key not in config_data:
                print(f"[Rei3KeyGroupLoader] 配置键 '{group_key}' 不存在")
                return ("", "", "")
            
            # 解析 3KeyGroup 数据
            group_value = config_data[group_key]
            try:
                key_group = json.loads(str(group_value))
            except json.JSONDecodeError:
                print(f"[Rei3KeyGroupLoader] 解析 3KeyGroup 数据失败: {group_value}")
                return ("", "", "")
            
            # 获取三个键对应的值
            key1 = key_group.get('key1')
            key2 = key_group.get('key2') 
            key3 = key_group.get('key3')
            
            # 简单获取值并转换为字符串
            value1 = str(config_data.get(key1, "")) if key1 else ""
            value2 = str(config_data.get(key2, "")) if key2 else ""
            value3 = str(config_data.get(key3, "")) if key3 else ""
            
            print(f"[Rei3KeyGroupLoader] 加载 3KeyGroup '{group_key}': {key1}={value1}, {key2}={value2}, {key3}={value3}")
            
            return (value1, value2, value3)
            
        except Exception as e:
            print(f"[Rei3KeyGroupLoader] 加载失败: {e}")
            return ("", "", "")

NODE_CLASS_MAPPINGS = {
    "Rei3KeyGroupLoader": Rei3KeyGroupLoader
}

NODE_DISPLAY_NAME_MAPPINGS = {
    "Rei3KeyGroupLoader": "Rei 三键组合加载器"
} 