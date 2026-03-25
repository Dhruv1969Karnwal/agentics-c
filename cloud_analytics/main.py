import requests
import json
import uvicorn
from fastapi import FastAPI, Depends, Header, HTTPException
from sqlalchemy.orm import Session
from typing import List, Dict, Any, Optional
from pydantic import BaseModel
from database import init_db, get_db, Chat, ChatStats, Message, ToolCall

from datetime import datetime
from contextlib import asynccontextmanager
from sqlalchemy import func, desc, and_, cast, Integer, String

@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    yield

app = FastAPI(title="Agentlytics Cloud Backend", lifespan=lifespan)

IDENTIY_API_URL = "https://api.identity.codemate.ai/user/uuid"

def get_user_email(x_session: str = Header("db584093-d905-49ef-9448-c8c02b521d15")):
    try:
        response = requests.get(IDENTIY_API_URL, headers={"x-session": x_session}, timeout=5)
        user_data = response.json()
        
        email = user_data.get("email", None)
        if not email:
            email = "karnwaldhruv84@gmail.com"
            return email
            
        return email
    except Exception as e:
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(status_code=500, detail=f"Identity service error: {str(e)}")

# Helper for date range filtering
def apply_date_filter(query, model, date_from: Optional[int] = None, date_to: Optional[int] = None):
    # Use COALESCE(last_updated_at, created_at)
    ts_expr = func.coalesce(model.last_updated_at, model.created_at)
    if date_from:
        query = query.filter(ts_expr >= date_from)
    if date_to:
        query = query.filter(ts_expr <= date_to)
    return query

@app.get("/api/overview")
def get_overview(
    editor: Optional[str] = None, 
    folder: Optional[str] = None,
    dateFrom: Optional[int] = None,
    dateTo: Optional[int] = None,
    db: Session = Depends(get_db), 
    email: str = Depends(get_user_email)
):
    # Base query filtered by user email
    base_q = db.query(Chat).filter(Chat.user_email == email)
    if editor: base_q = base_q.filter(Chat.source == editor)
    if folder: base_q = base_q.filter(Chat.folder == folder)
    base_q = apply_date_filter(base_q, Chat, dateFrom, dateTo)

    total_chats = base_q.count()
    
    # Editors breakdown
    editors_q = db.query(Chat.source, func.count(Chat.id).label('count'))\
        .filter(Chat.user_email == email)
    if folder: editors_q = editors_q.filter(Chat.folder == folder)
    editors = editors_q.group_by(Chat.source).order_by(desc('count')).all()
    
    # Modes breakdown
    modes_q = db.query(Chat.mode, func.count(Chat.id).label('count'))\
        .filter(Chat.user_email == email)\
        .filter(Chat.mode.is_not(None))
    if editor: modes_q = modes_q.filter(Chat.source == editor)
    if folder: modes_q = modes_q.filter(Chat.folder == folder)
    modes_q = apply_date_filter(modes_q, Chat, dateFrom, dateTo)
    modes = modes_q.group_by(Chat.mode).all()
    
    # By Month
    # SQLite specific date formatting
    month_expr = func.substr(func.date(func.coalesce(Chat.last_updated_at, Chat.created_at)/1000, 'unixepoch'), 1, 7)
    month_q = db.query(month_expr.label('month'), Chat.source, func.count(Chat.id).label('count'))\
        .filter(Chat.user_email == email)\
        .filter(Chat.last_updated_at.is_not(None))
    if editor: month_q = month_q.filter(Chat.source == editor)
    if folder: month_q = month_q.filter(Chat.folder == folder)
    month_q = apply_date_filter(month_q, Chat, dateFrom, dateTo)
    month_rows = month_q.group_by('month', Chat.source).order_by('month').all()
    
    month_map = {}
    for r in month_rows:
        if r.month not in month_map:
            month_map[r.month] = {"month": r.month, "count": 0, "editors": {}}
        month_map[r.month]["count"] += r.count
        month_map[r.month]["editors"][r.source] = r.count
    
    # Top Projects
    projects_q = db.query(Chat.folder, func.count(Chat.id).label('count'))\
        .filter(Chat.user_email == email)\
        .filter(Chat.folder.is_not(None))
    if editor: projects_q = projects_q.filter(Chat.source == editor)
    projects_q = apply_date_filter(projects_q, Chat, dateFrom, dateTo)
    projects = projects_q.group_by(Chat.folder).order_by(desc('count')).limit(20).all()
    
    project_list = []
    for p in projects:
        if not p.folder: continue
        ed_q = db.query(Chat.source, func.count(Chat.id))\
            .filter(Chat.user_email == email, Chat.folder == p.folder)
        ed_q = apply_date_filter(ed_q, Chat, dateFrom, dateTo)
        ed_rows = ed_q.group_by(Chat.source).all()
        project_list.append({
            "name": "/".join(p.folder.replace("\\", "/").split("/")[-2:]),
            "fullPath": p.folder,
            "count": p.count,
            "editors": {r[0]: r[1] for r in ed_rows}
        })

    # Oldest/Newest
    ts_expr = func.coalesce(Chat.last_updated_at, Chat.created_at)
    time_bounds = db.query(func.min(ts_expr), func.max(ts_expr))\
        .filter(Chat.user_email == email)
    if editor: time_bounds = time_bounds.filter(Chat.source == editor)
    if folder: time_bounds = time_bounds.filter(Chat.folder == folder)
    time_bounds = apply_date_filter(time_bounds, Chat, dateFrom, dateTo)
    oldest, newest = time_bounds.first()

    return {
        "totalChats": total_chats,
        "editors": [{"id": e.source, "count": e.count} for e in editors],
        "byMode": {m.mode: m.count for m in modes},
        "byMonth": sorted(month_map.values(), key=lambda x: x["month"]),
        "topProjects": project_list,
        "oldestChat": oldest,
        "newestChat": newest
    }

