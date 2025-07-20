import os
import json
import base64
from PIL import Image
from PIL.PngImagePlugin import PngInfo
import folder_paths
from .ReiWebUIParams import ReiWebUIParams


class ReiImageMetadataLoader:
    """
    加载WebUI或ComfyUI生成的图片，读取其元数据中的prompt和其他信息
    支持PNG格式的图片元数据读取
    """
    
    @classmethod
    def INPUT_TYPES(s):
        input_dir = folder_paths.get_input_directory()
        files = [f for f in os.listdir(input_dir) if os.path.isfile(os.path.join(input_dir, f)) and f.lower().endswith(('.png', '.jpg', '.jpeg', '.webp'))]
        
        return {
            "required": {
                "image": (sorted(files), {"image_upload": True}),
            },
        }

    RETURN_TYPES = ("IMAGE", "STRING", "STRING", "STRING", "STRING", "STRING", "STRING")
    RETURN_NAMES = ("image", "positive_prompt", "negative_prompt", "parameters", "workflow", "raw_metadata", "parsed_params")
    
    FUNCTION = "load_image_metadata"
    CATEGORY = "ReiTools"
    
    def load_image_metadata(self, image):
        """加载图片并提取元数据"""
        input_dir = folder_paths.get_input_directory()
        image_path = os.path.join(input_dir, image)
        
        # 加载图片
        img = Image.open(image_path)
        
        # 转换为ComfyUI格式
        import torch
        import numpy as np
        
        img_array = np.array(img.convert("RGB")).astype(np.float32) / 255.0
        img_tensor = torch.from_numpy(img_array)[None,]
        
        # 初始化返回值
        positive_prompt = ""
        negative_prompt = ""
        parameters = ""
        workflow = ""
        raw_metadata = ""
        parsed_params = ""
        
        try:
            # 方法1: 尝试读取PNG信息（普通WebUI/ComfyUI格式）
            if hasattr(img, 'text') and img.text:
                # 安全地处理PNG文本数据
                safe_text = {}
                for key, value in img.text.items():
                    if isinstance(value, bytes):
                        try:
                            safe_text[key] = value.decode('utf-8', errors='ignore')
                        except:
                            safe_text[key] = f"<bytes数据,长度:{len(value)}>"
                    else:
                        safe_text[key] = str(value)
                raw_metadata = json.dumps(safe_text, ensure_ascii=False, indent=2)
                
                # 检查是否为普通WebUI生成的图片
                if 'parameters' in img.text:
                    parameters = img.text['parameters']
                    positive_prompt, negative_prompt = self._parse_webui_parameters(parameters)
                    
                    # 解析WebUI参数对象
                    try:
                        webui_params = ReiWebUIParams.from_parameters_text(parameters)
                        parsed_params = webui_params.to_json()
                    except Exception as e:
                        print(f"[ReiImageMetadataLoader] 解析WebUI参数对象时出错: {str(e)}")
                        parsed_params = f"解析参数对象时出错: {str(e)}"
                    
                    return (img_tensor, positive_prompt, negative_prompt, parameters, workflow, raw_metadata, parsed_params)
                
                # 检查是否为普通ComfyUI生成的图片
                elif 'workflow' in img.text:
                    workflow = img.text['workflow']
                    positive_prompt, negative_prompt = self._parse_comfyui_workflow(workflow)
                    return (img_tensor, positive_prompt, negative_prompt, parameters, workflow, raw_metadata, parsed_params)
                elif 'prompt' in img.text:
                    workflow = img.text['prompt']
                    positive_prompt, negative_prompt = self._parse_comfyui_workflow(workflow)
                    return (img_tensor, positive_prompt, negative_prompt, parameters, workflow, raw_metadata, parsed_params)
                
                # 直接查找prompt字段
                if 'prompt' in img.text and not positive_prompt:
                    positive_prompt = img.text['prompt']
                if 'negative_prompt' in img.text and not negative_prompt:
                    negative_prompt = img.text['negative_prompt']
                    
                # 如果在PNG文本中找到了内容，返回结果
                if positive_prompt or negative_prompt:
                    return (img_tensor, positive_prompt, negative_prompt, parameters, workflow, raw_metadata, parsed_params)
            
            # 方法2: 检查EXIF数据（Civitai格式）
            if hasattr(img, 'info') and img.info:
                # 安全地转换EXIF数据，处理bytes类型
                safe_info = {}
                for key, value in img.info.items():
                    if isinstance(value, bytes):
                        try:
                            safe_info[key] = value.decode('utf-8', errors='ignore')
                        except:
                            safe_info[key] = f"<bytes数据,长度:{len(value)}>"
                    else:
                        safe_info[key] = value
                raw_metadata = json.dumps(safe_info, ensure_ascii=False, indent=2)
                
                # 方法2.1: 检查所有EXIF字段中的JSON格式（Civitai ComfyUI格式）
                for key, value in img.info.items():
                    if isinstance(value, str) and len(value) > 100:
                        if value.strip().startswith('{') and 'extraMetadata' in value:
                            try:
                                data = json.loads(value)
                                if isinstance(data, dict) and 'extraMetadata' in data:
                                    extra_meta = data['extraMetadata']
                                    if isinstance(extra_meta, str) and len(extra_meta) > 20:
                                        positive_prompt = extra_meta
                                        workflow = json.dumps(data, ensure_ascii=False, indent=2)
                                        
                                        # 为Civitai ComfyUI格式创建参数对象
                                        civitai_params = {
                                            "format": "Civitai ComfyUI",
                                            "source_field": key,
                                            "prompt": extra_meta,
                                            "workflow_nodes": len([k for k in data.keys() if k.isdigit()]),
                                            "has_extraMetadata": True
                                        }
                                        
                                        # 尝试从workflow中提取其他参数
                                        for node_id, node_data in data.items():
                                            if isinstance(node_data, dict) and 'inputs' in node_data:
                                                inputs = node_data['inputs']
                                                class_type = node_data.get('class_type', '')
                                                
                                                # 提取常见参数
                                                if 'steps' in inputs:
                                                    civitai_params['steps'] = inputs['steps']
                                                if 'cfg' in inputs:
                                                    civitai_params['cfg_scale'] = inputs['cfg']
                                                if 'seed' in inputs:
                                                    civitai_params['seed'] = inputs['seed']
                                                if 'sampler_name' in inputs:
                                                    civitai_params['sampler'] = inputs['sampler_name']
                                                if 'scheduler' in inputs:
                                                    civitai_params['scheduler'] = inputs['scheduler']
                                                if 'width' in inputs and 'height' in inputs:
                                                    civitai_params['width'] = inputs['width']
                                                    civitai_params['height'] = inputs['height']
                                                if 'ckpt_name' in inputs:
                                                    civitai_params['model'] = inputs['ckpt_name']
                                                    
                                        parsed_params = json.dumps(civitai_params, ensure_ascii=False, indent=2)
                                        if not raw_metadata:
                                            raw_metadata = json.dumps(safe_info, ensure_ascii=False, indent=2)
                                        return (img_tensor, positive_prompt, negative_prompt, parameters, workflow, raw_metadata, parsed_params)
                            except json.JSONDecodeError:
                                pass
                    elif isinstance(value, bytes) and len(value) > 100:
                        try:
                            decoded = value.decode('utf-8', errors='ignore')
                            if '{' in decoded and 'extraMetadata' in decoded:
                                start = decoded.find('{')
                                if start != -1:
                                    json_part = decoded[start:]
                                    brace_count = 0
                                    end_pos = start
                                    for i, char in enumerate(json_part):
                                        if char == '{':
                                            brace_count += 1
                                        elif char == '}':
                                            brace_count -= 1
                                            if brace_count == 0:
                                                end_pos = start + i + 1
                                                break
                                    
                                    if end_pos > start:
                                        json_candidate = decoded[start:end_pos]
                                        try:
                                            data = json.loads(json_candidate)
                                            if isinstance(data, dict) and 'extraMetadata' in data:
                                                extra_meta = data['extraMetadata']
                                                
                                                # 检查extraMetadata的类型并正确处理
                                                if isinstance(extra_meta, str) and len(extra_meta) > 20:
                                                    # extraMetadata是字符串
                                                    positive_prompt = extra_meta
                                                elif isinstance(extra_meta, dict):
                                                    # extraMetadata是对象，提取prompt字段
                                                    positive_prompt = extra_meta.get('prompt', '')
                                                    # 如果prompt为空或太短，使用第一个长文本字段
                                                    if len(positive_prompt) < 20:
                                                        for key, value in extra_meta.items():
                                                            if isinstance(value, str) and len(value) > 20:
                                                                positive_prompt = value
                                                                break
                                                    # 如果还是没有找到合适的prompt，使用截断的字符串表示
                                                    if len(positive_prompt) < 20:
                                                        positive_prompt = str(extra_meta)[:200] + '...'
                                                    # 如果有negative_prompt，也提取出来
                                                    if 'negative_prompt' in extra_meta:
                                                        negative_prompt = extra_meta['negative_prompt']
                                                else:
                                                    # 其他情况，转换为字符串
                                                    positive_prompt = str(extra_meta)
                                                
                                                # 确保positive_prompt是字符串
                                                if not isinstance(positive_prompt, str):
                                                    positive_prompt = str(positive_prompt)
                                                
                                                workflow = json.dumps(data, ensure_ascii=False, indent=2)
                                                
                                                # 为Civitai ComfyUI格式创建参数对象
                                                civitai_params = {
                                                    "format": "Civitai ComfyUI",
                                                    "source_field": f"{key} (bytes)",
                                                    "prompt": positive_prompt,
                                                    "extraMetadata_type": type(extra_meta).__name__,
                                                    "workflow_nodes": len([k for k in data.keys() if k.isdigit()]),
                                                    "has_extraMetadata": True
                                                }
                                                
                                                # 如果extraMetadata是对象，直接使用其内容
                                                if isinstance(extra_meta, dict):
                                                    civitai_params.update(extra_meta)
                                                
                                                # 尝试从workflow中提取其他参数
                                                for node_id, node_data in data.items():
                                                    if isinstance(node_data, dict) and 'inputs' in node_data:
                                                        inputs = node_data['inputs']
                                                        class_type = node_data.get('class_type', '')
                                                        
                                                        # 提取常见参数
                                                        if 'steps' in inputs:
                                                            civitai_params['steps'] = inputs['steps']
                                                        if 'cfg' in inputs:
                                                            civitai_params['cfg_scale'] = inputs['cfg']
                                                        if 'seed' in inputs:
                                                            civitai_params['seed'] = inputs['seed']
                                                        if 'sampler_name' in inputs:
                                                            civitai_params['sampler'] = inputs['sampler_name']
                                                        if 'scheduler' in inputs:
                                                            civitai_params['scheduler'] = inputs['scheduler']
                                                        if 'width' in inputs and 'height' in inputs:
                                                            civitai_params['width'] = inputs['width']
                                                            civitai_params['height'] = inputs['height']
                                                        if 'ckpt_name' in inputs:
                                                            civitai_params['model'] = inputs['ckpt_name']
                                                            
                                                parsed_params = json.dumps(civitai_params, ensure_ascii=False, indent=2)
                                                if not raw_metadata:
                                                    raw_metadata = json.dumps(safe_info, ensure_ascii=False, indent=2)
                                                return (img_tensor, positive_prompt, negative_prompt, parameters, workflow, raw_metadata, parsed_params)
                                        except json.JSONDecodeError:
                                            pass
                        except:
                            pass
                
                # 方法2.2: 检查UserComment字段（直接UserComment或Civitai WebUI格式）
                user_comment = None
                
                # 首先检查直接的UserComment字段
                if 'UserComment' in img.info:
                    user_comment = img.info['UserComment']
                    if isinstance(user_comment, bytes):
                        user_comment = user_comment.decode('utf-8', errors='ignore')
                # 然后检查EXIF数据中的嵌套UserComment
                elif 'exif' in img.info:
                    exif_data = img.info['exif']
                    if isinstance(exif_data, bytes):
                        try:
                            exif_str = exif_data.decode('latin-1', errors='ignore')
                            # 查找UNICODE标记和内容
                            unicode_pos = exif_str.find('UNICODE')
                            if unicode_pos != -1:
                                unicode_content = exif_str[unicode_pos + 7:]
                                # 更精确的字符过滤，保留可打印字符和常见标点
                                user_comment = ''.join(char for char in unicode_content if ord(char) >= 32 or char in '\n\r\t')
                                # 清理末尾的控制字符和null字符
                                user_comment = user_comment.rstrip('\x00\x01\x02\x03\x04\x05\x06\x07\x08\x0b\x0c\x0e\x0f').strip()
                            # else:
                            #     # 查找包含AI关键词的文本段
                            #     import re
                            #     text_matches = re.findall(r'[a-zA-Z,\s]{50,}', exif_str)
                            #     for match in text_matches:
                            #         if any(keyword in match.lower() for keyword in ['masterpiece', 'quality', 'detailed', 'realistic']):
                            #             user_comment = match.strip()
                            #             break
                        except Exception as e:
                            print(f"[ReiImageMetadataLoader] 解析EXIF中的UserComment时出错: {str(e)}")
                
                if user_comment:
                    try:
                        # 检查是否为JSON格式（可能是Civitai ComfyUI格式）
                        if user_comment.strip().startswith('{'):
                            try:
                                comment_data = json.loads(user_comment)
                                if isinstance(comment_data, dict) and 'extraMetadata' in comment_data:
                                    # Civitai ComfyUI格式
                                    extra_meta = comment_data['extraMetadata']
                                    # 打印extra_meta的值和类型
                                    # print(f"[ReiImageMetadataLoader] extraMetadata值: {extra_meta}")
                                    # print(f"[ReiImageMetadataLoader] extraMetadata类型: {type(extra_meta)}")
                                    # 检查extraMetadata的类型并正确处理
                                    if isinstance(extra_meta, str) and len(extra_meta) > 20:
                                        # extraMetadata是字符串
                                        # 尝试解析extra_meta字符串为JSON
                                        try:
                                            extra_meta_json = json.loads(extra_meta)
                                            if isinstance(extra_meta_json, dict):
                                                extra_meta = extra_meta_json
                                            else:
                                                extra_meta = None
                                        except json.JSONDecodeError:
                                            extra_meta = None
                                        # positive_prompt = extra_meta
                                    if isinstance(extra_meta, dict):
                                        # extraMetadata是对象，提取prompt字段
                                        positive_prompt = extra_meta.get('prompt', '')
                                        # 如果prompt为空或太短，使用第一个长文本字段
                                        if len(positive_prompt) < 20:
                                            for key, value in extra_meta.items():
                                                if isinstance(value, str) and len(value) > 20:
                                                    positive_prompt = value
                                                    break
                                        # 如果还是没有找到合适的prompt，使用截断的字符串表示
                                        if len(positive_prompt) < 20:
                                            positive_prompt = str(extra_meta)[:200] + '...'
                                        # 如果有negative_prompt，也提取出来
                                        if 'negative_prompt' in extra_meta:
                                            negative_prompt = extra_meta['negative_prompt']
                                    # else:
                                    #     # 其他情况，转换为字符串
                                    #     positive_prompt = str(extra_meta)
                                    
                                    # 确保positive_prompt是字符串
                                    if not isinstance(positive_prompt, str):
                                        positive_prompt = ""
                                    
                                    workflow = json.dumps(comment_data, ensure_ascii=False, indent=2)
                                    
                                    # 为Civitai ComfyUI格式创建参数对象
                                    civitai_params = {
                                        "format": "Civitai ComfyUI",
                                        "source_field": "UserComment",
                                        "prompt": positive_prompt,
                                        "extraMetadata_type": type(extra_meta).__name__,
                                        # "workflow_nodes": len([k for k in comment_data.keys() if k.isdigit()]),
                                        "has_extraMetadata": True
                                    }
                                    
                                    # 如果extraMetadata是对象，直接使用其内容
                                    if isinstance(extra_meta, dict):
                                        civitai_params.update(extra_meta)
                                    
                                    
                                    parsed_params = json.dumps(civitai_params, ensure_ascii=False, indent=2)
                                    
                                    return (img_tensor, positive_prompt, negative_prompt, parameters, workflow, raw_metadata, parsed_params)
                            except json.JSONDecodeError:
                                pass
                        
                        # 检查是否包含WebUI格式的parameters
                        if 'Negative prompt:' in user_comment or 'Steps:' in user_comment:
                            # 这是WebUI格式的参数文本（可能是Civitai WebUI格式）
                            parameters = user_comment
                            positive_prompt, negative_prompt = self._parse_webui_parameters(parameters)
                            
                            # 解析WebUI参数对象
                            try:
                                webui_params = ReiWebUIParams.from_parameters_text(parameters)
                                parsed_params = webui_params.to_json()
                            except Exception as e:
                                print(f"[ReiImageMetadataLoader] 解析UserComment中的WebUI参数时出错: {str(e)}")
                                parsed_params = f"Civitai WebUI格式，解析参数时出错: {str(e)}"
                                
                            return (img_tensor, positive_prompt, negative_prompt, parameters, workflow, raw_metadata, parsed_params)
                        
                        # 如果直接是提示词文本
                        elif user_comment and not positive_prompt:
                            # 检查是否包含AI关键词
                            text_lower = user_comment.lower()
                            ai_keywords = ['masterpiece', 'best quality', 'high quality', 'detailed', 'realistic', 'absurdres']
                            found_keywords = [kw for kw in ai_keywords if kw in text_lower]
                            
                            if len(found_keywords) >= 2:
                                positive_prompt = user_comment
                                parsed_params = "直接prompt文本格式"
                                return (img_tensor, positive_prompt, negative_prompt, parameters, workflow, raw_metadata, parsed_params)
                            else:
                                # 尝试按行分析是否包含提示词信息
                                lines = user_comment.split('\n')
                                if lines:
                                    positive_prompt = lines[0].strip()
                                    # 查找负向提示词
                                    for line in lines[1:]:
                                        if line.strip().startswith('Negative:') or line.strip().startswith('Negative prompt:'):
                                            negative_prompt = line.split(':', 1)[1].strip() if ':' in line else ""
                                            break
                                    parsed_params = "多行文本格式"
                    except Exception as e:
                        print(f"[ReiImageMetadataLoader] 解析UserComment时出错: {str(e)}")
                        # 如果解析失败，至少将原始内容作为positive_prompt
                        if user_comment and not positive_prompt:
                            positive_prompt = user_comment[:500] + "..." if len(user_comment) > 500 else user_comment
                            parsed_params = f"解析失败，原始文本: {str(e)}"
        
        except Exception as e:
            print(f"[ReiImageMetadataLoader] 读取元数据时出错: {str(e)}")
            raw_metadata = f"读取元数据时出错: {str(e)}"
        
        return (img_tensor, positive_prompt, negative_prompt, parameters, workflow, raw_metadata, parsed_params)
    
    def _parse_webui_parameters(self, parameters_text):
        """解析WebUI的parameters文本"""
        try:
            # 查找 "Negative prompt:" 的位置来分割正负向提示词
            negative_prompt_marker = "Negative prompt:"
            negative_idx = parameters_text.find(negative_prompt_marker)
            
            if negative_idx != -1:
                # 找到了负向提示词标记
                positive_prompt = parameters_text[:negative_idx].strip()
                
                # 提取负向提示词部分
                negative_section = parameters_text[negative_idx + len(negative_prompt_marker):].strip()
                
                # 查找下一个参数行（通常以大写字母开头，如 "Steps:", "Sampler:" 等）
                import re
                # 匹配常见的WebUI参数模式
                param_pattern = r'\n(?=(?:Steps|Sampler|CFG scale|Seed|Size|Model hash|Model|Denoising strength|Clip skip|ENSD|Version|Hires upscale|Hires steps|Hires upscaler|VAE|VAE hash|ADetailer|ControlNet|TI hashes|Lora hashes|AddNet|Wildcard prompt|Dynamic prompts):)'
                param_match = re.search(param_pattern, negative_section)
                
                if not param_match:
                    # 如果没找到特定参数，尝试通用模式：行首英文单词后跟冒号
                    generic_param_pattern = r'\n(?=[A-Za-z][A-Za-z0-9\s]*:(?:\s|$))'
                    param_match = re.search(generic_param_pattern, negative_section)
                
                if param_match:
                    # 找到了参数行，负向提示词在参数行之前
                    negative_prompt = negative_section[:param_match.start()].strip()
                else:
                    # 没找到参数行，整个剩余部分都是负向提示词
                    negative_prompt = negative_section.strip()
            else:
                # 没有找到负向提示词标记，整个文本都是正向提示词
                # 但需要移除可能的参数部分
                import re
                param_pattern = r'\n(?=(?:Steps|Sampler|CFG scale|Seed|Size|Model hash|Model|Denoising strength|Clip skip|ENSD|Version|Hires upscale|Hires steps|Hires upscaler|VAE|VAE hash|ADetailer|ControlNet|TI hashes|Lora hashes|AddNet|Wildcard prompt|Dynamic prompts):)'
                param_match = re.search(param_pattern, parameters_text)
                
                if not param_match:
                    # 如果没找到特定参数，尝试通用模式
                    generic_param_pattern = r'\n(?=[A-Za-z][A-Za-z0-9\s]*:(?:\s|$))'
                    param_match = re.search(generic_param_pattern, parameters_text)
                
                if param_match:
                    positive_prompt = parameters_text[:param_match.start()].strip()
                else:
                    positive_prompt = parameters_text.strip()
                negative_prompt = ""
            
            return positive_prompt, negative_prompt
        except Exception as e:
            print(f"[ReiImageMetadataLoader] 解析WebUI参数时出错: {str(e)}")
            return parameters_text, ""
    
    def _parse_comfyui_workflow(self, workflow_text):
        """解析ComfyUI的workflow JSON"""
        try:
            if isinstance(workflow_text, str):
                workflow_data = json.loads(workflow_text)
            else:
                workflow_data = workflow_text
            
            positive_prompt = ""
            negative_prompt = ""
            
            # 遍历节点查找CLIPTextEncode相关的节点
            for node_id, node_data in workflow_data.items():
                if isinstance(node_data, dict):
                    class_type = node_data.get('class_type', '')
                    inputs = node_data.get('inputs', {})
                    
                    # 查找文本编码节点
                    if 'CLIPTextEncode' in class_type or 'prompt' in class_type.lower():
                        text = inputs.get('text', '')
                        if text and not positive_prompt:
                            positive_prompt = text
                        elif text and positive_prompt and not negative_prompt:
                            negative_prompt = text
                    
                    # 查找直接的text字段
                    if 'text' in inputs and inputs['text']:
                        if not positive_prompt:
                            positive_prompt = inputs['text']
                        elif not negative_prompt and inputs['text'] != positive_prompt:
                            negative_prompt = inputs['text']
            
            return positive_prompt, negative_prompt
        except:
            return workflow_text if isinstance(workflow_text, str) else str(workflow_text), ""

    @classmethod
    def IS_CHANGED(s, image):
        """检查图片是否发生变化"""
        input_dir = folder_paths.get_input_directory()
        image_path = os.path.join(input_dir, image)
        if os.path.exists(image_path):
            return os.path.getmtime(image_path)
        return float("NaN")
    
    @classmethod
    def VALIDATE_INPUTS(s, image):
        """验证输入"""
        input_dir = folder_paths.get_input_directory()
        if not os.path.exists(os.path.join(input_dir, image)):
            return "图片文件不存在"
        return True 