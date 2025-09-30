#!/bin/bash

# Blockchain FPEuskadi Standalone Restore Script
# This script can be used to restore a backup on a new server

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
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

info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

# Check if running as root for some operations
if [[ $EUID -eq 0 ]]; then
    SUDO_CMD=""
else
    SUDO_CMD="sudo"
fi

# Function to show usage
show_usage() {
    echo "Usage: $0 <backup_file> <target_directory>"
    echo ""
    echo "Arguments:"
    echo "  backup_file           Path to the backup file (.tar.gz or .tar.gz.gpg)"
    echo "  target_directory      Directory to restore to (REQUIRED)"
    echo ""
    echo "Examples:"
    echo "  $0 blockchain_backup_20241201_120000.tar.gz /opt/blockchain"
    echo "  $0 blockchain_backup_20241201_120000.tar.gz.gpg /opt/blockchain"
    echo "  $0 /path/to/backup.tar.gz /opt/blockchain"
    echo ""
    echo "This script will:"
    echo "  1. Extract/decrypt the backup file (if encrypted)"
    echo "  2. Restore all Docker volumes"
    echo "  3. Restore configuration files"
    echo "  4. Restore SSL certificates"
    echo "  5. Restore application code"
    echo "  6. Create necessary Docker networks"
    echo "  7. Provide instructions for final setup"
    echo ""
    echo "Note: For encrypted backups (.gpg files), you'll need GPG installed"
    echo "      and the correct password to decrypt the backup."
}

