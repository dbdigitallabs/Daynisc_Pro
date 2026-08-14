import socket

def get_lan_ip_1():
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except Exception as e:
        return f"failed_1: {e}"

def get_lan_ip_2():
    try:
        hostname = socket.gethostname()
        ips = socket.gethostbyname_ex(hostname)[2]
        return ips
    except Exception as e:
        return f"failed_2: {e}"

print("Method 1 (Socket Connect to 8.8.8.8):", get_lan_ip_1())
print("Method 2 (GetHostByNameEx):", get_lan_ip_2())
