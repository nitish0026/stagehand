$env:BB_ENV = 'remote'
Set-Location 'D:\ServerStageHand\stagehand'
& pnpm install --silent
& pnpm build
Start-Process -FilePath 'pnpm.cmd' -ArgumentList 'start' -WorkingDirectory 'D:\ServerStageHand\stagehand' -NoNewWindow