# UI Validation Display Guide

## Overview
The UI now displays validation information showing that matched anomalies are truly the same anomaly by checking distance and orientation tolerances.

---

## What's Displayed

### 1. Validation Badge (Anomaly Details Panel)

When you click on an anomaly, you'll see one of two validation badges:

#### ✅ **Validated Match** (Green Badge)
```
┌─────────────────────────────────────┐
│ ✓ Validated Match          95%     │
├─────────────────────────────────────┤
│ Distance Δ:    0.16 ft ✓           │
│ Orientation Δ: 11.5° ✓             │
│ Within tolerances: ±5ft, ±60°      │
└─────────────────────────────────────┘
```

**Means:**
- Distance difference ≤ 5 feet ✓
- Orientation difference ≤ 60 degrees ✓
- High confidence this is the same anomaly
- Percentage shows validation confidence (0-100%)

#### ⚠️ **Validation Warning** (Orange Badge)
```
┌─────────────────────────────────────┐
│ ⚠ Validation Warning               │
├─────────────────────────────────────┤
│ Distance Δ:    6.37 ft ✗           │
│ Orientation Δ: 5.2° ✓              │
│ ⚠️ Distance exceeds 5 ft tolerance │
└─────────────────────────────────────┘
```

**Means:**
- One or both tolerances exceeded
- May not be the same anomaly
- Requires manual review
- Failed criteria highlighted in orange

---

## 2. Critical Zones List Indicators

Each critical zone now shows a small validation icon:

```
┌─────────────────────────────────┐
│ #1 ✓  5.2%/yr                  │  ← Green checkmark = validated
│ Distance: 1250 ft               │
│ Depth: 82.5%                    │
│ ⚠️ Severe depth                 │
└─────────────────────────────────┘

┌─────────────────────────────────┐
│ #2 ⚠  4.8%/yr                  │  ← Orange warning = validation issue
│ Distance: 2340 ft               │
│ Depth: 75.3%                    │
│ ⚠️ High depth + growth          │
└─────────────────────────────────┘
```

**Icons:**
- ✓ (green) = Validated match
- ⚠ (orange) = Validation warning
- (no icon) = New anomaly (no match to validate)

---

## 3. Detailed Anomaly Information

When you click an anomaly, the full details panel shows:

### Validated Match Example:
```
┌──────────────────────────────────────────┐
│ ✓ Validated Match              97%      │
│ Distance Δ: 0.16 ft ✓                   │
│ Orientation Δ: 11.5° ✓                  │
│ Within tolerances: ±5ft, ±60°           │
└──────────────────────────────────────────┘

┌──────────────────────────────────────────┐
│ 🔴 Anomaly Detected                      │
├──────────────────────────────────────────┤
│ Status:        Critical                  │
│ Confidence:    Confident                 │
│ Joint No.:     2640                      │
│ Distance:      9452.29 ft                │
│ Orientation:   271.5° (9:00)             │
│ Depth:         19.0%                     │
│ Growth Rate:   3.0%/yr                   │
└──────────────────────────────────────────┘
```

### Validation Warning Example:
```
┌──────────────────────────────────────────┐
│ ⚠ Validation Warning                     │
│ Distance Δ: 6.37 ft ✗                    │
│ Orientation Δ: 5.2° ✓                   │
│ ⚠️ Distance exceeds 5 ft tolerance       │
└──────────────────────────────────────────┘

┌──────────────────────────────────────────┐
│ 🔴 Anomaly Detected                      │
│ ... (rest of details)                    │
└──────────────────────────────────────────┘
```

---

## How to Use

### Step 1: Run Analytics with Validation
```bash
python src/analytics.py
```

This will:
- Calculate distance and orientation differences
- Check against tolerances (±5ft, ±60°)
- Add validation flags to ui_payload.json
- Calculate validation confidence scores

### Step 2: Start the Viewer
```bash
cd viewer
npm run dev
```

### Step 3: Explore Anomalies

1. **Check Critical Zones List**
   - Look for ✓ (validated) or ⚠ (warning) icons
   - Green checkmarks = high confidence matches
   - Orange warnings = need review

2. **Click an Anomaly**
   - See full validation details
   - Check distance and orientation differences
   - Review confidence percentage

3. **Interpret Results**
   - **95-100% confidence**: Excellent match, very likely same anomaly
   - **80-95% confidence**: Good match, probably same anomaly
   - **50-80% confidence**: Moderate match, review recommended
   - **<50% confidence**: Poor match, may be different anomaly

---

## Validation Criteria

### Distance Tolerance: ±5.0 feet
```
Valid:   |dist_2022 - dist_2015| ≤ 5.0 ft
Example: 9452.13 ft → 9452.29 ft = 0.16 ft ✓
```

