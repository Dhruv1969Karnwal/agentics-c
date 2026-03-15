import os
import json
import shutil
from python_editor.adapters.codemate import CodeMateAdapter
from python_editor.models import Chat

def setup_mock_data(tmp_dir):
    os.makedirs(tmp_dir, exist_ok=True)
    task_id = "test-task-123"
    task_dir = os.path.join(tmp_dir, task_id)
    os.makedirs(task_dir, exist_ok=True)
    
    metadata = {
        "workspace": "/mock/workspace",
        "files_in_context": [
            {"record_source": "test_tool", "path": "test.js"}
        ]
    }
    
    history = [
        {
            "role": "user",
            "id": "human-1",
            "content": "<task>Test task name</task>",
            "ts": 1000
        },
        {
            "role": "assistant",
            "content": [
                {"type": "text", "text": "I will help with that."},
                {"type": "tool_use", "name": "read_file", "input": {"path": "main.py"}}
            ],
            "ts": 1100
        }
    ]
    
    with open(os.path.join(task_dir, 'task_metadata.json'), 'w') as f:
        json.dump(metadata, f)
    with open(os.path.join(task_dir, 'api_conversation_history.json'), 'w') as f:
        json.dump(history, f)
        
    return task_id, task_dir

def verify():
    # We'll use a local 'tmp_test' dir instead of system HOME to avoid mess
    test_data_dir = os.path.join(os.getcwd(), "tmp_test_data")
    task_id, task_dir = setup_mock_data(test_data_dir)
    
    print(f"Verifying CodeMateAdapter with mock data at {test_data_dir}...")
    
    adapter = CodeMateAdapter()
    # Monkeypatch the tasks dir for testing
    import python_editor.adapters.codemate as cm_mod
    cm_mod.CODEMATE_TASKS_DIR = test_data_dir
    
    chats = adapter.get_chats()
    assert len(chats) == 1, "Should find 1 mock chat"
    chat = chats[0]
    assert chat.name == "Test task name"
    assert chat.bubble_count == 2
    
    messages = adapter.get_messages(chat)
    assert len(messages) == 2
    assert messages[0].role == "user"
    assert messages[1].role == "assistant"
    assert len(messages[1].tool_calls) == 1
    assert messages[1].tool_calls[0]['name'] == 'read_file'
    
    print("✅ Verification successful! Python port logic matches expected behavior.")
    
    # Cleanup
    shutil.rmtree(test_data_dir)

if __name__ == "__main__":
    verify()
