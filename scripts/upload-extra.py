import paramiko, os, time, sys

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('8.136.23.108', 22, username='administrator', password='@ge803412345', timeout=20, look_for_keys=False, allow_agent=False)

sftp = client.open_sftp()
LOCAL = r'D:\Learn-Claude\GuanDan4'
REMOTE = r'C:\guandan4-master'

FILES = [
    'src/components/game/PlayingCard.tsx',
    'src/components/game/HandArea.tsx',
    'src/components/ui/Card.tsx',
    'src/components/ui/Input.tsx',
    'src/components/ui/Modal.tsx',
    'src/components/ui/Avatar.tsx',
    'src/components/ui/Button.tsx',
    'src/components/ui/Badge.tsx',
    'src/components/layout/Navigation.tsx',
    'src/components/ui/Tabs.tsx',
]
for f in FILES:
    local_path = os.path.join(LOCAL, f)
    remote_path = os.path.join(REMOTE, f).replace('/', '\\')
    if os.path.exists(local_path):
        sftp.put(local_path, remote_path)
        print('OK:', f)
    else:
        print('SKIP:', f)
sftp.close()
print('Upload done')

# Rebuild
cmd = 'cd /d {} && set PATH=C:\\\\node-v22.14.0-win-x64;%PATH% && npm run build'.format(REMOTE)
stdin, stdout, stderr = client.exec_command(cmd)
exit_code = stdout.channel.recv_exit_status()
out = stdout.read().decode('gbk', errors='replace')
if 'Compiled successfully' in out or 'Route (app)' in out:
    print('BUILD OK')
else:
    print('BUILD output:', out[-500:])

# Restart
stdin, stdout, stderr = client.exec_command('taskkill /F /IM node.exe 2>&1')
stdout.channel.recv_exit_status()
time.sleep(3)
stdin, stdout, stderr = client.exec_command('schtasks /run /tn Guandan4Server')
stdout.channel.recv_exit_status()
time.sleep(5)
stdin, stdout, stderr = client.exec_command('netstat -ano | findstr :3000')
stdout.channel.recv_exit_status()
out = stdout.read().decode('gbk', errors='replace')
print('Port 3000:', 'LISTENING' if 'LISTENING' in out else 'NOT FOUND')
client.close()
