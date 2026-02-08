# "Review Required" Classification Guide

## Overview
The "Review Required" label is now based on **5 clear, data-driven criteria** instead of just match cost. The UI shows exactly WHY review is needed.

---

## Review Required Criteria

### Criterion 1: Spatial Validation Failed ⚠️
**Trigger:** Distance OR orientation exceeds tolerance

```python
# Distance tolerance: ±5 feet
# Orientation tolerance: ±60 degrees

if distance_diff > 5.0 OR orientation_diff > 60.0:
    → Review Required
    → Reason: "Spatial validation failed"
```

**Example:**
- Distance diff: 6.37 ft (exceeds 5 ft) ✗
- **Action:** May be different anomalies, verify location

**Why this matters:** If the anomaly isn't in the same location, it's probably not the same defect.

---

### Criterion 2: High Match Cost ⚠️
**Trigger:** Match cost > 0.6

```python
if match_cost > 0.6:
    → Review Required
    → Reason: "High match cost (>0.6)"
```

**Example:**
- Match cost: 0.85 (poor algorithmic match) ✗
- **Action:** Algorithm not confident, verify manually

**Why this matters:** High match cost means the Hungarian algorithm struggled to find a good pairing.

---

### Criterion 3: Low Overall Confidence ⚠️
**Trigger:** Anomaly confidence < 70%

```python
if anomaly_confidence < 70%:
    → Review Required
    → Reason: "Low confidence (<70%)"
```

**Example:**
- Anomaly confidence: 58% (below threshold) ✗
- **Action:** Multiple factors indicate uncertainty

**Why this matters:** Low confidence means several validation factors are weak.

---

### Criterion 4: Unusual Depth Change ⚠️
**Trigger:** Depth change > 30% OR < -10%

```python
depth_change = depth_2022 - depth_2015

if depth_change > 30% OR depth_change < -10%:
    → Review Required
    → Reason: "Unusual depth change"
```

**Examples:**

**Too much growth:**
- 2015: 15% → 2022: 50% (35% growth) ✗
- **Action:** Verify measurement, may be different anomaly

**Shrinkage (impossible):**
- 2015: 30% → 2022: 18% (-12% shrinkage) ✗
- **Action:** Likely measurement error or different anomaly

**Why this matters:** Anomalies don't shrink, and extreme growth is suspicious.

---

### Criterion 5: Type Mismatch ⚠️
**Trigger:** Anomaly type different between runs

```python
if event_type_2015 != event_type_2022:
    → Review Required
    → Reason: "Type mismatch"
```

**Example:**
- 2015: "metal loss" → 2022: "dent" ✗
- **Action:** Verify type, may be different anomaly

**Why this matters:** Anomaly type shouldn't change (metal loss doesn't become a dent).

---

## UI Display

### Example 1: Spatial Validation Failed

```
╔══════════════════════════════════════════╗
║ ⚠ Validation Warning                     ║
║ Distance Δ: 6.37 ft ✗                    ║
║ ⚠️ Distance exceeds 5 ft tolerance       ║
╚══════════════════════════════════════════╝

╔══════════════════════════════════════════╗
║ 🟠 Anomaly Detected                      ║
╠══════════════════════════════════════════╣
║ Match Confidence: Review Required        ║
║                                          ║
║ ┌────────────────────────────────────┐  ║
║ │ Review Reasons:                    │  ║
║ │ Spatial validation failed          │  ║
║ └────────────────────────────────────┘  ║
╚══════════════════════════════════════════╝
```

---

### Example 2: Multiple Reasons

```
╔══════════════════════════════════════════╗
║ 🟠 Anomaly Detected                      ║
╠══════════════════════════════════════════╣
║ Match Confidence: Review Required        ║
║                                          ║
║ ┌────────────────────────────────────┐  ║
║ │ Review Reasons:                    │  ║
║ │ High match cost (>0.6);            │  ║
║ │ Low confidence (<70%);             │  ║
║ │ Unusual depth change               │  ║
║ └────────────────────────────────────┘  ║
╚══════════════════════════════════════════╝
```

---

### Example 3: Confident (No Review Needed)

```
╔══════════════════════════════════════════╗
║ ✓ Validated Match              97%      ║
╚══════════════════════════════════════════╝

╔══════════════════════════════════════════╗
║ 📊 Anomaly Confidence          92%      ║
╚══════════════════════════════════════════╝

╔══════════════════════════════════════════╗
║ 🟢 Anomaly Detected                      ║
╠══════════════════════════════════════════╣
║ Match Confidence: Confident              ║
║ (No review reasons - all criteria pass)  ║
╚══════════════════════════════════════════╝
```

---

## Decision Matrix

