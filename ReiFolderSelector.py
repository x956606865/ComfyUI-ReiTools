import os
import folder_paths

class ReiFolderSelector:
    """
    文件夹选择器节点
    提供一个按钮用于弹出文件夹选择器，选择后返回文件夹的绝对路径
    """
    
    @classmethod
    def INPUT_TYPES(cls):
        return {
            "required": {
                "folder_path": ("STRING", {
                    "default": "",
                    "multiline": False,
                    "placeholder": "点击'选择文件夹'按钮选择文件夹..."
                }),
            },
            "optional": {
                "initial_directory": ("STRING", {
                    "default": "",
                    "multiline": False,
                    "placeholder": "可选：指定文件选择器的起始目录..."
                }),
            },
            "hidden": {
                "unique_id": "UNIQUE_ID"
            }
        }
    
    RETURN_TYPES = ("STRING",)
    RETURN_NAMES = ("folder_path",)
    FUNCTION = "get_folder_path"
    CATEGORY = "ReiTools/Test"
    
    def get_folder_path(self, folder_path, unique_id=None, **kwargs):
        """
        返回选定的文件夹路径
        如果路径为空，返回当前ComfyUI根目录作为默认值
        """
        if not folder_path or folder_path.strip() == "":
            return (folder_paths.base_path,)
        
        # 检查路径是否存在
        if os.path.exists(folder_path) and os.path.isdir(folder_path):
            # 返回绝对路径
            absolute_path = os.path.abspath(folder_path)
            print(f"[ReiFolderSelector] 成功返回文件夹路径: {absolute_path}")
            return (absolute_path,)
        else:
            print(f"[ReiFolderSelector] 警告: 路径不存在或不是文件夹: {folder_path}")
            # 如果路径无效，返回ComfyUI根目录
            return (os.path.abspath(folder_paths.base_path),) 