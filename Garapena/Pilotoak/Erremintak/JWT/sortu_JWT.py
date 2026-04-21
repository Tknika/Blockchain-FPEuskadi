
"""
Genera un conjunto de claves RSA y su JWT asociado.

Uso:
    python sortu_JWT.py 1

Salida en la carpeta actual:
    ./1/
        privateRSAKeyOperator1.pem
        publicRSAKeyOperator1.pem
        JWT_1


Dependencias:
pip install pyjwt[crypto]


Configuración de permisos:
Cada usuario tiene una lista de cadenas de permisos que definen los métodos a los que puede acceder. Para otorgar acceso:

    Para todos los métodos de la API, especifica ["*:*"].
    Para todos los métodos de un grupo específico de la API, especifica ["<api_group>:*"]. Por ejemplo, ["eth:*"].
    Para métodos específicos de la API, especifica ["<api_group>:<method_name>"]. Por ejemplo, ["admin:peers"].

Con la autenticación habilitada, para indicar explícitamente que un usuario no puede acceder a ningún método, incluye al usuario con una lista de permisos vacía ([]). Los usuarios con una lista de permisos vacía no pueden acceder a ningún método JSON-RPC.
"""

import argparse
from pathlib import Path

import jwt
from cryptography.hazmat.primitives.asymmetric import rsa
from cryptography.hazmat.primitives.serialization import Encoding
from cryptography.hazmat.primitives.serialization import NoEncryption
from cryptography.hazmat.primitives.serialization import PrivateFormat
from cryptography.hazmat.primitives.serialization import PublicFormat


def parse_args() -> int:
    """Lee el identificador numérico desde la línea de comandos."""
    parser = argparse.ArgumentParser(
        description="Genera claves RSA y un JWT firmado."
    )
    parser.add_argument(
        "token_number",
        type=int,
        help="Número que se usará para nombrar la carpeta y los ficheros.",
    )
    args = parser.parse_args()
    return args.token_number


def generate_rsa_keys(token_number: int, output_dir: Path) -> bytes:
    """Genera la pareja RSA usada para firmar y validar el JWT."""
    private_key = rsa.generate_private_key(
        public_exponent=65537,
        key_size=2048,
    )
    public_key = private_key.public_key()

    private_pem = private_key.private_bytes(
        encoding=Encoding.PEM,
        format=PrivateFormat.PKCS8,
        encryption_algorithm=NoEncryption(),
    )
    public_pem = public_key.public_bytes(
        encoding=Encoding.PEM,
        format=PublicFormat.SubjectPublicKeyInfo,
    )

    (output_dir / f"privateRSAKeyOperator{token_number}.pem").write_bytes(private_pem)
    (output_dir / f"publicRSAKeyOperator{token_number}.pem").write_bytes(public_pem)

    return private_pem


def generate_jwt(
    token_number: int,
    output_dir: Path,
    private_pem: bytes,
) -> str:
    """Crea el JWT manteniendo los mismos parámetros base del fichero original."""
    payload = {
        "permissions": ["*:*"],
        "exp": 1600899999002,
    }
    headers = {"alg": "RS256", "typ": "JWT"}

    encoded_jwt = jwt.encode(payload, key=private_pem, algorithm="RS256", headers=headers)
    (output_dir / f"JWT_{token_number}").write_text(encoded_jwt, encoding="utf-8")

    return encoded_jwt


def main() -> None:
    """Crea la carpeta y genera las claves RSA junto al JWT correspondiente."""
    token_number = parse_args()
    output_dir = Path.cwd() / str(token_number)
    output_dir.mkdir(parents=True, exist_ok=True)

    private_pem = generate_rsa_keys(token_number, output_dir)
    jwt_token = generate_jwt(
        token_number,
        output_dir,
        private_pem,
    )

    print(f"Ficheros generados en: {output_dir}")
    print(f"- privateRSAKeyOperator{token_number}.pem")
    print(f"- publicRSAKeyOperator{token_number}.pem")
    print(f"- JWT_{token_number}")
    print()
    print("JWT generado:")
    print(jwt_token)


if __name__ == "__main__":
    main()