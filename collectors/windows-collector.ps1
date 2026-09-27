#!/bin/bash
# Windows Event Log Collector Agent for SEIM
# Windows-compatible script using PowerShell to query Event Logs

# This is a templated example for Windows host deployment
# It is intended to be run via PowerShell or as a scheduled task.

cat <<'EOF'
$SIEM_SERVER = "http://localhost:5000"
$COLLECTOR_NAME = "windows-$(hostname)"
$COLLECTOR_TYPE = "Windows Server"
$EVENT_LOGS = @("System", "Security", "Application")

function Convert-EventToJson($logName, $eventId, $level, $message, $computerName) {
    $severity = "low"
    switch ($level) {
        "Error" { $severity = "high" }
        "Critical" { $severity = "critical" }
        "Warning" { $severity = "medium" }
        "Information" { $severity = "low" }
    }

    $eventType = "system_event"
    if ($message -match "failed|Failed") { $eventType = "login_failed" }
    elseif ($message -match "succeeded|Succeeded") { $eventType = "login_success" }
    elseif ($message -match "port|connection") { $eventType = "network_event" }
    elseif ($message -match "malware|virus") { $eventType = "malware_detected" }

    $payload = @{
        source = $computerName
        sourceType = $COLLECTOR_TYPE
        eventType = $eventType
        severity = $severity
        message = $message.Substring(0, [Math]::Min(500, $message.Length))
        status = "open"
        metadata = @{
            log_name = $logName
            event_id = $eventId
            level = $level
            collector_name = $COLLECTOR_NAME
            timestamp = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")
        }
    }

    return ($payload | ConvertTo-Json -Compress)
}

while ($true) {
    foreach ($log in $EVENT_LOGS) {
        $lastEventFile = "C:\Temp\siem_$($log)_last_event.txt"
        $lastEventId = 0

        if (Test-Path $lastEventFile) {
            $lastEventId = [int](Get-Content $lastEventFile)
        }

        $events = Get-WinEvent -LogName $log -MaxEvents 50 | Where-Object { $_.Id -gt $lastEventId }

        foreach ($event in $events) {
            $payload = Convert-EventToJson -logName $log -eventId $event.Id -level $event.LevelDisplayName -message $event.Message -computerName $env:COMPUTERNAME
            Invoke-RestMethod -Method Post -Uri "http://localhost:5000/api/events" -ContentType "application/json" -Body $payload | Out-Null
            $lastEventId = $event.Id
        }

        if ($events.Count -gt 0) {
            $events[$events.Count - 1].Id | Set-Content $lastEventFile
        }
    }

    Start-Sleep -Seconds 30
}
EOF
