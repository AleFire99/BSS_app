$root = $PSScriptRoot

# Backend
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$root'; .venv\Scripts\uvicorn webapp.api:app --reload --host 0.0.0.0 --port 8000"

# Frontend
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$root\mobile'; npx expo start"

Write-Host "Backend: http://localhost:8000"
Write-Host "Frontend: Expo - scan QR in the new window"
