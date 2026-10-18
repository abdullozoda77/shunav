// Starts the FastAPI backend from the project's .venv, on Linux/macOS and on Windows alike.
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const python =
  process.platform === "win32"
    ? path.join(root, ".venv", "Scripts", "python.exe")
    : path.join(root, ".venv", "bin", "python");

const api = spawn(python, ["-m", "uvicorn", "main:app", "--reload", "--port", "8002"], { cwd: root, stdio: "inherit" });
api.on("exit", (code) => process.exit(code ?? 0));
