import requests
import json
import uvicorn
from fastapi import FastAPI, Depends, Header, HTTPException
from sqlalchemy.orm import Session
from typing import List, Dict, Any
from pydantic import BaseModel
from database import init_db, get_db, Chat, ChatStats, Message, ToolCall, Meta

app = FastAPI(title="Agentlytics Cloud Backend")

IDENTIY_API_URL = "https://api.identity.codemate.ai/user/uuid"

def get_user_email(x_session: str = Header("db584093-d905-49ef-9448-c8c02b521d15")):
    try:
        response = requests.get(IDENTIY_API_URL, headers={"x-session": x_session}, timeout=5)
        user_data = response.json()
        
        email = user_data.get("email", None)
        if not email:
            email = "karnwaldhruv84@gmail.com"
            return email
            # raise HTTPException(status_code=401, detail="User personal information not found")
            
        return email
    except Exception as e:
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(status_code=500, detail=f"Identity service error: {str(e)}")

# Initialize DB on startup
@app.on_event("startup")
def startup_event():
    init_db()

class AnalyticsRecord(BaseModel):
    chat: Dict[str, Any]
    stats: Dict[str, Any]
    messages: List[Dict[str, Any]]
    tool_calls: List[Dict[str, Any]]

class AnalyticsBatch(BaseModel):
    records: List[AnalyticsRecord]

@app.get("/health")
def health_check():
    return {"status": "ok"}

@app.post("/ingest/batch")
def ingest_batch(batch: AnalyticsBatch, db: Session = Depends(get_db), email: str = Depends(get_user_email)):
    for entry in batch.records:
        # 1. Insert/Update Chat
        c = entry.chat
        chat_obj = Chat(
            id=c['id'],
            source=c['source'],
            name=c.get('name'),
            mode=c.get('mode'),
            folder=c.get('folder'),
            created_at=c.get('created_at'),
            last_updated_at=c.get('last_updated_at'),
            encrypted=c.get('encrypted', 0),
            bubble_count=c.get('bubble_count', 0),
            user_email=email,
            _meta=json.dumps(c.get('_meta', {})) if isinstance(c.get('_meta'), dict) else c.get('_meta')
        )
        db.merge(chat_obj)
        
        # 2. Insert/Update Stats
        s = entry.stats
        stats_obj = ChatStats(
            chat_id=c['id'],
            total_messages=s.get('total_messages', 0),
            user_messages=s.get('user_messages', 0),
            assistant_messages=s.get('assistant_messages', 0),
            tool_messages=s.get('tool_messages', 0),
            system_messages=s.get('system_messages', 0),
            tool_calls=json.dumps(s.get('tool_calls', [])),
            models=json.dumps(s.get('models', [])),
            total_user_chars=s.get('total_user_chars', 0),
            total_assistant_chars=s.get('total_assistant_chars', 0),
            total_input_tokens=s.get('total_input_tokens', 0),
            total_output_tokens=s.get('total_output_tokens', 0),
            total_cache_read=s.get('total_cache_read', 0),
            total_cache_write=s.get('total_cache_write', 0),
            user_email=email,
            analyzed_at=s.get('analyzed_at')
        )
        db.merge(stats_obj)

        # 3. Insert Messages
        db.query(Message).filter(Message.chat_id == c['id']).delete()
        for i, m in enumerate(entry.messages):
            msg_obj = Message(
                chat_id=c['id'],
                seq=m.get('seq', i),
                role=m['role'],
                content=m['content'],
                model=m.get('model'),
                input_tokens=m.get('input_tokens'),
                output_tokens=m.get('output_tokens'),
                user_email=email
            )
            db.add(msg_obj)

        # 4. Insert Tool Calls
        db.query(ToolCall).filter(ToolCall.chat_id == c['id']).delete()
        for tc in entry.tool_calls:
            tc_obj = ToolCall(
                chat_id=c['id'],
                tool_name=tc['tool_name'],
                args_json=json.dumps(tc.get('args', {})),
                source=tc.get('source'),
                folder=tc.get('folder'),
                user_email=email,
                timestamp=tc.get('timestamp')
            )
            db.add(tc_obj)

    db.commit()
    return {"status": "success", "count": len(batch.records), "user": email}

@app.get("/analytics")
def get_analytics(db: Session = Depends(get_db)):
    # Returns chats with their stats
    results = db.query(Chat).all()
    return results

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
