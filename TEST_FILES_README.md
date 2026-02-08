# Test Files for Upload Feature

I've created **two test files** for you to test the upload feature:

## 1. Simple Format: `test_upload.csv`
**Location:** `/Users/sujithjulakanti/Desktop/RCP_Tidal-1/test_upload.csv`

**Format:** Standard column names (easy to map)
- 17 real anomalies from your 2022 inspection data
- Columns: `distance`, `event_type`, `orientation`, `depth`, `joint_number`, etc.
- **Use this first** - it will map perfectly with no issues

## 2. Original Format: `test_upload_original_format.csv`
**Location:** `/Users/sujithjulakanti/Desktop/RCP_Tidal-1/test_upload_original_format.csv`

**Format:** Exact column names from your original Excel file
- Same 17 anomalies
- Columns: `ILI Wheel Count [ft.]`, `O'clock [hh:mm]`, `Metal Loss Depth [%]`, etc.
- **Use this second** - tests the fuzzy column mapping feature!

## How to Test

### Quick Test (5 minutes)

1. **Start the API server:**
   ```bash
   cd /Users/sujithjulakanti/Desktop/RCP_Tidal-1
   ./start_api.sh
   ```

2. **Start the viewer** (new terminal):
   ```bash
   cd /Users/sujithjulakanti/Desktop/RCP_Tidal-1/viewer
   npm run dev
   ```

3. **Test upload:**
   - Open viewer in browser
   - Drag `test_upload.csv` to the upload box
   - Wait for success message
   - Click "Process & Visualize"
   - You should see 17 anomalies on the pipeline!

4. **Test fuzzy matching:**
   - Refresh the page
   - Drag `test_upload_original_format.csv`
   - Check console for column mapping report
   - Should automatically map all columns correctly!

## What You'll See

**Expected Results:**
- ✅ 17 anomalies loaded
- ✅ Depths ranging from 12% to 32%
- ✅ Joints 75, 80, 90, 120, 200, 215, 230
- ✅ Various orientations (0-360°)
- ✅ All anomalies visualized on 3D pipeline

**Console Output:**
```
Column Mapping Report:
==================================================
  'ILI Wheel Count [ft.]' → 'distance'
  'O'clock [hh:mm]' → 'orientation'
  'Metal Loss Depth [%]' → 'depth'
  'Joint Number' → 'joint_number'
  ...

✓ Successfully processed 17 rows
```

## Data Preview

The test files contain real anomalies from your pipeline:
- Joint 75: 4 anomalies (17-30% depth)
- Joint 80: 4 anomalies (12-32% depth)
- Joint 90: 3 anomalies (15-23% depth)
- Joint 120: 1 anomaly (23% depth)
- Joint 200: 3 anomalies (12-15% depth)
- Joint 215: 1 anomaly (15% depth)
- Joint 230: 1 anomaly (14% depth)

All are "metal loss" type anomalies from your 2022 inspection run.

Enjoy testing! 🚀
