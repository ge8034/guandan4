@echo off
set PATH=C:\node-v22.14.0-win-x64;%PATH%
cd /d C:\guandan4-master
node node_modules\next\dist\bin\next start -p 3000 > server.log 2>&1
