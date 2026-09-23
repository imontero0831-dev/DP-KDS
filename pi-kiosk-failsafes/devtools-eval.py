#!/usr/bin/env python3
"""Evaluate one JS expression in a live Chromium tab over the DevTools protocol.

Exists because the DevTools *HTTP* endpoint (:9222/json) exposes only tab
metadata -- url, title, id -- and no DOM. Every watchdog we had judged the
kiosk from that metadata alone, which is why a blank screen whose <title>
still said "KDS" passed every check for as long as it was up (2026-09-22).
Reading the actual DOM needs the websocket, and the Pis have no websocket
client at all: no `websocket`/`websockets` module, no wscat, no websocat.
Rather than add an apt/pip dependency to three kiosks, this speaks just
enough of RFC 6455 by hand -- HTTP upgrade, one masked client text frame,
read frames until our reply id comes back.

Usage:  devtools-eval.py <target_id> <expression>
Prints the expression's value to stdout (JSON-decoded if it is a string of
JSON), or nothing and exit 1 on any failure. Deliberately silent-and-
nonzero rather than noisy: callers are cron watchdogs that must treat
"couldn't tell" as "don't act".
"""
import socket, base64, os, json, struct, sys, urllib.request, time

TIMEOUT = 10


def ws_eval(ws_url, expr):
    rest = ws_url.split("://", 1)[1]
    hostport, path = rest.split("/", 1)
    path = "/" + path
    host, port = hostport.split(":")
    s = socket.create_connection((host, int(port)), timeout=TIMEOUT)
    try:
        key = base64.b64encode(os.urandom(16)).decode()
        s.send((
            "GET %s HTTP/1.1\r\nHost: %s\r\nUpgrade: websocket\r\n"
            "Connection: Upgrade\r\nSec-WebSocket-Key: %s\r\n"
            "Sec-WebSocket-Version: 13\r\n\r\n" % (path, hostport, key)
        ).encode())
        buf = b""
        while b"\r\n\r\n" not in buf:
            chunk = s.recv(4096)
            if not chunk:
                return None
            buf += chunk
        if b" 101 " not in buf.split(b"\r\n")[0]:
            return None

        msg = json.dumps({
            "id": 1, "method": "Runtime.evaluate",
            "params": {"expression": expr, "returnByValue": True},
        }).encode()
        hdr = bytearray([0x81])
        n = len(msg)
        if n < 126:
            hdr.append(0x80 | n)
        elif n < 65536:
            hdr.append(0x80 | 126); hdr += struct.pack(">H", n)
        else:
            hdr.append(0x80 | 127); hdr += struct.pack(">Q", n)
        mask = os.urandom(4)
        hdr += mask
        s.send(bytes(hdr) + bytes(b ^ mask[i % 4] for i, b in enumerate(msg)))

        data = b""
        deadline = time.time() + TIMEOUT
        while time.time() < deadline:
            chunk = s.recv(65536)
            if not chunk:
                break
            data += chunk
            frames, i = [], 0
            while i + 2 <= len(data):
                ln = data[i + 1] & 0x7F
                off = i + 2
                if ln == 126:
                    if off + 2 > len(data): break
                    ln = struct.unpack(">H", data[off:off + 2])[0]; off += 2
                elif ln == 127:
                    if off + 8 > len(data): break
                    ln = struct.unpack(">Q", data[off:off + 8])[0]; off += 8
                if off + ln > len(data):
                    break
                frames.append(data[off:off + ln])
                i = off + ln
            for f in frames:
                try:
                    j = json.loads(f)
                except Exception:
                    continue
                if j.get("id") == 1:
                    res = j.get("result", {}).get("result", {})
                    if "value" not in res:
                        return None
                    return res["value"]
            data = data[i:]
        return None
    finally:
        try:
            s.close()
        except Exception:
            pass


def main():
    if len(sys.argv) < 3:
        return 1
    tid, expr = sys.argv[1], sys.argv[2]
    try:
        targets = json.load(urllib.request.urlopen(
            "http://127.0.0.1:9222/json", timeout=TIMEOUT))
    except Exception:
        return 1
    for t in targets:
        if t.get("id") == tid:
            ws = t.get("webSocketDebuggerUrl")
            if not ws:
                return 1
            val = ws_eval(ws, expr)
            if val is None:
                return 1
            print(val if isinstance(val, str) else json.dumps(val))
            return 0
    return 1


if __name__ == "__main__":
    sys.exit(main())
