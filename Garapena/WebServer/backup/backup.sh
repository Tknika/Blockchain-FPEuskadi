#!/bin/bash

# Blockchain FPEuskadi Backup Script
# This script backs up all Docker volumes, configuration files, and application code

set -e  # Exit on any error

# Configuration
BACKUP_DIR="/backup/blockchain-fpeuskadi"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_NAME="blockchain_backup_$DATE"
BACKUP_PATH="$BACKUP_DIR/$BACKUP_NAME"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$(dirname "$(dirname "$SCRIPT_DIR")")")"

# Target user for file ownership (can be overridden with BACKUP_TARGET_USER env var)
TARGET_USER="${BACKUP_TARGET_USER:-$(whoami)}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Logging function
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1" >&2
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# Check if running as root for some operations
check_permissions() {
    if [[ $EUID -eq 0 ]]; then
        SUDO_CMD=""
        RUNNING_AS_ROOT=true
    else
        SUDO_CMD="sudo"
        RUNNING_AS_ROOT=false
    fi
}

# Create backup directory
create_backup_dir() {
    log "Creating backup directory: $BACKUP_PATH"
    mkdir -p "$BACKUP_PATH"
}

# Backup Docker volumes
backup_docker_volumes() {
    log "Backing up Docker volumes..."
    
    # List of volumes to backup
    declare -A volumes=(
        ["db_data"]="webserver_db_data"
        ["mail_data"]="webserver_mail_data"
        ["mail_state"]="webserver_mail_state"
        ["mail_logs"]="webserver_mail_logs"
        ["mail_config"]="webserver_mail_config"
        ["ethstats_logs"]="webserver_ethstats_logs"
        ["formakuntza_ziurtagiriak"]="webserver_formakuntza_ziurtagiriak"
        ["cmknew"]="checkmk_cmknew"
    )
    
    for volume_name in "${!volumes[@]}"; do
        docker_volume="${volumes[$volume_name]}"
        log "Backing up volume: $volume_name ($docker_volume)"
        
        if docker volume inspect "$docker_volume" >/dev/null 2>&1; then
            docker run --rm \
                -v "$docker_volume":/data \
                -v "$BACKUP_PATH":/backup \
                alpine:latest \
                tar czf "/backup/${volume_name}.tar.gz" -C /data .
            log "✓ Volume $volume_name backed up successfully"
        else
            warning "Volume $docker_volume not found, skipping..."
        fi
    done
}

