"""Bounded decoder child. Process separation is not a filesystem sandbox."""
import json
from pathlib import Path
import sys
from .domain import MAX_FILE_BYTES, Problem
from .media import stage_image


def main():
    root, name, aid = sys.argv[1:4]
    try:
        result = stage_image(Path(root), name, sys.stdin.buffer.read(MAX_FILE_BYTES+1), aid=aid)
        print(json.dumps({"ad": result}))
    except Problem as error:
        print(json.dumps({"error": error.code, "detail": error.message}))


if __name__ == "__main__":
    main()
