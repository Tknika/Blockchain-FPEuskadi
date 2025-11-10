
'''
CREAR CLAVES TENANT CON COMANDOS:
# Generate private (PKCS#8 PEM)
openssl genpkey -algorithm X25519 -out tenantKeyNew.pem

# Derive raw public key (DER) and base64 encode the 32-byte key
openssl pkey -in tenantKeyNew.pem -pubout -outform DER \
| tail -c 44 \
| base64 > tenantKeyNew.pub

# Optionally store the raw 32-byte private key as base64 (to mirror the Python layout):
openssl pkey -in tenantKeyNew.pem -outform DER \
| tail -c 48 \
| tail -c 32 \
| base64 > tenantKeyNew
'''
'''
CREAR CLAVES TENANT CON PYTHON:
import base64
from nacl.signing import PrivateKey

def main(prefix: str):
    sk = PrivateKey.generate()              # 32-byte X25519 secret key
    pk = sk.public_key                      # 32-byte X25519 public key

    # Base64 (standard, with padding '=') to match Tessera's format
    pub_b64 = base64.b64encode(bytes(pk)).decode("ascii")
    prv_b64 = base64.b64encode(bytes(sk)).decode("ascii")

    # Write files like Tessera does (public is a single base64 line)
    with open(f"{prefix}.pub", "w") as f:
        f.write(pub_b64)
    with open(f"{prefix}", "w") as f:
        f.write(prv_b64)

    print("Public (use this in privacyPublicKey):", pub_b64)

if __name__ == "__main__":
    # Example: Hedapena/networkFiles/TenantKeys/tenantKeyNew
    main("Hedapena/networkFiles/TenantKeys/tenantKeyNew")
'''

'''
pip install pyjwt[crypto]
Ejemplo de creación de un JWT con algoritmo RS256, se ha utilizado la clave pública del tenant 1 de Tessera.

Uso:
Each user has a list of permissions strings defining the methods they can access. To give access to:

    All API methods, specify ["*:*"].
    All API methods in an API group, specify ["<api_group>:*"]. For example, ["eth:*"].
    Specific API methods, specify ["<api_group>:<method_name>"]. For example, ["admin:peers"].

With authentication enabled, to explicitly specify a user cannot access any methods, include the user with an empty permissions list ([]). Users with an empty permissions list cannot access any JSON-RPC methods.
'''

import jwt

with open('Hedapena/networkFiles/JWTkeys/privateRSAKeyOperator.pem', 'r') as key_file:
    private_key = key_file.read()
# Define the payload and headers for the JWT
with open('Hedapena/networkFiles/TenantKeys/tenantKeyNew.pub', 'r') as pub_key_file:
    privacy_public_key = pub_key_file.read().strip()

payload = {
            "permissions": ["*:*"],
            "privacyPublicKey": privacy_public_key,
            "exp": 1600899999002
          }
headers = {"alg": "RS256", "typ": "JWT"}

# Encode the JWT using the specified payload, headers, and private key
encoded_jwt = jwt.encode(payload, key=private_key, headers=headers)
print(encoded_jwt)

#jwt.decode(encoded_jwt, "secret", algorithms=["HS256"])
#{'some': 'payload'}