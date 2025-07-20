import re
import json


class ReiWebUIParams:
    """
    WebUI生成参数解析器
    将WebUI的parameters字符串解析成结构化的参数对象
    """
    
    def __init__(self):
        # 初始化所有可能的参数
        self.steps = None
        self.sampler = None
        self.schedule_type = None
        self.cfg_scale = None
        self.seed = None
        self.size = None
        self.width = None
        self.height = None
        self.model_hash = None
        self.model = None
        self.denoising_strength = None
        self.clip_skip = None
        self.ensd = None
        self.version = None
        self.hires_upscale = None
        self.hires_steps = None
        self.hires_upscaler = None
        self.vae = None
        self.vae_hash = None
        self.ti_hashes = None
        self.lora_hashes = None
        self.addnet_enabled = None
        self.wildcard_prompt = None
        self.dynamic_prompts = None
        self.adetailer_model = None
        self.controlnet_model = None
        # 存储所有未识别的参数
        self.other_params = {}
    
    @classmethod
    def from_parameters_text(cls, parameters_text):
        """从WebUI的parameters文本创建参数对象"""
        params = cls()
        params.parse_parameters(parameters_text)
        return params
    
    def parse_parameters(self, parameters_text):
        """解析WebUI参数文本"""
        if not parameters_text:
            return
        
        try:
            # 查找 "Negative prompt:" 后的参数部分
            negative_prompt_marker = "Negative prompt:"
            negative_idx = parameters_text.find(negative_prompt_marker)
            
            if negative_idx != -1:
                # 找到负向提示词后，查找参数部分
                negative_section = parameters_text[negative_idx + len(negative_prompt_marker):]
                
                # 找到参数开始的位置
                import re
                param_pattern = r'\n(?=(?:Steps|Sampler|CFG scale|Seed|Size|Model hash|Model|Denoising strength|Clip skip|ENSD|Version|Hires upscale|Hires steps|Hires upscaler|VAE|VAE hash|ADetailer|ControlNet|TI hashes|Lora hashes|AddNet|Wildcard prompt|Dynamic prompts):)'
                param_match = re.search(param_pattern, negative_section)
                
                if param_match:
                    params_text = negative_section[param_match.start():].strip()
                else:
                    # 如果没找到特定参数，尝试通用模式
                    generic_param_pattern = r'\n(?=[A-Za-z][A-Za-z0-9\s]*:(?:\s|$))'
                    param_match = re.search(generic_param_pattern, negative_section)
                    if param_match:
                        params_text = negative_section[param_match.start():].strip()
                    else:
                        params_text = ""
            else:
                # 没有负向提示词，直接查找参数
                param_pattern = r'\n(?=(?:Steps|Sampler|CFG scale|Seed|Size|Model hash|Model|Denoising strength|Clip skip|ENSD|Version|Hires upscale|Hires steps|Hires upscaler|VAE|VAE hash|ADetailer|ControlNet|TI hashes|Lora hashes|AddNet|Wildcard prompt|Dynamic prompts):)'
                param_match = re.search(param_pattern, parameters_text)
                
                if param_match:
                    params_text = parameters_text[param_match.start():].strip()
                else:
                    # 尝试通用模式
                    generic_param_pattern = r'\n(?=[A-Za-z][A-Za-z0-9\s]*:(?:\s|$))'
                    param_match = re.search(generic_param_pattern, parameters_text)
                    if param_match:
                        params_text = parameters_text[param_match.start():].strip()
                    else:
                        params_text = ""
            
            if params_text:
                self._parse_params_text(params_text)
                
        except Exception as e:
            print(f"[ReiWebUIParams] 解析参数时出错: {str(e)}")
    
    def _parse_params_text(self, params_text):
        """解析参数文本"""
        # 按行分割，但要考虑多行参数值
        lines = params_text.split('\n')
        current_param = None
        current_value = ""
        
        for line in lines:
            line = line.strip()
            if not line:
                continue
            
            # 检查是否是新的参数行（包含冒号）
            if ':' in line and not line.startswith(' '):
                # 保存上一个参数
                if current_param:
                    self._set_parameter(current_param, current_value.strip())
                
                # 解析新参数
                parts = line.split(':', 1)
                if len(parts) == 2:
                    current_param = parts[0].strip()
                    current_value = parts[1].strip()
                else:
                    current_param = None
                    current_value = ""
            else:
                # 继续上一个参数的值（多行值）
                if current_param:
                    current_value += " " + line
        
        # 保存最后一个参数
        if current_param:
            self._set_parameter(current_param, current_value.strip())
    
    def _set_parameter(self, param_name, param_value):
        """设置参数值"""
        param_name_lower = param_name.lower().replace(' ', '_').replace('-', '_')
        
        # 解析逗号分隔的参数（如Steps: 20, Sampler: Euler a）
        if ',' in param_value:
            # 分割并处理每个子参数
            parts = [p.strip() for p in param_value.split(',')]
            
            # 第一个部分是当前参数的值
            if parts:
                first_value = parts[0]
                self._set_single_parameter(param_name_lower, first_value)
                
                # 处理后续的子参数
                for part in parts[1:]:
                    if ':' in part:
                        sub_parts = part.split(':', 1)
                        if len(sub_parts) == 2:
                            sub_param = sub_parts[0].strip().lower().replace(' ', '_').replace('-', '_')
                            sub_value = sub_parts[1].strip()
                            self._set_single_parameter(sub_param, sub_value)
        else:
            self._set_single_parameter(param_name_lower, param_value)
    
    def _set_single_parameter(self, param_name, param_value):
        """设置单个参数值"""
        try:
            # 映射参数名到属性
            param_mapping = {
                'steps': 'steps',
                'sampler': 'sampler',
                'schedule_type': 'schedule_type',
                'cfg_scale': 'cfg_scale',
                'seed': 'seed',
                'size': 'size',
                'model_hash': 'model_hash',
                'model': 'model',
                'denoising_strength': 'denoising_strength',
                'clip_skip': 'clip_skip',
                'ensd': 'ensd',
                'version': 'version',
                'hires_upscale': 'hires_upscale',
                'hires_steps': 'hires_steps',
                'hires_upscaler': 'hires_upscaler',
                'vae': 'vae',
                'vae_hash': 'vae_hash',
                'ti_hashes': 'ti_hashes',
                'lora_hashes': 'lora_hashes',
                'addnet_enabled': 'addnet_enabled',
                'wildcard_prompt': 'wildcard_prompt',
                'dynamic_prompts': 'dynamic_prompts',
                'adetailer_model': 'adetailer_model',
                'controlnet_model': 'controlnet_model',
            }
            
            if param_name in param_mapping:
                attr_name = param_mapping[param_name]
                
                # 尝试转换数值类型
                if param_name in ['steps', 'cfg_scale', 'seed', 'clip_skip', 'hires_steps']:
                    try:
                        setattr(self, attr_name, int(float(param_value)))
                    except ValueError:
                        setattr(self, attr_name, param_value)
                elif param_name in ['denoising_strength', 'hires_upscale']:
                    try:
                        setattr(self, attr_name, float(param_value))
                    except ValueError:
                        setattr(self, attr_name, param_value)
                elif param_name == 'size':
                    # 解析尺寸 (如 "512x768")
                    if 'x' in param_value:
                        try:
                            width, height = param_value.split('x')
                            self.width = int(width.strip())
                            self.height = int(height.strip())
                            self.size = param_value
                        except ValueError:
                            self.size = param_value
                    else:
                        self.size = param_value
                else:
                    setattr(self, attr_name, param_value)
            else:
                # 存储未识别的参数
                self.other_params[param_name] = param_value
                
        except Exception as e:
            print(f"[ReiWebUIParams] 设置参数 {param_name}={param_value} 时出错: {str(e)}")
            self.other_params[param_name] = param_value
    
    def to_dict(self):
        """转换为字典格式"""
        result = {}
        
        # 添加所有非空的标准参数
        standard_params = [
            'steps', 'sampler', 'schedule_type', 'cfg_scale', 'seed', 'size', 
            'width', 'height', 'model_hash', 'model', 'denoising_strength', 
            'clip_skip', 'ensd', 'version', 'hires_upscale', 'hires_steps', 
            'hires_upscaler', 'vae', 'vae_hash', 'ti_hashes', 'lora_hashes', 
            'addnet_enabled', 'wildcard_prompt', 'dynamic_prompts', 
            'adetailer_model', 'controlnet_model'
        ]
        
        for param in standard_params:
            value = getattr(self, param, None)
            if value is not None:
                result[param] = value
        
        # 添加其他参数
        if self.other_params:
            result['other_params'] = self.other_params
        
        return result
    
    def to_json(self, indent=2):
        """转换为JSON字符串"""
        return json.dumps(self.to_dict(), ensure_ascii=False, indent=indent)
    
    def __str__(self):
        """字符串表示"""
        return self.to_json()
    
    def __repr__(self):
        """对象表示"""
        return f"ReiWebUIParams({self.to_dict()})" 