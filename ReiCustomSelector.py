import json

class ReiCustomSelector:
    @classmethod
    def INPUT_TYPES(cls):
        return {
            "required": {
                "selected_option": (["-- No Options Connected --"],),
            },
            "optional": {
                "option_1": ("REI_SELECTOR_OPTION_OBJECT",),
                "option_2": ("REI_SELECTOR_OPTION_OBJECT",),
                "option_3": ("REI_SELECTOR_OPTION_OBJECT",),
                "option_4": ("REI_SELECTOR_OPTION_OBJECT",),
                "option_5": ("REI_SELECTOR_OPTION_OBJECT",),
                "option_6": ("REI_SELECTOR_OPTION_OBJECT",),
                "option_7": ("REI_SELECTOR_OPTION_OBJECT",),
                "option_8": ("REI_SELECTOR_OPTION_OBJECT",),
                "option_9": ("REI_SELECTOR_OPTION_OBJECT",),
                "option_10": ("REI_SELECTOR_OPTION_OBJECT",),
            }
        }
    @classmethod
    def VALIDATE_INPUTS(cls, selected_option, **kwargs):
        """
        通过返回True来覆盖默认的输入验证。
        这可以防止后端因为收到的值不在初始列表中而报错。
        """
        return True
    RETURN_TYPES = ("STRING",)
    RETURN_NAMES = ("value",)
    FUNCTION = "process"
    CATEGORY = "Rei Tools"
    
    
    def __init__(self):
        self.option_list = []
        self.selected_option = "unselected"
        

    def process(self, selected_option: str, **kwargs) -> tuple:
        option_list = []
        target_option = None
       
        
        # 遍历kwargs找到匹配的选项
        for value in kwargs.values():
            if value is not None:
                try:
                    option = json.loads(value)
                    if option["name"] == selected_option:
                        target_option = option["value"]
                        break
                except:
                    continue
                    
        if target_option:
            return (target_option,)
        return ("",)
        
        
