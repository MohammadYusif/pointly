# Disable and delete old CloudFront distributions
$distIds = @("E2ZSJ88P7O7AKO", "ENILGFVBZ6SSX", "E1VCE01IMGWOBM")

foreach ($id in $distIds) {
    Write-Host "`n=== Processing $id ==="
    
    # Get current config
    $raw = aws cloudfront get-distribution --id $id --output json 2>&1
    $dist = $raw | ConvertFrom-Json
    $config = $dist.Distribution.DistributionConfig
    $etag = $dist.ETag
    
    Write-Host "Current enabled: $($config.Enabled), ETag: $etag"
    
    if ($config.Enabled) {
        # Disable it
        $config.Enabled = $false
        $jsonPath = "$env:TEMP\cf-$id.json"
        $config | ConvertTo-Json -Depth 20 | Out-File -FilePath $jsonPath -Encoding utf8
        
        Write-Host "Disabling..."
        aws cloudfront update-distribution --id $id --cli-input-json (Get-Content $jsonPath -Raw) --if-match $etag 2>&1 | Out-Null
        
        # Wait for propagation
        Write-Host "Waiting for propagation (up to 3 minutes)..."
        $maxWait = 180
        $waited = 0
        while ($waited -lt $maxWait) {
            Start-Sleep -Seconds 10
            $waited += 10
            $check = aws cloudfront get-distribution --id $id --output json 2>&1 | ConvertFrom-Json
            if (-not $check.Distribution.DistributionConfig.Enabled) {
                Write-Host "Disabled after ${waited}s"
                break
            }
            Write-Host "  Still propagating... (${waited}s)"
        }
    }
    
    # Delete
    $dist2 = aws cloudfront get-distribution --id $id --output json 2>&1 | ConvertFrom-Json
    $etag2 = $dist2.ETag
    $enabled = $dist2.Distribution.DistributionConfig.Enabled
    
    if ($enabled) {
        Write-Host "WARNING: Distribution $id still enabled after waiting. Skipping delete."
    } else {
        Write-Host "Deleting..."
        aws cloudfront delete-distribution --id $id --if-match $etag2 2>&1
        Write-Host "Deleted $id"
    }
}

Write-Host "`n=== Done ==="
