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