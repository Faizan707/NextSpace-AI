"""
100 concurrent-user load test against the NextSpace API.

Usage (from backend/):
  uv run python scripts/load_test_100.py
  uv run python scripts/load_test_100.py --base-url http://127.0.0.1:8002 --users 100 --duration 45

Env (optional):
  LOADTEST_EMAIL / LOADTEST_PASSWORD  — reuse an existing account
If unset, registers a one-off loadtest user once.
"""

from __future__ import annotations

import argparse
import asyncio
import os
import statistics
import sys
import time
import uuid
from collections import defaultdict
from dataclasses import dataclass, field

import httpx

DEFAULT_BASE = os.getenv("LOADTEST_BASE_URL", "http://127.0.0.1:8002")


def log(msg: str) -> None:
    print(msg, flush=True)


@dataclass
class Stats:
    latencies_ms: list[float] = field(default_factory=list)
    status: dict[int, int] = field(default_factory=lambda: defaultdict(int))
    errors: dict[str, int] = field(default_factory=lambda: defaultdict(int))
    by_route: dict[str, list[float]] = field(default_factory=lambda: defaultdict(list))

    def record(self, route: str, status: int, ms: float) -> None:
        self.latencies_ms.append(ms)
        self.status[status] += 1
        self.by_route[route].append(ms)

    def fail(self, route: str, reason: str) -> None:
        self.errors[f"{route}:{reason}"] += 1


def pct(sorted_vals: list[float], p: float) -> float:
    if not sorted_vals:
        return 0.0
    idx = min(len(sorted_vals) - 1, max(0, int(round((p / 100) * (len(sorted_vals) - 1)))))
    return sorted_vals[idx]


async def _post_with_retries(
    client: httpx.AsyncClient,
    path: str,
    *,
    attempts: int = 4,
    **kwargs,
) -> httpx.Response:
    last: Exception | None = None
    for i in range(attempts):
        try:
            return await client.post(path, **kwargs)
        except (httpx.TimeoutException, httpx.TransportError) as exc:
            last = exc
            await asyncio.sleep(0.5 * (i + 1))
    assert last is not None
    raise last


async def ensure_token(client: httpx.AsyncClient, email: str, password: str) -> str:
    login = await _post_with_retries(
        client,
        "/auth/login",
        data={"username": email, "password": password},
        headers={"Content-Type": "application/x-www-form-urlencoded"},
    )
    if login.status_code == 200:
        return login.json()["access_token"]

    reg = await _post_with_retries(
        client,
        "/auth/register",
        json={
            "email": email,
            "password": password,
            "full_name": "Load Test User",
            "company": {
                "name": f"LoadTest Co {email.split('@')[0][:12]}",
                "employee_count": 10,
                "location": "PK",
            },
        },
    )
    if reg.status_code not in (200, 201):
        raise RuntimeError(f"register failed: {reg.status_code} {reg.text}")

    login = await _post_with_retries(
        client,
        "/auth/login",
        data={"username": email, "password": password},
        headers={"Content-Type": "application/x-www-form-urlencoded"},
    )
    if login.status_code != 200:
        raise RuntimeError(f"login failed after register: {login.status_code} {login.text}")
    return login.json()["access_token"]


async def hit(
    client: httpx.AsyncClient,
    stats: Stats,
    method: str,
    path: str,
    route: str,
    **kwargs,
) -> None:
    started = time.perf_counter()
    try:
        res = await client.request(method, path, **kwargs)
        ms = (time.perf_counter() - started) * 1000
        stats.record(route, res.status_code, ms)
        if res.status_code >= 500:
            stats.fail(route, f"http_{res.status_code}")
    except Exception as exc:  # noqa: BLE001 — aggregate load errors
        ms = (time.perf_counter() - started) * 1000
        stats.record(route, 0, ms)
        stats.fail(route, type(exc).__name__)


async def user_loop(
    client: httpx.AsyncClient,
    token: str,
    stats: Stats,
    stop_at: float,
    user_id: int,
) -> None:
    headers = {"Authorization": f"Bearer {token}"}
    await asyncio.sleep((user_id % 25) * 0.04)

    i = 0
    while time.perf_counter() < stop_at:
        await hit(client, stats, "GET", "/health", "GET /health")
        if time.perf_counter() >= stop_at:
            break
        await hit(client, stats, "GET", "/auth/me", "GET /auth/me", headers=headers)
        if time.perf_counter() >= stop_at:
            break
        await hit(client, stats, "GET", "/work/dashboard", "GET /work/dashboard", headers=headers)
        if time.perf_counter() >= stop_at:
            break
        await hit(client, stats, "GET", "/work/projects", "GET /work/projects", headers=headers)
        if time.perf_counter() >= stop_at:
            break
        await hit(client, stats, "GET", "/work/tasks", "GET /work/tasks", headers=headers)
        if time.perf_counter() >= stop_at:
            break
        await hit(client, stats, "GET", "/spaces", "GET /spaces", headers=headers)
        if time.perf_counter() >= stop_at:
            break
        await hit(client, stats, "GET", "/companies/me", "GET /companies/me", headers=headers)
        if i % 3 == 0 and time.perf_counter() < stop_at:
            await hit(
                client,
                stats,
                "GET",
                "/companies/me/members",
                "GET /companies/me/members",
                headers=headers,
            )
        i += 1
        await asyncio.sleep(0.1)


