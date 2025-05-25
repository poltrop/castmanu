import httpx
import asyncio

_server_alive = False

async def update_server_alive():
    global _server_alive
    url = "https://castmanu.ddns.net/alive"
    headers = {"Authorization": "Bearer castmanu"}
    try:
        print("[ALIVE CHECK] Haciendo petición al servidor...")
        async with httpx.AsyncClient() as client:
            response = await client.get(url, headers=headers, timeout=3)
            response.raise_for_status()
            data = response.json()
            _server_alive = (data.get("status") == "alive")
            print(f"[ALIVE CHECK] Estado del servidor: {_server_alive}")
    except Exception:
        _server_alive = False
        print(f"[ALIVE CHECK] Estado del servidor: {_server_alive}")

async def periodic_alive_check(interval_minutes: int = 10):
    while True:
        await update_server_alive()
        await asyncio.sleep(interval_minutes * 60)

def is_server_alive():
    return _server_alive
