import os
import glob
from typing import Dict, List, Tuple

class ReiFileCounter:
    """
    文件计数器节点
    统计指定目录下特定后缀的文件数量
    """
    
    @classmethod
    def INPUT_TYPES(cls):
        return {
            "required": {
                "directory_path": ("STRING", {
                    "default": "",
                    "multiline": False,
                    "placeholder": "输入目录路径或使用文件夹选择器..."
                }),
                "file_extension": (["-- No Options Connected --"],),
            },
            "hidden": {
                "unique_id": "UNIQUE_ID"
            }
        }
    @classmethod
    def VALIDATE_INPUTS(cls, directory_path, file_extension, **kwargs):
        """
        通过返回True来覆盖默认的输入验证。
        这可以防止后端因为收到的值不在初始列表中而报错。
        """
        return True
    RETURN_TYPES = ("INT", "STRING", "STRING")
    RETURN_NAMES = ("file_count", "available_extensions", "selected_files")
    FUNCTION = "count_files"
    CATEGORY = "Rei Tools"
    
    def count_files(self, directory_path: str, file_extension: str, unique_id=None):
        """
        统计指定目录下特定后缀的文件数量
        
        Args:
            directory_path: 目录路径
            file_extension: 文件后缀（不包含点号）
            
        Returns:
            file_count: 文件数量
            available_extensions: 可用后缀列表（JSON格式）
            selected_files: 匹配的文件列表（JSON格式）
        """
        import json
        
        # 检查目录路径是否有效
        if not directory_path or not directory_path.strip():
            print("[ReiFileCounter] 警告: 目录路径为空")
            return (0, "[]", "[]")
        
        # 规范化路径
        directory_path = os.path.abspath(directory_path.strip())
        
        # 检查目录是否存在
        if not os.path.exists(directory_path):
            print(f"[ReiFileCounter] 错误: 目录不存在: {directory_path}")
            return (0, "[]", "[]")
        
        if not os.path.isdir(directory_path):
            print(f"[ReiFileCounter] 错误: 路径不是目录: {directory_path}")
            return (0, "[]", "[]")
        
        try:
            # 获取目录下所有文件
            all_files = []
            for root, dirs, files in os.walk(directory_path):
                for file in files:
                    file_path = os.path.join(root, file)
                    all_files.append(file_path)
            
            # 统计所有文件后缀
            extension_count = {}
            for file_path in all_files:
                _, ext = os.path.splitext(file_path)
                ext = ext.lower().lstrip('.')  # 移除点号并转为小写
                if ext:  # 只统计有后缀的文件
                    extension_count[ext] = extension_count.get(ext, 0) + 1
            
            # 生成可用后缀列表（按数量排序）
            available_extensions = sorted(extension_count.keys(), 
                                        key=lambda x: extension_count[x], 
                                        reverse=True)
            
            # 如果指定了文件后缀，统计匹配的文件
            selected_files = []
            file_count = 0
            
            if file_extension and file_extension.strip():
                target_ext = file_extension.strip().lower().lstrip('.')
                
                # 查找匹配的文件
                for file_path in all_files:
                    _, ext = os.path.splitext(file_path)
                    ext = ext.lower().lstrip('.')
                    
                    if ext == target_ext:
                        selected_files.append(file_path)
                        file_count += 1
                
                print(f"[ReiFileCounter] 在目录 {directory_path} 中找到 {file_count} 个 .{target_ext} 文件")
            else:
                # 如果没有指定后缀，返回所有文件的数量
                file_count = len(all_files)
                selected_files = all_files
                print(f"[ReiFileCounter] 目录 {directory_path} 中共有 {file_count} 个文件")
            
            # 返回结果
            return (
                file_count,
                json.dumps(available_extensions, ensure_ascii=False),
                json.dumps(selected_files, ensure_ascii=False)
            )
            
        except Exception as e:
            print(f"[ReiFileCounter] 统计文件时发生错误: {e}")
            return (0, "[]", "[]")
    
    # @classmethod
    # def IS_CHANGED(cls, **kwargs):
    #     # 当目录路径或文件后缀改变时，节点需要重新计算
    #     return True 