import os
import datetime
from SCons.Script import Import

Import("env")

# 1. Set Source Directory based on Environment
# This allows "src_dir = target/src" behavior per environment
project_dir = env.subst("$PROJECT_DIR")
env_name = env.subst("$PIOENV")

if "target" in env_name:
    env["PROJECT_SRC_DIR"] = os.path.join(project_dir, "target", "src")
elif "weapon" in env_name:
    env["PROJECT_SRC_DIR"] = os.path.join(project_dir, "weapon", "src")

# Check for custom_src_dir option in platformio.ini
custom_src = env.GetProjectOption("custom_src_dir", None)
if custom_src:
    env["PROJECT_SRC_DIR"] = os.path.join(project_dir, custom_src)

print(f"[{env_name}] Source Directory set to: {env['PROJECT_SRC_DIR']}")

# 2. Generate Version Header
def generate_version_header():
    version = None
    # Extract RAYZ_VERSION from build flags
    # We need to look at CPPDEFINES in the current env
    if 'CPPDEFINES' in env:
        for flag in env['CPPDEFINES']:
            if isinstance(flag, tuple) and flag[0] == 'RAYZ_VERSION':
                version = flag[1].strip('"')
            elif flag == 'RAYZ_VERSION':
                version = 'UNKNOWN'
    
    if version is None:
        # Fallback or default
        version = '1.0.0'

    now = datetime.datetime.utcnow()
    header_content = f"""// Auto-generated version header
#pragma once
#define RAYZ_VERSION_STR "{version}"
#define RAYZ_BUILD_UTC "{now.isoformat()}Z"
"""
    
    include_dir = os.path.join(project_dir, "include")
    if not os.path.exists(include_dir):
        os.makedirs(include_dir)
        
    version_file = os.path.join(include_dir, "version.h")
    
    # Only write if changed to avoid rebuilds
    if os.path.exists(version_file):
        with open(version_file, "r") as f:
            if f.read() == header_content:
                return

    with open(version_file, "w") as f:
        f.write(header_content)

# Run version generation
generate_version_header()

