# Validation in UI - Quick Visual Guide

## What You'll See

### 1. When You Click an Anomaly

#### ✅ Validated Match (Green)
```
╔═══════════════════════════════════════╗
║ ✓ Validated Match            97%     ║
╠═══════════════════════════════════════╣
║ Distance Δ:    0.16 ft ✓             ║
║ Orientation Δ: 11.5° ✓               ║
║ Within tolerances: ±5ft, ±60°        ║
╚═══════════════════════════════════════╝

This means: SAME ANOMALY ✓
- Distance difference: 0.16 feet (within 5 ft)
- Angle difference: 11.5 degrees (within 60°)
- 97% confidence it's the same defect
```

#### ⚠️ Validation Warning (Orange)
```
╔═══════════════════════════════════════╗
║ ⚠ Validation Warning                 ║
╠═══════════════════════════════════════╣
║ Distance Δ:    6.37 ft ✗             ║
║ Orientation Δ: 5.2° ✓                ║
║ ⚠️ Distance exceeds 5 ft tolerance   ║
╚═══════════════════════════════════════╝

This means: QUESTIONABLE MATCH ⚠️
- Distance difference: 6.37 feet (exceeds 5 ft limit)
- Angle difference: 5.2 degrees (OK)
- May be different anomalies - needs review
```

---

### 2. Critical Zones List

```
Critical Zones                    [3]
────────────────────────────────────
┌─────────────────────────────────┐
│ #1 ✓  5.2%/yr                  │ ← Green ✓ = Validated
│ Distance: 1250 ft               │
│ Depth: 82.5%                    │
│ ⚠️ Severe depth                 │
└─────────────────────────────────┘

┌─────────────────────────────────┐
│ #2 ⚠  4.8%/yr                  │ ← Orange ⚠ = Warning
│ Distance: 2340 ft               │
│ Depth: 75.3%                    │
│ ⚠️ Rapid growth rate            │
└─────────────────────────────────┘

┌─────────────────────────────────┐
│ #3    3.9%/yr                   │ ← No icon = New anomaly
│ Distance: 3450 ft               │
│ Depth: 68.2%                    │
│ ⚠️ High depth + growth          │
└─────────────────────────────────┘
```

---

## How to Interpret

### Confidence Scores

| Score | Badge Color | Meaning | Action |
|-------|-------------|---------|--------|
| 95-100% | 🟢 Green | Excellent match | Trust it |
| 80-95% | 🟢 Green | Good match | Likely same |
| 50-80% | 🟠 Orange | Moderate | Review |
| <50% | 🟠 Orange | Poor match | Investigate |

### Tolerance Checks

| Check | Limit | Pass | Fail |
|-------|-------|------|------|
| Distance | ±5 ft | ✓ Green | ✗ Orange |
| Orientation | ±60° | ✓ Green | ✗ Orange |

---

## Real Example

### Scenario: Inspector clicks anomaly at 9452 ft

**UI Shows:**
```
╔═══════════════════════════════════════╗
║ ✓ Validated Match            97%     ║
╠═══════════════════════════════════════╣
║ Distance Δ:    0.16 ft ✓             ║
║ Orientation Δ: 11.5° ✓               ║
║ Within tolerances: ±5ft, ±60°        ║
╚═══════════════════════════════════════╝

╔═══════════════════════════════════════╗
║ 🔴 Anomaly Detected                   ║
╠═══════════════════════════════════════╣
║ Status:        Critical               ║
║ Confidence:    Confident              ║
║ Joint No.:     2640                   ║
║ Distance:      9452.29 ft             ║
║ Orientation:   271.5° (9:00)          ║
║ Depth:         19.0%                  ║
║ Growth Rate:   3.0%/yr                ║
╚═══════════════════════════════════════╝
```

**Inspector's Conclusion:**
✅ This is definitely the same anomaly from 2015
✅ It grew from 16% to 19% depth (3% growth)
✅ Growing at 3% per year
✅ Validated by distance (0.16 ft) and angle (11.5°)
✅ 97% confidence - very reliable match

---

## Setup Steps

### 1. Update Analytics
```bash
python src/analytics.py
```
This adds validation data to ui_payload.json

### 2. Start Viewer
```bash
cd viewer
npm run dev
```

### 3. Explore
- Click anomalies to see validation badges
- Check critical zones for ✓ or ⚠ icons
- Review confidence percentages

---

## Files Modified

1. ✅ `src/analytics.py` - Calculates validation metrics
2. ✅ `viewer/src/main.js` - Displays validation badges
3. ✅ `data/ui_payload.json` - Contains validation data

---

## Quick Reference

**Tolerances:**
- Distance: ±5 feet
- Orientation: ±60 degrees (2 clock hours)

**Validation:**
- Both must pass = ✓ Validated
- Either fails = ⚠ Warning

**Confidence:**
- High (>80%) = Trust it
- Low (<50%) = Review it

**Visual Indicators:**
- 🟢 Green badge = Validated match
- 🟠 Orange badge = Validation warning
- ✓ Green checkmark = Within tolerance
- ✗ Orange cross = Exceeds tolerance
- ⚠ Orange warning = Needs review

---

## Summary

You can now **visually prove** an anomaly is the same anomaly by:

1. ✅ Seeing the validation badge (green = validated)
2. ✅ Checking distance difference (must be ≤5 ft)
3. ✅ Checking orientation difference (must be ≤60°)
4. ✅ Reviewing confidence score (higher = better)
5. ✅ Looking for ✓ icon in critical zones list

**Result:** Clear, visual proof that matched anomalies meet industry-standard tolerances! 🎯
