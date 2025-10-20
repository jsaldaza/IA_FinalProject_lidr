@echo off
REM Project API helper script for Windows cmd.exe
REM Provides interactive menu for common project endpoints used by the frontend

setlocal enabledelayedexpansion

necho =============================================
echo TestForge - Project API helper
echo =============================================

n:: Ask for API URL and token (once per session)
necho NOTE: Press Enter to accept default values.
necho.
set /p API_URL=API base URL (include /api) [http://localhost:3001/api]: 
nif "%API_URL%"=="" set "API_URL=http://localhost:3001/api"
set /p TOKEN=Bearer token (JWT): 
if "%TOKEN%"=="" (
  echo WARNING: No token provided. Requests that require auth will likely fail.
)

n:menu
echo.
echo Select an action:
echo  1) Create project and start chat (POST /projects/create-and-start)
echo  2) List projects in progress (GET /projects/in-progress)
echo  3) Get project status (GET /projects/{id}/status)
echo  4) Send chat message to project (POST /projects/{id}/chat)
echo  5) Complete project (POST /projects/{id}/complete)
echo  6) Delete project (DELETE /projects/{id})
echo  7) Exit
echo.
set /p choice=Enter choice [1-7]: 

nif "%choice%"=="1" goto create_and_start
nif "%choice%"=="2" goto list_in_progress
nif "%choice%"=="3" goto get_status
nif "%choice%"=="4" goto send_chat
nif "%choice%"=="5" goto complete_project
nif "%choice%"=="6" goto delete_project
nif "%choice%"=="7" goto end
echo Invalid option. Try again.
goto menu

n:create_and_start
echo.
set /p TITLE=Project title: 
set /p DESC=Project description (single line recommended): 
echo.
echo Creating project...
curl -s -X POST "%API_URL%/projects/create-and-start" ^
  -H "Content-Type: application/json" ^
  -H "Authorization: Bearer %TOKEN%" ^
  -d "{\"title\":\"%TITLE%\",\"description\":\"%DESC%\"}" 
echo.
echo Done. Press any key to continue...
pause>nul
goto menu

n:list_in_progress
echo.
echo Fetching in-progress projects...
curl -s "%API_URL%/projects/in-progress" -H "Authorization: Bearer %TOKEN%" 
echo.
pause>nul
goto menu

n:get_status
echo.
set /p PROJECT_ID=Project ID: 
echo Fetching project status for %PROJECT_ID%...
curl -s "%API_URL%/projects/%PROJECT_ID%/status" -H "Authorization: Bearer %TOKEN%" 
echo.
pause>nul
goto menu

n:send_chat
echo.
set /p PROJECT_ID=Project ID: 
set /p INSTRUCTION=Message / instruction to send: 
set /p REQUIREMENT=Optional requirement/summary to attach (leave empty if none): 
echo Sending message to project %PROJECT_ID%...
if "%REQUIREMENT%"=="" (
  curl -s -X POST "%API_URL%/projects/%PROJECT_ID%/chat" ^
    -H "Content-Type: application/json" ^
    -H "Authorization: Bearer %TOKEN%" ^
    -d "{\"instruction\":\"%INSTRUCTION%\"}"
) else (
  curl -s -X POST "%API_URL%/projects/%PROJECT_ID%/chat" ^
    -H "Content-Type: application/json" ^
    -H "Authorization: Bearer %TOKEN%" ^
    -d "{\"instruction\":\"%INSTRUCTION%\",\"requirement\":\"%REQUIREMENT%\"}"
)
echo.
pause>nul
goto menu

n:complete_project
echo.
set /p PROJECT_ID=Project ID: 
echo Marking project %PROJECT_ID% as complete...
curl -s -X POST "%API_URL%/projects/%PROJECT_ID%/complete" -H "Authorization: Bearer %TOKEN%" 
echo.
pause>nul
goto menu

n:delete_project
echo.
set /p PROJECT_ID=Project ID: 
echo Deleting project %PROJECT_ID%...
curl -s -X DELETE "%API_URL%/projects/%PROJECT_ID%" -H "Authorization: Bearer %TOKEN%" 

echo.
pause>nul
goto menu

n:end
echo Goodbye.
endlocal
exit /b 0
