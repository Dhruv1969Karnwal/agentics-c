from dataclasses import dataclass, field
from typing import List, Optional, Dict, Any

@dataclass
class Message:
    role: str  # 'user' | 'assistant' | 'system' | 'tool'
    content: str
    id: Optional[str] = None
    model: Optional[str] = None
    input_tokens: Optional[int] = None
    output_tokens: Optional[int] = None
    cache_read: Optional[int] = None
    cache_write: Optional[int] = None
    tool_calls: List[Dict[str, Any]] = field(default_factory=list)

@dataclass
class Chat:
    source: str
    composer_id: str
    name: Optional[str] = None
    created_at: Optional[int] = None
    last_updated_at: Optional[int] = None
    mode: str = 'agent'
    folder: Optional[str] = None
    bubble_count: int = 0
    _task_dir: Optional[str] = None
    _metadata: Dict[str, Any] = field(default_factory=dict)
