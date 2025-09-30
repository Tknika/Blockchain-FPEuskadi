# Blockchain FPEuskadi Backup & Restore Guide

This guide explains how to backup and restore your Blockchain FPEuskadi deployment for easy migration to a new server.

## Overview

The backup system includes:
- **Docker Volumes**: All persistent data (databases, mail, logs, certificates)
- **Configuration Files**: Nginx config, environment files, CheckMK config
- **SSL Certificates**: Let's Encrypt certificates
- **Application Code**: Pilotoak and WebServer directories
- **Database**: Complete MariaDB volume backup
- **Encryption**: GPG encryption using password from backup_file_password.txt

## Files Included

- `backup.sh` - Linux backup script
- `restore.sh` - Standalone restore script for new servers
- `setup_backup.sh` - Setup script to prepare the backup environment
- `test_backup.sh` - Test script to validate backup functionality
- `backup_file_password.txt` - Password file for backup encryption

## Quick Start

### Initial Setup

```bash
cd Garapena/WebServer/backup
chmod +x *.sh
./setup_backup.sh
```

### Testing the Backup System

```bash
./test_backup.sh
```

### Creating a Backup

```bash
./backup.sh
```

### Restoring on a New Server

1. **Copy the backup file** to your new server
2. **Extract the backup**:
   ```bash
   # For encrypted backups (.gpg files)
   gpg --decrypt blockchain_backup_YYYYMMDD_HHMMSS.tar.gz.gpg | tar xzf -
   
   # For unencrypted backups
   tar xzf blockchain_backup_YYYYMMDD_HHMMSS.tar.gz
   ```
3. **Run the restore script**:
   ```bash
   ./restore.sh blockchain_backup_YYYYMMDD_HHMMSS.tar.gz.gpg /opt/blockchain
   ```
4. **Follow the instructions** provided by the restore script

## What Gets Backed Up

### Docker Volumes
- `db_data` - MariaDB database data
- `mail_data` - Email data and mailboxes
- `mail_state` - Email state information
- `mail_logs` - Email server logs
- `mail_config` - Email server configuration
- `ethstats_logs` - Ethstats monitoring logs
- `formakuntza_ziurtagiriak` - Certificates for Formakuntza app
- `cmknew` - CheckMK monitoring data

### Configuration Files
- Nginx configuration (`./nginx/`)
- Environment files (`*.env`)
- CheckMK configuration (`./checkmk/`)

### SSL Certificates
- Let's Encrypt certificates (`/etc/letsencrypt/`)

### Application Code
- `Pilotoak/` directory (all applications)
- `WebServer/` directory (excluding temporary files)

### Database
- Complete MariaDB volume backup (includes all databases, users, and configurations)

## Backup Locations

- Default backup location: `/backup/blockchain-fpeuskadi/`
- Backup format: `blockchain_backup_YYYYMMDD_HHMMSS.tar.gz.gpg` (encrypted)
- Fallback format: `blockchain_backup_YYYYMMDD_HHMMSS.tar.gz` (unencrypted if GPG not available)

## File Ownership Configuration

When running backups as root (via cron), you can specify a target user for file ownership:

### Environment Variable Method
```bash
# Set target user before running backup
export BACKUP_TARGET_USER="yourusername"
./backup.sh
```

### Cron Example with Target User
```bash
# Add to root's crontab (sudo crontab -e)
0 2 * * * BACKUP_TARGET_USER=yourusername /path/to/Garapena/WebServer/backup/backup.sh >> /var/log/backup.log 2>&1
```

### Benefits of Setting Target User
- **Accessible Files**: Backup files are readable by the specified user
- **Security**: Maintains proper file permissions
- **Convenience**: No need to change ownership manually after backup

## Automated Backups

### Using cron (recommended)
```bash
# Add to crontab (crontab -e)
# Daily backup at 2 AM
0 2 * * * /path/to/Garapena/WebServer/backup/backup.sh >> /var/log/backup.log 2>&1

# Weekly backup on Sundays at 3 AM
0 3 * * 0 /path/to/Garapena/WebServer/backup/backup.sh >> /var/log/backup.log 2>&1

# Monthly backup on the 1st at 4 AM
0 4 1 * * /path/to/Garapena/WebServer/backup/backup.sh >> /var/log/backup.log 2>&1
```

