import json
import os
from datetime import datetime
from aiohttp import web
from server import PromptServer
import folder_paths
from .utils import load_config, save_config

# 获取路由实例
routes = PromptServer.instance.routes

@routes.get('/api/rei/config/get_all')
async def get_all_configs(request):
    """获取所有配置值"""
    try:
        configs = load_config()
        # 提取值用于前端显示
        config_values = {}
        for key, config_obj in configs.items():
            if isinstance(config_obj, dict):
                config_values[key] = config_obj.get("value", "")
            else:
                # 兼容旧格式
                config_values[key] = config_obj
        return web.json_response(config_values)
    except Exception as e:
        print(f"[ReiConfig] 获取配置失败: {e}")
        return web.json_response(
            {"error": f"获取配置失败: {str(e)}"}, 
            status=500
        )

@routes.get('/api/rei/config/get_types')
async def get_config_types(request):
    """获取所有配置类型信息（从配置对象中提取）"""
    try:
        configs = load_config()
        types = {}
        for key, config_obj in configs.items():
            if isinstance(config_obj, dict):
                types[key] = {
                    "type": config_obj.get("type", "string"),
                    "encrypted": config_obj.get("encrypted", False)
                }
            else:
                # 兼容旧格式
                types[key] = {
                    "type": "string",
                    "encrypted": False
                }
        return web.json_response(types)
    except Exception as e:
        print(f"[ReiConfig] 获取配置类型失败: {e}")
        return web.json_response(
            {"error": f"获取配置类型失败: {str(e)}"}, 
            status=500
        )

@routes.get('/api/rei/presets/list')
async def list_presets(request):
    """获取所有预设列表"""
    try:
        # 获取预设目录
        base_path = folder_paths.base_path
        presets_dir = os.path.join(base_path, 'custom_nodes', 'ComfyUI-ReiTools', 'presets')
        
        # 确保预设目录存在
        if not os.path.exists(presets_dir):
            os.makedirs(presets_dir)
            
        presets = []
        for filename in os.listdir(presets_dir):
            if filename.endswith('.json'):
                preset_path = os.path.join(presets_dir, filename)
                try:
                    stat_info = os.stat(preset_path)
                    with open(preset_path, 'r', encoding='utf-8') as f:
                        preset_data = json.load(f)
                    
                    presets.append({
                        'name': os.path.splitext(filename)[0],
                        'filename': filename,
                        'title': preset_data.get('title', os.path.splitext(filename)[0]),
                        'description': preset_data.get('description', ''),
                        'created_at': preset_data.get('created_at', ''),
                        'updated_at': preset_data.get('updated_at', ''),
                        'size': stat_info.st_size,
                        'modified': stat_info.st_mtime
                    })
                except (json.JSONDecodeError, IOError) as e:
                    print(f"[ReiTools] 无法读取预设文件 {filename}: {e}")
                    continue
        
        # 按修改时间排序
        presets.sort(key=lambda x: x['modified'], reverse=True)
        
        return web.json_response({
            'presets': presets,
            'count': len(presets),
            'presets_dir': presets_dir
        })
        
    except Exception as e:
        print(f"[ReiTools] 获取预设列表失败: {e}")
        return web.json_response(
            {'error': f'获取预设列表失败: {str(e)}'}, 
            status=500
        )

@routes.get('/api/rei/presets/get/{preset_name}')
async def get_preset(request):
    """获取指定预设的内容"""
    try:
        preset_name = request.match_info['preset_name']
        
        # 获取预设目录
        base_path = folder_paths.base_path
        presets_dir = os.path.join(base_path, 'custom_nodes', 'ComfyUI-ReiTools', 'presets')
        preset_path = os.path.join(presets_dir, f'{preset_name}.json')
        
        if not os.path.exists(preset_path):
            return web.json_response(
                {'error': '预设不存在'}, 
                status=404
            )
        
        with open(preset_path, 'r', encoding='utf-8') as f:
            preset_data = json.load(f)
        
        return web.json_response(preset_data)
        
    except Exception as e:
        print(f"[ReiTools] 获取预设失败: {e}")
        return web.json_response(
            {'error': f'获取预设失败: {str(e)}'}, 
            status=500
        )

