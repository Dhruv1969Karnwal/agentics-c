import threading
import queue
import time
import requests
import logging
from typing import List, Dict, Any

class AnalyticsClient:
    def __init__(self, backend_url: str = "http://localhost:8000/ingest/batch", batch_size: int = 5, flush_interval: int = 10, headers: Dict[str, str] = None):
        self.url = backend_url
        self.batch_size = batch_size
        self.flush_interval = flush_interval
        self.headers = headers or {}
        self.queue = queue.Queue()
        self.stop_event = threading.Event()
        self.worker_thread = threading.Thread(target=self._worker, daemon=True)
        self.worker_thread.start()

    def track(self, data: Dict[str, Any]):
        """Queue a record to be sent asynchronously."""
        self.queue.put(data)

    def _worker(self):
        batch = []
        last_flush = time.time()

        while not self.stop_event.is_set() or not self.queue.empty():
            try:
                # Wait for an item with a timeout to allow periodic flushing
                # If we're stopping, we should still process everything in the queue
                item = self.queue.get(timeout=1.0)
                batch.append(item)
                self.queue.task_done()
            except queue.Empty:
                pass

            now = time.time()
            if len(batch) >= self.batch_size or (batch and now - last_flush >= self.flush_interval):
                self._send_batch(batch)
                batch = []
                last_flush = now

        # Final flush on shutdown
        if batch:
            self._send_batch(batch)

    def _send_batch(self, batch: List[Dict[str, Any]]):
        print(f"  [Analytics] Attempting to send batch of {len(batch)} records to {self.url}...")
        try:
            response = requests.post(
                self.url, 
                json={"records": batch},
                headers=self.headers,
                timeout=15  # Increased timeout for batches
            )
            print(f"  [Analytics] Sent batch. Status Code: {response.status_code}")
            if response.status_code != 200:
                print(f"  [Analytics] Failed to send batch: {response.text}")
        except Exception as e:
            print(f"  [Analytics] Connection error: {e}")

    def shutdown(self):
        """Signal the worker to finish and stop."""
        print("  [Analytics] Shutting down client and flushing remaining records...")
        self.stop_event.set()
        if self.worker_thread.is_alive():
            # Wait longer for the worker to finish processing the queue
            self.worker_thread.join(timeout=15)
        print("  [Analytics] Shutdown complete.")