### Orientation Tolerance: ±60 degrees
```
Valid:   |orient_2022 - orient_2015| ≤ 60°
Example: 283° → 271.5° = 11.5° ✓

Special case (wraparound):
Example: 350° → 10° = 20° (not 340°) ✓
```

### Overall Validation
```
is_validated = distance_ok AND orientation_ok
```

### Confidence Score
```
dist_score = 100 × (1 - dist_diff / 5.0)
orient_score = 100 × (1 - orient_diff / 60.0)
confidence = (dist_score + orient_score) / 2
```

---

## Visual Examples

### Example 1: High Confidence Match (97%)
```
2015 → 2022 Comparison:
  Distance:    9452.13 ft → 9452.29 ft (Δ 0.16 ft)
  Orientation: 283° → 271.5° (Δ 11.5°)
  Depth:       16% → 19% (growth: 3%)

UI Display:
  ┌─────────────────────────────┐
  │ ✓ Validated Match      97% │
  │ Distance Δ: 0.16 ft ✓      │
  │ Orientation Δ: 11.5° ✓     │
  └─────────────────────────────┘
```

### Example 2: Moderate Confidence Match (84%)
```
2015 → 2022 Comparison:
  Distance:    9453.04 ft → 9452.98 ft (Δ 0.06 ft)
  Orientation: 89° → 70° (Δ 19°)
  Depth:       13% → 20% (growth: 7%)

UI Display:
  ┌─────────────────────────────┐
  │ ✓ Validated Match      84% │
  │ Distance Δ: 0.06 ft ✓      │
  │ Orientation Δ: 19° ✓       │
  └─────────────────────────────┘
```

### Example 3: Validation Warning (Distance)
```
2015 → 2022 Comparison:
  Distance:    9452.13 ft → 9458.50 ft (Δ 6.37 ft)
  Orientation: 90° → 95° (Δ 5°)

UI Display:
  ┌─────────────────────────────────────┐
  │ ⚠ Validation Warning               │
  │ Distance Δ: 6.37 ft ✗              │
  │ Orientation Δ: 5° ✓                │
  │ ⚠️ Distance exceeds 5 ft tolerance │
  └─────────────────────────────────────┘
```

### Example 4: Validation Warning (Orientation)
```
2015 → 2022 Comparison:
  Distance:    10000.00 ft → 10000.10 ft (Δ 0.10 ft)
  Orientation: 0° → 180° (Δ 180°)

UI Display:
  ┌──────────────────────────────────────────┐
  │ ⚠ Validation Warning                    │
  │ Distance Δ: 0.10 ft ✓                   │
  │ Orientation Δ: 180° ✗                   │
  │ ⚠️ Orientation exceeds 60° tolerance    │
  └──────────────────────────────────────────┘
```

---

## Color Coding

| Element | Color | Meaning |
|---------|-------|---------|
| Green badge | `bg-green-900/20` | Validated match |
| Green checkmark ✓ | `text-green-400` | Within tolerance |
| Orange badge | `bg-orange-900/20` | Validation warning |
| Orange warning ⚠ | `text-orange-400` | Exceeds tolerance |
| Red cross ✗ | `text-red-400` | Failed validation |

---

## Data Flow

```
1. matching.py
   ↓ Creates matched_anomalies.csv
   
2. analytics.py
   ↓ Calculates validation metrics
   ↓ - dist_diff_ft
   ↓ - orient_diff_deg
   ↓ - is_validated
   ↓ - validation_confidence
   ↓ Exports to ui_payload.json
   
3. viewer/src/main.js
   ↓ Loads ui_payload.json
   ↓ Displays validation badges
   ↓ Shows confidence scores
   ↓ Highlights tolerance violations
```

---

## Troubleshooting

### No validation badges showing?
1. Check if `is_validated` field exists in ui_payload.json
2. Re-run `python src/analytics.py`
3. Refresh the browser

### All anomalies show warnings?
1. Check tolerance values in analytics.py
2. Verify alignment was performed correctly
3. Review matched_anomalies.csv for large differences

### Confidence scores seem wrong?
1. Verify distance and orientation differences
2. Check calculation: `(dist_score + orient_score) / 2`
3. Ensure values are within expected ranges

---

## Summary

✅ **Validation badges** show if anomaly match is verified  
✅ **Distance and orientation differences** displayed  
✅ **Confidence percentage** shows match quality  
✅ **Tolerance violations** clearly highlighted  
✅ **Visual indicators** in critical zones list  
✅ **Color-coded** for quick assessment  

**Result**: You can now visually prove that matched anomalies are truly the same physical defect by showing they meet industry-standard distance (±5ft) and orientation (±60°) tolerances!
