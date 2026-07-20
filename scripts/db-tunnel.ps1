# Stayee DB Tunnel via SSM
# Run this script to connect to the RDS database from your local machine.
# Requires: AWS CLI configured with staye-developer or root-admin profile.
#
# Usage: Right-click -> Run with PowerShell
# Then connect with any Postgres client to: localhost:5432

$INSTANCE_ID = "i-066e2193c831d8495"
$RDS_HOST = "database-1.cj2woqyom1ds.ap-south-1.rds.amazonaws.com"
$RDS_PORT = "5432"
$LOCAL_PORT = "5432"
$PROFILE = "default"  # Change to "root-admin" if needed

Write-Host "======================================" -ForegroundColor Cyan
Write-Host "  Stayee DB Tunnel (SSM Port Forward)" -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Starting SSM tunnel..." -ForegroundColor Yellow
Write-Host "EC2 Instance : $INSTANCE_ID"
Write-Host "RDS Host     : $RDS_HOST"
Write-Host "Local Port   : localhost:$LOCAL_PORT -> RDS:$RDS_PORT"
Write-Host ""
Write-Host "Once connected, use this connection string in any Postgres client:" -ForegroundColor Green
Write-Host "postgresql://postgres:Stayee7865@localhost:$LOCAL_PORT/staye_db" -ForegroundColor White
Write-Host ""
Write-Host "Press Ctrl+C to stop the tunnel." -ForegroundColor Red
Write-Host ""

$params = @{
    host           = @($RDS_HOST)
    portNumber     = @($RDS_PORT)
    localPortNumber = @($LOCAL_PORT)
}
$paramsJson = ($params | ConvertTo-Json -Compress).Replace('"', '\"')

& "C:\Program Files\Amazon\AWSCLIV2\aws.exe" ssm start-session `
    --target $INSTANCE_ID `
    --document-name AWS-StartPortForwardingSessionToRemoteHost `
    --parameters $paramsJson `
    --region ap-south-1 `
    --profile $PROFILE