@app.get("/api/chats")
def get_chats(
    editor: Optional[str] = None,
    folder: Optional[str] = None,
    limit: int = 50,
    offset: int = 0,
    named: bool = True,
    dateFrom: Optional[int] = None,
    dateTo: Optional[int] = None,
    db: Session = Depends(get_db),
    email: str = Depends(get_user_email)
):
    query = db.query(Chat, ChatStats.models).join(ChatStats, Chat.id == ChatStats.chat_id)\
        .filter(Chat.user_email == email)
    
    if editor: query = query.filter(Chat.source == editor)
    if folder: query = query.filter(Chat.folder == folder)
    if named:
        query = query.filter((Chat.name.is_not(None)) | (Chat.bubble_count > 0))
    
    query = apply_date_filter(query, Chat, dateFrom, dateTo)
    
    total = query.count()
    chats = query.order_by(desc(func.coalesce(Chat.last_updated_at, Chat.created_at)))\
        .offset(offset).limit(limit).all()
    
    result_list = []
    for c, models_json in chats:
        # Replicate top_model logic
        top_model = None
        try:
            models = json.loads(models_json) if models_json else []
            if models:
                from collections import Counter
                top_model = Counter(models).most_common(1)[0][0]
        except: pass
        
        result_list.append({
            "id": c.id,
            "source": c.source,
            "name": c.name,
            "mode": c.mode,
            "folder": c.folder,
            "created_at": c.created_at,
            "last_updated_at": c.last_updated_at,
            "encrypted": c.encrypted,
            "bubble_count": c.bubble_count,
            "topModel": top_model
        })
        
    return {"chats": result_list, "total": total}

