import os
import json
import re
from typing import List, Dict, Any, Optional
from .base import BaseAdapter
from ..models import Chat, Message

ADAPTER_NAME = 'codemate-agent'
LABELS = {ADAPTER_NAME: 'CodeMate Agent'}
CHARS_PER_TOKEN = 4
SYSTEM_PROMPT_TOKENS = 25000

# This would ideally be localized or passed in, but hardcoded for now as per JS
CODEMATE_TASKS_DIR = os.path.join(
    os.path.expanduser("~"),
    'Desktop',
    'CodeMate.AI',
    'extra_research',
    'agentlytics',
    'extra_data'
)

class CodeMateAdapter(BaseAdapter):
    @property
    def name(self) -> str:
        return ADAPTER_NAME

    @property
    def labels(self) -> Dict[str, str]:
        return LABELS

    def get_chats(self) -> List[Chat]:
        if not os.path.exists(CODEMATE_TASKS_DIR):
            return []

        try:
            task_ids = os.listdir(CODEMATE_TASKS_DIR)
        except Exception:
            return []

        chats = []
        for task_id in task_ids:
            task_dir = os.path.join(CODEMATE_TASKS_DIR, task_id)
            if not os.path.isdir(task_dir):
                continue

            metadata_path = os.path.join(task_dir, 'task_metadata.json')
            history_path = os.path.join(task_dir, 'api_conversation_history.json')

            if not os.path.exists(metadata_path) or not os.path.exists(history_path):
                continue

            metadata = self._read_json_file(metadata_path)
            history = self._read_json_file(history_path)

            if not isinstance(history, list) or len(history) == 0:
                continue

            bubble_count = len([m for m in history if self._classify_role(m) in ('user', 'assistant')])
            if bubble_count == 0:
                continue

            first_ts = history[0].get('ts')
            last_ts = history[-1].get('ts', first_ts)

            chats.append(Chat(
                source=ADAPTER_NAME,
                composer_id=task_id,
                name=self._extract_chat_name(history),
                created_at=first_ts,
                last_updated_at=last_ts,
                mode='agent',
                folder=metadata.get('workspace') if metadata else None,
                bubble_count=bubble_count,
                _task_dir=task_dir,
                _metadata=metadata or {}
            ))
        
        return chats

    def get_messages(self, chat: Chat) -> List[Message]:
        task_dir = chat._task_dir
        if not task_dir or not os.path.exists(task_dir):
            return []

        history_path = os.path.join(task_dir, 'api_conversation_history.json')
        history = self._read_json_file(history_path)
        if not isinstance(history, list):
            return []

        result = []
        prior_tokens = 0
        first_user_turn_seen = False
        metadata_tool_calls_attached = False
        metadata = chat._metadata

        for msg in history:
            role = self._classify_role(msg)
            if not role:
                continue

            text_content = self._extract_text_content(msg.get('content'), role == 'user')
            if not text_content:
                continue

            embedded_usage = self._extract_embedded_usage(msg)
            char_count = len(text_content)

            turn_tokens = 0
            if embedded_usage:
                turn_tokens = embedded_usage['output_tokens'] if role == 'assistant' else embedded_usage['input_tokens']
            else:
                turn_tokens = round(char_count / CHARS_PER_TOKEN)

            message_obj = Message(
                role=role,
                content=text_content,
                model=msg.get('model', 'code-complete')
            )

            if role == 'user':
                is_first_user_turn = not first_user_turn_seen
                first_user_turn_seen = True

                if embedded_usage:
                    message_obj.input_tokens = embedded_usage['input_tokens']
                    if embedded_usage.get('cache_read', 0) > 0:
                        message_obj.cache_read = embedded_usage['cache_read']
                    if embedded_usage.get('cache_write', 0) > 0:
                        message_obj.cache_write = embedded_usage['cache_write']
                else:
                    cache_tokens = self._estimate_cache_tokens(turn_tokens, prior_tokens, is_first_user_turn)
                    message_obj.input_tokens = turn_tokens
                    message_obj.cache_read = cache_tokens['cache_read']
                    message_obj.cache_write = cache_tokens['cache_write']

            elif role == 'tool':
                message_obj.input_tokens = embedded_usage['input_tokens'] if embedded_usage else turn_tokens

            else:  # assistant
                message_obj.output_tokens = embedded_usage['output_tokens'] if embedded_usage else turn_tokens
                
                inline_calls = self._extract_tool_calls(msg.get('content'))
                if inline_calls:
                    message_obj.tool_calls = inline_calls
                elif not metadata_tool_calls_attached:
                    meta_calls = self._extract_metadata_tool_calls(metadata)
                    if meta_calls:
                        message_obj.tool_calls = meta_calls
                        metadata_tool_calls_attached = True

            prior_tokens += turn_tokens
            result.append(message_obj)

        return result

    def _classify_role(self, msg: Dict[str, Any]) -> Optional[str]:
        role = msg.get('role')
        if role == 'assistant': return 'assistant'
        if role == 'user': return 'user' if msg.get('id') else 'tool'
        return None

    def _read_json_file(self, file_path: str) -> Any:
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                return json.load(f)
        except Exception:
            return None

    def _extract_text_content(self, content: Any, only_first_part: bool = False) -> str:
        if isinstance(content, str):
            return content.strip()
        if not isinstance(content, list):
            return ""
        
        text_parts = [part.get('text', '') for part in content if part.get('type') == 'text' and isinstance(part.get('text'), str)]
        
        if only_first_part and text_parts:
            return text_parts[0].strip()
        
        return "\n".join(text_parts).strip()

    def _extract_tool_calls(self, content: Any) -> List[Dict[str, Any]]:
        if not isinstance(content, list):
            return []
        return [{"name": p['name'], "args": p.get('input', {})} for p in content if p.get('type') == 'tool_use' and p.get('name')]

    def _extract_chat_name(self, history: List[Dict[str, Any]]) -> Optional[str]:
        for msg in history:
            if self._classify_role(msg) != 'user':
                continue
            text = self._extract_text_content(msg.get('content'))
            match = re.search(r'<task>([\s\S]*?)</task>', text)
            if match:
                return match.group(1).strip()[:120]
        return None

    def _extract_metadata_tool_calls(self, metadata: Dict[str, Any]) -> List[Dict[str, Any]]:
        files = metadata.get('files_in_context')
        if not isinstance(files, list):
            return []
        return [{"name": f['record_source'], "args": {}} for f in files if isinstance(f.get('record_source'), str)]

    def _extract_embedded_usage(self, msg: Dict[str, Any]) -> Optional[Dict[str, int]]:
        usage = msg.get('usage') or msg.get('apiUsage')
        if not isinstance(usage, dict):
            return None
        return {
            "input_tokens": usage.get('input_tokens') or usage.get('inputTokens') or 0,
            "output_tokens": usage.get('output_tokens') or usage.get('outputTokens') or 0,
            "cache_read": usage.get('cache_read_input_tokens') or usage.get('cacheReadInputTokens') or 0,
            "cache_write": usage.get('cache_creation_input_tokens') or usage.get('cacheWriteInputTokens') or 0,
        }

    def _estimate_cache_tokens(self, turn_tokens: int, prior_tokens: int, is_first_user_turn: bool) -> Dict[str, int]:
        if is_first_user_turn:
            input_tokens = SYSTEM_PROMPT_TOKENS + turn_tokens
            return {"input_tokens": input_tokens, "cache_read": 0, "cache_write": input_tokens}
        
        cache_read = SYSTEM_PROMPT_TOKENS + prior_tokens
        return {"input_tokens": cache_read + turn_tokens, "cache_read": cache_read, "cache_write": turn_tokens}
