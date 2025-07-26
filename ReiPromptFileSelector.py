import os
import folder_paths

class ReiPromptFileSelector:
    
    PROMPTS_DIR = os.path.join(folder_paths.base_path, "prompts")
 
    @classmethod
    def get_text_files(cls):
        # 确保目录存在，如果不存在，则创建一个
        if not os.path.isdir(cls.PROMPTS_DIR):
            print(f"ReiTextFileSelector: 'prompts' directory not found at {cls.PROMPTS_DIR}. Creating it.")
            try:
                os.makedirs(cls.PROMPTS_DIR)
            except Exception as e:
                print(f"ReiTextFileSelector: Failed to create 'prompts' directory: {e}")
                return ["-- 'prompts' directory not found or created --"]
 
        files = [f for f in os.listdir(cls.PROMPTS_DIR) if f.endswith(".txt")]
        
        if not files:
            return ["-- No .txt files in prompts dir --"]
            
        return sorted([os.path.splitext(f)[0] for f in files])
 
    @classmethod
    def INPUT_TYPES(cls):
        return {
            "required": {
                "filename": (cls.get_text_files(),),
            }
        }
 
    RETURN_TYPES = ("STRING",)
    RETURN_NAMES = ("text",)
    FUNCTION = "load_text"
    CATEGORY = "ReiTools"
 
    def load_text(self, filename):
        file_path = os.path.join(self.PROMPTS_DIR, filename + ".txt")
        
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                text_content = f.read()
            return (text_content,)
        except FileNotFoundError:
            print(f"ReiPromptFileSelector: File not found at {file_path}")
            return ("",)
        except Exception as e:
            print(f"ReiPromptFileSelector: Error reading file {file_path}: {e}")
            return ("",)