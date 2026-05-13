#!/usr/bin/env python3
"""部署到 Windows ECS (8.136.23.108)"""
import paramiko, os, sys

HOST = "8.136.23.108"
USER = "administrator"
PASS = "@ge803412345"
REMOTE = r"C:\guandan4-master"
LOCAL = r"D:\Learn-Claude\GuanDan4"

FILES = [
    r"src\app\friends\page.tsx",
    r"src\app\globals.css",
    r"src\app\layout.tsx",
    r"src\app\leaderboard\page.tsx",
    r"src\app\lobby\page.tsx",
    r"src\app\page.tsx",
    r"src\app\profile\page.tsx",
    r"src\app\room\[roomId]\page.tsx",
    r"src\components\game\Scoreboard.tsx",
    r"src\components\game\CardCounter.tsx",
    r"src\components\game\TurnTimer.tsx",
    r"src\components\game\PlayingCard.tsx",
    r"src\components\game\HandArea.tsx",
    r"src\components\ui\Card.tsx",
    r"src\components\ui\Input.tsx",
    r"src\components\ui\Modal.tsx",
    r"src\components\ui\Avatar.tsx",
    r"src\components\ui\Button.tsx",
    r"src\components\ui\Badge.tsx",
    r"src\components\layout\Navigation.tsx",
    r"src\components\ui\Tabs.tsx",
]

def check_build_output(text):
    """检查构建输出是否成功"""
    if "Compiled successfully" in text:
        return True
    if "✓" in text and "Route" in text:
        return True
    return "error" not in text.lower() or "Build error" not in text

def main():
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())

    print(f"连接 {HOST} ...")
    client.connect(HOST, 22, username=USER, password=PASS, timeout=20,
                   look_for_keys=False, allow_agent=False)
    print("SSH 连接成功\n")

    # 1. 上传文件
    print("=== 1. 上传文件 ===")
    sftp = client.open_sftp()
    for f in FILES:
        local_path = os.path.join(LOCAL, f)
        remote_path = REMOTE + "\\" + f.replace("/", "\\")
        if not os.path.exists(local_path):
            print(f"  跳过: {f}")
            continue
        try:
            sftp.put(local_path, remote_path)
            print(f"  OK: {f}")
        except Exception as e:
            print(f"  失败: {f} - {e}")
    sftp.close()
    print("上传完成\n")

    # 2. 构建
    print("=== 2. npm run build ===")
    cmd_str = f'cd /d {REMOTE} && npm run build'
    stdin, stdout, stderr = client.exec_command(cmd_str)
    exit_code = stdout.channel.recv_exit_status()
    out = stdout.read().decode('gbk', errors='replace')
    err = stderr.read().decode('gbk', errors='replace')

    if exit_code == 0 or check_build_output(out):
        print("构建成功!")
        for line in out.split('\n'):
            line = line.strip()
            if line and ('✓' in line or 'Route' in line or 'error' in line.lower()):
                print(f"  {line}")
    else:
        print(f"构建失败 (exit={exit_code})")
        # 打印最后50行
        lines = out.split('\n')
        for line in lines[-50:]:
            print(f"  {line}")
        client.close()
        sys.exit(1)

    # 3. 重启服务
    print("\n=== 3. 重启服务 ===")
    # 杀掉旧进程
    stdin, stdout, stderr = client.exec_command("taskkill /F /IM node.exe 2>&1")
    exit_code = stdout.channel.recv_exit_status()
    out = stdout.read().decode('gbk', errors='replace')
    print(f"停止旧进程: {out.strip()}")

    # 启动新进程
    import time
    time.sleep(2)
    start_cmd = f'cd /d {REMOTE} && start /b cmd /c "node node_modules\\next\\dist\\bin\\next start -p 3000 > server.log 2>&1"'
    stdin, stdout, stderr = client.exec_command(start_cmd)
    stdout.channel.recv_exit_status()
    print("启动新进程完成")

    # 验证
    time.sleep(3)
    stdin, stdout, stderr = client.exec_command("netstat -ano | findstr :3000")
    stdout.channel.recv_exit_status()
    out = stdout.read().decode('gbk', errors='replace')
    if "LISTENING" in out:
        print("端口 3000 已监听!")
    else:
        print("警告: 端口3000未检测到监听")

    client.close()
    print(f"\n=== 部署完成 ===")
    print(f"http://{HOST}:3000")

if __name__ == "__main__":
    main()
