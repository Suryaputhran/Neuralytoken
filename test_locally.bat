@echo off
echo Starting Local Blockchain...
start "Hardhat Local Node" cmd /k "echo Copy a PRIVATE KEY from here to MetaMask! && npx hardhat node"
echo.
echo [1] Local Chain Started in new window.
echo [2] Wait 10 seconds for it to initialize...
timeout /t 10
echo.
echo [3] Deploying Contracts to Local Chain...
cmd /k "npx hardhat run scripts/deploy.js --network localhost"
pause
