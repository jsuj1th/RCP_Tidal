# Joint Comparison Feature - Quick Guide

## What It Does

After uploading a file, you'll see a **Joint Comparison** panel with buttons for each joint. Click any joint button to see:
- **Cyan dots** = Uploaded anomalies (new data)
- **Green dots** = Existing anomalies (from database)
- Side-by-side comparison stats

## How to Use

### 1. Upload Your File
Drag `test_upload_50_anomalies.csv` to the upload box

### 2. Click "Process & Visualize"
The visualization will show all uploaded anomalies

### 3. View Joint Comparison Panel
Below the upload button, you'll see:

```
┌─────────────────────────────────────┐
│ 📊 JOINT COMPARISON                 │
├─────────────────────────────────────┤
│ Joint 75        │ Joint 80    BOTH  │
│ Uploaded: 4     │ Uploaded: 4       │
│ Existing: 0     │ Existing: 0       │
├─────────────────────────────────────┤
│ Joint 90        │ Joint 120         │
│ Uploaded: 3     │ Uploaded: 1       │
│ Existing: 0     │ Existing: 0       │
└─────────────────────────────────────┘
```

### 4. Click Any Joint Button
- Camera flies to that joint
- Shows both uploaded (cyan) and existing (green) anomalies
- Right panel displays comparison stats

## Visual Legend

- 🔵 **Cyan dots** = Uploaded data (new)
- 🟢 **Green dots** = Existing data (from database)
- 🟣 **"BOTH" badge** = Joint has anomalies in both datasets

## Comparison Info Panel

When you click a joint, the right panel shows:

```
┌─────────────────────────────────────┐
│ Joint 75 Comparison                 │
├─────────────────────────────────────┤
│  Uploaded        │  Existing        │
│     4            │     0            │
│  New anomalies   │  From database   │
├─────────────────────────────────────┤
│ Legend:                             │
│ 🔵 Uploaded Data                    │
│ 🟢 Existing Data                    │
└─────────────────────────────────────┘
```

## Example Scenarios

### Scenario 1: New Joint (Only Uploaded Data)
```
Joint 75
Uploaded: 4  ← Shows 4 cyan dots
Existing: 0  ← No green dots
```

### Scenario 2: Existing Joint (Only Database Data)
```
Joint 150
Uploaded: 0  ← No cyan dots
Existing: 6  ← Shows 6 green dots
```

### Scenario 3: Both Datasets (Comparison)
```
Joint 200  [BOTH]
Uploaded: 3  ← Shows 3 cyan dots
Existing: 5  ← Shows 5 green dots
Total: 8 anomalies visible
```

## Testing Steps

1. **Upload test file** (`test_upload_50_anomalies.csv`)
2. **Process & visualize**
3. **Scroll down** to see Joint Comparison panel
4. **Click Joint 75** - should see 4 cyan dots
5. **Click Joint 260** - should see 7 cyan dots (most anomalies)
6. **Check info panel** - shows uploaded vs existing counts

## Features

✅ **Automatic joint detection** from both datasets  
✅ **Color-coded visualization** (cyan vs green)  
✅ **Side-by-side statistics** per joint  
✅ **"BOTH" badge** for joints with both types  
✅ **Focused view** when clicking joint button  
✅ **Detailed comparison** in info panel  

This makes it easy to compare new inspection data with your existing database!
