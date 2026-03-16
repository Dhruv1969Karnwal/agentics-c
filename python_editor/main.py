import sys
import os
import json
from typing import List, Dict, Any, Optional
from .models import Message, Chat
from .adapters.codemate import vs_code_cora, jet_brains_cora, CodeMateAdapter
from .analytics_client import AnalyticsClient
import time
import threading

def compute_stats(messages: List[Message], chat: Chat, start_index: int = 0) -> Dict[str, Any]:
    stats = {
        "total_messages": 0,
        "user_messages": 0,
        "assistant_messages": 0,
        "tool_messages": 0,
        "system_messages": 0,
        "tool_calls": [],
        "models": [],
        "total_user_chars": 0,
        "total_assistant_chars": 0,
        "total_input_tokens": 0,
        "total_output_tokens": 0,
        "total_cache_read": 0,
        "total_cache_write": 0,
        "analyzed_at": int(time.time() * 1000)
    }

    msg_list = []
    tc_list = []

    last_index = 0
    last_id = None
    
    for i, msg in enumerate(messages):
        if i < start_index:
            if msg.role == 'user' and msg.id:
                last_id = msg.id
            continue

        stats['total_messages'] += 1
        last_index = i
        if msg.role == 'user' and msg.id:
            last_id = msg.id

        if msg.role == 'user':
            stats['user_messages'] += 1
            stats['total_user_chars'] += len(msg.content)
        elif msg.role == 'assistant':
            stats['assistant_messages'] += 1
            stats['total_assistant_chars'] += len(msg.content)
            for tc in msg.tool_calls:
                stats['tool_calls'].append(tc['name'])
                tc_list.append({
                    "tool_name": tc['name'],
                    "args": tc.get('args', {}),
                    "source": chat.source,
                    "folder": chat.folder,
                    "timestamp": chat.last_updated_at or chat.created_at
                })
        elif msg.role == 'tool':
            stats['tool_messages'] += 1
        elif msg.role == 'system':
            stats['system_messages'] += 1

        if msg.model:
            stats['models'].append(msg.model)

        stats['total_input_tokens'] += (msg.input_tokens or 0)
        stats['total_output_tokens'] += (msg.output_tokens or 0)
        stats['total_cache_read'] += (msg.cache_read or 0)
        stats['total_cache_write'] += (msg.cache_write or 0)

        msg_list.append({
            "seq": i,
            "role": msg.role,
            "content": msg.content,
            "model": msg.model,
            "input_tokens": msg.input_tokens,
            "output_tokens": msg.output_tokens
        })

    return {
        "chat": {
            "id": chat.composer_id,
            "source": chat.source,
            "name": chat.name,
            "mode": chat.mode,
            "folder": chat.folder,
            "created_at": chat.created_at,
            "last_updated_at": chat.last_updated_at,
            "encrypted": 0,
            "bubble_count": chat.bubble_count,
            "_meta": chat._metadata
        },
        "stats": stats,
        "messages": msg_list,
        "tool_calls": tc_list,
        "last_index": last_index,
        "last_id": last_id
    }

