# 🔧 Troubleshooting Guide

## Common Issues & Solutions

### 1. "Cannot read property 'maps' of undefined"

**Cause:** Google Maps API not loaded yet

**Solution:**
- Check your API key in `viewer/src/config.js`
- Verify Maps JavaScript API is enabled in Google Cloud Console
- Check browser console for API key errors

### 2. Map Container Not Found

**Cause:** HTML element missing

**Solution:**
- Verify `<div id="map-container">` exists in `viewer/index.html`
- Check that it's inside the `canvas-container` div

### 3. Proximity Detection Not Working

**Cause:** Missing imports or data

**Solution:**
- Check that `geoData.js` is imported in `main.js`
- Verify anomaly has `dist_22_aligned` field
- Check console for proximity errors (they're caught and logged)

### 4. Map Toggle Button Not Showing

**Cause:** Button hidden due to map initialization failure

**Solution:**
- Check browser console for map errors
- Verify API key is correct
- Button auto-hides if map fails to load

### 5. "Failed to initialize Google Maps"

**Possible Causes:**
1. Invalid API key
2. API not enabled in Google Cloud
3. Network/firewall blocking Google APIs
4. API key restrictions too strict

**Solutions:**
1. Double-check API key in `config.js`
2. Enable "Maps JavaScript API" in Google Cloud Console
3. Check network connection
4. Remove API key restrictions temporarily for testing

## Debugging Steps

### Step 1: Check Browser Console

Open browser DevTools (F12) and look for:
- Red errors
- Yellow warnings
- "Google Maps" related messages

### Step 2: Verify API Key

```javascript
// In browser console, type:
console.log(GOOGLE_MAPS_API_KEY);
```

Should show your API key, not "YOUR_GOOGLE_MAPS_API_KEY_HERE"

### Step 3: Test Map Loading

```javascript
// In browser console, type:
window.google
```

Should show Google Maps API object if loaded successfully

### Step 4: Check Map Container

```javascript
// In browser console, type:
document.getElementById('map-container')
```

Should return the div element, not null

### Step 5: Test Proximity Detection

```javascript
// In browser console, type:
viewer.anomalies[0].userData
```

Should show anomaly data with `dist_22_aligned` field

## Error Messages & Fixes

### "RefererNotAllowedMapError"

**Cause:** API key restricted to specific domains

**Fix:**
1. Go to Google Cloud Console → Credentials
2. Edit your API key
3. Under "Application restrictions":
   - Add `http://localhost:5173/*`
   - Add `http://localhost:*`
4. Save and wait 5 minutes

### "ApiNotActivatedMapError"

**Cause:** Maps JavaScript API not enabled

**Fix:**
1. Go to Google Cloud Console → APIs & Services
2. Click "Enable APIs and Services"
3. Search for "Maps JavaScript API"
4. Click "Enable"

### "InvalidKeyMapError"

**Cause:** API key is invalid or deleted

**Fix:**
1. Go to Google Cloud Console → Credentials
2. Create a new API key
3. Copy to `config.js`

### Module Import Errors

**Error:** `Cannot find module './geoData.js'`

**Fix:**
- Check file exists: `viewer/src/geoData.js`
- Check import path in `main.js`
- Restart dev server

## Performance Issues

### Map Loading Slowly

**Solutions:**
- Reduce number of anomaly markers
- Simplify pipeline polyline (increase segment length)
- Use map only when needed (toggle off by default)

### Page Reloading Constantly

**Cause:** File watching triggering too many reloads

**Solution:**
- Check for syntax errors
- Restart dev server: `Ctrl+C` then `npm run dev`

## Still Having Issues?

### Check These Files:

1. **`viewer/src/config.js`**
   - API key present?
   - No syntax errors?

2. **`viewer/src/main.js`**
   - Imports at top correct?
   - No red squiggly lines?

3. **`viewer/index.html`**
   - Map container div present?
   - Toggle button present?

### Console Commands for Debugging:

```javascript
// Check if viewer initialized
window.viewer

// Check map integration
window.viewer.mapIntegration

// Check if map is visible
window.viewer.mapVisible

// Check anomalies loaded
window.viewer.anomalies.length

// Test proximity detection manually
checkProximityToSensitiveLocations(15000)
```

### Disable Map Temporarily

If map is causing issues, comment out in `main.js`:

```javascript
// await this.initializeMap(); // DISABLED FOR TESTING
```

This will disable map but keep rest of app working.

## Getting Help

When reporting issues, please provide:
1. Error message from browser console
2. Browser and version (Chrome 120, Firefox 121, etc.)
3. Operating system
4. Steps to reproduce
5. Screenshot of error (if applicable)

## Quick Fixes

### Reset Everything

```bash
# Stop server
Ctrl+C

# Clear node modules
rm -rf viewer/node_modules

# Reinstall
cd viewer
npm install

# Restart
npm run dev
```

### Check API Key Works

Test in browser:
```
https://maps.googleapis.com/maps/api/js?key=YOUR_KEY_HERE
```

Should load JavaScript, not show error page.

## Success Indicators

✅ **Map Working:**
- No console errors
- "Google Maps initialized successfully" in console
- Toggle button visible
- Map shows when clicked

✅ **Proximity Detection Working:**
- Proximity badge appears for nearby anomalies
- Alert level shown (CRITICAL/HIGH/MEDIUM)
- Distance displayed correctly

✅ **Everything Working:**
- 3D view loads
- Map toggle works
- Anomalies clickable
- Proximity alerts show
- No console errors