@routes.post('/api/rei/presets/save')
async def save_preset(request):
    """保存预设"""
    try:
        data = await request.json()
        
        # 验证必要字段
        if 'name' not in data or 'content' not in data:
            return web.json_response(
                {'error': '缺少必要字段: name 和 content'}, 
                status=400
            )
        
        preset_name = data['name']
        
        # 验证预设名称
        if not preset_name or not preset_name.replace('_', '').replace('-', '').isalnum():
            return web.json_response(
                {'error': '预设名称只能包含字母、数字、下划线和连字符'}, 
                status=400
            )
        
        # 获取预设目录
        base_path = folder_paths.base_path
        presets_dir = os.path.join(base_path, 'custom_nodes', 'ComfyUI-ReiTools', 'presets')
        
        # 确保预设目录存在
        if not os.path.exists(presets_dir):
            os.makedirs(presets_dir)
        
        preset_path = os.path.join(presets_dir, f'{preset_name}.json')
        
        # 构建预设数据
        current_time = datetime.now().isoformat()
        preset_data = {
            'name': preset_name,
            'title': data.get('title', preset_name),
            'description': data.get('description', ''),
            'content': data['content'],
            'created_at': data.get('created_at', current_time),
            'updated_at': current_time,
            'version': data.get('version', '1.0'),
            'author': data.get('author', ''),
            'tags': data.get('tags', [])
        }
        
        # 保存预设文件
        with open(preset_path, 'w', encoding='utf-8') as f:
            json.dump(preset_data, f, ensure_ascii=False, indent=2)
        
        return web.json_response({
            'success': True,
            'message': '预设保存成功',
            'preset_name': preset_name,
            'preset_path': preset_path
        })
        
    except json.JSONDecodeError:
        return web.json_response(
            {'error': '无效的JSON数据'}, 
            status=400
        )
    except Exception as e:
        print(f"[ReiTools] 保存预设失败: {e}")
        return web.json_response(
            {'error': f'保存预设失败: {str(e)}'}, 
            status=500
        )

@routes.delete('/api/rei/presets/delete/{preset_name}')
async def delete_preset(request):
    """删除预设"""
    try:
        preset_name = request.match_info['preset_name']
        
        # 获取预设目录
        base_path = folder_paths.base_path
        presets_dir = os.path.join(base_path, 'custom_nodes', 'ComfyUI-ReiTools', 'presets')
        preset_path = os.path.join(presets_dir, f'{preset_name}.json')
        
        if not os.path.exists(preset_path):
            return web.json_response(
                {'error': '预设不存在'}, 
                status=404
            )
        
        os.remove(preset_path)
        
        return web.json_response({
            'success': True,
            'message': '预设删除成功',
            'preset_name': preset_name
        })
        
    except Exception as e:
        print(f"[ReiTools] 删除预设失败: {e}")
        return web.json_response(
            {'error': f'删除预设失败: {str(e)}'}, 
            status=500
        )

