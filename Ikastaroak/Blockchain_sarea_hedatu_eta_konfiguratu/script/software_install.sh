#!/usr/bin/env bash

# Ubuntu Desktop ingurunean blockchain sarearen hedapenerako behar diren tresnak instalatzen ditu.
set -euo pipefail

ANSIBLE_VERSION="2.17.14"
BESU_VERSION="26.2.0"
WEBSOCAT_VERSION="1.14.1"
JAVA_PACKAGE="openjdk-25-jdk-headless"

INSTALL_DIR="${HOME}/.local/opt"
BIN_DIR="${HOME}/.local/bin"
JAVA_HOME_DIR="${INSTALL_DIR}/jdk-25"
PROFILE_FILE="${HOME}/.profile"

if [[ -r /etc/os-release ]]; then
  # shellcheck disable=SC1091
  source /etc/os-release
  if [[ "${ID:-}" != "ubuntu" ]]; then
    echo "Errorea: script hau Ubuntu Desktop-erako prestatuta dago."
    exit 1
  fi
fi

echo "Sistema eguneratzen eta oinarrizko paketeak instalatzen..."
sudo apt update
sudo apt install -y \
  curl \
  pipx \
  python3.10 \
  python3.10-venv \
  tar \
  wget \
  xz-utils

mkdir -p "${INSTALL_DIR}" "${BIN_DIR}"

echo "Java 25 instalatzen..."
if ! sudo apt install -y "${JAVA_PACKAGE}"; then
  echo "Apt bidez ${JAVA_PACKAGE} ez dago eskuragarri; Eclipse Temurin JDK 25 instalatuko da."
  rm -rf "${JAVA_HOME_DIR}"
  mkdir -p "${JAVA_HOME_DIR}"
  wget -q --show-progress -O "${INSTALL_DIR}/temurin-25.tar.gz" \
    "https://api.adoptium.net/v3/binary/latest/25/ga/linux/x64/jdk/hotspot/normal/eclipse"
  tar -xzf "${INSTALL_DIR}/temurin-25.tar.gz" -C "${JAVA_HOME_DIR}" --strip-components=1
  rm -f "${INSTALL_DIR}/temurin-25.tar.gz"
fi

echo "Ansible ${ANSIBLE_VERSION} instalatzen..."
pipx install --force "ansible-core==${ANSIBLE_VERSION}"

echo "Hyperledger Besu ${BESU_VERSION} deskargatzen eta instalatzen..."
cd "${INSTALL_DIR}"
wget -q --show-progress "https://github.com/hyperledger/besu/releases/download/${BESU_VERSION}/besu-${BESU_VERSION}.tar.gz"
tar -xvzf "./besu-${BESU_VERSION}.tar.gz"
rm -f "./besu-${BESU_VERSION}.tar.gz"
ln -sfn "${INSTALL_DIR}/besu-${BESU_VERSION}/bin/besu" "${BIN_DIR}/besu"

echo "Websocat ${WEBSOCAT_VERSION} deskargatzen eta instalatzen..."
cd "${BIN_DIR}"
wget -q --show-progress "https://github.com/vi/websocat/releases/download/v${WEBSOCAT_VERSION}/websocat.x86_64-unknown-linux-musl"
mv -f "websocat.x86_64-unknown-linux-musl" "websocat"
chmod +x "websocat"

if ! grep -q 'export PATH="$HOME/.local/bin:$PATH"' "${PROFILE_FILE}" 2>/dev/null; then
  {
    echo ""
    echo "# Blockchain sareen hedapenerako instalatutako tresnak"
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
echo "Instalazioa amaitu da. Bertsioak:"
python3.10 --version
ansible --version | sed -n '1p'
java --version | sed -n '1p'
besu --version
websocat --version
echo ""
echo "Terminal berrietan PATH automatikoki kargatuko da; oraingo terminalean erabili: source ~/.profile"
