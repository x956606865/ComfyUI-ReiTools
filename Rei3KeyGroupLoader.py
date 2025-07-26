import json
from .utils import load_config
from .crypto_utils import TokenCrypto

class Rei3KeyGroupLoader:
    """
    3KeyGroup 配置加载器
    从 3KeyGroup 类型的配置中加载三个键对应的值
    支持加密配置的解密功能
    """
    
    @classmethod
    def INPUT_TYPES(cls):
        # 获取所有 3KeyGroup 类型的配置键
        try:
            # 加载配置数据
            config_data = load_config()
            
            # 从配置对象中提取 3KeyGroup 类型的键
            group_keys = []
            for key, config_obj in config_data.items():
                if isinstance(config_obj, dict):
                    # 新格式：检查配置对象的类型
                    if config_obj.get("type") == "3KeyGroup":
                        group_keys.append(key)
                # 对于旧格式，暂时跳过，因为无法确定类型
            
            if not group_keys:
                group_keys = ["-- 没有 3KeyGroup 配置 --"]
                
        except Exception as e:
            print(f"[Rei3KeyGroupLoader] 获取配置失败: {e}")
            group_keys = ["-- 获取配置失败 --"]
        
        return {
            "required": {
                "group_key": (group_keys,),
            },
            "optional": {
                "password (可选)": ("STRING", {
                    "default": "",
                    "multiline": False,
                    "placeholder": "加密配置需要密码"
                }),
            }
        }

    RETURN_TYPES = ("STRING", "STRING", "STRING")
    RETURN_NAMES = ("value1", "value2", "value3")
    FUNCTION = "load_key_group"
    CATEGORY = "ReiTools"

    def load_key_group(self, group_key: str, **kwargs) -> tuple:
        """
        加载 3KeyGroup 配置并返回三个键对应的值
        """
        try:
            # 获取可选的密码参数
            password = kwargs.get("password (可选)", "").strip()
            
            # 获取配置数据
            config_data = load_config()
            
            if group_key not in config_data:
                error_msg = f"ERROR: 配置键 '{group_key}' 不存在"
                print(f"[Rei3KeyGroupLoader] {error_msg}")
                return (error_msg, "", "")
            
            # 解析 3KeyGroup 数据
            group_config = config_data[group_key]
            
            # 处理新的对象格式
            if isinstance(group_config, dict):
                group_value = group_config.get("value", "")
            else:
                # 兼容旧格式
                group_value = group_config
            
            try:
                key_group = json.loads(str(group_value))
            except json.JSONDecodeError:
                error_msg = f"ERROR: 解析 3KeyGroup 数据失败"
                print(f"[Rei3KeyGroupLoader] 解析 3KeyGroup 数据失败: {group_value}")
                return (error_msg, "", "")
            
            # 获取三个键对应的值
            key1 = key_group.get('key1')
            key2 = key_group.get('key2') 
            key3 = key_group.get('key3')
            
            # 获取值并转换为字符串（支持解密）
            def get_config_value(key):
                if not key:
                    return ""
                    
                config_obj = config_data.get(key)
                if config_obj is None:
                    return f"ERROR: 键 '{key}' 不存在"
                
                if isinstance(config_obj, dict):
                    # 新格式：从对象中提取值和加密信息
                    value = config_obj.get("value", "")
                    is_encrypted = config_obj.get("encrypted", False)
                    
                    # 如果配置是加密的，尝试解密
                    if is_encrypted:
                        if not password:
                            return f"ERROR: 键 '{key}' 已加密，需要密码"
                        
                        try:
                            # 使用密码解密
                            decrypted_value = TokenCrypto.decrypt_token(value, password)
                            return str(decrypted_value)
                        except Exception as e:
                            return f"ERROR: 解密键 '{key}' 失败 - {str(e)}"
                    else:
                        # 未加密的配置直接返回
                        return str(value)
                else:
                    # 兼容旧格式：直接使用值
                    return str(config_obj)
            
            value1 = get_config_value(key1)
            value2 = get_config_value(key2)
            value3 = get_config_value(key3)
            
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