@routes.get('/api/rei/filesystem/browse')
async def browse_filesystem(request):
    """浏览ComfyUI文件系统（受限制版本）"""
    try:
        # 获取查询参数
        path = request.query.get('path', '')
        show_files = request.query.get('show_files', 'true').lower() == 'true'
        file_types = request.query.get('file_types', '').split(',') if request.query.get('file_types') else []
        base_dir = request.query.get('base_dir', '')  # 新增：允许指定base目录
        
        # 获取ComfyUI根目录
        comfyui_root = folder_paths.base_path
        
        # 确定实际的base目录
        if base_dir:
            # 如果指定了base_dir，构建相对于ComfyUI根目录的路径
            base_dir_cleaned = base_dir.lstrip('/')
            actual_base_path = os.path.join(comfyui_root, base_dir_cleaned)
            
            # 安全检查：确保base目录在ComfyUI目录内
            actual_base_path = os.path.abspath(actual_base_path)
            comfyui_root_abs = os.path.abspath(comfyui_root)
            
            if not actual_base_path.startswith(comfyui_root_abs):
                return web.json_response(
                    {"error": "base目录不在允许范围内"}, 
                    status=403
                )
            
            # 检查base目录是否存在
            if not os.path.exists(actual_base_path) or not os.path.isdir(actual_base_path):
                return web.json_response(
                    {"error": f"base目录不存在: {base_dir}"}, 
                    status=404
                )
        else:
            # 默认使用ComfyUI根目录
            actual_base_path = comfyui_root
            base_dir_cleaned = ""
        
        # 如果没有指定路径，返回base目录
        if not path:
            target_path = actual_base_path
            relative_path = ""
        else:
            # 构建完整路径，确保在base目录内
            relative_path = path.lstrip('/')
            target_path = os.path.join(actual_base_path, relative_path)
            
        # 安全检查：确保路径在base目录内
        target_path = os.path.abspath(target_path)
        actual_base_path = os.path.abspath(actual_base_path)
        
        if not target_path.startswith(actual_base_path):
            return web.json_response(
                {"error": "路径不在允许范围内"}, 
                status=403
            )
        
        # 检查路径是否存在
        if not os.path.exists(target_path):
            return web.json_response(
                {"error": "路径不存在"}, 
                status=404
            )
        
        # 如果是文件，返回文件信息
        if os.path.isfile(target_path):
            file_stat = os.stat(target_path)
            file_extension = os.path.splitext(target_path)[1].lower().lstrip('.')
            
            file_info = {
                "type": "file",
                "name": os.path.basename(target_path),
                "path": relative_path,
                "size": file_stat.st_size,
                "modified": file_stat.st_mtime,
                "created": file_stat.st_ctime,
                "extension": file_extension,
                "is_readable": os.access(target_path, os.R_OK),
                "is_writable": os.access(target_path, os.W_OK)
            }
            return web.json_response(file_info)
        
        # 读取目录内容
        items = []
        try:
            dir_entries = []
            
            # 收集所有条目
            for item_name in os.listdir(target_path):
                # 跳过隐藏文件和特殊目录
                if item_name.startswith('.') or item_name.startswith('__pycache__'):
                    continue
                
                item_path = os.path.join(target_path, item_name)
                item_relative_path = os.path.join(relative_path, item_name) if relative_path else item_name
                
                try:
                    item_stat = os.stat(item_path)
                    
                    item_info = {
                        "name": item_name,
                        "path": item_relative_path.replace(os.sep, '/'),  # 统一使用正斜杠
                        "modified": item_stat.st_mtime,
                        "created": item_stat.st_ctime,
                        "is_readable": os.access(item_path, os.R_OK),
                    }
                    
                    if os.path.isdir(item_path):
                        item_info["type"] = "directory"
                        # 统计子项数量
                        try:
                            sub_items = [x for x in os.listdir(item_path) if not x.startswith('.')]
                            item_info["children_count"] = len(sub_items)
                            
                            # 统计子目录中的文件和文件夹数量
                            file_count = 0
                            dir_count = 0
                            for sub_item in sub_items[:10]:  # 只检查前10个，避免性能问题
                                sub_path = os.path.join(item_path, sub_item)
                                if os.path.isfile(sub_path):
                                    file_count += 1
                                elif os.path.isdir(sub_path):
                                    dir_count += 1
                            
                            item_info["file_count"] = file_count
                            item_info["dir_count"] = dir_count
                            
                        except (PermissionError, OSError):
                            item_info["children_count"] = 0
                            item_info["file_count"] = 0
                            item_info["dir_count"] = 0
                            
                        item_info["is_writable"] = os.access(item_path, os.W_OK)
                        
                    elif os.path.isfile(item_path) and show_files:
                        file_extension = os.path.splitext(item_name)[1].lower().lstrip('.')
                        
                        # 如果指定了文件类型过滤
                        if file_types and file_extension not in file_types:
                            continue
                            
                        item_info["type"] = "file"
                        item_info["size"] = item_stat.st_size
                        item_info["extension"] = file_extension
                        item_info["is_writable"] = os.access(item_path, os.W_OK)
                        
                        # 添加文件类型图标
                        if file_extension in ['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp', 'svg']:
                            item_info["icon"] = "🖼️"
                            item_info["category"] = "image"
                        elif file_extension in ['txt', 'md', 'readme']:
                            item_info["icon"] = "📄"
                            item_info["category"] = "text"
                        elif file_extension in ['json', 'yaml', 'yml']:
                            item_info["icon"] = "📋"
                            item_info["category"] = "config"
                        elif file_extension in ['py', 'pyw']:
                            item_info["icon"] = "🐍"
                            item_info["category"] = "python"
                        elif file_extension in ['js', 'ts', 'jsx', 'tsx']:
                            item_info["icon"] = "📜"
                            item_info["category"] = "javascript"
                        elif file_extension in ['css', 'scss', 'sass']:
                            item_info["icon"] = "🎨"
                            item_info["category"] = "style"
                        elif file_extension in ['html', 'htm']:
                            item_info["icon"] = "🌐"
                            item_info["category"] = "web"
                        elif file_extension in ['zip', 'rar', '7z', 'tar', 'gz']:
                            item_info["icon"] = "📦"
                            item_info["category"] = "archive"
                        else:
                            item_info["icon"] = "📄"
                            item_info["category"] = "other"
                    else:
                        continue  # 跳过文件（如果不显示文件）或其他类型
                    
                    dir_entries.append(item_info)
                    
                except (OSError, PermissionError):
                    # 跳过无法访问的文件/目录
                    continue
            
            # 排序：目录优先，然后按名称排序
            dir_entries.sort(key=lambda x: (x["type"] != "directory", x["name"].lower()))
            items = dir_entries
        
        except PermissionError:
            return web.json_response(
                {"error": "权限不足，无法访问该目录"}, 
                status=403
            )
        
                # 构建父级路径
        parent_path = None
        if relative_path:
            parent_parts = relative_path.split('/')
            if len(parent_parts) > 1:
                parent_path = '/'.join(parent_parts[:-1])
            else:
                parent_path = ""

        # 构建面包屑导航
        breadcrumbs = []
        
        # 如果有base_dir，添加base目录到面包屑的开头
        if base_dir_cleaned:
            breadcrumbs.append({
                "name": f"📁 {os.path.basename(actual_base_path)}",
                "path": "",
                "is_base": True,
                "base_dir": base_dir_cleaned
            })
        
        if relative_path:
            parts = relative_path.split('/')
            current_path = ""
            for part in parts:
                current_path = os.path.join(current_path, part).replace(os.sep, '/') if current_path else part
                breadcrumbs.append({
                    "name": part,
                    "path": current_path,
                    "is_base": False
                })

        # 确定显示名称
        if relative_path:
            display_name = os.path.basename(target_path)
        elif base_dir_cleaned:
            display_name = f"{os.path.basename(actual_base_path)} (base)"
        else:
            display_name = "ComfyUI"

        response_data = {
            "type": "directory", 
            "name": display_name,
            "path": relative_path,
            "parent_path": parent_path,
            "items": items,
            "breadcrumbs": breadcrumbs,
            "total_items": len(items),
            "total_files": len([x for x in items if x["type"] == "file"]),
            "total_directories": len([x for x in items if x["type"] == "directory"]),
            "base_path": os.path.basename(actual_base_path),
            "base_dir": base_dir_cleaned,  # 新增：返回当前使用的base目录
            "comfyui_root": os.path.basename(comfyui_root),  # 新增：返回ComfyUI根目录信息
            "comfyui_root_path": os.path.abspath(comfyui_root),  # 新增：返回ComfyUI根目录的完整路径
            "actual_base_path": os.path.abspath(actual_base_path),  # 新增：返回实际base路径
            "current_time": datetime.now().isoformat()
        }
        
        return web.json_response(response_data)
        
    except Exception as e:
        print(f"[ReiConfig] 浏览文件系统失败: {e}")
        import traceback
        traceback.print_exc()
        return web.json_response(
            {"error": f"浏览文件系统失败: {str(e)}"}, 
            status=500
        )