# Backup configuration files
backup_config_files() {
    log "Backing up configuration files..."
    
    # Backup nginx configuration
    if [ -d "$(dirname "$SCRIPT_DIR")/nginx" ]; then
        cp -r "$(dirname "$SCRIPT_DIR")/nginx" "$BACKUP_PATH/"
        log "✓ Nginx configuration backed up"
    fi
    
    # Backup environment files
    for env_file in "$(dirname "$SCRIPT_DIR")"/*.env; do
        if [ -f "$env_file" ]; then
            cp "$env_file" "$BACKUP_PATH/"
            log "✓ Environment file $(basename "$env_file") backed up"
        fi
    done
    
    # Backup CheckMK configuration
    if [ -f "$(dirname "$SCRIPT_DIR")/checkmk/docker-compose-checkmk.yaml" ]; then
        mkdir -p "$BACKUP_PATH/checkmk"
        cp "$(dirname "$SCRIPT_DIR")/checkmk/docker-compose-checkmk.yaml" "$BACKUP_PATH/checkmk/"
        log "✓ CheckMK configuration backed up"
    fi
}

# Backup SSL certificates
backup_ssl_certificates() {
    log "Backing up SSL certificates..."
    
    if [ -d "/etc/letsencrypt" ]; then
        $SUDO_CMD cp -r /etc/letsencrypt "$BACKUP_PATH/"
        log "✓ SSL certificates backed up"
    else
        warning "SSL certificates directory not found at /etc/letsencrypt"
    fi
}

# Backup application code
backup_application_code() {
    log "Backing up application code..."
    
    # Backup Pilotoak directory
    if [ -d "$PROJECT_ROOT/Pilotoak" ]; then
        cp -r "$PROJECT_ROOT/Pilotoak" "$BACKUP_PATH/"
        log "✓ Pilotoak directory backed up"
    else
        warning "Pilotoak directory not found at $PROJECT_ROOT/Pilotoak"
    fi
    
    # Backup WebServer directory (excluding large directories that will be recreated)
    mkdir -p "$BACKUP_PATH/WebServer"
    rsync -av --exclude='node_modules' --exclude='__pycache__' --exclude='*.pyc' \
          --exclude='.git' --exclude='logs' --exclude='data' --exclude='backup' \
          "$(dirname "$SCRIPT_DIR")/" "$BACKUP_PATH/WebServer/"
    log "✓ WebServer directory backed up"
}

# Create backup metadata
create_backup_metadata() {
    log "Creating backup metadata..."
    
    cat > "$BACKUP_PATH/backup_info.txt" << EOF
Blockchain FPEuskadi Backup
===========================
Backup Date: $(date)
Backup Name: $BACKUP_NAME
Source Server: $(hostname)
Running User: $(whoami)
Target User: $TARGET_USER
Docker Version: $(docker --version)
Docker Compose Version: $(docker compose version)

Included Components:
- Docker Volumes: db_data, mail_data, mail_state, mail_logs, mail_config, ethstats_logs, formakuntza_ziurtagiriak, cmknew
- Configuration: nginx, environment files, CheckMK config
- SSL Certificates: /etc/letsencrypt
- Application Code: Pilotoak, WebServer


Restore Instructions:
1. Copy the restore.sh script to the target server
2. Extract this backup on the target server
3. Run: ./restore.sh <backup_file> <target_directory>
4. Follow the instructions provided by the restore script
EOF
}

# Set proper ownership for files
set_file_ownership() {
    if [ "$RUNNING_AS_ROOT" = true ] && [ "$TARGET_USER" != "root" ]; then
        log "Setting file ownership to $TARGET_USER..."
        
        # Check if target user exists
        if id "$TARGET_USER" >/dev/null 2>&1; then
            chown -R "$TARGET_USER:$TARGET_USER" "$BACKUP_PATH"
            log "✓ File ownership set to $TARGET_USER"
        else
            warning "Target user '$TARGET_USER' does not exist, keeping root ownership"
        fi
    fi
}

# Create compressed and encrypted archive
create_compressed_archive() {
    log "Creating compressed archive..."
    cd "$BACKUP_DIR"
    tar czf "${BACKUP_NAME}.tar.gz" "$BACKUP_NAME"
    
    # Calculate size
    ARCHIVE_SIZE=$(du -h "${BACKUP_NAME}.tar.gz" | cut -f1)
    log "✓ Compressed archive created: ${BACKUP_NAME}.tar.gz (Size: $ARCHIVE_SIZE)"
    
    # Encrypt the archive
    log "Encrypting backup file..."
    if [ -f "$SCRIPT_DIR/backup_file_password.txt" ]; then
        BACKUP_PASSWORD=$(cat "$SCRIPT_DIR/backup_file_password.txt")
        
        # Use GPG to encrypt the file
        if command -v gpg >/dev/null 2>&1; then
            echo "$BACKUP_PASSWORD" | gpg --batch --yes --passphrase-fd 0 --symmetric --cipher-algo AES256 --output "${BACKUP_NAME}.tar.gz.gpg" "${BACKUP_NAME}.tar.gz"
            
            if [ $? -eq 0 ]; then
                log "✓ Backup file encrypted successfully"
                
                # Calculate encrypted file size
                ENCRYPTED_SIZE=$(du -h "${BACKUP_NAME}.tar.gz.gpg" | cut -f1)
                
                # Remove unencrypted file
                rm -f "${BACKUP_NAME}.tar.gz"
                
                # Update variables for final output
                ARCHIVE_SIZE="$ENCRYPTED_SIZE"
                FINAL_BACKUP_FILE="${BACKUP_NAME}.tar.gz.gpg"
            else
                error "Failed to encrypt backup file"
                FINAL_BACKUP_FILE="${BACKUP_NAME}.tar.gz"
            fi
        else
            warning "GPG not found, using unencrypted backup"
            FINAL_BACKUP_FILE="${BACKUP_NAME}.tar.gz"
        fi
    else
        warning "Password file not found at $SCRIPT_DIR/backup_file_password.txt, using unencrypted backup"
        FINAL_BACKUP_FILE="${BACKUP_NAME}.tar.gz"
    fi
    
    # Clean up uncompressed directory
    rm -rf "$BACKUP_NAME"
    
    # Set proper ownership for the final backup file
    if [ "$RUNNING_AS_ROOT" = true ] && [ "$TARGET_USER" != "root" ]; then
        if id "$TARGET_USER" >/dev/null 2>&1; then
            chown "$TARGET_USER:$TARGET_USER" "$FINAL_BACKUP_FILE"
            log "✓ Final backup file ownership set to $TARGET_USER"
        fi
    fi
    
    echo ""
    echo "=========================================="
    echo "BACKUP COMPLETED SUCCESSFULLY"
    echo "=========================================="
    echo "Backup file: $BACKUP_DIR/$FINAL_BACKUP_FILE"
    echo "Size: $ARCHIVE_SIZE"
    echo "Date: $(date)"
    echo "Running as: $(whoami)"
    echo "Target user: $TARGET_USER"
    echo ""
    if [[ "$FINAL_BACKUP_FILE" == *.gpg ]]; then
        echo "To restore on a new server:"
        echo "1. Copy the backup file and restore.sh script to the new server"
        echo "2. Decrypt: gpg --decrypt ${FINAL_BACKUP_FILE} | tar xzf -"
        echo "3. Run: ./restore.sh ${FINAL_BACKUP_FILE} <target_directory>"
        echo ""
        echo "Note: You'll need the password from backup_file_password.txt to decrypt"
    else
        echo "To restore on a new server:"
        echo "1. Copy the backup file and restore.sh script to the new server"
        echo "2. Extract: tar xzf $FINAL_BACKUP_FILE"
        echo "3. Run: ./restore.sh $FINAL_BACKUP_FILE <target_directory>"
    fi
    echo "=========================================="
}

# Main execution
main() {
    log "Starting Blockchain FPEuskadi backup process..."
    log "Project root: $PROJECT_ROOT"
    log "Script directory: $SCRIPT_DIR"
    log "Running as: $(whoami)"
    log "Target user for file ownership: $TARGET_USER"
    
    check_permissions
    create_backup_dir
    backup_docker_volumes
    backup_config_files
    backup_ssl_certificates
    backup_application_code
    create_backup_metadata
    set_file_ownership
    create_compressed_archive
    
    log "Backup process completed successfully!"
}

# Run main function
main "$@"