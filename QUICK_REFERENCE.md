# Quick Reference Guide

## UI Changes at a Glance

### Legend (Top-Right of Canvas)
```
Before:                          After:
┌─────────────────┐             ┌─────────────────┐
│ Legend          │             │ Anomaly Status  │
├─────────────────┤             ├─────────────────┤
│ 🔴 Critical     │             │ 🔴 Critical     │
│ 🟠 Review Req   │             │ 🟠 Review Req   │
│ 🟢 Normal       │             │ 🟢 Normal       │
│ ─────────────── │             └─────────────────┘
│ 🟢 Tap          │  ← REMOVED
│ 🔵 Tee          │  ← REMOVED
│ ▬  Weld         │  ← REMOVED
└─────────────────┘
```

### Show Joint Labels Feature
```
Toggle OFF:                     Toggle ON:
                               
    ═══════════                    ┌─────────┐
    ═══════════                    │Joint 123│
    ═══════════                    │ 1250 ft │
                                   └─────────┘
                                       ↓
                                   ═══════════
                                   ═══════════
                                   ═══════════
```

### Filters Section
```
Before:                          After:
┌─────────────────┐             ┌─────────────────┐
│ Quick Actions   │             │ Quick Actions   │
├─────────────────┤             ├─────────────────┤
│ ☐ Show Labels   │             │ ☐ Show Labels   │
│ 🚨 Next Critical│             │ 🚨 Next Critical│
└─────────────────┘             │ 🎛️ Show Filters │ ← NEW
                                └─────────────────┘
┌─────────────────┐                    ↓
│ ▼ Filters       │             (Click to expand)
├─────────────────┤                    ↓
│ Joint Range     │             ┌─────────────────┐
│ [Start] [End]   │             │ Joint Range     │
│ [Apply] [Reset] │             │ [S] [E]         │ ← Smaller
│                 │             │ [Apply] [Reset] │
│ Neighborhood    │             │                 │
│ [Center] [Rad]  │             │ Neighborhood    │
│ [Apply]         │             │ [C] [R]         │ ← Smaller
└─────────────────┘             │ [Apply]         │
                                └─────────────────┘
```

### Critical Zones List
```
Before:                          After:
┌─────────────────┐             ┌─────────────────┐
│ #1  5.2%/yr     │             │ #1  5.2%/yr     │
│ Dist: 1250 ft   │             │ Dist: 1250 ft   │
│ Depth: 82.5%    │             │ Depth: 82.5%    │
│                 │             │ ⚠️ Severe depth │ ← NEW
└─────────────────┘             └─────────────────┘
```

---

## Algorithm: Hungarian Algorithm

### Visual Representation

```
2015 Anomalies          Cost Matrix          2022 Anomalies
    A1 ────────────────── 2.1 ──────────────────── B1
    A2 ────────────────── 3.5 ──────────────────── B2
    A3 ────────────────── 1.8 ──────────────────── B3
    A4 ────────────────── 4.2 ──────────────────── B4

Hungarian Algorithm finds optimal one-to-one matching:
    A1 ──────────────────────────────────────────→ B1 ✓
    A2 ──────────────────────────────────────────→ B3 ✓
    A3 ──────────────────────────────────────────→ B2 ✓
    A4 ──────────────────────────────────────────→ B4 ✓

Minimizes total cost: 2.1 + 1.8 + 3.5 + 4.2 = 11.6
```

### Cost Calculation

```
Cost = √[(Δdistance)² + (Δorientation/30)²]

Example:
  A1: distance=1000ft, orientation=90°
  B1: distance=1002ft, orientation=95°
  
  Cost = √[(1002-1000)² + (95-90)/30)²]
       = √[4 + 0.028]
       = 2.01 ft
```

### Constraints

```
Hard Constraint: Distance Difference ≤ 5 ft

Valid Match:                    Invalid Match:
A: 1000 ft ──2ft──→ B: 1002 ft  A: 1000 ft ──8ft──→ B: 1008 ft
   ✓ Allowed                       ✗ Rejected (cost = ∞)
```

---

## Feature Comparison

| Feature | Before | After |
|---------|--------|-------|
| Legend Items | 7 | 3 |
| Joint Labels | Not working | ✅ Working |
| Critical Explanations | None | ✅ Added |
| Filter Visibility | Always visible | Toggle button |
| Filter Size | Large | Compact (30% smaller) |

---

## Algorithm Comparison

| Algorithm | Used? | Why/Why Not |
|-----------|-------|-------------|
| **Hungarian** | ✅ **YES** | Optimal, fast, handles constraints |
| DTW | ❌ No | For time series, not spatial points |
| ICP | ❌ No | Overkill for 2D data |
| Graph-based | ❌ No | Unnecessary complexity |
| Ensemble | ❌ No | Single metric sufficient |
| Deep Learning | ❌ No | Insufficient training data |

---

## Key Metrics

### Matching Parameters:
- **Distance Tolerance**: 5.0 ft
- **Orientation Scaling**: 30 deg/ft
- **Cost Threshold**: 1e6 (infinite)

### Critical Zone Thresholds:
- **Severe Depth**: ≥ 80%
- **Rapid Growth**: ≥ 5% per year
- **High Risk Combo**: Depth ≥60% AND Growth ≥2%/yr

---

## Testing Commands

```bash
# Start viewer
cd viewer
npm run dev

# Run matching algorithm
cd ..
python src/matching.py

# Run full pipeline
python src/ingestion.py
python src/create_master.py
python src/alignment.py
python src/matching.py
python src/analytics.py
```

---

## File Structure

```
project/
├── src/
│   ├── matching.py          ← Hungarian Algorithm
│   ├── alignment.py         ← Linear Interpolation
│   ├── analytics.py         ← Growth Analysis
│   └── ...
├── viewer/
│   ├── index.html           ← UI (legend removed)
│   ├── src/
│   │   ├── main.js          ← Labels + filters
│   │   └── style.css        ← Compact styling
│   └── ...
├── ALGORITHM_EXPLANATION.md ← Detailed algorithm docs
└── QUICK_REFERENCE.md       ← This file
```

---

## Summary

✅ **Removed**: Tap, Tee, Weld from legend  
✅ **Added**: Working joint labels feature  
✅ **Added**: Critical zone explanations  
✅ **Added**: Dedicated filter toggle button  
✅ **Improved**: More compact filter design  
✅ **Documented**: Hungarian Algorithm usage  

**Algorithm**: Hungarian (Optimal Bipartite Matching)  
**Preprocessing**: Linear Interpolation Alignment  
**Features**: Distance + Orientation  
**Constraint**: 5 ft tolerance  