@routes.get('/api/rei/filesystem/browse-system')
async def browse_system_filesystem(request):
    """浏览系统文件系统（从根目录开始，用于文件夹选择器）"""
    try:
        import platform
        import os
        
        # 获取查询参数
        path = request.query.get('path', '')
        show_files = request.query.get('show_files', 'true').lower() == 'true'
        file_types = request.query.get('file_types', '').split(',') if request.query.get('file_types') else []
        
        # 根据操作系统确定根目录
        system = platform.system().lower()
        if system == 'windows':
            # Windows: 从盘符开始
            if not path:
                # 返回所有可用盘符
                import string
                drives = []
                for letter in string.ascii_uppercase:
                    drive_path = f"{letter}:\\"
                    if os.path.exists(drive_path):
                        try:
                            drive_stat = os.stat(drive_path)
                            drives.append({
                                "name": f"{letter}:",
                                "path": f"{letter}:",
                                "type": "directory",
                                "modified": drive_stat.st_mtime,
                                "created": drive_stat.st_ctime,
                                "is_readable": os.access(drive_path, os.R_OK),
                                "children_count": 0,  # 暂时设为0，实际使用时可以计算
                                "icon": "💾"
                            })
                        except (OSError, PermissionError):
                            continue
                
                return web.json_response({
                    "type": "directory",
                    "name": "系统驱动器",
                    "path": "",
                    "parent_path": None,
                    "items": drives,
                    "breadcrumbs": [{"name": "系统驱动器", "path": "", "is_base": True}],
                    "total_items": len(drives),
                    "total_files": 0,
                    "total_directories": len(drives),
                    "base_path": "系统根目录",
                    "system_type": "windows",
                    "current_time": datetime.now().isoformat()
                })
            else:
                # Windows: 处理具体路径
                target_path = path
                if not os.path.exists(target_path):
                    return web.json_response({"error": "路径不存在"}, status=404)
        else:
            # Linux/macOS: 从根目录开始
            if not path:
                target_path = "/"
            else:
                target_path = path
                if not target_path.startswith('/'):
                    target_path = '/' + target_path
                if not os.path.exists(target_path):
                    return web.json_response({"error": "路径不存在"}, status=404)
        
        # 检查路径是否存在
        if not os.path.exists(target_path):
            return web.json_response({"error": "路径不存在"}, status=404)
        
        # 如果是文件，返回文件信息
        if os.path.isfile(target_path):
            file_stat = os.stat(target_path)
            file_extension = os.path.splitext(target_path)[1].lower().lstrip('.')
            
            file_info = {
                "type": "file",
                "name": os.path.basename(target_path),
                "path": target_path,
                "size": file_stat.st_size,
                "modified": file_stat.st_mtime,
                "created": file_stat.st_ctime,
                "extension": file_extension,
                "is_readable": os.access(target_path, os.R_OK),
                "is_writable": os.access(target_path, os.W_OK)
            }
            return web.json_response(file_info)
        
        # 如果是Windows系统的磁盘根目录(如 "C:")，确保加上 "/" 
        if system == 'windows' and len(target_path) == 2 and target_path[1] == ':':
            target_path = target_path + '/'
        # 读取目录内容
        items = []
        try:
            dir_entries = []
            
            # 收集所有条目
            for item_name in os.listdir(target_path):
                # 跳过隐藏文件和特殊目录（但保留系统目录）
                if item_name.startswith('.') and system != 'windows':
                    continue
                
                item_path = os.path.join(target_path, item_name)
                
                try:
                    item_stat = os.stat(item_path)
                    
                    item_info = {
                        "name": item_name,
                        "path": item_path,
                        "modified": item_stat.st_mtime,
                        "created": item_stat.st_ctime,
                        "is_readable": os.access(item_path, os.R_OK),
                    }
                    
                    if os.path.isdir(item_path):
                        item_info["type"] = "directory"
                        item_info["icon"] = "📁"
                        
                        # 计算子目录和文件数量
                        try:
                            children = os.listdir(item_path)
                            item_info["children_count"] = len(children)
                            
                            file_count = 0
                            dir_count = 0
                            for child in children:
                                child_path = os.path.join(item_path, child)
                                if os.path.isdir(child_path):
                                    dir_count += 1
                                else:
                                    file_count += 1
                            
                            item_info["file_count"] = file_count
                            item_info["dir_count"] = dir_count
                        except (OSError, PermissionError):
                            item_info["children_count"] = 0
                            item_info["file_count"] = 0
                            item_info["dir_count"] = 0
                    else:
                        if not show_files:
                            continue
                        
                        item_info["type"] = "file"
                        file_extension = os.path.splitext(item_path)[1].lower().lstrip('.')
                        item_info["size"] = item_stat.st_size
                        item_info["extension"] = file_extension
                        item_info["is_writable"] = os.access(item_path, os.W_OK)
                        
                        # 设置文件图标
                        if file_extension in ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg']:
                            item_info["icon"] = "🖼️"
                        elif file_extension in ['mp4', 'avi', 'mov', 'mkv', 'wmv']:
                            item_info["icon"] = "🎬"
                        elif file_extension in ['mp3', 'wav', 'flac', 'aac']:
                            item_info["icon"] = "🎵"
                        elif file_extension in ['pdf']:
                            item_info["icon"] = "📄"
                        elif file_extension in ['doc', 'docx']:
                            item_info["icon"] = "📝"
                        elif file_extension in ['xls', 'xlsx']:
                            item_info["icon"] = "📊"
                        elif file_extension in ['zip', 'rar', '7z', 'tar', 'gz']:
                            item_info["icon"] = "📦"
                        elif file_extension in ['py', 'js', 'ts', 'java', 'cpp', 'c']:
                            item_info["icon"] = "💻"
                        else:
                            item_info["icon"] = "📄"
                    
                    dir_entries.append(item_info)
                    
                except (OSError, PermissionError):
                    # 跳过无法访问的文件/目录
                    continue
            
            # 排序：目录优先，然后按名称排序
            dir_entries.sort(key=lambda x: (x["type"] != "directory", x["name"].lower()))
            items = dir_entries
        
        except PermissionError:
            return web.json_response(
                {"error": "权限不足，无法访问该目录"}, 
                status=403
            )
        
        # 构建父级路径
        parent_path = None
        if system == 'windows':
            if target_path and target_path != "\\" and len(target_path) > 3:
                parent_path = os.path.dirname(target_path)
                if not parent_path:
                    parent_path = None
        else:
            if target_path and target_path != "/":
                parent_path = os.path.dirname(target_path)
                if not parent_path:
                    parent_path = "/"

        # 构建面包屑导航
        breadcrumbs = []
        
        if system == 'windows':
            if target_path:
                parts = target_path.split('\\')
                current_path = ""
                for part in parts:
                    if part:
                        current_path = os.path.join(current_path, part) if current_path else part
                        breadcrumbs.append({
                            "name": part,
                            "path": current_path,
                            "is_base": False
                        })
        else:
            if target_path and target_path != "/":
                parts = target_path.split('/')
                current_path = ""
                for part in parts:
                    if part:
                        current_path = os.path.join(current_path, part) if current_path else part
                        breadcrumbs.append({
                            "name": part,
                            "path": "/" + current_path,
                            "is_base": False
                        })

        # 确定显示名称
        if target_path:
            display_name = os.path.basename(target_path) if os.path.basename(target_path) else target_path
        else:
            display_name = "系统根目录"

        response_data = {
            "type": "directory", 
            "name": display_name,
            "path": target_path,
            "parent_path": parent_path,
            "items": items,
            "breadcrumbs": breadcrumbs,
            "total_items": len(items),
            "total_files": len([x for x in items if x["type"] == "file"]),
            "total_directories": len([x for x in items if x["type"] == "directory"]),
            "base_path": "系统根目录",
            "system_type": system,
            "current_time": datetime.now().isoformat()
        }
        
        return web.json_response(response_data)
        
    except Exception as e:
        print(f"[ReiConfig] 浏览系统文件系统失败: {e}")
        import traceback
        traceback.print_exc()
        return web.json_response(
            {"error": f"浏览系统文件系统失败: {str(e)}"}, 
            status=500
        )

