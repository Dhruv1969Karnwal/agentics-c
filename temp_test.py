import sys
import os
import time

# Add the project root to sys.path
sys.path.append(os.getcwd())

from python_editor.main import process_incremental_analytics

# Test parameters
folder_id = "2a855a15-94f7-4049-b969-bdc741c0a0af"
new_id = "cde09a58-9971-469d-95bf-3c71be7286e6123456"

print(f"Triggering incremental analytics for folder {folder_id} and ID {new_id}...")
result = process_incremental_analytics(folder_id, new_id)

if result:
    print("DONE")
    # print("Function execution complete.")
    # print(f"Delta Stats: {result['delta']}")
    # print(f"New Messages: {len(result['messages'])}")
    # print("\n[Test] Waiting for background cloud sync thread to finish...")
    time.sleep(5)
else:
    print("Function failed to return a result.")