@app.get("/api/chats/{chat_id}")
def get_chat_detail(chat_id: str, db: Session = Depends(get_db), email: str = Depends(get_user_email)):
    chat = db.query(Chat).filter(Chat.id == chat_id, Chat.user_email == email).first()
    if not chat:
        raise HTTPException(status_code=404, detail="Chat not found")
    
    stats = db.query(ChatStats).filter(ChatStats.chat_id == chat_id).first()
    messages = db.query(Message).filter(Message.chat_id == chat_id).order_by(Message.seq).all()
    tool_calls = db.query(ToolCall).filter(ToolCall.chat_id == chat_id).order_by(ToolCall.id).all()
    
    return {
        "id": chat.id,
        "source": chat.source,
        "name": chat.name,
        "mode": chat.mode,
        "folder": chat.folder,
        "created_at": chat.created_at,
        "last_updated_at": chat.last_updated_at,
        "encrypted": bool(chat.encrypted),
        "messages": [{"role": m.role, "content": m.content, "model": m.model} for m in messages],
        "stats": {
            "totalMessages": stats.total_messages if stats else 0,
            "userMessages": stats.user_messages if stats else 0,
            "assistantMessages": stats.assistant_messages if stats else 0,
            "toolMessages": stats.tool_messages if stats else 0,
            "systemMessages": stats.system_messages if stats else 0,
            "toolCalls": json.loads(stats.tool_calls) if stats and stats.tool_calls else [],
            "models": json.loads(stats.models) if stats and stats.models else [],
            "totalUserChars": stats.total_user_chars if stats else 0,
            "totalAssistantChars": stats.total_assistant_chars if stats else 0,
            "totalInputTokens": stats.total_input_tokens if stats else 0,
            "totalOutputTokens": stats.total_output_tokens if stats else 0,
            "totalCacheRead": stats.total_cache_read if stats else 0,
            "totalCacheWrite": stats.total_cache_write if stats else 0,
        } if stats else None,
        "toolCallDetails": [{"name": tc.tool_name, "args": json.loads(tc.args_json)} for tc in tool_calls]
    }

@app.get("/api/daily-activity")
def get_daily_activity(
    editor: Optional[str] = None,
    dateFrom: Optional[int] = None,
    dateTo: Optional[int] = None,
    db: Session = Depends(get_db),
    email: str = Depends(get_user_email)
):
    # Group by day, source, and hour
    day_expr = func.date(func.coalesce(Chat.last_updated_at, Chat.created_at)/1000, 'unixepoch', 'localtime')
    hour_expr = cast(func.strftime('%H', func.datetime(func.coalesce(Chat.last_updated_at, Chat.created_at)/1000, 'unixepoch', 'localtime')), Integer)
    
    query = db.query(day_expr.label('day'), Chat.source, hour_expr.label('hour'), func.count(Chat.id).label('count'))\
        .filter(Chat.user_email == email)\
        .filter((Chat.last_updated_at.is_not(None)) | (Chat.created_at.is_not(None)))
    
    if editor: query = query.filter(Chat.source == editor)
    query = apply_date_filter(query, Chat, dateFrom, dateTo)
    
    rows = query.group_by('day', Chat.source, 'hour').order_by('day').all()
    
    daily = {}
    for r in rows:
        if r.day not in daily:
            daily[r.day] = {"day": r.day, "total": 0, "editors": {}, "hours": {}}
        daily[r.day]["total"] += r.count
        daily[r.day]["editors"][r.source] = daily[r.day]["editors"].get(r.source, 0) + r.count
        if r.source not in daily[r.day]["hours"]:
            daily[r.day]["hours"][r.source] = [0] * 24
        daily[r.day]["hours"][r.source][r.hour] += r.count
        
    return sorted(daily.values(), key=lambda x: x["day"])

