#!/usr/bin/env bash
# Automated backup script for Sales Management MVP (SQLite DB & backups)
set -e
PROJECT_DIR="/opt/sales-management-mvp"
BACKUP_DIR="$PROJECT_DIR/backups"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
TARGET_DIR="$BACKUP_DIR/backup_$TIMESTAMP"

mkdir -p "$TARGET_DIR"

if [ -f "$PROJECT_DIR/data/sales.db" ]; then
  cp "$PROJECT_DIR/data/sales.db" "$TARGET_DIR/sales.db"
  echo "Database backed up to $TARGET_DIR/sales.db"
fi

# Optional: compress backup and clean old backups (> 30 days)
find "$BACKUP_DIR" -type d -mtime +30 -exec rm -rf {} +
echo "Backup completed successfully at $TIMESTAMP"
