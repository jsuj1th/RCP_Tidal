# New Features Guide

## 1. Show Joint Labels ✨

### What it does:
When enabled, displays floating 3D labels above each visible pipe joint showing:
- Joint number
- Distance in feet

### How to use:
1. Toggle the "Show Joint Labels" switch in Quick Actions
2. Labels appear as 3D sprites floating above the pipeline
3. Labels automatically update when you apply filters
4. Toggle off to hide labels and reduce visual clutter

### Technical details:
- Labels are rendered as canvas textures on 3D sprites
- Positioned 4 units above the pipeline
- Only visible joints get labels (respects filters)
- Labels are automatically cleaned up when toggled off

---

## 2. Critical Zone Explanations 🚨

### What's new:
Each critical zone now shows **why** it's classified as critical with a small explanation badge.

### Explanation categories:
- **"Severe depth (≥80%)"** - Anomaly depth is 80% or more
- **"Rapid growth rate"** - Growth rate is 5% per year or higher
- **"High depth + growth"** - Depth ≥60% AND growth ≥2% per year
- **"Multiple risk factors"** - Other combinations of concerning metrics

### Visual design:
- Red warning icon (⚠️)
- Small badge at bottom of each critical zone card
- Light red background with border
- Easy to scan at a glance

---

## 3. Dedicated "Filters" Button 🎛️

### What changed:
Instead of an always-visible collapsible section, filters are now completely hidden by default.

### How it works:
1. Click the **"Show Filters"** button in Quick Actions
2. Filter section smoothly expands below
3. Button text changes to **"Hide Filters"**
4. Click again to collapse and hide filters

### Benefits:
- Cleaner interface by default
- More space for critical zones list
- Filters only visible when needed
- Smooth animation for better UX

---

## 4. Smaller, More Compact Filters 📏

### Size reductions:
- **Input fields**: Reduced padding (py-1.5 instead of py-2)
- **Labels**: Smaller font (9px instead of 10px)
- **Buttons**: More compact (py-1.5 instead of py-2)
- **Section spacing**: Tighter gaps (gap-2 instead of gap-3)
- **Overall padding**: Reduced from p-4 to p-3

### Visual improvements:
- Cleaner, more professional look
- Takes up less vertical space
- Easier to see more content at once
- Still fully functional and readable

---

## Complete Feature Summary

### Quick Actions Section:
1. **Show Joint Labels** - Toggle 3D labels on/off
2. **Fly to Next Critical Zone** - Cycle through critical anomalies
3. **Show/Hide Filters** - Toggle filter visibility

### Filters Section (when visible):
1. **Joint Range Filter**
   - Filter by start/end joint numbers
   - Compact inputs and buttons
   
2. **Neighborhood Filter**
   - Show joints around a center point
   - Adjustable radius

### Critical Zones List:
- Shows all critical anomalies
- Sorted by severity (growth rate)
- **NEW**: Explanation badge for each zone
- Click to jump to location
- Displays:
  - Zone number
  - Growth rate
  - Distance
  - Depth percentage
  - **Why it's critical**

---

## Usage Tips

### For cleaner view:
1. Keep filters hidden until needed
2. Toggle labels off when not analyzing specific joints
3. Use critical zones list for quick navigation

### For detailed analysis:
1. Enable joint labels to see all joint numbers
2. Show filters to narrow down to specific areas
3. Use neighborhood filter to focus on problem areas

### For presentations:
1. Hide filters for cleaner screenshots
2. Enable labels to show joint identification
3. Use "Fly to Next Critical" to demonstrate issues

---

## Keyboard Shortcuts (Future Enhancement)
Consider adding:
- `L` - Toggle labels
- `F` - Toggle filters
- `N` - Next critical zone
- `Esc` - Hide filters

---

## Performance Notes

### Joint Labels:
- Labels are only created for visible segments
- Automatically cleaned up when toggled off
- Canvas textures are properly disposed
- Minimal performance impact

### Filter Animations:
- CSS transitions for smooth UX
- No JavaScript animation loops
- Hardware accelerated where possible

---

## Testing Checklist

- [ ] Toggle joint labels on/off
- [ ] Verify labels show correct joint numbers
- [ ] Check labels update when filters applied
- [ ] Click "Show Filters" button
- [ ] Verify filters expand smoothly
- [ ] Click "Hide Filters" button
- [ ] Verify filters collapse smoothly
- [ ] Check critical zone explanations display
- [ ] Verify explanations are accurate
- [ ] Test all filter combinations with labels
- [ ] Verify compact filter sizing
- [ ] Check responsive behavior
