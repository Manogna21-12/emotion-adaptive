/**
 * Starts FastAPI (sibling ../backend) and Vite together.
 * Used by: npm run dev
 *
 * Resolves Python on Windows even when "python" is not on PATH (venv, PYTHON_EXE,
 * where.exe, standard install folders).
 */
const { spawn, spawnSync, execSync } = require("child_process");
const path = require("path");
const fs = require("fs");

const frontRoot = path.resolve(__dirname, "..");
const backendRoot = path.resolve(frontRoot, "..", "backend");
const mainPy = path.join(backendRoot, "main.py");
const isWin = process.platform === "win32";

if (!fs.existsSync(mainPy)) {
  console.error("[start-dev] Expected FastAPI app at:", mainPy);
  console.error("[start-dev] Fix: run npm run dev from the FrontEnd folder inside the repo (not a copied subtree).");
  process.exit(1);
}

function isWindowsAppsStub(p) {
  if (!p) return true;
  const lower = String(p).toLowerCase().replace(/\\/g, "/");
  return lower.includes("windowsapps");
}

function testPython(exe) {
  if (!exe || !fs.existsSync(exe)) return false;
  if (isWindowsAppsStub(exe)) return false;
  const r = spawnSync(exe, ["-c", "import sys"], {
    stdio: "ignore",
    windowsHide: true,
  });
  return r.status === 0;
}

function venvPythonCandidates() {
  if (isWin) {
    return [
      path.join(backendRoot, ".venv", "Scripts", "python.exe"),
      path.join(backendRoot, "venv", "Scripts", "python.exe"),
    ];
  }
  return [
    path.join(backendRoot, ".venv", "bin", "python"),
    path.join(backendRoot, "venv", "bin", "python"),
  ];
}

function envOverridePython() {
  const raw =
    process.env.PYTHON_EXE ||
    process.env.EMOTION_PYTHON ||
    process.env.PYTHON ||
    "";
  const t = raw.trim();
  if (!t) return null;
  return path.isAbsolute(t) ? t : path.resolve(backendRoot, t);
}

/** @returns {string[]} */
function whereFirstMatches(exeName) {
  if (!isWin) return [];
  try {
    const out = execSync(`where.exe ${exeName}`, {
      encoding: "utf8",
      shell: true,
      windowsHide: true,
    });
    return out
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);
  } catch {
    return [];
  }
}

function scanWindowsProgramPython() {
  if (!isWin) return null;
  const roots = [];
  if (process.env.LOCALAPPDATA) {
    roots.push(path.join(process.env.LOCALAPPDATA, "Programs", "Python"));
  }
  if (process.env.ProgramFiles) {
    roots.push(process.env.ProgramFiles);
  }
  const pf86 = process.env["ProgramFiles(x86)"];
  if (pf86) roots.push(pf86);

  for (const root of roots) {
    if (!root || !fs.existsSync(root)) continue;
    let entries;
    try {
      entries = fs.readdirSync(root, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const ent of entries) {
      if (!ent.isDirectory()) continue;
      const candidate = path.join(root, ent.name, "python.exe");
      if (testPython(candidate)) return candidate;
    }
  }
  return null;
}

/**
 * @returns {{ cmd: string, prefix: string[] } | null}
 */
function resolvePython() {
  const override = envOverridePython();
  if (override && testPython(override)) {
    return { cmd: override, prefix: [] };
  }

  for (const v of venvPythonCandidates()) {
    if (testPython(v)) {
      console.log("[start-dev] Using backend virtualenv:", v);
      return { cmd: v, prefix: [] };
    }
  }

  if (isWin) {
    for (const line of whereFirstMatches("python")) {
      if (testPython(line)) return { cmd: line, prefix: [] };
    }
    const scanned = scanWindowsProgramPython();
    if (scanned) {
      console.log("[start-dev] Using Python from standard install path:", scanned);
      return { cmd: scanned, prefix: [] };
    }
    const rPy = spawnSync("py", ["-3", "-c", "import sys"], {
      stdio: "ignore",
      shell: true,
      windowsHide: true,
    });
    if (rPy.status === 0) {
      return { cmd: "py", prefix: ["-3"] };
    }
  } else {
    for (const name of ["python3", "python"]) {
      const r = spawnSync(name, ["-c", "import sys"], { stdio: "ignore" });
      if (r.status === 0) return { cmd: name, prefix: [] };
    }
  }

  return null;
}

const resolved = resolvePython();
if (!resolved) {
  console.error(`
[start-dev] No working Python interpreter found.

Windows — choose ONE:

  (1) Install Python 3.11+ from https://www.python.org/downloads/
      On the installer FIRST screen, enable: "Add python.exe to PATH"
      Close and reopen this terminal, then:
        python --version
        where python

  (2) Virtual env (works even if you forgot PATH — uses backend\\.venv):
        cd ..\backend
        py -3 -m venv .venv
        .venv\\Scripts\\python.exe -m pip install -r requirements.txt
      Or double-run: ..\\backend\\setup-venv.bat
      Then: cd ..\\FrontEnd && npm run dev

  (3) Set env var PYTHON_EXE to your python.exe full path, then npm run dev
`);
  process.exit(1);
}

const uvicornTail = [
  "-m",
  "uvicorn",
  "main:app",
  "--host",
  "127.0.0.1",
  "--port",
  "8000",
  "--reload",
];
const apiArgs = [...resolved.prefix, ...uvicornTail];
const useShell = isWin && !path.isAbsolute(resolved.cmd);

console.log(
  "[start-dev] FastAPI:",
  resolved.cmd,
  apiArgs.join(" "),
  "\n       cwd:",
  backendRoot
);

const api = spawn(resolved.cmd, apiArgs, {
  cwd: backendRoot,
  stdio: "inherit",
  shell: useShell,
  windowsHide: true,
  env: process.env,
});

api.on("error", (err) => {
  console.error("[start-dev] Failed to spawn FastAPI:", err.message);
  process.exit(1);
});

const viteBin = path.join(frontRoot, "node_modules", ".bin", isWin ? "vite.cmd" : "vite");
if (!fs.existsSync(viteBin)) {
  console.error("[start-dev] Vite not found. Run: npm install   (in FrontEnd folder)");
  try {
    api.kill(isWin ? undefined : "SIGTERM");
  } catch (_) {}
  process.exit(1);
}

const vite = spawn(viteBin, ["--port", "5173"], {
  cwd: frontRoot,
  stdio: "inherit",
  shell: isWin,
  windowsHide: true,
  env: process.env,
});

vite.on("error", (err) => {
  console.error("[start-dev] Failed to spawn Vite:", err.message);
  try {
    api.kill(isWin ? undefined : "SIGTERM");
  } catch (_) {}
  process.exit(1);
});

function shutdown() {
  console.log("\n[start-dev] Stopping...");
  try {
    api.kill(isWin ? undefined : "SIGTERM");
  } catch (_) {}
  try {
    vite.kill(isWin ? undefined : "SIGTERM");
  } catch (_) {}
  setTimeout(() => process.exit(0), 400);
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

api.on("exit", (code, signal) => {
  if (signal === "SIGTERM" || signal === "SIGINT") return;
  if (code !== 0 && code !== null) {
    console.error(
      "[start-dev] FastAPI exited with code",
      code,
      "- check errors above (pip install -r backend/requirements.txt)."
    );
  }
  try {
    vite.kill(isWin ? undefined : "SIGTERM");
  } catch (_) {}
});

vite.on("exit", () => {
  try {
    api.kill(isWin ? undefined : "SIGTERM");
  } catch (_) {}
});
