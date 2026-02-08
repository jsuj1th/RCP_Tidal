# Pipeline Viewer - Layout Guide

## Fixed Canvas Size

The 3D pipeline visualization is now contained in a **fixed-size div**:
- **Width**: 50% of screen (responsive)
- **Height**: 600px (fixed)
- **Position**: Left side of screen, centered vertically
- **Styling**: Rounded corners with border and shadow

### Benefits:
✅ Consistent viewing area regardless of screen size
✅ Prevents UI elements from being too spread out on large screens
✅ Better control over aspect ratio
✅ Professional, contained appearance

## Collapsible Filters

The filter section can now be toggled on/off:

### How it works:
1. Click the "Filters & Search" header
2. The filter content smoothly collapses/expands
3. The chevron icon rotates to indicate state
4. Uses CSS transitions for smooth animation

### Implementation:
- Uses `hidden` class with max-height transition
- Smooth opacity fade
- Rotating chevron indicator
- No display jump or layout shift

## Layout Structure

```
┌─────────────────────────────────────────────────────────┐
│                    Full Screen                          │
├──────────────────────────┬──────────────────────────────┤
│                          │                              │
│   Left (50%)             │   Right (50%)                │
│   ┌──────────────────┐   │   ┌──────────────────────┐   │
│   │                  │   │   │  Header              │   │
│   │                  │   │   ├──────────────────────┤   │
│   │   3D Canvas      │   │   │  Quick Actions       │   │
│   │   (600px high)   │   │   ├──────────────────────┤   │
│   │                  │   │   │  Filters (toggle)    │   │
│   │   [Legend]       │   │   ├──────────────────────┤   │
│   │                  │   │   │  Selected Object     │   │
│   │   [Controls]     │   │   ├──────────────────────┤   │
│   │                  │   │   │  Critical Zones      │   │
│   └──────────────────┘   │   │  (scrollable)        │   │
│                          │   └──────────────────────┘   │
└──────────────────────────┴──────────────────────────────┘
```

## Canvas Container Details

### HTML Structure:
```html
<div class="w-1/2 relative flex items-center justify-center bg-slate-950 p-6">
  <div id="canvas-container" class="w-full h-[600px] rounded-xl overflow-hidden border-2 border-slate-700 shadow-2xl">
    <!-- Three.js canvas renders here -->
  </div>
</div>
```

### Key Features:
- **Flexbox centering**: Canvas is vertically centered in left panel
- **Fixed height**: 600px ensures consistent size
- **Responsive width**: Adapts to screen width
- **Rounded corners**: Modern appearance
- **Border**: Clear visual boundary
- **Shadow**: Depth and elevation

## Mouse Interaction Updates

The mouse coordinate calculations now use:
- `getBoundingClientRect()` for accurate canvas bounds
- Boundary checking to prevent interactions outside canvas
- Proper coordinate transformation for the fixed-size container

This ensures:
✅ Accurate raycasting for object selection
✅ Tooltips only show when hovering over canvas
✅ Clicks outside canvas are ignored
✅ No coordinate offset issues

## Filter Toggle Animation

### CSS Implementation:
```css
#filters-content {
  transition: all 0.3s ease-in-out;
  max-height: 1000px;
  overflow: hidden;
}

#filters-content.hidden {
  max-height: 0;
  padding-top: 0;
  padding-bottom: 0;
  opacity: 0;
}
```

### JavaScript:
```javascript
toggleFilters() {
  const content = document.getElementById('filters-content');
  const chevron = document.getElementById('filter-chevron');
  
  if (content.classList.contains('hidden')) {
    content.classList.remove('hidden');
    chevron.style.transform = 'rotate(0deg)';
  } else {
    content.classList.add('hidden');
    chevron.style.transform = 'rotate(-90deg)';
  }
}
```

## Testing Checklist

- [ ] Canvas renders at 600px height
- [ ] Canvas is centered vertically in left panel
- [ ] Mouse hover works correctly on pipeline
- [ ] Click detection works on anomalies and segments
- [ ] Filter toggle button shows/hides filters smoothly
- [ ] Chevron icon rotates when toggling
- [ ] Legend is visible in top-right of canvas
- [ ] Controls are visible at bottom of canvas
- [ ] Right panel scrolls independently
- [ ] Critical zones list is clickable
- [ ] Window resize maintains canvas size
