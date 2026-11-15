#!/usr/bin/env python3
"""Install the Modernization OS into a repository. Standard library only.

  python3 install.py /path/to/legacy-repo                 # the shared .agents/skills folder
  python3 install.py /path/to/legacy-repo --tool copilot  # VS Code with GitHub Copilot
  python3 install.py /path/to/legacy-repo --tool claude cursor
  python3 install.py /path/to/legacy-repo --dir some/custom/skills

Copies the skills into the folder your tool reads, puts the tools in modernization/ (mos.py, mos_sources.py, mos_design.py),
and adds a short contract to AGENTS.md so tools and models without skill support can follow it.
Safe to run again: it replaces its own files and its own AGENTS.md block, nothing else.
"""
import argparse
import os
import re
import shutil
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
TOOLS = {
    "agents": ".agents/skills",    # shared folder: Codex, Cursor, Gemini CLI, Amp, Cline and others
    "copilot": ".github/skills",   # VS Code with GitHub Copilot
    "claude": ".claude/skills",    # Claude Code (terminal, VS Code and JetBrains extensions)
    "cursor": ".cursor/skills",
    "gemini": ".gemini/skills",
}
BLOCK = re.compile(r"<!-- modernization-os:start -->.*?<!-- modernization-os:end -->\n?", re.S)


def install(target, dirs, agents_md=True):
    if not os.path.isdir(target):
        sys.exit("Not a directory: " + target)
    src = os.path.join(HERE, "skills")
    done = []
    for d in dirs:
        dest_root = os.path.join(target, d)
        os.makedirs(dest_root, exist_ok=True)
        for name in sorted(os.listdir(src)):
            dest = os.path.join(dest_root, name)
            if os.path.isdir(dest):
                shutil.rmtree(dest)
            shutil.copytree(os.path.join(src, name), dest,
                            ignore=shutil.ignore_patterns("__pycache__"))
        done.append(d)
    ws = os.path.join(target, "modernization")
    os.makedirs(ws, exist_ok=True)
    scripts = os.path.join(src, "modernize", "scripts")
    for name in sorted(os.listdir(scripts)):
        if name.endswith(".py"):
            shutil.copy2(os.path.join(scripts, name), os.path.join(ws, name))
    if agents_md:
        with open(os.path.join(HERE, "AGENTS.md"), encoding="utf-8") as f:
            block = f.read().replace("the skills folder", "`%s`" % dirs[0])
        path = os.path.join(target, "AGENTS.md")
        old = ""
        if os.path.exists(path):
            with open(path, encoding="utf-8") as f:
                old = f.read()
        new = BLOCK.sub(lambda m: block, old) if BLOCK.search(old) else \
            (old.rstrip("\n") + "\n\n" if old.strip() else "") + block
        with open(path, "w", encoding="utf-8") as f:
            f.write(new)
    return done


def main(argv=None):
    ap = argparse.ArgumentParser(description="Install the Modernization OS into a repository.")
    ap.add_argument("target", help="the repository to modernize")
    ap.add_argument("--tool", nargs="+", choices=sorted(TOOLS) + ["all"], default=["agents"])
    ap.add_argument("--dir", nargs="+", default=[], help="custom skills folder(s), relative to target")
    ap.add_argument("--no-agents-md", action="store_true", help="do not touch AGENTS.md")
    a = ap.parse_args(argv)
    tools = sorted(TOOLS) if "all" in a.tool else a.tool
    dirs = a.dir or [TOOLS[t] for t in tools]
    done = install(a.target, dirs, not a.no_agents_md)
    print("Skills installed in: " + ", ".join(done))
    print("Tools:               modernization/mos.py, mos_sources.py, mos_design.py")
    if not a.no_agents_md:
        print("Contract added to:   AGENTS.md")
    print('\nOpen the repository in your tool and say: "modernize this codebase".')


if __name__ == "__main__":
    main()
