"""
ComfyUI插件初始化文件
"""
from .nodes import NODE_CLASS_MAPPINGS, NODE_DISPLAY_NAME_MAPPINGS

WEB_DIRECTORY = "./js"

# 导入 server 模块以注册 API 路由
try:
    from . import server
    print("[ReiTools] API 路由模块加载成功")
except ImportError as e:
    print(f"[ReiTools] API 路由模块加载失败: {e}")

__all__ = ["NODE_CLASS_MAPPINGS", "NODE_DISPLAY_NAME_MAPPINGS", "WEB_DIRECTORY"]