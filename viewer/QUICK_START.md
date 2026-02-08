# Quick Start Guide

## Run the Application

```bash
cd viewer
npm run dev
```

Then open your browser to the URL shown (usually http://localhost:5173)

## What You'll See

### Left Side (50% of screen)
- **3D Pipeline Visualization** in a fixed 600px tall container
- **Legend** in top-right corner
- **Camera Controls** at bottom (slider, pitch, yaw)

### Right Side (50% of screen)
- **Header** - Pipeline Sentinel title
- **Quick Actions** - Toggle labels, fly to critical zones
- **Filters** - Click header to show/hide (collapsible!)
  - Joint Range Filter
  - Neighborhood Filter
- **Selected Object** - Details when you click something
- **Critical Zones** - List of all critical anomalies

## Key Features

### 1. Toggle Filters
**Click the "Filters & Search" header** to show/hide the filter section
- Smooth animation
- Chevron rotates to indicate state
- Reduces clutter when not needed

### 2. Fixed Canvas Size
- Canvas is always 600px tall
- Centered in left panel
- Rounded corners with border
- Professional, contained look

### 3. Navigate the Pipeline
- **Left mouse**: Rotate camera
- **Right mouse**: Pan view
- **Scroll wheel**: Zoom in/out
- **Slider**: Move along pipeline length

### 4. Interact with Objects
- **Hover**: See tooltip with joint/distance info
- **Click anomaly**: View detailed information
- **Click pipe segment**: View joint details
- **Click critical zone**: Jump to that location

### 5. Use Filters
- **Joint Range**: Show only joints between start and end
- **Neighborhood**: Show joints around a center point
- **Reset**: Clear all filters

## Tips

- Start by clicking "Fly to Next Critical Zone" to see critical anomalies
- Use the Critical Zones list to quickly jump to problem areas
- Hide filters when you don't need them for a cleaner view
- The pipeline slider lets you quickly scan the entire length

## Troubleshooting

**Canvas not showing?**
- Check browser console for errors
- Ensure data files are in `/viewer/public/data/`

**Filters not hiding?**
- Click the "Filters & Search" header (not the content)
- Look for the chevron icon rotating

**Mouse not working?**
- Make sure you're clicking inside the canvas area
- Canvas has a visible border showing its bounds

## Data Files Required

The app needs these files in `/viewer/public/data/`:
- `ui_payload.json` - Anomaly data
- `reference_payload.json` - Pipeline reference data

These should already be in place from your data processing scripts.
