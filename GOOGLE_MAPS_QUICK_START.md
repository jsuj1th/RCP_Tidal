# 🗺️ Google Maps - Quick Start

## ✅ What's Integrated

The Google Maps integration is now **fully implemented** in your application!

### Features Active:
- ✅ Google Maps background layer
- ✅ Pipeline route overlay (blue line)
- ✅ Anomaly markers (red/orange dots)
- ✅ Sensitive location markers (schools, hospitals, etc.)
- ✅ Proximity detection and alerts
- ✅ Toggle between 3D view and Map view
- ✅ Auto-highlight anomalies on map when clicked

## 🚀 Setup (2 Steps)

### Step 1: Add Your Google Maps API Key

Edit `viewer/src/config.js`:

```javascript
export const GOOGLE_MAPS_API_KEY = 'YOUR_GOOGLE_MAPS_API_KEY_HERE';
```

**Get API Key:**
1. Go to https://console.cloud.google.com/
2. Create/select project
3. Enable "Maps JavaScript API"
4. Create credentials → API Key
5. Copy and paste into config.js

### Step 2: Refresh the Page

The map will automatically initialize when you reload!

## 🎯 How to Use

### Toggle Map View
1. Look for the **"Show Map"** button in the legend (top-right)
2. Click to switch between 3D view and Map view
3. Button changes to "Show 3D" when map is visible

### View Anomalies on Map
- Red markers = Critical anomalies
- Orange markers = Normal anomalies
- Click markers for details

### Proximity Alerts
When you click an anomaly that's near a sensitive location:
- **Proximity Alert badge** appears (animated)
- Shows distance to nearby schools/hospitals/etc.
- Alert level: CRITICAL / HIGH / MEDIUM
- Recommended actions displayed

## 📍 Example Proximity Alert

```
⚠️ PROXIMITY ALERT: HIGH

Near Sensitive Location:
🏫 School
Lincoln Elementary School
247 ft away
Safety radius: 500 ft

⚠️ Priority inspection within 48 hours
```

## 🗺️ Map Features

### Pipeline Route
- Blue polyline showing pipeline path
- Follows configured direction (45° NE by default)
- Spans entire pipeline length

### Sensitive Locations
- 🏫 Schools (500ft radius)
- 🏥 Hospitals (1000ft radius)
- 🏘️ Residential (300ft radius)
- 🏛️ Public facilities (400ft radius)
- Color-coded safety circles

### Interactive
- Zoom and pan
- Click markers for info windows
- Hybrid view (satellite + roads)
- Auto-center on selected anomaly

## ⚙️ Configuration

### Change Pipeline Start Location

Edit `viewer/src/config.js`:

```javascript
export const PIPELINE_START_COORDS = {
    lat: 29.7604,  // Your latitude
    lng: -95.3698  // Your longitude
};

export const PIPELINE_DIRECTION = 45; // Direction in degrees
```

### Add Real Sensitive Locations

Edit `viewer/src/geoData.js`:

```javascript
export const SENSITIVE_LOCATIONS = [
    {
        name: "Your School Name",
        type: "school",
        lat: 29.7650,
        lng: -95.3650,
        radius: 500,
        priority: "high"
    },
    // Add more...
];
```

## 🔍 Troubleshooting

### Map Not Showing?
1. Check API key in `config.js`
2. Verify Maps JavaScript API is enabled in Google Cloud
3. Check browser console for errors
4. Click "Show Map" button in legend

### No Proximity Alerts?
- Alerts only show when anomaly is within radius of sensitive location
- Check `geoData.js` has locations configured
- Verify coordinates are correct

### Markers Not Appearing?
- Wait for map to fully load
- Check anomaly data has `dist_22_aligned` field
- Verify pipeline coordinates are set

## 💰 Cost

**Google Maps API:**
- First 28,000 loads/month: **FREE**
- After that: $7 per 1,000 loads
- Typical usage: 100-500 loads/month = FREE

## 🎉 You're Done!

Just add your API key and the map will work automatically!

**Current Status:**
- ✅ Code integrated
- ✅ UI added
- ✅ Toggle button working
- ✅ Proximity detection active
- ⚠️ Needs API key to display

**Server running at:** http://localhost:5173/
