#!/bin/bash
# Linux System Log Collector Agent for SIEM
# This script runs on Linux machines and forwards events to the SIEM server

# Configuration
SIEM_SERVER="${SIEM_SERVER:-http://localhost:5000}"
API_KEY="${API_KEY:-your-api-key-here}"
COLLECTOR_NAME="${COLLECTOR_NAME:-linux-$(hostname)}"
COLLECTOR_TYPE="${COLLECTOR_TYPE:-Linux Server}"
LOG_FILES=(
  "/var/log/auth.log"
  "/var/log/syslog"
  "/var/log/secure"
  "/var/log/audit/audit.log"
  "/var/log/httpd/access_log"
  "/var/log/httpd/error_log"
)

# Function to convert log entry to SIEM format
convert_log_entry() {
  local log_file=$1
  local log_entry=$2

  local event_type="system_log"
  local severity="low"

  if [[ "$log_entry" =~ "Failed password" ]]; then
    event_type="login_failed"
    severity="high"
  elif [[ "$log_entry" =~ "Accepted password" ]] || [[ "$log_entry" =~ "Accepted publickey" ]]; then
    event_type="login_success"
    severity="low"
  elif [[ "$log_entry" =~ "sudo:" ]]; then
    event_type="privilege_escalation"
    severity="medium"
  elif [[ "$log_entry" =~ "COMMAND" ]]; then
    event_type="command_execution"
    severity="medium"
  elif [[ "$log_entry" =~ "Invalid user" ]]; then
    event_type="invalid_user"
    severity="high"
  elif [[ "$log_entry" =~ "error" ]] || [[ "$log_entry" =~ "ERROR" ]]; then
    event_type="system_error"
    severity="medium"
  elif [[ "$log_entry" =~ "warning" ]] || [[ "$log_entry" =~ "WARNING" ]]; then
    event_type="system_warning"
    severity="low"
  fi

  local source_ip=$(echo "$log_entry" | grep -oP '(?:from|ip=)\s*\K[0-9]{1,3}(?:\.[0-9]{1,3}){3}' | head -1)
  if [[ -z "$source_ip" ]]; then
    source_ip="unknown"
  fi

  cat <<EOF
{
  "source": "$source_ip",
  "sourceType": "$COLLECTOR_TYPE",
  "eventType": "$event_type",
  "severity": "$severity",
  "message": "${log_entry:0:500}",
  "status": "open",
  "metadata": {
    "log_file": "$log_file",
    "hostname": "$(hostname)",
    "collector_name": "$COLLECTOR_NAME",
    "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
  }
}
EOF
}

send_event() {
  local event_json=$1
  curl -s -X POST "$SIEM_SERVER/api/events" \
    -H "Content-Type: application/json" \
    -d "$event_json" > /dev/null 2>&1
}

monitor_log_file() {
  local log_file=$1
  local state_file="/tmp/siem_$(echo $log_file | sed 's#/#_#g')_state"

  if [[ ! -f "$log_file" ]]; then
    return
  fi

  if [[ ! -f "$state_file" ]]; then
    wc -l < "$log_file" > "$state_file"
    return
  fi

  local last_line=$(cat "$state_file")
  local current_line=$(wc -l < "$log_file")

  if [[ $current_line -gt $last_line ]]; then
    tail -n +$((last_line + 1)) "$log_file" | while read -r log_entry; do
      if [[ -n "$log_entry" ]]; then
        local event_json=$(convert_log_entry "$log_file" "$log_entry")
        send_event "$event_json"
      fi
    done

    echo "$current_line" > "$state_file"
  fi
}

echo "[$(date)] Starting Linux Log Collector for SIEM"
echo "[$(date)] SIEM Server: $SIEM_SERVER"

while true; do
  for log_file in "${LOG_FILES[@]}"; do
    monitor_log_file "$log_file"
  done
  sleep 10
done
