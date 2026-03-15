import os
import sys

def get_home_dir():
    return os.path.expanduser("~")

def get_app_data_path(app_name: str) -> str:
    home = get_home_dir()
    if sys.platform == "darwin":  # macOS
        return os.path.join(home, "Library", "Application Support", app_name)
    elif sys.platform == "win32":  # Windows
        return os.path.join(home, "AppData", "Roaming", app_name)
    else:  # Linux, etc.
        return os.path.join(home, ".config", app_name)
