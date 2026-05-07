import { LaunchProps, showToast, Toast } from "@raycast/api";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

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

    // Check for cliclick
    const hasCliclick = await checkCliclick();

    if (hasCliclick) {
      // Use cliclick for smooth mouse movement
      for (const [dx, dy] of offsets) {
        await execAsync(`cliclick m:${dx}:${dy}`);
        await new Promise((r) => setTimeout(r, 50));
      }
    } else {
      // Use Python fallback
      const pythonScript = generatePythonScript(offsets);
      await execAsync(`/usr/bin/python3 -c '${pythonScript}'`);
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
  try {
    await execAsync("which cliclick");
    return true;
  } catch {
    return false;
  }
}

function generatePythonScript(offsets: [number, number][]): string {
  const moves = offsets.map(([dx, dy]) => `move_mouse(${dx}, ${dy})`).join("\n    ");

  return `
import Quartz
import time

def move_mouse(dx, dy):
    current = Quartz.CGEventGetCurrentEvent()
    loc = Quartz.CGEventGetLocation(current)
    from AppKit import NSScreen
    main_screen = NSScreen.mainScreen()
    if main_screen:
        frame = main_screen.frame()
        screen_height = frame.size.height
        current_x = loc.x
        current_y = screen_height - loc.y
        new_x = current_x + dx
        new_y = current_y - dy
        new_loc = Quartz.CGPoint(new_x, new_y)
        event = Quartz.CGEventCreateMouseEvent(None, Quartz.kCGEventMouseMoved, new_loc, Quartz.kCGMouseButtonLeft)
        if event:
            Quartz.CGEventPost(Quartz.kCGHIDEventTap, event)

${moves}
`;
}
