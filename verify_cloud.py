import time
import subprocess
import requests
import os
import sqlite3
from python_editor.analytics_client import AnalyticsClient

def verify_integration():
    print("--- Verifying Cloud Analytics Integration ---")
    
    # 1. Start the FastAPI backend in the background
    # Note: This assumes uvicorn is installed. If not, this might fail,
    # but we will attempt it as per standard web development workflow.
    backend_proc = subprocess.Popen(
        ["python", "-m", "uvicorn", "cloud_analytics.main:app", "--port", "8000"],
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE
    )
    
    print("Waiting for backend to start...")
    time.sleep(3) # Give it time to boot
    
    try:
        # 2. Use the client to send a batch
        client = AnalyticsClient(batch_size=2, flush_interval=2)
        print("Sending test records...")
        
        test_records = [
            {"source": "test", "composer_id": "c1", "name": "Chat 1", "bubble_count": 5, "metrics": {"tokens": 100}},
            {"source": "test", "composer_id": "c2", "name": "Chat 2", "bubble_count": 3, "metrics": {"tokens": 50}},
        ]
        
        for r in test_records:
            client.track(r)
            
        print("Waiting for batch flush...")
        time.sleep(5)
        client.shutdown()
        
        # 3. Check the SQLite database directly to verify persistence
        db_path = "analytics.db"
        if os.path.exists(db_path):
            conn = sqlite3.connect(db_path)
            cursor = conn.cursor()
            cursor.execute("SELECT count(*) FROM analytics_records")
            count = cursor.fetchone()[0]
            print(f"Verified: {count} records found in database.")
            conn.close()
            
            if count >= 2:
                print("✅ Integration test passed!")
            else:
                print("❌ Integration test failed: Records not found.")
        else:
            print("❌ Integration test failed: Database file not created.")
            
    finally:
        backend_proc.terminate()
        try:
            backend_proc.wait(timeout=5)
        except:
            backend_proc.kill()

if __name__ == "__main__":
    verify_integration()
