import sys
import os
import json
from .adapters.codemate import CodeMateAdapter
from .utils.platform import get_app_data_path
from .analytics_client import AnalyticsClient
import time

def main():
    print("--- Agentlytics Python Collector ---")
    
    # In a real scenario, we might iterate over multiple adapters
    # For now, we focus on CodeMate as requested
    adapter = CodeMateAdapter()
    # Default session for testing, can be passed via env or args in real usage
    headers = {"x-session": "db584093-d905-49ef-9448-c8c02b521d15"}
    analytics = AnalyticsClient(headers=headers)
    
    print(f"Scanning sessions for: {adapter.labels[adapter.name]}...")
    
    chats = adapter.get_chats()
    
    if not chats:
        print("No sessions found.")
        return

    print(f"Found {len(chats)} sessions.")
    
    for chat in sorted(chats, key=lambda x: x.last_updated_at or 0, reverse=True):
        print(f"\n[{chat.source}] {chat.name or 'Unnamed Session'}")
        print(f"  ID: {chat.composer_id}")
        print(f"  Messages: {chat.bubble_count}")
        
        messages = adapter.get_messages(chat)
        for msg in messages:
            prefix = f"  [{msg.role.upper()}]"
            content_preview = (msg.content[:70] + '...') if len(msg.content) > 70 else msg.content
            print(f"{prefix} {content_preview}")
            if msg.tool_calls:
                print(f"    Tools: {', '.join([tc['name'] for tc in msg.tool_calls])}")
        
        # Extract full metrics for cloud analytics (matching JS schema)
        stats = {
            "total_messages": len(messages),
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

        analytics.track({
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
            "tool_calls": tc_list
        })

        # Save analytics.json if task dir is available
        if chat._task_dir and os.path.exists(chat._task_dir):
            analytics_data = {
                "last_index": last_index,
                "last_id": last_id
            }
            analytics_path = os.path.join(chat._task_dir, 'analytics.json')
            try:
                with open(analytics_path, 'w', encoding='utf-8') as f:
                    json.dump(analytics_data, f, indent=4)
                print(f"  Saved analytics to: {analytics_path}")
            except Exception as e:
                print(f"  Error saving analytics: {e}")

    print("\nProcessing complete. Flushing analytics background thread...")
    analytics.shutdown()
    print("Done.")

if __name__ == "__main__":
    main()