# Check arguments
if [ $# -lt 2 ] || [ "$1" = "-h" ] || [ "$1" = "--help" ]; then
    show_usage
    exit 1
fi

BACKUP_FILE="$1"
TARGET_DIR="$2"

# Validate backup file
if [ ! -f "$BACKUP_FILE" ]; then
    error "Backup file '$BACKUP_FILE' not found!"
    exit 1
fi

# Check if target directory exists
if [ ! -d "$TARGET_DIR" ]; then
    error "Target directory '$TARGET_DIR' does not exist!"
    exit 1
fi

# Get absolute paths
BACKUP_FILE=$(realpath "$BACKUP_FILE")
TARGET_DIR=$(realpath "$TARGET_DIR")

log "Starting restore process..."
log "Backup file: $BACKUP_FILE"
log "Target directory: $TARGET_DIR"

# Check if Docker is running
if ! docker info >/dev/null 2>&1; then
    error "Docker is not running. Please start Docker first."
    exit 1
fi

# Check if Docker Compose is available
if ! command -v docker compose >/dev/null 2>&1; then
    error "Docker Compose is not available. Please install Docker Compose first."
    exit 1
fi

# Extract backup
log "Extracting backup file..."
cd "$TARGET_DIR"

# Check if backup file is encrypted
if [[ "$BACKUP_FILE" == *.gpg ]]; then
    log "Detected encrypted backup file"
    
    # Check if GPG is available
    if ! command -v gpg >/dev/null 2>&1; then
        error "GPG is not available but backup file is encrypted. Please install GPG first."
        exit 1
    fi
    
    # Try to decrypt and extract
    log "Decrypting backup file..."
    if gpg --decrypt "$BACKUP_FILE" | tar xzf -; then
        log "✓ Backup file decrypted and extracted successfully"
    else
        error "Failed to decrypt backup file. Please check the password."
        exit 1
    fi
else
    # Regular unencrypted backup
    tar xzf "$BACKUP_FILE"
    log "✓ Backup file extracted successfully"
fi

# Find the extracted directory
EXTRACTED_DIR=$(find . -maxdepth 1 -type d -name "blockchain_backup_*" | head -1)

if [ -z "$EXTRACTED_DIR" ]; then
    error "Could not find extracted backup directory!"
    exit 1
fi

log "Extracted to: $EXTRACTED_DIR"
cd "$EXTRACTED_DIR"

# Check if restore script exists in the backup
if [ -f "restore.sh" ]; then
    log "Found restore script in backup, executing it..."
    chmod +x restore.sh
    ./restore.sh
else
    warning "No restore script found in backup, performing manual restore..."
    
    # Manual restore process
    log "Restoring Docker volumes..."
    
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
        if [ -f "${volume_name}.tar.gz" ]; then
            log "Restoring volume: $volume_name"
            
            # Create volume if it doesn't exist
            if ! docker volume inspect "$docker_volume" >/dev/null 2>&1; then
                docker volume create "$docker_volume"
            fi
            
            # Restore volume data
            docker run --rm \
                -v "$docker_volume":/data \
                -v "$(pwd)":/backup \
                alpine:latest \
                sh -c "cd /data && tar xzf /backup/${volume_name}.tar.gz"
            log "✓ Volume $volume_name restored successfully"
        else
            warning "Backup file for volume $volume_name not found, skipping..."
        fi
    done
    
    # Restore configuration files
    log "Restoring configuration files..."
    
    if [ -d "nginx" ]; then
        mkdir -p "$TARGET_DIR/WebServer"
        cp -r nginx "$TARGET_DIR/WebServer/"
        log "✓ Nginx configuration restored"
    fi
    
    # Restore environment files
    for env_file in *.env; do
        if [ -f "$env_file" ]; then
            mkdir -p "$TARGET_DIR/WebServer"
            cp "$env_file" "$TARGET_DIR/WebServer/"
            log "✓ Environment file $env_file restored"
        fi
    done
    
    # Restore CheckMK configuration
    if [ -d "checkmk" ]; then
        mkdir -p "$TARGET_DIR/WebServer/checkmk"
        cp -r checkmk/* "$TARGET_DIR/WebServer/checkmk/"
        log "✓ CheckMK configuration restored"
    fi
    
    # Restore SSL certificates
    if [ -d "letsencrypt" ]; then
        log "Restoring SSL certificates..."
        $SUDO_CMD cp -r letsencrypt /etc/
        log "✓ SSL certificates restored"
    fi
    
    # Restore application code
    log "Restoring application code..."
    
    if [ -d "Pilotoak" ]; then
        cp -r Pilotoak "$TARGET_DIR/"
        log "✓ Pilotoak directory restored"
    fi
    
    if [ -d "WebServer" ]; then
        cp -r WebServer/* "$TARGET_DIR/WebServer/"
        log "✓ WebServer directory restored"
    fi
fi

# Create network if it doesn't exist
log "Creating Docker network..."
if ! docker network inspect server_network >/dev/null 2>&1; then
    docker network create server_network
    log "✓ Docker network 'server_network' created"
else
    log "✓ Docker network 'server_network' already exists"
fi

# Create CheckMK network if it doesn't exist
if ! docker network inspect checkmk_network >/dev/null 2>&1; then
    docker network create checkmk_network
    log "✓ Docker network 'checkmk_network' created"
else
    log "✓ Docker network 'checkmk_network' already exists"
fi

# Final instructions
echo ""
echo "=========================================="
echo "RESTORE COMPLETED SUCCESSFULLY"
echo "=========================================="
echo ""
info "Next steps to complete the setup:"
echo ""
echo "1. Review and update configuration files:"
echo "   - Check environment files (*.env) for any server-specific settings"
echo "   - Update passwords if needed"
echo "   - Verify database credentials"
echo ""
echo "2. Update DNS records to point to this server"
echo ""
echo "3. Start the main services:"
echo "   cd $TARGET_DIR/WebServer"
echo "   docker compose up -d"
echo ""
echo "4. Start CheckMK monitoring (optional):"
echo "   cd $TARGET_DIR/WebServer/checkmk"
echo "   docker compose -f docker-compose-checkmk.yaml up -d"
echo ""
echo "5. Database will be automatically restored from the db_data volume"
echo ""
echo "6. Verify all services are running:"
echo "   docker compose ps"
echo ""
echo "7. Check logs if needed:"
echo "   docker compose logs [service_name]"
echo ""
echo "=========================================="
echo "Backup restored from: $EXTRACTED_DIR"
echo "Target directory: $TARGET_DIR"
echo "=========================================="

# Clean up extracted directory
read -p "Do you want to remove the extracted backup directory? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    cd "$TARGET_DIR"
    rm -rf "$EXTRACTED_DIR"
    log "Extracted backup directory removed"
else
    log "Extracted backup directory kept at: $EXTRACTED_DIR"
fi

log "Restore process completed!"
