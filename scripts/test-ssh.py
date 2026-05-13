"""SSH连接测试"""
import paramiko
import socket

host = "8.136.23.108"
user = "root"
pwd = "@ge803412345"

print(f"=== 1. TCP 连接测试 {host}:22 ===")
try:
    sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    sock.settimeout(10)
    result = sock.connect_ex((host, 22))
    sock.close()
    if result == 0:
        print("端口22可达")
    else:
        print(f"端口不可达, code={result}")
except Exception as e:
    print(f"TCP错误: {e}")

print(f"\n=== 2. SSH 尝试 (user={user}, pwd_len={len(pwd)}) ===")
client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
try:
    client.connect(host, port=22, username=user, password=pwd, timeout=15, look_for_keys=False, allow_agent=False)
    print("连接成功!")
    stdin, stdout, stderr = client.exec_command("hostname && whoami && pwd")
    print("输出:", stdout.read().decode())
    client.close()
except paramiko.AuthenticationException as e:
    print(f"认证失败: {e}")
except Exception as e:
    print(f"连接错误: {type(e).__name__}: {e}")
