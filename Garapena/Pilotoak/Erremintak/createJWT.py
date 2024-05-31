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
payload = {
            "permissions": ["*:*"],
            "privacyPublicKey": "7qHrtDo9MW4PtOIx+NBCYcjM3j7E3iM+aA1/m+6jsns=",
            "exp": 1600899999002
          }
headers = {"alg": "RS256", "typ": "JWT"}

# Encode the JWT using the specified payload, headers, and private key
encoded_jwt = jwt.encode(payload, key=private_key, headers=headers)
print(encoded_jwt)

#jwt.decode(encoded_jwt, "secret", algorithms=["HS256"])
#{'some': 'payload'}