@app.get("/api/deep-analytics")
def get_deep_analytics(
    editor: Optional[str] = None,
    folder: Optional[str] = None,
    limit: Optional[int] = None,
    dateFrom: Optional[int] = None,
    dateTo: Optional[int] = None,
    db: Session = Depends(get_db),
    email: str = Depends(get_user_email)
):
    query = db.query(ChatStats).join(Chat, Chat.id == ChatStats.chat_id)\
        .filter(Chat.user_email == email)
    
    if editor: query = query.filter(Chat.source == editor)
    if folder: query = query.filter(Chat.folder == folder)
    query = apply_date_filter(query, Chat, dateFrom, dateTo)
    
    if limit: query = query.limit(limit)
    
    rows = query.all()
    
    tool_freq = {}
    model_freq = {}
    total_messages = 0
    total_user_chars = 0
    total_assistant_chars = 0
    total_tool_calls = 0
    total_input_tokens = 0
    total_output_tokens = 0
    total_cache_read = 0
    total_cache_write = 0
    
    for r in rows:
        total_messages += r.total_messages
        total_user_chars += r.total_user_chars
        total_assistant_chars += r.total_assistant_chars
        total_input_tokens += r.total_input_tokens
        total_output_tokens += r.total_output_tokens
        total_cache_read += r.total_cache_read
        total_cache_write += r.total_cache_write
        
        try:
            tools = json.loads(r.tool_calls)
            for t in tools:
                tool_freq[t] = tool_freq.get(t, 0) + 1
                total_tool_calls += 1
        except: pass
        
        try:
            models = json.loads(r.models)
            for m in models:
                model_freq[m] = model_freq.get(m, 0) + 1
        except: pass

    # Token estimation if zero
    tokens_estimated = False
    if total_input_tokens == 0 and total_output_tokens == 0 and (total_user_chars > 0 or total_assistant_chars > 0):
        total_input_tokens = round(total_user_chars / 4)
        total_output_tokens = round(total_assistant_chars / 4)
        tokens_estimated = True

    return {
        "analyzedChats": len(rows),
        "totalMessages": total_messages,
        "totalToolCalls": total_tool_calls,
        "totalUserChars": total_user_chars,
        "totalAssistantChars": total_assistant_chars,
        "totalInputTokens": total_input_tokens,
        "totalOutputTokens": total_output_tokens,
        "tokensEstimated": tokens_estimated,
        "totalCacheRead": total_cache_read,
        "totalCacheWrite": total_cache_write,
        "topTools": [{"name": n, "count": c} for n, c in sorted(tool_freq.items(), key=lambda x: x[1], reverse=True)[:30]],
        "topModels": [{"name": n, "count": c} for n, c in sorted(model_freq.items(), key=lambda x: x[1], reverse=True)[:20]]
    }

