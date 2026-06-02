import os

pgpass_path = os.path.expandvars(r'%APPDATA%\postgresql\pgpass.conf')
print(f"Checking for pgpass.conf at: {pgpass_path}")

if os.path.exists(pgpass_path):
    print("Found pgpass.conf! Reading contents:")
    try:
        with open(pgpass_path, 'r') as f:
            for line in f:
                # Strip comments and print
                if line.strip() and not line.strip().startswith('#'):
                    print(f"Credential entry: {line.strip()}")
    except Exception as e:
        print(f"Error reading file: {e}")
else:
    print("pgpass.conf does not exist.")
