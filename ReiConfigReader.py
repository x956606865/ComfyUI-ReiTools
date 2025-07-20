from .utils import load_config
from .crypto_utils import TokenCrypto



class ReiConfigLoader:
    """
    一个从 env_config.json 读取指定键 (key) 并输出其值 (value) 的节点。
    下拉菜单中的选项会根据 JSON 文件中的键动态生成。
    支持加密配置的解密功能。
    """
    
    @classmethod
    def INPUT_TYPES(s):
        config = load_config()
        config_keys = list(config.keys())
        
        if not config_keys:
            config_keys = ["N/A (请检查 env_config.json)"]

        return {
            "required": {
                "config_key": (config_keys, ),
            },
            "optional": {
                "password (可选)": ("STRING", {
                    "default": "",
                    "multiline": False,
                    "placeholder": "加密配置需要密码"
                }),
            }
        }


    RETURN_TYPES = ("STRING",)  
    RETURN_NAMES = ("value",)

    FUNCTION = "load_value"

    CATEGORY = "Rei"

    def load_value(self, config_key, **kwargs):
        """
        这个方法由 ComfyUI 执行。
        它接收从 UI 中选择的键和可选的密码，并返回对应的值。
        """
        # 获取可选的密码参数
        password = kwargs.get("password (可选)", "").strip()
        
        # 在这里再次加载配置，以确保能获取到最新的值，
        # 以防用户在 ComfyUI 启动后编辑了文件。
        config = load_config()
        
        # 获取所选键对应的配置对象
        config_obj = config.get(config_key)
        if config_obj is None:
            return (f"ERROR: 配置键 '{config_key}' 不存在",)
        
        if isinstance(config_obj, dict):
            # 新格式：从对象中提取值和加密信息
            value = config_obj.get("value", "")
            is_encrypted = config_obj.get("encrypted", False)
            config_type = config_obj.get("type", "string")
            
            # 如果配置是加密的，尝试解密
            if is_encrypted:
                if not password:
                    return (f"ERROR: 配置 '{config_key}' 已加密，需要输入密码",)
                
                try:
                    # 使用密码解密
                    decrypted_value = TokenCrypto.decrypt_token(value, password)
                    return (str(decrypted_value),)
                except Exception as e:
                    return (f"ERROR: 解密失败 - {str(e)}",)
            else:
                # 未加密的配置直接返回
                return (str(value),)
        else:
            # 兼容旧格式：直接使用值
            value = config_obj if config_obj is not None else ""
            return (str(value),)

# --- 节点注册 ---
# 这是将你的节点注册到 ComfyUI 的标准样板代码。

NODE_CLASS_MAPPINGS = {
    "ReiConfigLoader": ReiConfigLoader
}

NODE_DISPLAY_NAME_MAPPINGS = {
    "ReiConfigLoader": "Rei Config Loader"
}
