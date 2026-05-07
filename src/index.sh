#!/bin/zsh

# @raycast.schemaVersion 1
# @raycast.title Mouse Jiggle
# @raycast.description Move the mouse cursor randomly to prevent sleep or keep status active
# @raycast.mode silent
# @raycast.packageName Mouse Jiggle

# Mouse Jiggle - Raycast Custom Command
# Moves the mouse randomly to prevent sleep or keep status active

# Generate random offsets within a small range (-10 to +10 pixels)
dx1=$((RANDOM % 21 - 10))
dy1=$((RANDOM % 21 - 10))
dx2=$((RANDOM % 21 - 10))
dy2=$((RANDOM % 21 - 10))
dx3=$((RANDOM % 21 - 10))
dy3=$((RANDOM % 21 - 10))
dx4=$((RANDOM % 21 - 10))
dy4=$((RANDOM % 21 - 10))

# Check for cliclick (preferred method for precise mouse control)
if command -v cliclick &> /dev/null; then
    # cliclick is installed - use it for smooth mouse movement
    cliclick m:${dx1}:${dy1}
    sleep 0.05
    cliclick m:${dx2}:${dy2}
    sleep 0.05
    cliclick m:${dx3}:${dy3}
    sleep 0.05
    cliclick m:${dx4}:${dy4}
    
else
    # Fallback: Use Python with pyobjc-framework-Quartz
    /usr/bin/python3 << 'PYTHON_EOF'
import Quartz
import time
import random

def move_mouse(dx, dy):
    """Move mouse using CGEvent"""
    current = Quartz.CGEventGetCurrentEvent()
    loc = Quartz.CGEventGetLocation(current)
    
    # Convert to screen coordinates (Quartz uses bottom-left origin)
    from AppKit import NSScreen
    main_screen = NSScreen.mainScreen()
    if main_screen:
        frame = main_screen.frame()
        screen_height = frame.size.height
        
        # Current position in screen coordinates
        current_x = loc.x
        current_y = screen_height - loc.y
        
        # New position
        new_x = current_x + dx
        new_y = current_y - dy  # Note: Quartz y is inverted
        
        # Create move event
        new_loc = Quartz.CGPoint(new_x, new_y)
        event = Quartz.CGEventCreateMouseEvent(
            None, 
            Quartz.kCGEventMouseMoved,
            new_loc,
            Quartz.kCGMouseButtonLeft
        )
        if event:
            Quartz.CGEventPost(Quartz.kCGHIDEventTap, event)

# Generate random offsets (-10 to +10 pixels)
offsets = [(random.randint(-10, 10), random.randint(-10, 10)) for _ in range(4)]

# Random motion
for dx, dy in offsets:
    move_mouse(dx, dy)
    time.sleep(0.05)
PYTHON_EOF
fi

echo "🖱️ Mouse jiggled!"
