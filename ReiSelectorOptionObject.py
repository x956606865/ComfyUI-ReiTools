
class ReiSelectorOptionObject:
    @classmethod
    def INPUT_TYPES(cls):
        return {
            "required": {
                "name": ("STRING", {
                    "default": ''
                }),
                "value": ("STRING", {
                    "multiline": True,
                    "default": ''
                }),
                
            },
        }

    @classmethod
    def VALIDATE_INPUTS(cls):
        return True
        
    RETURN_TYPES =("REI_SELECTOR_OPTION_OBJECT",)
    RETURN_NAMES = ("rei_selector_option_object",)
    FUNCTION = "process"
    CATEGORY = "Rei Tools"
    
    def __init__(self):
        self.name = ""
        self.value = ""
        
   
    def process(self, name: str, value: str) -> tuple:
        return ((name,value),)
