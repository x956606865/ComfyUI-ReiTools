from .ReiSelectorOptionObject import ReiSelectorOptionObject
from .ReiCustomSelector import ReiCustomSelector
from .ReiPromptFileSelector import ReiPromptFileSelector
from .ReiConfigReader import ReiConfigLoader
from .ReiConfigManager import ReiConfigManager
from .Rei3KeyGroupLoader import Rei3KeyGroupLoader
NODE_CLASS_MAPPINGS = {
    "ReiCustomSelector": ReiCustomSelector,
    "ReiSelectorOptionObject": ReiSelectorOptionObject,
    "ReiPromptFileSelector": ReiPromptFileSelector,
    "ReiConfigLoader": ReiConfigLoader,
    "ReiConfigManager": ReiConfigManager,
    "Rei3KeyGroupLoader": Rei3KeyGroupLoader
}

NODE_DISPLAY_NAME_MAPPINGS = {
    "ReiCustomSelector": "Rei 自定义下拉框",
    "ReiSelectorOptionObject": "Rei 下拉框选项",
    "ReiPromptFileSelector": "Rei Prompt 文件选择器",
    "ReiConfigLoader": "Rei 配置读取器",
    "ReiConfigManager": "Rei 配置管理器",
    "Rei3KeyGroupLoader": "Rei 三键组合加载器"
}