### Using systemd timer (alternative)
Create `/etc/systemd/system/blockchain-backup.service`:
```ini
[Unit]
Description=Blockchain FPEuskadi Backup
After=docker.service

[Service]
Type=oneshot
ExecStart=/path/to/Garapena/WebServer/backup/backup.sh
User=root
Environment=BACKUP_TARGET_USER=yourusername
```

Create `/etc/systemd/system/blockchain-backup.timer`:
```ini
[Unit]
Description=Run Blockchain backup daily
Requires=blockchain-backup.service

[Timer]
OnCalendar=daily
Persistent=true

[Install]
WantedBy=timers.target
```

Enable and start:
```bash
sudo systemctl enable blockchain-backup.timer
sudo systemctl start blockchain-backup.timer
```

## Restore Process Details

The restore process will:

1. **Extract/decrypt the backup file** (if encrypted)
2. **Restore all Docker volumes** from compressed archives
3. **Restore configuration files** to appropriate locations
4. **Restore SSL certificates** to `/etc/letsencrypt/`
5. **Restore application code** to the project structure
6. **Create Docker networks** (`server_network`, `checkmk_network`)
7. **Provide setup instructions** for final configuration

## Post-Restore Steps

After running the restore script, you need to:

1. **Review configuration files**:
   - Check environment files for server-specific settings
   - Update passwords if needed
   - Verify database credentials

2. **Update DNS records** to point to the new server

3. **Start the main services**:
   ```bash
   cd WebServer
   docker compose up -d
   ```

4. **Start CheckMK monitoring** (optional):
   ```bash
   cd WebServer/checkmk
   docker compose -f docker-compose-checkmk.yaml up -d
   ```

5. **Database restoration** is automatic - the MariaDB volume contains all data

6. **Verify all services**:
   ```bash
   docker compose ps
   docker compose logs [service_name]
   ```

## Troubleshooting

### Common Issues

1. **Docker not running**:
   - Start Docker service before running restore
   - Check Docker daemon status

2. **Permission denied**:
   - Run with appropriate permissions
   - Check file ownership

3. **Volume not found**:
   - Volumes will be created automatically during restore
   - Check Docker volume list: `docker volume ls`

4. **SSL certificate issues**:
   - Certificates may need to be renewed
   - Check certificate validity and domain names

5. **File ownership issues**:
   - Use `BACKUP_TARGET_USER` environment variable
   - Check if target user exists: `id username`

### Logs and Debugging

- Check backup logs in the backup directory
- Use `docker compose logs [service]` to check service logs
- Verify all containers are running: `docker compose ps`

## Security Considerations

- **Backup files contain sensitive data** (passwords, certificates)
- **Backups are automatically encrypted** using GPG with AES256 encryption
- **Password is stored in** `backup_file_password.txt` - keep this file secure
- **Store backups securely** with appropriate access controls
- **Regularly test restore process** to ensure backups are valid
- **Keep the password file safe** - without it, encrypted backups cannot be restored

## Encryption Requirements

### For Backup Creation:
- **GPG must be installed** on the backup server
- **Password file** `backup_file_password.txt` must exist and contain the encryption password
- If GPG is not available, backup will be created unencrypted

### For Backup Restoration:
- **GPG must be installed** on the restore server
- **Correct password** is required to decrypt the backup
- The restore script will automatically detect encrypted backups and prompt for decryption

## File Structure After Restore

```
target_directory/
├── WebServer/
│   ├── nginx/
│   ├── *.env
│   ├── docker-compose.yml
│   └── checkmk/
├── Pilotoak/
│   ├── EtiketaAPP/
│   ├── FormakuntzakAPP/
│   ├── ZiurtagiriakAPP/
│   └── ...
└── letsencrypt/
```

## Support

If you encounter issues:

1. Check the backup logs for errors
2. Verify Docker and Docker Compose are installed
3. Ensure sufficient disk space for backup/restore
4. Check file permissions and ownership
5. Review the restore script output for specific error messages

## Version Information

- **Backup Script Version**: 1.1
- **Compatible with**: Docker Compose v2+
- **Tested on**: Ubuntu 20.04+, CentOS 7+, Debian 10+, RHEL 8+