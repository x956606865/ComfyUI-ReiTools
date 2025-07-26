import json

class ReiMetadataParser:
    """
    WebUI参数解析器节点
    输入WebUI的parameters字符串，输出解析后的结构化参数
    """
    
    @classmethod
    def INPUT_TYPES(s):
        return {
            "required": {
                "parsed_parameters_text": ("STRING", {
                    "default": "",
                    "multiline": True,
                    "placeholder": "粘贴或连接parsed_parameters_text..."
                }),
            },
        }

    RETURN_TYPES = (
        "STRING",  # positive_prompt
        "STRING",  # negative_prompt
        "INT",     # steps
        "STRING",  # sampler
        "FLOAT",   # cfg_scale
        "INT",     # seed
        "INT",     # width
        "INT",     # height
        "STRING",  # model
        "STRING",  # parsed_params_json
    )
    RETURN_NAMES = (
        "steps",
        "sampler",
        "cfg_scale",
        "seed",
        "width", 
        "height",
        "model",
        "parsed_params_json"
    )
    
    FUNCTION = "parse_parameters"
    CATEGORY = "ReiTools/Test"
    def parse_parameters_function(self,parameters_text):
        """解析WebUI参数文本"""
        target={
        "steps" : None,
        "schedule_type" : None,
        "sampler" : None,
        "cfg_scale" : None,
        "seed" : None,
        "size" : None,
        "width" : None,
        "height" : None,
        "model_hash" : None,
        "model" : None,
        "denoising_strength" : None,
        "clip_skip" : None,
        "otherSpellMap" : {
            "modelHash": "model_hash",
            "scheduleType": "schedule_type",
            "cfgScale": "cfg_scale",
            "clipSkip":"clip_skip",
            "denoisingStrength":"denoising_strength",
        },
        "other_params" : {}
            } 
        if not parameters_text:
            return target
        try:    
            json_data = json.loads(parameters_text)
        except json.JSONDecodeError:
            return
        
        if isinstance(json_data, dict):
            
            for key, value in json_data.items():
                if key in target:
                    target[key] = value
                elif key in target["otherSpellMap"]:
                    target[target["otherSpellMap"][key]] = value
                else:
                    target["other_params"][key] = value
        return target
    
    def parse_parameters(self, parsed_parameters_text):
        """解析WebUI参数"""
        
        # 初始化默认返回值
        steps = 0
        sampler = ""
        cfg_scale = 0.0
        seed = 0
        width = 0
        height = 0
        model = ""
        parsed_params_json = ""
        
        try:
            if not parsed_parameters_text.strip():
                return (positive_prompt, negative_prompt, steps, sampler, cfg_scale, 
                       seed, width, height, model, "参数文本为空")
            # 解析WebUI参数对象
            webui_params = self.parse_parameters_function(parsed_parameters_text)
            print(webui_params)
            # 提取常用参数
            steps = webui_params["steps"] or 0
            sampler = webui_params["sampler"] or ""
            cfg_scale = float(webui_params["cfg_scale"] or 0.0)
            seed = webui_params["seed"] or 0
            width = webui_params["width"] or 0
            height = webui_params["height"] or 0
            model = webui_params["model"] or ""
            
            # 获取完整的解析结果JSON
            parsed_params_json = json.dumps(webui_params, ensure_ascii=False, indent=2)
            
        except Exception as e:
            print(f"[ReiWebUIParamsParser] 解析参数时出错: {str(e)}")
            parsed_params_json = f"解析参数时出错: {str(e)}"
        
        return ( steps, sampler, cfg_scale, 
                seed, width, height, model, parsed_params_json)
    
        """解析提示词部分"""
        try:
            # 查找 "Negative prompt:" 的位置来分割正负向提示词
            negative_prompt_marker = "Negative prompt:"
            negative_idx = parameters_text.find(negative_prompt_marker)
            
            if negative_idx != -1:
                # 找到了负向提示词标记
                positive_prompt = parameters_text[:negative_idx].strip()
                
                # 提取负向提示词部分
                negative_section = parameters_text[negative_idx + len(negative_prompt_marker):].strip()
                
                # 查找下一个参数行
                import re
                param_pattern = r'\n(?=(?:Steps|Sampler|CFG scale|Seed|Size|Model hash|Model|Denoising strength|Clip skip|ENSD|Version|Hires upscale|Hires steps|Hires upscaler|VAE|VAE hash|ADetailer|ControlNet|TI hashes|Lora hashes|AddNet|Wildcard prompt|Dynamic prompts):)'
                param_match = re.search(param_pattern, negative_section)
                
                if not param_match:
                    # 如果没找到特定参数，尝试通用模式
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
                import re
                param_pattern = r'\n(?=(?:Steps|Sampler|CFG scale|Seed|Size|Model hash|Model|Denoising strength|Clip skip|ENSD|Version|Hires upscale|Hires steps|Hires upscaler|VAE|VAE hash|ADetailer|ControlNet|TI hashes|Lora hashes|AddNet|Wildcard prompt|Dynamic prompts):)'
                param_match = re.search(param_pattern, parameters_text)
                
                if not param_match:
                    # 尝试通用模式
                    generic_param_pattern = r'\n(?=[A-Za-z][A-Za-z0-9\s]*:(?:\s|$))'
                    param_match = re.search(generic_param_pattern, parameters_text)
                
                if param_match:
                    positive_prompt = parameters_text[:param_match.start()].strip()
                else:
                    positive_prompt = parameters_text.strip()
                negative_prompt = ""
            
            return positive_prompt, negative_prompt
        except Exception as e:
            print(f"[ReiWebUIParamsParser] 解析提示词时出错: {str(e)}")
            return parameters_text, "" 