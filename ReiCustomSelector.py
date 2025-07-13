

class ReiCustomSelector:
    @classmethod
    def INPUT_TYPES(cls):
        return {
            "required": {
                "selected_option": (["-- No Options Connected --"],),
            },
            "optional": {
                "option_1": ("REI_SELECTOR_OPTION_OBJECT",),
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
        for i in range(1, 21): 
            key = f"option_{i}"
            if key in kwargs and kwargs[key] is not None:
                option_data = kwargs[key]
                if isinstance(option_data, tuple) and len(option_data) == 2:
                    option_list.append(option_data)
        
        
        valid_options = []

        for item in option_list:
            if isinstance(item, tuple) and len(item) == 2:
                name, value = item
                valid_options.append({"name": name, "value": value})
                print(f"Received option: Name='{name}', Value='{value}'")
            else:
                print(f"Warning: Received an incompatible item in option_list: {item}")
        
        
        
        
        final_result = next((item["value"] for item in valid_options if item["name"] == selected_option), "")
        return (final_result,)
        
