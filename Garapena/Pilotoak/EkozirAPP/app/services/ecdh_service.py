"""ECDH encryption service for password-based key derivation and message encryption."""

from __future__ import annotations

import base64
import hashlib
import json
from typing import Dict, Any

from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.asymmetric import ec
from cryptography.hazmat.primitives.kdf.hkdf import HKDF
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from cryptography.hazmat.backends import default_backend
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC


def _derive_seed_from_password(password: str) -> bytes:
    """
    Derive a deterministic seed from password using PBKDF2.
    
    This ensures the same password always generates the same seed.
    Uses the same salt as the JavaScript implementation.
    """
    salt = b'KEY_DERIVATION_SALT_v1'
    password_bytes = password.encode('utf-8')
    
    kdf = PBKDF2HMAC(
        algorithm=hashes.SHA256(),
        length=32,  # 256 bits
        salt=salt,
        iterations=100000,
        backend=default_backend()
    )
    
    seed = kdf.derive(password_bytes)
    return seed


def _derive_private_key_from_seed(seed: bytes) -> bytes:
    """
    Derive deterministic private key material from seed using HKDF.
    
    Uses the same salt and info as the JavaScript implementation.
    """
    salt = b'ECDH_KEY_SALT_DETERMINISTIC_v1'
    info = b'ECDH-P256-PrivateKey'
    
    hkdf = HKDF(
        algorithm=hashes.SHA256(),
        length=32,  # 256 bits for P-256
        salt=salt,
        info=info,
        backend=default_backend()
    )
    
    private_key_material = hkdf.derive(seed)
    return private_key_material


def _base64url_encode(data: bytes) -> str:
    """Convert bytes to base64url string (JWK format)."""
    base64_str = base64.b64encode(data).decode('utf-8')
    # Convert base64 to base64url (replace + with -, / with _, remove padding)
    base64url = base64_str.replace('+', '-').replace('/', '_').rstrip('=')
    return base64url


def _base64url_decode(base64url: str) -> bytes:
    """Convert base64url string to bytes."""
    # Convert base64url to base64
    base64_str = base64url.replace('-', '+').replace('_', '/')
    # Add padding if needed
    padding = 4 - len(base64_str) % 4
    if padding != 4:
        base64_str += '=' * padding
    return base64.b64decode(base64_str)


def derive_public_key_from_password(password: str, username: str = "") -> Dict[str, Any]:
    """
    Derive ECDH public key (JSON) from password using same algorithm as JavaScript.
    
    The same password will always generate the same public key, even across sessions.
    Uses P-256 curve (NIST secp256r1).
    
    Args:
        password: User's password
        username: Optional username (not used in key derivation, but kept for API compatibility)
    
    Returns:
        Dictionary containing the public key in JWK format (JSON-serializable)
    """
    # Derive seed from password
    seed = _derive_seed_from_password(password)
    
    # Derive private key material from seed
    private_key_material = _derive_private_key_from_seed(seed)
    
    # Create private key from material
    # Note: We need to ensure the private key is in valid range [1, n-1]
    # where n is the curve order. The cryptography library handles this.
    private_key = ec.derive_private_key(
        int.from_bytes(private_key_material, 'big'),
        ec.SECP256R1(),
        default_backend()
    )
    
    # Get public key
    public_key = private_key.public_key()
    
    # Extract x and y coordinates
    public_numbers = public_key.public_numbers()
    x_bytes = public_numbers.x.to_bytes(32, 'big')
    y_bytes = public_numbers.y.to_bytes(32, 'big')
    
    # Convert to base64url (JWK format)
    x_base64url = _base64url_encode(x_bytes)
    y_base64url = _base64url_encode(y_bytes)
    
    # Create shareable public key object (same format as JavaScript)
    shareable_public_key = {
        "kty": "EC",
        "crv": "P-256",
        "x": x_base64url,
        "y": y_base64url,
        "alg": "ECDH-P256",
        "ext": True
    }
    
    return shareable_public_key


