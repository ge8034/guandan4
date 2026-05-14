"""Upload .next build output to ECS (bypasses ECS build issues)"""
import paramiko, os, time, sys

HOST = "8.136.23.108"
USER = "administrator"
PASS = "@ge803412345"
LOCAL = r"D:\Learn-Claude\GuanDan4"
REMOTE = r"C:\guandan4-master"

def upload_dir(sftp, local_dir, remote_dir):
    """Recursively upload a directory"""
    for root, dirs, files in os.walk(local_dir):
        rel_path = os.path.relpath(root, local_dir)
        if rel_path == '.':
            remote_path = remote_dir
        else:
            remote_path = os.path.join(remote_dir, rel_path).replace('\\', '/')

        # Create remote directory
        try:
            sftp.mkdir(remote_path)
        except:
            pass

        for f in files:
            local_file = os.path.join(root, f)
            remote_file = remote_path + '/' + f
            try:
                sftp.put(local_file, remote_file)
            except Exception as e:
                print(f"  FAIL {rel_path}/{f}: {e}")

def main():
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect(HOST, 22, username=USER, password=PASS, timeout=30,
                   look_for_keys=False, allow_agent=False)

    sftp = client.open_sftp()

    # 1. Stop node
    print("1. Stopping Node...")
    stdin, stdout, stderr = client.exec_command("taskkill /F /IM node.exe 2>&1")
    stdout.channel.recv_exit_status()
    time.sleep(2)

    # 2. Delete old .next on ECS
    print("2. Deleting old .next...")
    stdin, stdout, stderr = client.exec_command(
        "rmdir /s /q " + REMOTE.replace('\\', '\\\\') + "\\\\.next 2>&1"
    )
    stdout.channel.recv_exit_status()

    # 3. Upload .next (critical parts only)
    print("3. Uploading .next build output...")

    local_next = os.path.join(LOCAL, ".next")
    remote_next = REMOTE.replace('\\', '/') + "/.next"

    # Create .next dir
    try:
        sftp.mkdir(remote_next)
    except:
        pass

    # Upload key directories (server, static, types, cache)
    for subdir in ['server', 'static', 'types']:
        ld = os.path.join(local_next, subdir)
        rd = remote_next + '/' + subdir
        if os.path.isdir(ld):
            print(f"  Uploading {subdir}/ ...")
            upload_dir(sftp, ld, rd)
            print(f"  {subdir}/ done")

    # Upload root files
    print("  Uploading root files...")
    for f in os.listdir(local_next):
        local_file = os.path.join(local_next, f)
        if os.path.isfile(local_file):
            remote_file = remote_next + '/' + f
            try:
                sftp.put(local_file, remote_file)
            except:
                pass

    sftp.close()

    # 4. Start server
    print("4. Starting server...")
    time.sleep(2)
    stdin, stdout, stderr = client.exec_command(
        REMOTE.replace('\\', '\\\\') + "\\\\start_gd4.bat"
    )
    stdout.channel.recv_exit_status()
    time.sleep(8)

    # 5. Verify
    stdin, stdout, stderr = client.exec_command("netstat -ano | findstr :3000")
    stdout.channel.recv_exit_status()
    out = stdout.read().decode('gbk', errors='replace')
    print("Port 3000:", "LISTENING" if "LISTENING" in out else "NOT FOUND")

    client.close()
    print("\nDONE")

if __name__ == "__main__":
    main()
