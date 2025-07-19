from .utils import load_config



class ReiConfigLoader:
    """
    一个从 env_config.json 读取指定键 (key) 并输出其值 (value) 的节点。
    下拉菜单中的选项会根据 JSON 文件中的键动态生成。
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
            }
        }


    RETURN_TYPES = ("STRING",)  
    RETURN_NAMES = ("value",)

    FUNCTION = "load_value"

    CATEGORY = "Rei"

    def load_value(self, config_key):
        """
        这个方法由 ComfyUI 执行。
        它接收从 UI 中选择的键，并返回对应的值。
        """
        # 在这里再次加载配置，以确保能获取到最新的值，
        # 以防用户在 ComfyUI 启动后编辑了文件。
        config = load_config()
        
        # 获取所选键对应的值。
        # 使用 .get() 方法比 `config[key]` 更安全，因为它在键不存在时会返回 None，从而避免程序崩溃。
        value = config.get(config_key, "")
        
        # 转换为字符串并返回
        return (str(value),)

# --- 节点注册 ---
# 这是将你的节点注册到 ComfyUI 的标准样板代码。

NODE_CLASS_MAPPINGS = {
    "ReiConfigLoader": ReiConfigLoader
}

NODE_DISPLAY_NAME_MAPPINGS = {
    "ReiConfigLoader": "Rei Config Loader"
}
