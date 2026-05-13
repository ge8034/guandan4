#!/usr/bin/env python3
"""直接部署到阿里云 ECS（绕过 GitHub，适用于 GitHub 不可达时）"""

import paramiko
import os
import sys
import tarfile
import io
import time

HOST = "8.136.23.108"
USER = "root"
PASS = "@ge803412345"
PROJECT_DIR = "/opt/guandan4"
LOCAL_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# 需要上传的修改文件（相对于项目根目录）
CHANGED_FILES = [
    "src/app/friends/page.tsx",
    "src/app/globals.css",
    "src/app/layout.tsx",
    "src/app/leaderboard/page.tsx",
    "src/app/lobby/page.tsx",
    "src/app/page.tsx",
    "src/app/profile/page.tsx",
    "src/app/room/[roomId]/page.tsx",
    "src/components/game/Scoreboard.tsx",
    "package.json",
    "package-lock.json",
]

def run_ssh(client, cmd, desc=""):
    """执行远程命令并打印输出"""
    label = f" [{desc}]" if desc else ""
    print(f"=== 执行{label}: {cmd}")
    stdin, stdout, stderr = client.exec_command(cmd)
    exit_code = stdout.channel.recv_exit_status()
    out = stdout.read().decode('utf-8', errors='replace')
    err = stderr.read().decode('utf-8', errors='replace')
    if out:
        print(out)
    if err:
        print(err, file=sys.stderr)
    if exit_code != 0:
        print(f"命令返回非零: {exit_code}", file=sys.stderr)
    return exit_code == 0

def main():
    print(f"=== GuanDan4 直接部署到 {HOST} ===\n")
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())

    try:
        client.connect(HOST, username=USER, password=PASS, timeout=30)
        print("SSH 连接成功\n")
    except Exception as e:
        print(f"SSH 连接失败: {e}")
        sys.exit(1)

    # 1. 上传修改的文件
    print("=== 1. 上传源文件到 ECS ===")
    sftp = client.open_sftp()

    for f in CHANGED_FILES:
        local_path = os.path.join(LOCAL_DIR, f)
        remote_path = f"{PROJECT_DIR}/{f}".replace("\\", "/")
        if not os.path.exists(local_path):
            print(f"  跳过(不存在): {f}")
            continue
        try:
            # 确保远程目录存在
            remote_dir = os.path.dirname(remote_path)
            try:
                sftp.stat(remote_dir)
            except FileNotFoundError:
                # 递归创建目录
                parts = remote_dir.lstrip("/").split("/")
                for i in range(len(parts)):
                    d = "/" + "/".join(parts[:i+1])
                    try:
                        sftp.stat(d)
                    except FileNotFoundError:
                        sftp.mkdir(d)

            sftp.put(local_path, remote_path)
            print(f"  上传: {f}")
        except Exception as e:
            print(f"  失败: {f} - {e}")

    sftp.close()
    print()

    # 2. 安装依赖（如有新增）
    print("=== 2. 安装依赖 ===")
    run_ssh(client, f"cd {PROJECT_DIR} && npm install", "npm install")

    # 3. 构建
    print("=== 3. 构建项目 ===")
    ok = run_ssh(client, f"cd {PROJECT_DIR} && npm run build", "next build")
    if not ok:
        print("构建失败，终止部署")
        client.close()
        sys.exit(1)

    # 4. 重启服务
    print("=== 4. 重启 PM2 ===")
    run_ssh(client, "pm2 restart guandan4 || pm2 start npm --name guandan4 -- start -- -p 3000", "pm2 restart")
    run_ssh(client, "pm2 save", "pm2 save")

    # 5. 检查状态
    print("=== 5. 服务状态 ===")
    run_ssh(client, "pm2 status", "pm2 status")

    client.close()
    print("\n=== 部署完成 ===")
    print(f"访问: http://{HOST}:3000")
    print("房间直达: http://8.136.23.108:3000/lobby")

if __name__ == "__main__":
    main()
