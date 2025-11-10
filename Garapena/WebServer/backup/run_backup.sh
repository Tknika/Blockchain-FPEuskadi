#!/bin/bash

# Blockchain FPEuskadi Backup Launcher
# This script provides easy access to backup functionality from the backup directory

set -e

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

# Check if running as root
if [[ $EUID -ne 0 ]]; then
    echo "This script must be run as root (use sudo)"
    echo "Usage: sudo $0 <command> [options]"
    exit 1
fi

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Check if backup scripts exist in current directory
if [ ! -f "$SCRIPT_DIR/backup.sh" ]; then
    echo "Error: backup.sh not found in $SCRIPT_DIR"
    exit 1
fi

if [ ! -f "$SCRIPT_DIR/restore.sh" ]; then
    echo "Error: restore.sh not found in $SCRIPT_DIR"
    exit 1
fi

if [ ! -f "$SCRIPT_DIR/setup_backup.sh" ]; then
    echo "Error: setup_backup.sh not found in $SCRIPT_DIR"
    exit 1
fi

if [ ! -f "$SCRIPT_DIR/test_backup.sh" ]; then
    echo "Error: test_backup.sh not found in $SCRIPT_DIR"
    exit 1
fi

# Function to show usage
show_usage() {
    echo "Blockchain FPEuskadi Backup Launcher"
    echo ""
    echo "Usage: sudo $0 <command> [options]"
    echo ""
    echo "Commands:"
    echo "  setup     - Set up the backup environment"
    echo "  test      - Test the backup system"
    echo "  backup    - Create a backup"
    echo "  restore   - Restore from backup (requires backup file and target directory)"
    echo "  help      - Show this help message"
    echo ""
    echo "Examples:"
    echo "  sudo $0 setup"
    echo "  sudo $0 test"
    echo "  sudo $0 backup"
    echo "  sudo $0 restore blockchain_backup_20241201_120000.tar.gz.gpg /opt/blockchain"
    echo "  sudo $0 restore blockchain_backup_20241201_120000.tar.gz /opt/blockchain"
    echo ""
    echo "Note: This script must be run with sudo privileges"
    echo "      For automated backups, use: sudo crontab -e"
    echo ""
}

# Main execution
case "${1:-help}" in
    setup)
        log "Running backup setup..."
        cd "$SCRIPT_DIR"
        ./setup_backup.sh
        ;;
    test)
        log "Running backup test..."
        cd "$SCRIPT_DIR"
        ./test_backup.sh
        ;;
    backup)
        log "Creating backup..."
        cd "$SCRIPT_DIR"
        ./backup.sh
        ;;
    restore)
        if [ -z "$2" ] || [ -z "$3" ]; then
            echo "Error: Please provide both backup file and target directory"
            echo "Usage: sudo $0 restore <backup_file> <target_directory>"
            echo "       Supports both .tar.gz and .tar.gz.gpg files"
            exit 1
        fi
        log "Restoring from backup: $2 to $3"
        cd "$SCRIPT_DIR"
        ./restore.sh "$2" "$3"
        ;;
    help|--help|-h)
        show_usage
        ;;
    *)
        echo "Error: Unknown command '$1'"
        echo ""
        show_usage
        exit 1
        ;;
esac