import sys
from pathlib import Path

# Add backend and root directories to sys.path so server and foods_data can be imported seamlessly
api_dir = Path(__file__).resolve().parent
root_dir = api_dir.parent
backend_dir = root_dir / "backend"

for d in [str(backend_dir), str(root_dir), str(api_dir)]:
    if d not in sys.path:
        sys.path.insert(0, d)

try:
    from server import app
except ImportError:
    try:
        from backend.server import app
    except ImportError:
        import importlib.util
        server_path = backend_dir / "server.py"
        if server_path.exists():
            spec = importlib.util.spec_from_file_location("server", str(server_path))
            server_mod = importlib.util.module_from_spec(spec)
            spec.loader.exec_module(server_mod)
            app = server_mod.app
        else:
            raise