def process_incremental_analytics(folder_id: str, new_id: str, adapter: CodeMateAdapter) -> Optional[Dict[str, Any]]:
    headers = {"x-session": "db584093-d905-49ef-9448-c8c02b521d15"}

    task_dir = os.path.join(adapter._tasks_dir, folder_id)
    if not os.path.isdir(task_dir):
        print(f"Folder {folder_id} not found in {adapter._tasks_dir}")
        return None

    analytics_path = os.path.join(task_dir, 'analytics.json')
    history_path = os.path.join(task_dir, 'api_conversation_history.json')
    
    if not os.path.exists(history_path):
        return None

    last_index_tracked = -1
    last_id_tracked = None
    if os.path.exists(analytics_path):
        try:
            with open(analytics_path, 'r', encoding='utf-8') as f:
                data = json.load(f)
                last_index_tracked = data.get('last_index', -1)
                last_id_tracked = data.get('last_id')
        except: pass

    chats = adapter.get_chats()
    chat = next((c for c in chats if c.composer_id == folder_id), None)
    if not chat:
        return None

    messages = adapter.get_messages(chat)
    found_idx = -1

    for i in range(last_index_tracked + 1, len(messages)):
        msg = messages[i]
        if msg.role == 'user' and msg.id == new_id:
            found_idx = i
            break
    
    if found_idx == -1 and last_id_tracked:
        for i in range(len(messages) - 1, -1, -1):
            msg = messages[i]
            if msg.role == 'user' and msg.id == new_id:
                found_idx = i
                break

    if found_idx == -1:
        for i, msg in enumerate(messages):
            if msg.role == 'user' and msg.id == new_id:
                found_idx = i
                break

    if found_idx == -1:
        print(f"new_id {new_id} not found in folder {folder_id}")
        return None

    print(f"\n[Incremental] Starting processing for folder: {folder_id}, searching for ID: {new_id}...")
    result = compute_stats(messages, chat, start_index=found_idx)
    
    print(f"[Incremental] Found {len(result['messages'])} messages to process starting from index {found_idx}")

    analytics_data = {
        "last_index": result['last_index'],
        "last_id": result['last_id']
    }
    try:
        with open(analytics_path, 'w', encoding='utf-8') as f:
            json.dump(analytics_data, f, indent=4)
        print(f"[Incremental] Updated local analytics.json: index={result['last_index']}, id={result['last_id']}")
    except Exception as e:
        print(f"[Incremental] Error saving local analytics.json: {e}")

    payload = {
        "chat": result['chat'],
        "stats": result['stats'],
        "messages": result['messages'],
        "tool_calls": result['tool_calls']
    }
    
    def send_task():
        print(f"[Incremental] Background task: Sending POST request to cloud API...")
        try:
            import requests
            api_url = "http://localhost:8000/api/incremental-analytics"
            response = requests.post(api_url, json=payload, headers=headers, timeout=15)
            response.raise_for_status()
        except Exception as e:
            print(f"[Incremental] Network error during background POST: {e}")

    print(f"[Incremental] Spawning background thread for cloud sync...")
    thread = threading.Thread(target=send_task, daemon=True)
    thread.start()

    return payload

def main():
    print("--- Agentlytics Python Collector ---")
    
    adapters = [vs_code_cora, jet_brains_cora]
    headers = {"x-session": "db584093-d905-49ef-9448-c8c02b521d15"}
    analytics = AnalyticsClient(headers=headers)
    
    all_chats = []
    
    for adapter in adapters:
        print(f"\nScanning sessions for: {adapter.labels[adapter.name]}...")
        print(f"Tasks directory: {adapter._tasks_dir}")
        
        chats = adapter.get_chats()
        if not chats:
            print(f"No sessions found for {adapter.name}.")
            continue

        print(f"Found {len(chats)} sessions.")
        all_chats.extend(chats)
        
        for chat in sorted(chats, key=lambda x: x.last_updated_at or 0, reverse=True):
            print(f"  [{chat.source}] {chat.name or 'Unnamed Session'}")
            print(f"    ID: {chat.composer_id}")
            
            messages = adapter.get_messages(chat)
            result = compute_stats(messages, chat)
            
            analytics.track({
                "chat": result['chat'],
                "stats": result['stats'],
                "messages": result['messages'],
                "tool_calls": result['tool_calls']
            })

            if chat._task_dir and os.path.exists(chat._task_dir):
                analytics_path = os.path.join(chat._task_dir, 'analytics.json')
                try:
                    with open(analytics_path, 'w', encoding='utf-8') as f:
                        json.dump({
                            "last_index": result['last_index'],
                            "last_id": result['last_id']
                        }, f, indent=4)
                except Exception: pass

    print(f"\nProcessing complete across {len(adapters)} adapters.")
    print("Flushing analytics background thread...")
    analytics.shutdown()
    print("Done.")

if __name__ == "__main__":
    main()