@routes.get('/api/rei/filesystem/get-extensions')
async def get_directory_extensions(request):
    """获取指定目录下的所有文件后缀列表"""
    try:
        directory_path = request.query.get('path', '')
        
        if not directory_path or not directory_path.strip():
            return web.json_response(
                {"error": "目录路径不能为空"}, 
                status=400
            )
        
        # 规范化路径
        directory_path = os.path.abspath(directory_path.strip())
        
        # 检查目录是否存在
        if not os.path.exists(directory_path):
            return web.json_response(
                {"error": f"目录不存在: {directory_path}"}, 
                status=404
            )
        
        if not os.path.isdir(directory_path):
            return web.json_response(
                {"error": f"路径不是目录: {directory_path}"}, 
                status=400
            )
        
        # 统计所有文件后缀
        extension_count = {}
        total_files = 0
        
        for root, dirs, files in os.walk(directory_path):
            for file in files:
                total_files += 1
                _, ext = os.path.splitext(file)
                ext = ext.lower().lstrip('.')  # 移除点号并转为小写
                if ext:  # 只统计有后缀的文件
                    extension_count[ext] = extension_count.get(ext, 0) + 1
        
        # 生成可用后缀列表（按数量排序）
        available_extensions = sorted(extension_count.keys(), 
                                    key=lambda x: extension_count[x], 
                                    reverse=True)
        
        return web.json_response({
            'directory_path': directory_path,
            'total_files': total_files,
            'extensions': available_extensions,
            'extension_counts': extension_count
        })
        
    except PermissionError:
        return web.json_response(
            {"error": f"没有权限访问目录: {directory_path}"}, 
            status=403
        )
    except Exception as e:
        print(f"[ReiConfig] 获取文件后缀失败: {e}")
        return web.json_response(
            {"error": f"获取文件后缀失败: {str(e)}"}, 
            status=500
        )