@app.get("/api/dashboard-stats")
def get_dashboard_stats(
    editor: Optional[str] = None,
    folder: Optional[str] = None,
    dateFrom: Optional[int] = None,
    dateTo: Optional[int] = None,
    db: Session = Depends(get_db),
    email: str = Depends(get_user_email)
):
    # Filter for Chat components
    chat_filter = [Chat.user_email == email]
    if editor: chat_filter.append(Chat.source == editor)
    if folder: chat_filter.append(Chat.folder == folder)
    
    # Filter for Stats components (those that join with Chat)
    # We'll use apply_date_filter on queries later

    # 1. Hourly distribution
    hour_expr = cast(func.strftime('%H', func.datetime(func.coalesce(Chat.last_updated_at, Chat.created_at)/1000, 'unixepoch', 'localtime')), Integer)
    hourly_q = db.query(hour_expr.label('hour'), func.count(Chat.id).label('count')).filter(*chat_filter)
    hourly_q = apply_date_filter(hourly_q, Chat, dateFrom, dateTo)
    hourly_rows = hourly_q.group_by('hour').all()
    hourly = [0] * 24
    for r in hourly_rows: hourly[r.hour] = r.count

    # 2. Weekday distribution (0=Sunday, 6=Saturday)
    dow_expr = cast(func.strftime('%w', func.datetime(func.coalesce(Chat.last_updated_at, Chat.created_at)/1000, 'unixepoch', 'localtime')), Integer)
    weekday_q = db.query(dow_expr.label('dow'), func.count(Chat.id).label('count')).filter(*chat_filter)
    weekday_q = apply_date_filter(weekday_q, Chat, dateFrom, dateTo)
    weekday_rows = weekday_q.group_by('dow').all()
    weekdays = [0] * 7
    for r in weekday_rows: weekdays[r.dow] = r.count

    # 3. Session depth
    depth_q = db.query(ChatStats.total_messages).join(Chat, Chat.id == ChatStats.chat_id).filter(*chat_filter)
    depth_q = apply_date_filter(depth_q, Chat, dateFrom, dateTo)
    depth_rows = depth_q.filter(ChatStats.total_messages > 0).all()
    depth_buckets = { '1': 0, '2-5': 0, '6-10': 0, '11-20': 0, '21-50': 0, '51-100': 0, '100+': 0 }
    for r in depth_rows:
        m = r[0]
        if m <= 1: depth_buckets['1'] += 1
        elif m <= 5: depth_buckets['2-5'] += 1
        elif m <= 10: depth_buckets['6-10'] += 1
        elif m <= 20: depth_buckets['11-20'] += 1
        elif m <= 50: depth_buckets['21-50'] += 1
        elif m <= 100: depth_buckets['51-100'] += 1
        else: depth_buckets['100+'] += 1

    # 4. Token economy
    token_q = db.query(
        func.sum(ChatStats.total_input_tokens).label('input'),
        func.sum(ChatStats.total_output_tokens).label('output'),
        func.sum(ChatStats.total_cache_read).label('cacheRead'),
        func.sum(ChatStats.total_cache_write).label('cacheWrite'),
        func.sum(ChatStats.total_user_chars).label('userChars'),
        func.sum(ChatStats.total_assistant_chars).label('assistantChars'),
        func.count(ChatStats.chat_id).label('sessions')
    ).join(Chat, Chat.id == ChatStats.chat_id).filter(*chat_filter)
    token_q = apply_date_filter(token_q, Chat, dateFrom, dateTo)
    token_row = token_q.first()

    # 5. Streaks
    day_expr = func.date(func.coalesce(Chat.last_updated_at, Chat.created_at)/1000, 'unixepoch', 'localtime')
    streak_q = db.query(day_expr.label('day')).filter(*chat_filter).distinct().order_by('day')
    streak_q = apply_date_filter(streak_q, Chat, dateFrom, dateTo)
    streak_rows = [r.day for r in streak_q.all()]
    
    curr_streak, long_streak, total_days = 0, 0, len(streak_rows)
    if streak_rows:
        from datetime import datetime, timedelta
        # Longest streak
        temp = 1
        for i in range(1, len(streak_rows)):
            d1 = datetime.strptime(streak_rows[i-1], '%Y-%m-%d')
            d2 = datetime.strptime(streak_rows[i], '%Y-%m-%d')
            if (d2 - d1).days == 1: temp += 1
            else: long_streak = max(long_streak, temp); temp = 1
        long_streak = max(long_streak, temp)
        
        # Current streak
        last_day = datetime.strptime(streak_rows[-1], '%Y-%m-%d')
        today = datetime.now()
        if (today - last_day).days <= 1:
            curr_streak = 1
            for i in range(len(streak_rows)-2, -1, -1):
                d1 = datetime.strptime(streak_rows[i], '%Y-%m-%d')
                d2 = datetime.strptime(streak_rows[i+1], '%Y-%m-%d')
                if (d2 - d1).days == 1: curr_streak += 1
                else: break

    # 6. Monthly trend
    month_expr = func.substr(func.date(func.coalesce(Chat.last_updated_at, Chat.created_at)/1000, 'unixepoch'), 1, 7)
    trend_q = db.query(month_expr.label('month'), Chat.source, func.count(Chat.id).label('count'))\
        .filter(*chat_filter)
    trend_q = apply_date_filter(trend_q, Chat, dateFrom, dateTo)
    trend_rows = trend_q.group_by('month', Chat.source).order_by('month').all()
    
    month_editors = {}
    sources = set()
    for r in trend_rows:
        if r.month not in month_editors: month_editors[r.month] = {}
        month_editors[r.month][r.source] = r.count
        sources.add(r.source)

    # 7. Velocity
    vel_q = db.query(
        month_expr.label('month'),
        func.avg(ChatStats.total_messages).label('avgMsgs'),
        func.avg(ChatStats.total_input_tokens + ChatStats.total_output_tokens).label('avgTokens')
    ).join(Chat, Chat.id == ChatStats.chat_id).filter(*chat_filter)
    vel_q = apply_date_filter(vel_q, Chat, dateFrom, dateTo)
    vel_rows = vel_q.group_by('month').order_by('month').all()

    # 8. Models and Tools (Top ones for dashboard)
    # Similar to deep-analytics but specifically for dashboard
    # We'll just reuse the deep-analytics logic if needed or keep it simple
    model_rows = db.query(ChatStats.models).join(Chat, Chat.id == ChatStats.chat_id).filter(*chat_filter)
    model_rows = apply_date_filter(model_rows, Chat, dateFrom, dateTo).all()
    model_freq = {}
    for r in model_rows:
        try:
            for m in json.loads(r[0]): model_freq[m] = model_freq.get(m, 0) + 1
        except: pass
    
    tool_rows = db.query(ChatStats.tool_calls).join(Chat, Chat.id == ChatStats.chat_id).filter(*chat_filter)
    tool_rows = apply_date_filter(tool_rows, Chat, dateFrom, dateTo).all()
    tool_freq = {}
    total_tools = 0
    for r in tool_rows:
        try:
            for t in json.loads(r[0]):
                tool_freq[t] = tool_freq.get(t, 0) + 1
                total_tools += 1
        except: pass

    # Token estimation
    in_t, out_t = token_row.input or 0, token_row.output or 0
    estimated = False
    if in_t == 0 and out_t == 0 and ((token_row.userChars or 0) > 0):
        in_t = round(token_row.userChars / 4)
        out_t = round(token_row.assistantChars / 4)
        estimated = True

    return {
        "hourly": hourly,
        "weekdays": weekdays,
        "depthBuckets": depth_buckets,
        "tokens": {
            "input": in_t,
            "output": out_t,
            "cacheRead": token_row.cacheRead or 0,
            "cacheWrite": token_row.cacheWrite or 0,
            "userChars": token_row.userChars or 0,
            "assistantChars": token_row.assistantChars or 0,
            "sessions": token_row.sessions or 0,
            "estimated": estimated
        },
        "streaks": {"current": curr_streak, "longest": long_streak, "totalDays": total_days},
        "monthlyTrend": {"months": sorted(month_editors.keys()), "sources": sorted(list(sources)), "data": month_editors},
        "velocity": [{"month": r.month, "avgMsgs": round(r.avgMsgs, 1), "avgTokens": round(r.avgTokens)} for r in vel_rows],
        "topModels": [{"name": n, "count": c} for n, c in sorted(model_freq.items(), key=lambda x: x[1], reverse=True)[:10]],
        "topTools": [{"name": n, "count": c} for n, c in sorted(tool_freq.items(), key=lambda x: x[1], reverse=True)[:8]],
        "totalToolCalls": total_tools
    }

