import asyncio
import json
import logging
import time
import uuid

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse

app = FastAPI(title="TraceMind API")

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("tracemind")


@app.middleware("http")
async def monitor_requests(request: Request, call_next):
    trace_id = str(uuid.uuid4())
    start_time = time.perf_counter()

    try:
        response = await call_next(request)
    except Exception as exc:
        logger.error(json.dumps({
            "trace_id": trace_id,
            "path": request.url.path,
            "error": str(exc),
        }))
        raise

    duration_ms = round(
        (time.perf_counter() - start_time) * 1000, 2
    )

    response.headers["X-Trace-ID"] = trace_id

    logger.info(json.dumps({
        "trace_id": trace_id,
        "method": request.method,
        "path": request.url.path,
        "status_code": response.status_code,
        "duration_ms": duration_ms,
    }))

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