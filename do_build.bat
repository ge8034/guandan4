@echo off
set PATH=C:
ode-v22.14.0-win-x64;%PATH%
set NODE_OPTIONS=--max-old-space-size=512
cd /d C:\guandan4-master
echo START > C:\guandan4-master_out.txt
node node_modules
ext\distin
ext build >> C:\guandan4-master_out.txt 2>&1
echo EXIT=%ERRORLEVEL% >> C:\guandan4-master_out.txt
echo DONE > C:\guandan4-master_done.txt