@app.get("/api/projects")
def get_projects(
    dateFrom: Optional[int] = None,
    dateTo: Optional[int] = None,
    db: Session = Depends(get_db),
    email: str = Depends(get_user_email)
):
    # This is a bit complex as it aggregates by folder
    # We'll first get unique folders and then compute stats for each
    folders = db.query(Chat.folder).filter(Chat.user_email == email).filter(Chat.folder.is_not(None)).distinct().all()
    
    results = []
    for (folder,) in folders:
        # Get sessions count per editor for this folder
        editors = db.query(Chat.source, func.count(Chat.id)).filter(Chat.user_email == email, Chat.folder == folder)
        editors = apply_date_filter(editors, Chat, dateFrom, dateTo).group_by(Chat.source).all()
        if not editors: continue # No sessions in this folder for the given date range
        
        # Aggregate stats
        stats = db.query(
            func.count(Chat.id).label('totalSessions'),
            func.min(func.coalesce(Chat.last_updated_at, Chat.created_at)).label('firstSeen'),
            func.max(func.coalesce(Chat.last_updated_at, Chat.created_at)).label('lastSeen'),
            func.sum(ChatStats.total_messages).label('totalMessages'),
            func.sum(ChatStats.total_input_tokens).label('totalInputTokens'),
            func.sum(ChatStats.total_output_tokens).label('totalOutputTokens'),
            func.sum(ChatStats.total_user_chars).label('totalUserChars'),
            func.sum(ChatStats.total_assistant_chars).label('totalAssistantChars'),
            func.sum(ChatStats.total_cache_read).label('totalCacheRead'),
            func.sum(ChatStats.total_cache_write).label('totalCacheWrite'),
            func.group_concat(ChatStats.models).label('models_raw'),
            func.group_concat(ChatStats.tool_calls).label('tools_raw')
        ).join(ChatStats, Chat.id == ChatStats.chat_id).filter(Chat.user_email == email, Chat.folder == folder)
        stats = apply_date_filter(stats, Chat, dateFrom, dateTo).first()
        
        # Parse models and tools
        model_freq = {}
        tool_freq = {}
        total_tc = 0
        if stats.models_raw:
            # group_concat joins them with commas, but they are JSON strings
            # This is tricky... we should probably query them separately or parse carefully
            # Let's just query models/tools for this folder
            raw_data = db.query(ChatStats.models, ChatStats.tool_calls).join(Chat, Chat.id == ChatStats.chat_id)\
                .filter(Chat.user_email == email, Chat.folder == folder)
            raw_data = apply_date_filter(raw_data, Chat, dateFrom, dateTo).all()
            for m_json, t_json in raw_data:
                try:
                    for m in json.loads(m_json or '[]'): model_freq[m] = model_freq.get(m, 0) + 1
                    for t in json.loads(t_json or '[]'): 
                        tool_freq[t] = tool_freq.get(t, 0) + 1
                        total_tc += 1
                except: pass

        results.append({
            "folder": folder,
            "name": folder.replace("\\", "/").split("/")[-1],
            "totalSessions": stats.totalSessions,
            "editors": {e[0]: e[1] for e in editors},
            "firstSeen": stats.firstSeen,
            "lastSeen": stats.lastSeen,
            "totalMessages": stats.totalMessages or 0,
            "totalInputTokens": stats.totalInputTokens or 0,
            "totalOutputTokens": stats.totalOutputTokens or 0,
            "totalUserChars": stats.totalUserChars or 0,
            "totalAssistantChars": stats.totalAssistantChars or 0,
            "totalToolCalls": total_tc,
            "totalCacheRead": stats.totalCacheRead or 0,
            "totalCacheWrite": stats.totalCacheWrite or 0,
            "topModels": [{"name": n, "count": c} for n, c in sorted(model_freq.items(), key=lambda x: x[1], reverse=True)[:10]],
            "topTools": [{"name": n, "count": c} for n, c in sorted(tool_freq.items(), key=lambda x: x[1], reverse=True)[:10]],
        })
        
    return sorted(results, key=lambda x: x["totalSessions"], reverse=True)

