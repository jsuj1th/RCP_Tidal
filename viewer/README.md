# Pipeline Sentinel 3D Viewer

## Recent UI Improvements

### Layout Changes
- **Split Screen Design**: Pipeline visualization now occupies the left 50% of the screen, with controls on the right 50%
- **Better Space Utilization**: More room for both 3D visualization and detailed controls

### Enhanced Features

#### 1. Collapsible Filters
- Click the "Filters & Search" header to toggle filter visibility
- Reduces visual clutter when filters aren't needed
- Smooth animation transitions

#### 2. Improved Legend
- Relocated to top-right corner of the 3D canvas
- Better visibility with enhanced styling
- Cleaner icon representations

#### 3. Enhanced Control Panel
- Modern card-based design with better visual hierarchy
- Improved spacing and readability
- Custom scrollbar styling for better aesthetics

#### 4. Critical Zones List
- Dedicated section showing all critical anomalies
- Sorted by growth rate (highest first)
- Click any item to fly to that location
- Shows count badge for quick reference

#### 5. Better Visual Feedback
- Enhanced hover effects on buttons and cards
- Improved color coding for anomaly severity
- Better focus states on input fields
- Smooth transitions throughout

### How to Use

1. **Start the development server**:
   ```bash
   npm run dev
   ```

2. **Navigate the 3D view**:
   - Left mouse: Rotate camera
   - Right mouse: Pan
   - Scroll: Zoom in/out
   - Click objects for details

3. **Use filters**:
   - Toggle filters section to show/hide
   - Joint Range: Filter by joint number range
   - Neighborhood: Show joints around a specific location

4. **Quick actions**:
   - "Fly to Next Critical Zone" cycles through critical anomalies
   - Click items in Critical Zones list to jump directly

### Technical Details

- Built with Three.js for 3D rendering
- Tailwind CSS for styling
- Vite for fast development
- Responsive design principles
