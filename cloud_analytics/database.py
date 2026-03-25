import os
from sqlalchemy import create_engine, Column, Integer, String, Text, DateTime, JSON
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from datetime import datetime

# In a real app, this would come from a .env file via python-dotenv
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./analytics.db")

engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False} if "sqlite" in DATABASE_URL else {})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

class Chat(Base):
    __tablename__ = "chats"
    id = Column(String, primary_key=True)
    source = Column(String, nullable=False)
    name = Column(String)
    mode = Column(String)
    folder = Column(String)
    created_at = Column(Integer)
    last_updated_at = Column(Integer)
    encrypted = Column(Integer, default=0)
    bubble_count = Column(Integer, default=0)
    user_email = Column(String)
    _meta = Column(Text)

class ChatStats(Base):
    __tablename__ = "chat_stats"
    chat_id = Column(String, primary_key=True)
    total_messages = Column(Integer, default=0)
    user_messages = Column(Integer, default=0)
    assistant_messages = Column(Integer, default=0)
    tool_messages = Column(Integer, default=0)
    system_messages = Column(Integer, default=0)
    tool_calls = Column(Text, default='[]')
    models = Column(Text, default='[]')
    total_user_chars = Column(Integer, default=0)
    total_assistant_chars = Column(Integer, default=0)
    total_input_tokens = Column(Integer, default=0)
    total_output_tokens = Column(Integer, default=0)
    total_cache_read = Column(Integer, default=0)
    total_cache_write = Column(Integer, default=0)
    user_email = Column(String)
    analyzed_at = Column(Integer)

class Message(Base):
    __tablename__ = "messages"
    id = Column(Integer, primary_key=True, autoincrement=True)
    chat_id = Column(String, nullable=False)
    seq = Column(Integer, nullable=False)
    role = Column(String, nullable=False)
    content = Column(Text, nullable=False)
    model = Column(String)
    input_tokens = Column(Integer)
    output_tokens = Column(Integer)
    user_email = Column(String)

class ToolCall(Base):
    __tablename__ = "tool_calls"
    id = Column(Integer, primary_key=True, autoincrement=True)
    chat_id = Column(String, nullable=False)
    tool_name = Column(String, nullable=False)
    args_json = Column(Text, default='{}')
    source = Column(String)
    folder = Column(String)
    user_email = Column(String)
    timestamp = Column(Integer)

def init_db():
    Base.metadata.create_all(bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
