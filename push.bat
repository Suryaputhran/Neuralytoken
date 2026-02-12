@echo off
echo Pushing to GitHub...
git push -u origin main
if %errorlevel% neq 0 (
    echo.
    echo Push failed. Please check your credentials.
) else (
    echo.
    echo Push successful!
)
pause
