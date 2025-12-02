# Encryption Setup - ECDH Password-Based Encryption

The Ekozir app uses **ECDH (Elliptic Curve Diffie-Hellman) encryption** with password-based key derivation. This replaces the previous MetaMask-based encryption system.

## Overview

- **Encryption Scheme**: Hybrid ECDH-AES-GCM
- **Key Derivation**: Deterministic PBKDF2 + HKDF from user password
- **Curve**: P-256 (NIST secp256r1)
- **Symmetric Encryption**: AES-256-GCM
- **Key Agreement**: ECDH with ephemeral keys

## Key Features

1. **Password-Based**: Users derive their encryption keys from a password (no MetaMask required)
2. **Deterministic**: Same password always generates the same public key
3. **Hybrid Encryption**: Messages of any length can be encrypted using AES, with the AES key encrypted via ECDH
4. **Server-Side Transactions**: All blockchain transactions are executed by the server using `EKOZIR_PRIVATE_KEY`

## Dependencies

### Frontend
- **Elliptic.js**: Loaded from CDN in `base.html`
  - CDN: `https://cdnjs.cloudflare.com/ajax/libs/elliptic/6.6.1/elliptic.min.js`
  - Used for ECDH key pair generation and key agreement operations
- **Web Crypto API**: Native browser API for PBKDF2, HKDF, and AES-GCM operations

### Backend
- **cryptography**: Python library (included in `requirements.txt`)
  - Used for ECDH key derivation, key agreement, and AES-GCM encryption/decryption

## How It Works

### 1. User Registration/Login

1. User enters username and password
2. **Password → Public Key Derivation**:
   - PBKDF2 with fixed salt (`KEY_DERIVATION_SALT_v1`) derives 256-bit seed
   - HKDF with fixed salt (`ECDH_KEY_SALT_DETERMINISTIC_v1`) derives private key material
   - Elliptic library generates P-256 key pair from private key material
   - Public key exported in JWK format (JSON)
3. Public key is registered on blockchain via `signUp()` transaction
4. Public key and username stored in Flask session

### 2. Message Encryption (Sender Side)

When sending a message to a recipient:

1. **Generate ephemeral ECDH key pair** (random, one-time use)
2. **Derive shared secret** via ECDH key agreement:
   - `sharedSecret = ephemeralPrivateKey * recipientPublicKey`
3. **Derive AES-256-GCM key** from shared secret using HKDF:
   - Salt: `ECDH-AES-KEY-SALT`
   - Info: `ECDH-AES-256-GCM-Key`
4. **Encrypt message** with AES-GCM (12-byte random IV)
5. **Encrypt AES key** by storing it in the encrypted package:
   - The encrypted package contains: `encryptedMessage`, `iv`, `ephemeralPublicKey`
   - The AES key is encrypted by including the ephemeral public key (recipient can derive it)
6. **Store on blockchain**:
   - `encryptedContent`: Base64-encoded (IV + encrypted message)
   - `encryptedKey`: JSON string of encrypted package with ephemeral public key
   - `messageHash`: SHA-256 hash of original message (for integrity)

### 3. Message Decryption (Recipient Side)

When recipient wants to decrypt a message:

1. **Retrieve encrypted message** from blockchain
2. **Regenerate private key** from password (same process as registration)
3. **Extract ephemeral public key** from encrypted package
4. **Derive shared secret** via ECDH:
   - `sharedSecret = recipientPrivateKey * ephemeralPublicKey`
5. **Derive AES key** from shared secret (same HKDF parameters as encryption)
6. **Decrypt message** using AES-GCM with derived key

## Implementation Details

### Frontend (`app/static/js/app.js`)

Key functions:
- `deriveSeedFromPassword(password)`: PBKDF2 key derivation
- `generateECDHKeyPairFromPassword(password)`: Generate deterministic ECDH key pair
- `derivePublicKeyFromPassword(password)`: Export public key as JSON
- `encryptWithPublicKey(message, recipientPublicKeyJson)`: Encrypt message for recipient
- `decryptWithPrivateKey(encryptedPackage, password)`: Decrypt message with password

### Backend (`app/services/ecdh_service.py`)

Key functions:
- `derive_public_key_from_password(password, username)`: Generate public key (matches frontend)
- `encrypt_message_for_recipient(message, recipient_public_key_json)`: Encrypt message
- `decrypt_message(encrypted_package, password, username)`: Decrypt message

### Smart Contract (`Ekozir.sol`)

- Users identified by **public key (JSON string)** instead of Ethereum address
- `registeredPublicKeys[]`: Array of registered public keys
- `userNames[publicKey]`: Mapping from public key to username
- Messages store `sender` and `recipient` as public key strings
- `SentMessage` struct allows senders to view their sent messages

## Public Key Format

Public keys are stored as JSON strings in JWK format:

```json
{
  "kty": "EC",
  "crv": "P-256",
  "x": "base64url-encoded-x-coordinate",
  "y": "base64url-encoded-y-coordinate",
  "alg": "ECDH-P256",
  "ext": true
}
```

## Security Considerations

1. **Password Security**: Passwords are never stored or transmitted. Only the derived public key is stored on-chain.
2. **Deterministic Keys**: Same password = same key (allows password recovery, but also means password changes require re-registration)
3. **Ephemeral Keys**: Each message uses a new ephemeral key pair for forward secrecy
4. **Server Private Key**: `EKOZIR_PRIVATE_KEY` must be kept secure - it's used to execute all blockchain transactions
5. **Session Management**: Public keys stored in Flask session (server-side)

## Migration from MetaMask

The previous implementation used:
- MetaMask for wallet connection
- `@metamask/eth-sig-util` for ECIES encryption
- Ethereum addresses for user identification

The new implementation:
- ✅ Password-based authentication
- ✅ ECDH encryption with elliptic.js
- ✅ Public keys (JSON) for user identification
- ✅ Server-side transaction execution

## Troubleshooting

### Elliptic library not loaded
- Ensure `elliptic.min.js` is loaded in `base.html`
- Check browser console for script loading errors

### Decryption fails
- Verify password is correct (same password used during registration)
- Check that encrypted package format is correct (must include `ephemeralPublicKey`)
- Ensure recipient's public key matches the one used during encryption

### Public key mismatch
- Public keys are deterministic from password - same password always generates same key
- If user forgot password, they cannot recover their account (by design)
- User must register again with new password (new public key)

## References

- **Elliptic.js**: https://github.com/indutny/elliptic
- **Web Crypto API**: https://developer.mozilla.org/en-US/docs/Web/API/Web_Crypto_API
- **ECDH**: https://en.wikipedia.org/wiki/Elliptic-curve_Diffie%E2%80%93Hellman
- **AES-GCM**: https://en.wikipedia.org/wiki/Galois/Counter_Mode
- **P-256 Curve**: NIST secp256r1 / prime256v1
