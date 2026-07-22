"""Open the local Story Workshop in the default browser."""

from __future__ import annotations

import threading
import webbrowser

from workshop.server import main


if __name__ == "__main__":
    threading.Timer(1.25, lambda: webbrowser.open("http://127.0.0.1:8765/")).start()
    main()
