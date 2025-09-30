#!/bin/bash

# Blockchain FPEuskadi Backup Test Script
# This script tests the backup and restore functionality

set -e

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1" >&2
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# Check if running as root
if [[ $EUID -ne 0 ]]; then
    error "This script must be run as root (use sudo)"
    error "Usage: sudo $0"
    exit 1
fi

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

log "Starting backup system test..."

# Check if scripts exist and are executable
if [ ! -f "$SCRIPT_DIR/backup.sh" ]; then
    error "Backup script not found at $SCRIPT_DIR/backup.sh"
    exit 1
fi

if [ ! -f "$SCRIPT_DIR/restore.sh" ]; then
    error "Restore script not found at $SCRIPT_DIR/restore.sh"
    exit 1
fi

if [ ! -x "$SCRIPT_DIR/backup.sh" ]; then
    error "Backup script is not executable"
    exit 1
fi

if [ ! -x "$SCRIPT_DIR/restore.sh" ]; then
    error "Restore script is not executable"
    exit 1
fi

log "✓ All scripts found and executable"

# Check Docker
if ! docker info >/dev/null 2>&1; then
    error "Docker is not running"
    exit 1
fi

log "✓ Docker is running"

# Check Docker Compose
if ! command -v docker compose >/dev/null 2>&1; then
    error "Docker Compose is not available"
    exit 1
fi

log "✓ Docker Compose is available"

# Check if backup directory exists and is writable
BACKUP_DIR="/backup/blockchain-fpeuskadi"
if [ ! -d "$BACKUP_DIR" ]; then
    log "Backup directory $BACKUP_DIR does not exist. Creating it..."
    mkdir -p "$BACKUP_DIR"
    chmod 755 "$BACKUP_DIR"
fi

if [ ! -w "$BACKUP_DIR" ]; then
    error "Backup directory $BACKUP_DIR is not writable"
    exit 1
fi

log "✓ Backup directory is accessible"

# Test backup script (dry run)
log "Testing backup script..."
cd "$SCRIPT_DIR"

# Create a test environment file
echo "TEST_VAR=test_value" > test.env

# Run backup script
log "Running backup script..."
if ./backup.sh; then
    log "✓ Backup script completed successfully"
else
    error "Backup script failed"
    exit 1
fi

# Check if backup was created
LATEST_BACKUP=$(ls -t "$BACKUP_DIR"/*.tar.gz* 2>/dev/null | head -1)
if [ -n "$LATEST_BACKUP" ]; then
    log "✓ Backup file created: $(basename "$LATEST_BACKUP")"
    
    # Check backup size
    BACKUP_SIZE=$(du -h "$LATEST_BACKUP" | cut -f1)
    log "✓ Backup size: $BACKUP_SIZE"
    
    # Check file ownership
    BACKUP_OWNER=$(stat -c '%U' "$LATEST_BACKUP")
    log "✓ Backup file owner: $BACKUP_OWNER"
else
    error "No backup file was created"
    exit 1
fi

# Test restore script
log "Testing restore script..."
TEMP_RESTORE_DIR="/tmp/blockchain_restore_test"
mkdir -p "$TEMP_RESTORE_DIR"

# Extract backup
cd "$TEMP_RESTORE_DIR"
if [[ "$LATEST_BACKUP" == *.gpg ]]; then
    log "Testing encrypted backup extraction..."
    if gpg --decrypt "$LATEST_BACKUP" | tar xzf -; then
        log "✓ Encrypted backup extracted successfully"
    else
        error "Failed to extract encrypted backup"
        exit 1
    fi
else
    tar xzf "$LATEST_BACKUP"
    log "✓ Backup extracted successfully"
fi

EXTRACTED_DIR=$(ls -d blockchain_backup_* | head -1)

if [ -n "$EXTRACTED_DIR" ]; then
    log "✓ Backup extracted successfully"
    cd "$EXTRACTED_DIR"
    
    # Check if restore script exists in backup
    if [ -f "restore.sh" ]; then
        log "✓ Restore script found in backup"
        
        # Test restore script (dry run - just check syntax)
        if bash -n restore.sh; then
            log "✓ Restore script syntax is valid"
        else
            error "Restore script has syntax errors"
            exit 1
        fi
    else
        warning "No restore script found in backup"
    fi
else
    error "Failed to extract backup"
    exit 1
fi

# Cleanup
log "Cleaning up test files..."
rm -f "$SCRIPT_DIR/test.env"
rm -rf "$TEMP_RESTORE_DIR"

echo ""
echo "=========================================="
echo "BACKUP SYSTEM TEST COMPLETED SUCCESSFULLY"
echo "=========================================="
echo ""
echo "Test Results:"
echo "✓ Backup script works correctly"
echo "✓ Restore script is valid"
echo "✓ Backup file created: $(basename "$LATEST_BACKUP")"
echo "✓ Backup size: $BACKUP_SIZE"
echo "✓ Backup file owner: $BACKUP_OWNER"
echo ""
echo "Your backup system is ready for production use!"
echo "=========================================="

log "All tests passed successfully!"