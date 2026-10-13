
import asyncio
import json
import logging
import time
import uuid
from collections import deque
from datetime import datetime, timezone

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

app = FastAPI(title="TraceMind API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["X-Trace-ID"],
)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("tracemind")

# Temporary storage: keeps the latest 500 requests in memory.
traces = deque(maxlen=500)


@app.middleware("http")
async def monitor_requests(request: Request, call_next):
    trace_id = str(uuid.uuid4())
    start_time = time.perf_counter()

    try:
        response = await call_next(request)
        status_code = response.status_code

    except Exception as exc:
        status_code = 500

        record = {
            "trace_id": trace_id,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "method": request.method,
            "path": request.url.path,
            "status_code": status_code,
            "duration_ms": round(
                (time.perf_counter() - start_time) * 1000, 2
            ),
            "error": str(exc),
        }

        traces.appendleft(record)
        logger.exception("Request failed: %s", trace_id)
        raise

    duration_ms = round(
        (time.perf_counter() - start_time) * 1000, 2
    )

    response.headers["X-Trace-ID"] = trace_id

    record = {
        "trace_id": trace_id,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "method": request.method,
        "path": request.url.path,
        "status_code": status_code,
        "duration_ms": duration_ms,
        "error": (
            "HTTP error response"
            if status_code >= 400 else None
        ),
    }

    traces.appendleft(record)
    logger.info(json.dumps(record))

    return response


@app.get("/")
def home():
    return {"project": "TraceMind", "status": "running"}


@app.get("/health")
def health():
    return {"status": "healthy"}


@app.get("/dashboard")
async def dashboard():
    return {
        "message": "Dashboard loaded",
        "orders": await get_orders(),
    }


async def get_orders():
    return {"total_orders": 25}


@app.get("/test/slow")
async def slow_endpoint():
    await asyncio.sleep(2)
    return {"message": "Slow request completed"}


@app.get("/test/error")
def error_endpoint():
    return JSONResponse(
        status_code=500,
        content={"error": "Simulated database failure"},
    )


@app.get("/api/traces")
def get_traces(limit: int = 100):
    limit = max(1, min(limit, 500))
    return {
        "total": len(traces),
        "traces": list(traces)[:limit],
    }


@app.get("/api/stats")
def get_stats():
    records = list(traces)
    total = len(records)
    errors = sum(r["status_code"] >= 400 for r in records)

    return {
        "total_requests": total,
        "successful_requests": total - errors,
        "failed_requests": errors,
        "error_rate": round(errors / total * 100, 2)
        if total else 0,
        "average_latency_ms": round(
            sum(r["duration_ms"] for r in records) / total, 2
        ) if total else 0,
    }


@app.get("/api/traces/{trace_id}")
def get_trace(trace_id: str):
    for record in traces:
        if record["trace_id"] == trace_id:
            return record

    return JSONResponse(
        status_code=404,
        content={"error": "Trace not found"},
    )
