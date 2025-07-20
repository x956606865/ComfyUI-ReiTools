import base64
import hashlib
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.backends import default_backend
import os


class TokenCrypto:
    """
    与前端 Web Crypto API 兼容的 Token 加密/解密工具类
    使用相同的算法：PBKDF2 + AES-GCM
    """
    
    @staticmethod
    def encrypt_token(text: str, password: str) -> str:
        """
        使用密码加密 token 文本
        
        Args:
            text: 要加密的明文
            password: 加密密码
            
        Returns:
            base64 编码的加密数据
            
        Raises:
            Exception: 加密失败时抛出异常
        """
        try:
            # 编码输入
            data = text.encode('utf-8')
            password_data = password.encode('utf-8')
            
            # 生成随机盐 (16 bytes)
            salt = os.urandom(16)
            
            # 使用 PBKDF2 派生密钥
            kdf = PBKDF2HMAC(
                algorithm=hashes.SHA256(),
                length=32,  # 256 bits key
                salt=salt,
                iterations=100000,
                backend=default_backend()
            )
            key = kdf.derive(password_data)
            
            # 生成随机 IV (12 bytes for GCM)
            iv = os.urandom(12)
            
            # 使用 AES-GCM 加密
            aesgcm = AESGCM(key)
            encrypted = aesgcm.encrypt(iv, data, None)
            
            # 组合：salt (16) + iv (12) + encrypted_data
            result = salt + iv + encrypted
            
            # 转换为 base64
            return base64.b64encode(result).decode('ascii')
            
        except Exception as e:
            raise Exception(f"Token 加密失败: {str(e)}")
    
    @staticmethod
    def decrypt_token(encrypted_text: str, password: str) -> str:
        """
        使用密码解密 token 文本
        
        Args:
            encrypted_text: base64 编码的加密数据
            password: 解密密码
            
        Returns:
            解密后的明文
            
        Raises:
            Exception: 解密失败时抛出异常
        """
        try:
            # 编码密码
            password_data = password.encode('utf-8')
            
            # 从 base64 解码
            encrypted_data = base64.b64decode(encrypted_text.encode('ascii'))
            
            # 提取组件
            if len(encrypted_data) < 28:  # 16 + 12 = 28 minimum
                raise ValueError("加密数据格式错误")
                
            salt = encrypted_data[:16]
            iv = encrypted_data[16:28]
            encrypted = encrypted_data[28:]
            
            # 使用 PBKDF2 派生密钥
            kdf = PBKDF2HMAC(
                algorithm=hashes.SHA256(),
                length=32,
                salt=salt,
                iterations=100000,
                backend=default_backend()
            )
            key = kdf.derive(password_data)
            
            # 使用 AES-GCM 解密
            aesgcm = AESGCM(key)
            decrypted = aesgcm.decrypt(iv, encrypted, None)
            
            # 转换为字符串
            return decrypted.decode('utf-8')
            
        except Exception as e:
            raise Exception(f"Token 解密失败，请检查密码是否正确: {str(e)}") 