#!/usr/bin/env python3
"""Dev-only second instance of server.py on a different port.

Useful when you already run `python3 server.py` on 8000 and want to verify
changes side-by-side without killing your server (avoids "Address already
in use"). Shares the same mamcom.db (WAL) so state stays in sync.

Run:  python3 server_dev.py            -> port 8010
      MAMCOM_DEV_PORT=8012 python3 server_dev.py
"""
import os
import runpy

os.environ["MAMCOM_PORT"] = os.environ.get("MAMCOM_DEV_PORT", "8010")
runpy.run_path(os.path.join(os.path.dirname(__file__), "server.py"), run_name="__main__")