| Criterion | Threshold | Pass | Fail → Review |
|-----------|-----------|------|---------------|
| Distance | ≤5 ft | ✓ | ✗ Spatial validation failed |
| Orientation | ≤60° | ✓ | ✗ Spatial validation failed |
| Match Cost | ≤0.6 | ✓ | ✗ High match cost |
| Confidence | ≥70% | ✓ | ✗ Low confidence |
| Depth Change | -10% to 30% | ✓ | ✗ Unusual depth change |
| Type | Same | ✓ | ✗ Type mismatch |

**Result:**
- **All pass** → "Confident"
- **Any fail** → "Review Required" (with specific reasons)

---

## Statistics Example

After running analytics, you might see:

```
--- Summary Report ---
Total Matched: 1234
Validated Matches: 1180 (95.6%)

Confidence Distribution:
  Confident: 1050 (85.1%)
  Review Required: 184 (14.9%)

Review Reasons Breakdown:
  Spatial validation failed: 54 (29.3%)
  High match cost: 78 (42.4%)
  Low confidence: 45 (24.5%)
  Unusual depth change: 23 (12.5%)
  Type mismatch: 12 (6.5%)
  
Note: Some anomalies have multiple reasons
```

---

## How to Use

### Step 1: Run Analytics
```bash
python src/analytics.py
```

This will:
- Check all 5 criteria for each anomaly
- Assign "Confident" or "Review Required"
- Record specific reasons for review

### Step 2: View in UI
```bash
cd viewer
npm run dev
```

Click any anomaly marked "Review Required" to see:
- Which criteria failed
- Specific reasons listed
- Exact measurements that triggered review

### Step 3: Take Action

#### For "Confident" Anomalies:
✅ Use for decision-making
✅ Proceed with maintenance planning
✅ Trust the data

#### For "Review Required" Anomalies:
⚠️ Check the specific reasons
⚠️ Verify vendor data
⚠️ Consider field inspection
⚠️ Review with subject matter expert

---

## Real Examples

### Example 1: Confident Match ✓
```
Criteria Check:
  ✓ Distance: 0.16 ft (within 5 ft)
  ✓ Orientation: 11.5° (within 60°)
  ✓ Match cost: 0.42 (below 0.6)
  ✓ Confidence: 92% (above 70%)
  ✓ Depth change: 3% (within -10% to 30%)
  ✓ Type: metal loss → metal loss

Result: Confident
Action: Trust this match
```

### Example 2: Review Required - Spatial ⚠️
```
Criteria Check:
  ✗ Distance: 6.37 ft (exceeds 5 ft)
  ✓ Orientation: 5° (within 60°)
  ✓ Match cost: 0.35 (below 0.6)
  ✗ Confidence: 45% (below 70%)
  ✓ Depth change: 2% (within range)
  ✓ Type: metal loss → metal loss

Result: Review Required
Reasons: Spatial validation failed; Low confidence
Action: Verify location, may be different anomalies
```

### Example 3: Review Required - Unusual Growth ⚠️
```
Criteria Check:
  ✓ Distance: 0.25 ft (within 5 ft)
  ✓ Orientation: 8° (within 60°)
  ✓ Match cost: 0.28 (below 0.6)
  ✓ Confidence: 85% (above 70%)
  ✗ Depth change: 35% (exceeds 30%)
  ✓ Type: metal loss → metal loss

Result: Review Required
Reasons: Unusual depth change
Action: Verify depth measurements, 35% growth in 7 years is extreme
```

### Example 4: Review Required - Type Mismatch ⚠️
```
Criteria Check:
  ✓ Distance: 1.2 ft (within 5 ft)
  ✓ Orientation: 15° (within 60°)
  ✓ Match cost: 0.45 (below 0.6)
  ✓ Confidence: 78% (above 70%)
  ✓ Depth change: 5% (within range)
  ✗ Type: metal loss → dent

Result: Review Required
Reasons: Type mismatch
Action: Verify anomaly type, metal loss shouldn't become dent
```

---

## Adjusting Thresholds

If you want to be more or less strict, you can adjust the thresholds in `analytics.py`:

```python
# More Strict (fewer "Review Required"):
high_match_cost = matched['match_cost'] > 0.8  # was 0.6
low_confidence = matched['anomaly_confidence'] < 60  # was 70
unusual_growth = (depth_diff > 40) | (depth_diff < -15)  # was 30/-10

# More Lenient (more "Review Required"):
high_match_cost = matched['match_cost'] > 0.4  # was 0.6
low_confidence = matched['anomaly_confidence'] < 80  # was 70
unusual_growth = (depth_diff > 20) | (depth_diff < -5)  # was 30/-10
```

---

## Summary

✅ **5 Clear Criteria** - Not just match cost
✅ **Specific Reasons** - Shows exactly why review is needed
✅ **Data-Driven** - Based on measurable thresholds
✅ **Transparent** - All criteria visible in UI
✅ **Actionable** - Tells you what to verify

**Before:** "Review Required" (why? 🤷)
**Now:** "Review Required: Spatial validation failed; Low confidence" (clear! ✓)

This makes the classification **transparent, defensible, and actionable**! 🎯