def encrypt_message_for_recipient(
    message: str,
    recipient_public_key_json: str
) -> Dict[str, Any]:
    """
    Encrypt a message using recipient's public key (hybrid ECDH-AES-GCM).
    
    This allows encryption of messages of any length.
    
    Args:
        message: Plaintext message to encrypt
        recipient_public_key_json: Recipient's public key as JSON string
    
    Returns:
        Dictionary containing encrypted package with:
        - encryptedMessage: Base64-encoded encrypted message
        - iv: Base64-encoded initialization vector
        - algorithm: "HYBRID-ECDH-AES-GCM"
        - ephemeralPublicKey: Sender's ephemeral public key (JWK format)
        - publicKeyHash: Hash of recipient's public key for verification
    """
    # Parse recipient's public key
    recipient_key_data = json.loads(recipient_public_key_json)
    
    # Validate ECDH public key format
    if recipient_key_data.get("crv") != "P-256":
        raise ValueError("Invalid public key format. Expected ECDH P-256 public key.")
    
    if not recipient_key_data.get("x") or not recipient_key_data.get("y"):
        raise ValueError("Invalid ECDH public key: missing x or y coordinates")
    
    # Decode recipient's public key coordinates
    x_bytes = _base64url_decode(recipient_key_data["x"])
    y_bytes = _base64url_decode(recipient_key_data["y"])
    
    # Reconstruct public key point
    x_int = int.from_bytes(x_bytes, 'big')
    y_int = int.from_bytes(y_bytes, 'big')
    
    # Create public key from coordinates
    from cryptography.hazmat.primitives.asymmetric.ec import EllipticCurvePublicNumbers
    public_numbers = EllipticCurvePublicNumbers(x_int, y_int, ec.SECP256R1())
    recipient_public_key = public_numbers.public_key(default_backend())
    
    # Generate ephemeral key pair for sender
    ephemeral_private_key = ec.generate_private_key(
        ec.SECP256R1(),
        default_backend()
    )
    ephemeral_public_key = ephemeral_private_key.public_key()
    
    # Perform ECDH key agreement
    shared_secret = ephemeral_private_key.exchange(ec.ECDH(), recipient_public_key)
    
    # Derive AES key from shared secret using HKDF
    hkdf = HKDF(
        algorithm=hashes.SHA256(),
        length=32,  # 256 bits for AES-256
        salt=b'ECDH-AES-KEY-SALT',
        info=b'ECDH-AES-256-GCM-Key',
        backend=default_backend()
    )
    
    aes_key_material = hkdf.derive(shared_secret)
    
    # Encrypt message with AES-GCM
    message_bytes = message.encode('utf-8')
    iv = b'\x00' * 12  # 12 bytes for AES-GCM, will be replaced with random
    import os
    iv = os.urandom(12)
    
    aesgcm = AESGCM(aes_key_material)
    encrypted_message = aesgcm.encrypt(iv, message_bytes, None)
    
    # Export ephemeral public key in JWK format
    ephemeral_public_numbers = ephemeral_public_key.public_numbers()
    ephemeral_x_bytes = ephemeral_public_numbers.x.to_bytes(32, 'big')
    ephemeral_y_bytes = ephemeral_public_numbers.y.to_bytes(32, 'big')
    ephemeral_x_base64url = _base64url_encode(ephemeral_x_bytes)
    ephemeral_y_base64url = _base64url_encode(ephemeral_y_bytes)
    
    ephemeral_public_key_jwk = {
        "kty": "EC",
        "crv": "P-256",
        "x": ephemeral_x_base64url,
        "y": ephemeral_y_base64url,
        "ext": True
    }
    
    # Hash recipient's public key for verification
    public_key_hash = hashlib.sha256(recipient_public_key_json.encode('utf-8')).hexdigest()[:16]
    
    # Create encrypted package
    encrypted_package = {
        "encryptedMessage": base64.b64encode(encrypted_message).decode('utf-8'),
        "iv": base64.b64encode(iv).decode('utf-8'),
        "algorithm": "HYBRID-ECDH-AES-GCM",
        "keyType": "ECDH",
        "version": "1.0",
        "ephemeralPublicKey": ephemeral_public_key_jwk,
        "publicKeyHash": public_key_hash
    }
    
    return encrypted_package


def decrypt_message(
    encrypted_package: Dict[str, Any],
    password: str,
    username: str = ""
) -> str:
    """
    Decrypt a message encrypted with your public key using password-derived private key.
    
    Args:
        encrypted_package: Dictionary containing encrypted data
        password: User's password (to derive private key)
        username: Optional username (not used, but kept for API compatibility)
    
    Returns:
        Decrypted plaintext message
    """
    # Validate encrypted package
    if encrypted_package.get("algorithm") != "HYBRID-ECDH-AES-GCM":
        raise ValueError("Unsupported encryption algorithm. Expected HYBRID-ECDH-AES-GCM")
    
    if not encrypted_package.get("encryptedMessage") or not encrypted_package.get("iv"):
        raise ValueError("Invalid encrypted data: missing required fields (encryptedMessage, iv)")
    
    if not encrypted_package.get("ephemeralPublicKey"):
        raise ValueError("Invalid ECDH encrypted data: missing ephemeralPublicKey")
    
    # Derive private key from password
    seed = _derive_seed_from_password(password)
    private_key_material = _derive_private_key_from_seed(seed)
    private_key = ec.derive_private_key(
        int.from_bytes(private_key_material, 'big'),
        ec.SECP256R1(),
        default_backend()
    )
    
    # Import sender's ephemeral public key
    ephemeral_key_data = encrypted_package["ephemeralPublicKey"]
    ephemeral_x_bytes = _base64url_decode(ephemeral_key_data["x"])
    ephemeral_y_bytes = _base64url_decode(ephemeral_key_data["y"])
    
    # Create public key from coordinates
    from cryptography.hazmat.primitives.asymmetric.ec import EllipticCurvePublicNumbers
    ephemeral_x_int = int.from_bytes(ephemeral_x_bytes, 'big')
    ephemeral_y_int = int.from_bytes(ephemeral_y_bytes, 'big')
    ephemeral_public_numbers = EllipticCurvePublicNumbers(ephemeral_x_int, ephemeral_y_int, ec.SECP256R1())
    ephemeral_public_key = ephemeral_public_numbers.public_key(default_backend())
    
    # Perform ECDH key agreement
    shared_secret = private_key.exchange(ec.ECDH(), ephemeral_public_key)
    
    # Derive AES key from shared secret using HKDF (same parameters as encryption)
    hkdf = HKDF(
        algorithm=hashes.SHA256(),
        length=32,
        salt=b'ECDH-AES-KEY-SALT',
        info=b'ECDH-AES-256-GCM-Key',
        backend=default_backend()
    )
    
    aes_key_material = hkdf.derive(shared_secret)
    
    # Decrypt message with AES-GCM
    encrypted_message = base64.b64decode(encrypted_package["encryptedMessage"])
    iv = base64.b64decode(encrypted_package["iv"])
    
    aesgcm = AESGCM(aes_key_material)
    decrypted_message = aesgcm.decrypt(iv, encrypted_message, None)
    
    return decrypted_message.decode('utf-8')