def summarize(stats: Stats, wall: float) -> int:
    total = len(stats.latencies_ms)
    ok = sum(c for code, c in stats.status.items() if 200 <= code < 400)
    err_http = sum(c for code, c in stats.status.items() if code >= 400 or code == 0)
    sorted_lat = sorted(stats.latencies_ms)

    log("\n=== Load test results ===")
    log(f"Wall time:         {wall:.1f}s")
    log(f"Total requests:    {total}")
    log(f"Throughput:        {(total / wall) if wall else 0:.1f} req/s")
    log(f"Success (2xx/3xx): {ok}")
    log(f"Errors/4xx/5xx/0:  {err_http}")
    if sorted_lat:
        log(f"Latency avg:       {statistics.fmean(sorted_lat):.1f} ms")
        log(f"Latency p50:       {pct(sorted_lat, 50):.1f} ms")
        log(f"Latency p95:       {pct(sorted_lat, 95):.1f} ms")
        log(f"Latency p99:       {pct(sorted_lat, 99):.1f} ms")
        log(f"Latency max:       {sorted_lat[-1]:.1f} ms")

    log("\nStatus codes:")
    for code in sorted(stats.status):
        log(f"  {code}: {stats.status[code]}")

    log("\nPer-route p95:")
    for route, vals in sorted(stats.by_route.items()):
        s = sorted(vals)
        log(f"  {route:28} n={len(s):5}  p50={pct(s, 50):7.1f}  p95={pct(s, 95):7.1f}  max={s[-1]:7.1f}")

    if stats.errors:
        log("\nError breakdown:")
        for k, v in sorted(stats.errors.items(), key=lambda x: -x[1])[:20]:
            log(f"  {k}: {v}")

    fail_rate = (err_http / total) if total else 1.0
    p95 = pct(sorted_lat, 95) if sorted_lat else 9999
    if fail_rate > 0.05 or p95 > 3000:
        log("\nResult: DEGRADED (fail rate >5% or p95 >3s)")
        return 1
    log("\nResult: PASS")
    return 0


async def run(base_url: str, users: int, duration: float) -> int:
    email = os.getenv("LOADTEST_EMAIL") or f"loadtest_{uuid.uuid4().hex[:10]}@example.com"
    password = os.getenv("LOADTEST_PASSWORD") or "LoadTest123!"
    stats = Stats()

    # Fail fast under overload so the run finishes near --duration
    timeout = httpx.Timeout(20.0, connect=10.0)
    limits = httpx.Limits(max_connections=users + 40, max_keepalive_connections=min(users, 50))

    async with httpx.AsyncClient(base_url=base_url.rstrip("/"), timeout=timeout, limits=limits) as client:
        health = await client.get("/health")
        if health.status_code != 200:
            log(f"Backend not healthy at {base_url}: {health.status_code}")
            return 2

        log(f"Base URL: {base_url}")
        log(f"Users: {users}  Duration: {duration:.0f}s")
        log(f"Health OK ({health.json().get('database_host', '?')})")
        log("Ensuring auth token…")
        token = await ensure_token(client, email, password)
        log(f"Auth OK ({email})")

        stop_at = time.perf_counter() + duration
        wall_start = time.perf_counter()
        tasks = [asyncio.create_task(user_loop(client, token, stats, stop_at, i)) for i in range(users)]
        # Hard ceiling: duration + one request timeout slack
        done, pending = await asyncio.wait(tasks, timeout=duration + 25)
        for t in pending:
            t.cancel()
        if pending:
            await asyncio.gather(*pending, return_exceptions=True)
            log(f"Cancelled {len(pending)} in-flight user loops after hard deadline")
        wall = time.perf_counter() - wall_start
        # silence unused
        _ = done

    return summarize(stats, wall)


def main() -> None:
    parser = argparse.ArgumentParser(description="NextSpace 100-user load test")
    parser.add_argument("--base-url", default=DEFAULT_BASE)
    parser.add_argument("--users", type=int, default=100)
    parser.add_argument("--duration", type=float, default=45.0, help="seconds")
    args = parser.parse_args()
    raise SystemExit(asyncio.run(run(args.base_url, args.users, args.duration)))


if __name__ == "__main__":
    main()
