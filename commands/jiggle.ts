import { LaunchProps, showToast, Toast } from "@raycast/api";
import { exec } from "child_process";
import { promisify } from "util";
import { writeFileSync, unlinkSync, mkdtempSync } from "fs";
import { join } from "path";

const execAsync = promisify(exec);

// Cache cliclick availability so we don't exec `which` on every invocation
let _hasCliclick: boolean | null = null;

interface JiggleArguments {
  intensity?: string;
}

export default async function JiggleMouse({ arguments: args }: LaunchProps<{ arguments: JiggleArguments }>) {
  const intensity = parseInt(args.intensity || "10", 10);
  const clampedIntensity = Math.min(Math.max(intensity, 5), 20);

  try {
    // Generate random offsets
    const offsets: [number, number][] = [];
    for (let i = 0; i < 4; i++) {
      offsets.push([
        Math.floor(Math.random() * (clampedIntensity * 2 + 1)) - clampedIntensity,
        Math.floor(Math.random() * (clampedIntensity * 2 + 1)) - clampedIntensity,
      ]);
    }

    const hasCliclick = await checkCliclick();

    if (hasCliclick) {
      // Use cliclick for smooth mouse movement
      for (const [dx, dy] of offsets) {
        await execAsync(`cliclick m:${dx}:${dy}`);
        await new Promise((r) => setTimeout(r, 50));
      }
    } else {
      // Use Python fallback — write to temp file to avoid shell escaping issues
      const tmpDir = mkdtempSync("/tmp/mouse-jiggle-");
      const scriptPath = join(tmpDir, "jiggle.py");
      try {
        writeFileSync(scriptPath, generatePythonScript(offsets), "utf-8");
        await execAsync(`/usr/bin/python3 "${scriptPath}"`);
      } finally {
        try {
          unlinkSync(scriptPath);
          // rmdir isn't great but we can use exec for that
          execAsync(`/bin/rm -rf "${tmpDir}"`).catch(() => {});
        } catch {
          // best-effort cleanup
        }
      }
    }

    await showToast({
      style: Toast.Style.Success,
      title: "Mouse Jiggled!",
      message: `Moved in ${offsets.length} random steps`,
    });
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Failed to jiggle mouse",
      message: String(error),
    });
  }
}

async function checkCliclick(): Promise<boolean> {
  if (_hasCliclick !== null) {
    return _hasCliclick;
  }
  try {
    await execAsync("which cliclick");
    _hasCliclick = true;
  } catch {
    _hasCliclick = false;
  }
  return _hasCliclick;
}

function generatePythonScript(offsets: [number, number][]): string {
  const moves = offsets.map(([dx, dy]) => `    move_mouse(${dx}, ${dy})`).join("\n");

  return `#!/usr/bin/env python3
import Quartz
import time
import sys


def move_mouse(dx, dy):
    """Move the mouse cursor by (dx, dy) pixels relative to current position."""
    event = Quartz.CGEventCreate(None)
    current = Quartz.CGEventGetLocation(event)
    Quartz.CFRelease(event)

    # Get main display height for coordinate flip
    display_id = Quartz.CGMainDisplayID()
    bounds = Quartz.CGDisplayBounds(display_id)
    screen_height = bounds.size.height

    current_x = current.x
    current_y = screen_height - current.y
    new_x = current_x + dx
    new_y = current_y - dy

    new_loc = Quartz.CGPoint(new_x, new_y)
    move_event = Quartz.CGEventCreateMouseEvent(
        None, Quartz.kCGEventMouseMoved, new_loc, Quartz.kCGMouseButtonLeft
    )
    if move_event:
        Quartz.CGEventPost(Quartz.kCGHIDEventTap, move_event)
        Quartz.CFRelease(move_event)


${moves}
`;
}
