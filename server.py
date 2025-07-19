import json
import os
from aiohttp import web
from server import PromptServer
import folder_paths
from .utils import load_config, save_config

# 获取路由实例
routes = PromptServer.instance.routes

@routes.get('/api/rei/config/get_all')
async def get_all_configs(request):
    """获取所有配置"""
    try:
        configs = load_config()
        return web.json_response(configs)
    except Exception as e:
        print(f"[ReiConfig] 获取配置失败: {e}")
        return web.json_response(
            {"error": f"获取配置失败: {str(e)}"}, 
            status=500
        )

@routes.get('/api/rei/config/get_types')
async def get_config_types(request):
    """获取所有配置类型信息"""
    try:
        types = _load_config_types()
        return web.json_response(types)
    except Exception as e:
        print(f"[ReiConfig] 获取配置类型失败: {e}")
        return web.json_response(
            {"error": f"获取配置类型失败: {str(e)}"}, 
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
        
        # 保存配置
        configs = load_config()
        configs[key] = converted_value
        save_config(configs)
        
        # 保存类型信息
        _save_config_type(key, value_type)
        
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
        
        # 删除类型信息
        _delete_config_type(key)
        
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
        if value_type == "string" or value_type == "token":
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

def _save_config_type(key, config_type):
    """保存配置类型信息"""
    try:
        type_file_path = os.path.join(folder_paths.base_path, "config_types.json")
        try:
            with open(type_file_path, 'r', encoding='utf-8') as f:
                type_data = json.loads(f.read())
        except:
            type_data = {}
        
        type_data[key] = config_type
        
        with open(type_file_path, 'w', encoding='utf-8') as f:
            f.write(json.dumps(type_data, indent=2, ensure_ascii=False))
    except Exception as e:
        print(f"[ReiConfig] 保存类型信息失败: {e}")

def _delete_config_type(key):
    """删除配置类型信息"""
    try:
        type_file_path = os.path.join(folder_paths.base_path, "config_types.json")
        try:
            with open(type_file_path, 'r', encoding='utf-8') as f:
                type_data = json.loads(f.read())
            
            if key in type_data:
                del type_data[key]
                
                with open(type_file_path, 'w', encoding='utf-8') as f:
                    f.write(json.dumps(type_data, indent=2, ensure_ascii=False))
        except:
            pass  # 文件不存在时忽略
    except Exception as e:
        print(f"[ReiConfig] 删除类型信息失败: {e}")

def _load_config_types():
    """加载配置类型信息"""
    try:
        type_file_path = os.path.join(folder_paths.base_path, "config_types.json")
        with open(type_file_path, 'r', encoding='utf-8') as f:
            return json.loads(f.read())
    except:
        return {}

print("[ReiConfig] API 路由注册完成") 