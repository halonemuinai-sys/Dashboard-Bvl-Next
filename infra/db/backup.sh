#!/bin/sh
# Daily dump of the Vizione database on the Proxmox VM (cron, 01:00 WIB). Keeps 14 days.
# The laptop pulls these with infra/db/pull_backup.py.
set -e
DIR=/home/ubuntu-mogems/vizione-db/dumps
FILE="$DIR/vizione-$(date +%Y%m%d-%H%M).dump"
mkdir -p "$DIR" && chmod 700 "$DIR"
docker exec vizione-db pg_dump -U postgres -d vizione --format=custom --file=/tmp/backup.dump
docker cp vizione-db:/tmp/backup.dump "$FILE"
docker exec vizione-db rm -f /tmp/backup.dump
chmod 600 "$FILE"
find "$DIR" -name 'vizione-*.dump' -mtime +14 -delete
echo "$(date -u +%FT%TZ) backup ok: $FILE ($(stat -c %s "$FILE") bytes)"
