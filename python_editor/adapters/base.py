import os
import time
from typing import List, Dict, Any, Optional
from abc import ABC, abstractmethod
from ..models import Chat, Message

class BaseAdapter(ABC):
    @property
    @abstractmethod
    def name(self) -> str:
        pass

    @property
    @abstractmethod
    def labels(self) -> Dict[str, str]:
        pass

    @abstractmethod
    def get_chats(self) -> List[Chat]:
        pass

    @abstractmethod
    def get_messages(self, chat: Chat) -> List[Message]:
        pass

def scan_artifacts(folder: str, editor: str, label: str, files: List[str] = None, dirs: List[str] = None) -> List[Dict[str, Any]]:
    if files is None: files = []
    if dirs is None: dirs = []
    
    artifacts = []
    if not folder or not os.path.exists(folder):
        return artifacts

    for rel_path in files:
        file_path = os.path.join(folder, rel_path)
        try:
            if not os.path.isfile(file_path):
                continue
            
            stat = os.stat(file_path)
            with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                content = f.read()
                
            artifacts.append({
                "editor": editor,
                "editor_label": label,
                "name": rel_path,
                "path": file_path,
                "relative_path": rel_path,
                "size": stat.st_size,
                "modified_at": int(stat.st_mtime * 1000),
                "preview": content[:500],
                "lines": len(content.splitlines())
            })
        except Exception:
            pass

    def is_artifact_file(f: str) -> bool:
        exts = ('.md', '.mdc', '.yaml', '.yml', '.json')
        return f.lower().endswith(exts)

    def add_file(full_path: str, r_path: str, f_name: str):
        try:
            if not os.path.isfile(full_path):
                return
            stat = os.stat(full_path)
            with open(full_path, 'r', encoding='utf-8', errors='ignore') as f:
                content = f.read()
            artifacts.append({
                "editor": editor,
                "editor_label": label,
                "name": f_name,
                "path": full_path,
                "relative_path": r_path,
                "size": stat.st_size,
                "modified_at": int(stat.st_mtime * 1000),
                "preview": content[:500],
                "lines": len(content.splitlines())
            })
        except Exception:
            pass

    for d in dirs:
        dir_path = os.path.join(folder, d)
        try:
            if not os.path.isdir(dir_path):
                continue
            for entry in os.listdir(dir_path):
                entry_path = os.path.join(dir_path, entry)
                if is_artifact_file(entry):
                    add_file(entry_path, os.path.join(d, entry), entry)
                elif os.path.isdir(entry_path):
                    # Recurse one level
                    try:
                        for sub_entry in os.listdir(entry_path):
                            if is_artifact_file(sub_entry):
                                add_file(os.path.join(entry_path, sub_entry), 
                                         os.path.join(d, entry, sub_entry), sub_entry)
                    except Exception:
                        pass
        except Exception:
            pass

    return artifacts