@app.get("/api/tool-calls")
def get_tool_calls(
    name: str,
    limit: int = 200,
    folder: Optional[str] = None,
    db: Session = Depends(get_db),
    email: str = Depends(get_user_email)
):
    query = db.query(ToolCall, Chat.name.label('chat_name')).join(Chat, ToolCall.chat_id == Chat.id)\
        .filter(ToolCall.user_email == email, ToolCall.tool_name == name)
    
    if folder: query = query.filter(ToolCall.folder == folder)
    
    rows = query.order_by(desc(ToolCall.timestamp)).limit(limit).all()
    
    return [{
        "toolName": tc.tool_name,
        "args": json.loads(tc.args_json),
        "source": tc.source,
        "folder": tc.folder,
        "timestamp": tc.timestamp,
        "chatName": chat_name,
        "chatId": tc.chat_id
    } for tc, chat_name in rows]

class IncrementalRequest(BaseModel):
    chat: Dict[str, Any]
    stats: Dict[str, Any]
    messages: List[Dict[str, Any]]
    tool_calls: List[Dict[str, Any]]

@app.post("/api/incremental-analytics")
def incremental_analytics(data: IncrementalRequest, db: Session = Depends(get_db), email: str = Depends(get_user_email)):
    # 1. Insert/Update Chat
    
    c = data.chat
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
    
    # 2. Insert/Update Stats (Additive for numeric fields)
    s = data.stats
    stats_obj = db.query(ChatStats).filter(ChatStats.chat_id == c['id']).first()
    
    if not stats_obj:
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
        db.add(stats_obj)
    else:
        # Add new stats to existing ones
        stats_obj.total_messages += s.get('total_messages', 0)
        stats_obj.user_messages += s.get('user_messages', 0)
        stats_obj.assistant_messages += s.get('assistant_messages', 0)
        stats_obj.tool_messages += s.get('tool_messages', 0)
        stats_obj.system_messages += s.get('system_messages', 0)
        stats_obj.total_user_chars += s.get('total_user_chars', 0)
        stats_obj.total_assistant_chars += s.get('total_assistant_chars', 0)
        stats_obj.total_input_tokens += s.get('total_input_tokens', 0)
        stats_obj.total_output_tokens += s.get('total_output_tokens', 0)
        stats_obj.total_cache_read += s.get('total_cache_read', 0)
        stats_obj.total_cache_write += s.get('total_cache_write', 0)
        stats_obj.analyzed_at = s.get('analyzed_at')
        
        # Merge Tool Calls (unique list)
        try:
            old_tools = json.loads(stats_obj.tool_calls)
            new_tools = s.get('tool_calls', [])
            stats_obj.tool_calls = json.dumps(list(set(old_tools + new_tools)))
        except: pass

        # Merge Models (unique list)
        try:
            old_models = json.loads(stats_obj.models)
            new_models = s.get('models', [])
            stats_obj.models = json.dumps(list(set(old_models + new_models)))
        except: pass

    # 3. Append Messages (Check for duplicates by seq)
    for i, m in enumerate(data.messages):
        seq = m.get('seq', i)
        # Check if message already exists
        exists = db.query(Message).filter(Message.chat_id == c['id'], Message.seq == seq).first()
        if not exists:
            msg_obj = Message(
                chat_id=c['id'],
                seq=seq,
                role=m['role'],
                content=m['content'],
                model=m.get('model'),
                input_tokens=m.get('input_tokens'),
                output_tokens=m.get('output_tokens'),
                user_email=email
            )
            db.add(msg_obj)

    # 4. Append Tool Calls
    for tc in data.tool_calls:
        # Check for exact duplicate tool call (heuristic: name + args + timestamp)
        tc_exists = db.query(ToolCall).filter(
            ToolCall.chat_id == c['id'],
            ToolCall.tool_name == tc['tool_name'],
            ToolCall.timestamp == tc.get('timestamp')
        ).first()
        
        if not tc_exists:
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
    return {"status": "success", "chat_id": c['id'], "user": email}

class AnalyticsRecord(BaseModel):
    chat: Dict[str, Any]
    stats: Dict[str, Any]
    messages: List[Dict[str, Any]]
    tool_calls: List[Dict[str, Any]]

class AnalyticsBatch(BaseModel):
    records: List[AnalyticsRecord]

@app.post("/ingest/batch")
def ingest_batch(batch: AnalyticsBatch, db: Session = Depends(get_db), email: str = Depends(get_user_email)):
    print(f"--- Received batch of {len(batch.records)} records for user {email} ---")
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

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
