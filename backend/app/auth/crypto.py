from cryptography.fernet import Fernet

from app.config import settings

_fernet = Fernet(settings.token_encryption_key.encode())


def encrypt_token(plaintext: str) -> bytes:
    return _fernet.encrypt(plaintext.encode())


def decrypt_token(ciphertext: bytes) -> str:
    return _fernet.decrypt(ciphertext).decode()
