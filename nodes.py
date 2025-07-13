from .ReiSelectorOptionObject import ReiSelectorOptionObject
from .ReiCustomSelector import ReiCustomSelector
from .ReiPromptFileSelector import ReiPromptFileSelector


NODE_CLASS_MAPPINGS = {
    "ReiCustomSelector": ReiCustomSelector,
    "ReiSelectorOptionObject": ReiSelectorOptionObject,
    "ReiPromptFileSelector": ReiPromptFileSelector
}

NODE_DISPLAY_NAME_MAPPINGS = {
    "ReiCustomSelector": "Rei 自定义下拉框",
    "ReiSelectorOptionObject": "Rei 下拉框选项",
    "ReiPromptFileSelector": "Rei Prompt 文件选择器"
}