@routes.post('/api/rei/config/update')
async def update_config(request):
    """更新配置"""
    try:
        # 使用 FormData 方式接收数据
        data = await request.post()
        key = data.get('key', '').strip()
        value = data.get('value', '')
        value_type = data.get('type', 'string')
        is_encrypted = data.get('encrypted', 'false') == 'true'
        
        if not key:
            return web.json_response(
                {"error": "键名不能为空"}, 
                status=400
            )
        
        # 转换值类型
        converted_value = _convert_value(value, value_type)
        if converted_value is None and value_type != 'string':
            return web.json_response(
                {"error": f"无法将 '{value}' 转换为 {value_type} 类型"}, 
                status=400
            )
        
        # 保存配置（新的对象结构）
        configs = load_config()
        configs[key] = {
            "value": converted_value,
            "type": value_type,
            "encrypted": is_encrypted,
            "created_at": datetime.now().isoformat(),
            "updated_at": datetime.now().isoformat()
        }
        save_config(configs)
        
        print(f"[ReiConfig] 成功更新配置: {key} = {converted_value}")
        return web.json_response({
            "success": True,
            "message": f"成功更新配置: {key}"
        })
        
    except Exception as e:
        print(f"[ReiConfig] 更新配置失败: {e}")
        return web.json_response(
            {"error": f"更新配置失败: {str(e)}"}, 
            status=500
        )

