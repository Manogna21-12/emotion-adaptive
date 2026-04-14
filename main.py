import os
import sys

# Add backend to sys.path so we can import from backend.main
sys.path.append(os.path.join(os.path.dirname(__file__), "backend"))

# Import application from backend
from backend.main import app

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000)
