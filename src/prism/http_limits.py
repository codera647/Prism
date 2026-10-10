"""Bound multipart bytes before Starlette spools them to temporary files."""
import json


class BodyLimit:
    def __init__(self, app, limit=1024**3+2*1024*1024):
        self.app, self.limit = app, limit

    async def __call__(self, scope, receive, send):
        if scope["type"] != "http":
            return await self.app(scope, receive, send)
        size, started = 0, False

        class TooLarge(Exception):
            pass

        async def bounded_receive():
            nonlocal size
            message = await receive()
            size += len(message.get("body", b""))
            if size > self.limit:
                raise TooLarge()
            return message

        async def tracked_send(message):
            nonlocal started
            if message["type"] == "http.response.start":
                started = True
            await send(message)

        try:
            await self.app(scope, bounded_receive, tracked_send)
        except TooLarge:
            if not started:
                body = json.dumps({"detail": "Request exceeds the upload size limit."}).encode()
                await send({"type": "http.response.start", "status": 413, "headers": [(b"content-type", b"application/json"), (b"content-length", str(len(body)).encode())]})
                await send({"type": "http.response.body", "body": body})
