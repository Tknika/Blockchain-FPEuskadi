#!/usr/bin/env bash

# Instala las herramientas necesarias para desplegar una red blockchain en Ubuntu Desktop.
set -euo pipefail

if [[ "${EUID}" -eq 0 ]]; then
  echo "Error: no ejecutes todo el script con sudo."
  echo "Utiliza tu usuario normal: bash ./software_install.sh"
  echo "El script usará sudo cuando necesite instalar paquetes del sistema."
  exit 1
fi

ANSIBLE_VERSION="2.17.14"
BESU_VERSION="26.2.0"
WEBSOCAT_VERSION="1.14.1"
JAVA_PACKAGE="openjdk-25-jdk-headless"

INSTALL_DIR="${HOME}/.local/opt"
BIN_DIR="${HOME}/.local/bin"
JAVA_HOME_DIR="${INSTALL_DIR}/jdk-25"
PROFILE_FILE="${HOME}/.profile"

export DEBIAN_FRONTEND=noninteractive

repair_apt_state() {
  # Si algún proceso apt/dpkg anterior quedó a medias, intenta reparar el sistema de paquetes.
  echo "Comprobando el estado de apt/dpkg y reparándolo si es necesario..."
  sudo dpkg --configure -a
  sudo apt-get install -f -y
}

apt_install() {
  repair_apt_state
  sudo apt-get install -y "$@"
}

if [[ -r /etc/os-release ]]; then
  # shellcheck disable=SC1091
  source /etc/os-release
  if [[ "${ID:-}" != "ubuntu" ]]; then
    echo "Error: este script está preparado para Ubuntu Desktop."
    exit 1
  fi
fi

echo "Actualizando el sistema e instalando los paquetes básicos..."
repair_apt_state
sudo apt-get update
apt_install \
  curl \
  pipx \
  python3.10 \
  python3.10-venv \
  tar \
  wget \
  xz-utils

mkdir -p "${INSTALL_DIR}" "${BIN_DIR}"
export PATH="${BIN_DIR}:${PATH}"

echo "Instalando Java 25..."
if ! apt_install "${JAVA_PACKAGE}"; then
  echo "${JAVA_PACKAGE} no está disponible mediante apt; se instalará Eclipse Temurin JDK 25."
  rm -rf "${JAVA_HOME_DIR}"
  mkdir -p "${JAVA_HOME_DIR}"
  wget -q --show-progress -O "${INSTALL_DIR}/temurin-25.tar.gz" \
    "https://api.adoptium.net/v3/binary/latest/25/ga/linux/x64/jdk/hotspot/normal/eclipse"
  tar -xzf "${INSTALL_DIR}/temurin-25.tar.gz" -C "${JAVA_HOME_DIR}" --strip-components=1
  rm -f "${INSTALL_DIR}/temurin-25.tar.gz"
fi

echo "Instalando Ansible ${ANSIBLE_VERSION}..."
pipx install --force "ansible-core==${ANSIBLE_VERSION}"

echo "Descargando e instalando Hyperledger Besu ${BESU_VERSION}..."
cd "${INSTALL_DIR}"
wget -q --show-progress "https://github.com/hyperledger/besu/releases/download/${BESU_VERSION}/besu-${BESU_VERSION}.tar.gz"
tar -xvzf "./besu-${BESU_VERSION}.tar.gz"
rm -f "./besu-${BESU_VERSION}.tar.gz"
ln -sfn "${INSTALL_DIR}/besu-${BESU_VERSION}/bin/besu" "${BIN_DIR}/besu"

echo "Descargando e instalando Websocat ${WEBSOCAT_VERSION}..."
cd "${BIN_DIR}"
wget -q --show-progress "https://github.com/vi/websocat/releases/download/v${WEBSOCAT_VERSION}/websocat.x86_64-unknown-linux-musl"
mv -f "websocat.x86_64-unknown-linux-musl" "websocat"
chmod +x "websocat"

if ! grep -q 'export PATH="$HOME/.local/bin:$PATH"' "${PROFILE_FILE}" 2>/dev/null; then
  {
    echo ""
    echo "# Herramientas instaladas para el despliegue de redes blockchain"
    echo 'export PATH="$HOME/.local/bin:$PATH"'
  } >> "${PROFILE_FILE}"
fi

if [[ -d "${JAVA_HOME_DIR}" ]] && ! grep -q 'export JAVA_HOME="$HOME/.local/opt/jdk-25"' "${PROFILE_FILE}" 2>/dev/null; then
  {
    echo 'export JAVA_HOME="$HOME/.local/opt/jdk-25"'
    echo 'export PATH="$JAVA_HOME/bin:$PATH"'
  } >> "${PROFILE_FILE}"
fi

if [[ -d "${JAVA_HOME_DIR}" ]]; then
  export JAVA_HOME="${JAVA_HOME_DIR}"
  export PATH="${JAVA_HOME}/bin:${BIN_DIR}:${PATH}"
else
  export PATH="${BIN_DIR}:${PATH}"
fi

echo ""
echo "La instalación ha finalizado. Versiones:"
python3.10 --version
ansible --version | sed -n '1p'
java --version | sed -n '1p'
besu --version
websocat --version
echo ""
echo "En las terminales nuevas, PATH se cargará automáticamente; en la terminal actual utiliza: source ~/.profile"