@routes.post('/api/rei/config/delete')
async def delete_config(request):
    """删除配置"""
    try:
        # 使用 FormData 方式接收数据
        data = await request.post()
        key = data.get('key', '').strip()
        
        if not key:
            return web.json_response(
                {"error": "键名不能为空"}, 
                status=400
            )
        
        configs = load_config()
        if key not in configs:
            return web.json_response(
                {"error": f"配置键 '{key}' 不存在"}, 
                status=404
            )
        
        del configs[key]
        save_config(configs)
        
        print(f"[ReiConfig] 成功删除配置: {key}")
        return web.json_response({
            "success": True,
            "message": f"成功删除配置: {key}"
        })
        
    except Exception as e:
        print(f"[ReiConfig] 删除配置失败: {e}")
        return web.json_response(
            {"error": f"删除配置失败: {str(e)}"}, 
            status=500
        )

def _convert_value(value, value_type):
    """转换值类型"""
    try:
        if value_type == "string":
            return str(value)
        elif value_type == "token":
            # token 类型作为字符串存储，但保持类型信息
            return str(value)
        elif value_type == "3KeyGroup":
            # 3KeyGroup 类型保持为字符串（JSON格式）
            return str(value)
        elif value_type == "integer":
            return int(value)
        elif value_type == "float":
            return float(value)
        elif value_type == "boolean":
            return value.lower() in ['true', '1', 't', 'y', 'yes']
    except (ValueError, AttributeError):
        return None



print("[ReiConfig] API 路由注册完成") 



@routes.get(f'/rei-tools/{{file}}')
async def get_resource(request):
    DIR_WEB = os.path.join(os.path.dirname(__file__), 'rei-web-dist')
    print("--------------------------------")
    print(DIR_WEB)
    print(request.match_info['file'])
    """ Returns a resource file. """
    return web.FileResponse(os.path.join(DIR_WEB, request.match_info['file']))

print("[ReiConfig] API js路由注册完成") 