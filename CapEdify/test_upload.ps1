$filePath = "test_video.mp4"
$uri = "http://localhost:4000/api/videos/upload"

if (-not (Test-Path $filePath)) {
    Write-Host "Test video file not found: $filePath"
    exit 1
}

$fileInfo = Get-Item $filePath
Write-Host "Testing ultra-compression with file: $($fileInfo.Name)"
Write-Host "Original size: $([math]::Round($fileInfo.Length / 1MB, 1))MB"

try {
    $boundary = [System.Guid]::NewGuid().ToString()
    $contentType = "multipart/form-data; boundary=$boundary"
    
    $bodyLines = @(
        "--$boundary",
        'Content-Disposition: form-data; name="video"; filename="' + $fileInfo.Name + '"',
        'Content-Type: video/mp4',
        '',
        [System.Text.Encoding]::UTF8.GetString([System.IO.File]::ReadAllBytes($filePath)),
        "--$boundary--"
    )
    
    $body = $bodyLines -join "`r`n"
    
    Write-Host "Uploading to server for ultra-compression..."
    
    $response = Invoke-RestMethod -Uri $uri -Method Post -Body $body -ContentType $contentType -TimeoutSec 60
    
    if ($response.success) {
        $originalMB = [math]::Round($fileInfo.Length / 1MB, 1)
        $compressedMB = [math]::Round($response.video.size / 1MB, 1)
        $compressionRatio = [math]::Round((($fileInfo.Length - $response.video.size) / $fileInfo.Length) * 100, 1)
        
        Write-Host "Upload successful!"
        Write-Host "Original: ${originalMB}MB -> Compressed: ${compressedMB}MB"
        Write-Host "Compression ratio: ${compressionRatio}% (Target: 96%)"
        Write-Host "Video ID: $($response.video.id)"
        Write-Host "Transcription: $($response.transcription.status)"
        
        if ($compressionRatio -ge 96) {
            Write-Host "TARGET ACHIEVED! Ultra-compression working!" -ForegroundColor Green
        } else {
            Write-Host "Target missed - need to adjust compression settings" -ForegroundColor Yellow
        }
    } else {
        Write-Host "Upload failed: $($response.error)" -ForegroundColor Red
    }
} catch {
    Write-Host "Error during upload: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "Details: $($_.Exception)" -ForegroundColor Red
}
