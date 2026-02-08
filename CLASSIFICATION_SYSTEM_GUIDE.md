# Anomaly Classification System - Complete Guide

## Overview
There are **TWO independent classification systems**:

1. **Status** (Severity) - How dangerous is the anomaly?
2. **Confidence Label** (Match Quality) - How confident are we in the match?

---

## System 1: Status Classification (Severity)

### Purpose
Determines the **operational risk** and **urgency** of the anomaly.

### Categories

#### 🔴 **Critical**
**Triggers:**
- Growth rate > 2% per year OR
- Current depth ≥ 50%

**Meaning:**
- High risk of failure
- Requires immediate attention
- May need repair/replacement

**Example:**
```
Depth: 65% → CRITICAL (exceeds 50%)
Growth: 3.5%/yr → CRITICAL (exceeds 2%/yr)
```

#### 🟢 **Active**
**Triggers:**
- Growth rate ≤ 2% per year AND
- Current depth < 50% AND
- Growth > 0%

**Meaning:**
- Anomaly is growing but manageable
- Monitor regularly
- Plan future maintenance

**Example:**
```
Depth: 25%
Growth: 1.2%/yr → ACTIVE (growing slowly)
```

#### ⚪ **Static**
**Triggers:**
- Growth ≤ 0% (no growth or shrinkage)

**Meaning:**
- Not growing (measurement variation or stable)
- Low priority
- Continue monitoring

**Example:**
```
Depth 2015: 18%
Depth 2022: 17%
Growth: -0.14%/yr → STATIC (no real growth)
```

#### 🆕 **New**
**Triggers:**
- Anomaly found in 2022 but not in 2015

**Meaning:**
- Newly detected defect
- No growth history
- Requires investigation

**Example:**
```
2015: Not detected
2022: Detected at 15% depth → NEW
```

---

## System 2: Confidence Label (Match Quality)

### Purpose
Determines how **confident** we are that the 2015 and 2022 anomalies are the **same defect**.

### Categories

#### ✅ **Confident**
**Triggers:**
- ALL of the following pass:
  - Distance ≤ 5 ft
  - Orientation ≤ 60°
  - Match cost ≤ 0.6
  - Anomaly confidence ≥ 70%
  - Depth change between -10% and 30%
  - Same anomaly type (or one missing)

**Meaning:**
- High confidence it's the same anomaly
- Data is reliable
- Use for decision-making

**Example:**
```
Distance Δ: 0.16 ft ✓
Orientation Δ: 11.5° ✓
Match cost: 0.42 ✓
Confidence: 92% ✓
Depth change: 3% ✓
Type: metal loss → metal loss ✓
→ CONFIDENT
```

#### ⚠️ **Review Required**
**Triggers:**
- ANY of the following fail:
  - Distance > 5 ft OR
  - Orientation > 60° OR
  - Match cost > 0.6 OR
  - Anomaly confidence < 70% OR
  - Depth change > 30% or < -10% OR
  - Type mismatch

**Meaning:**
- Uncertainty in the match
- May be different anomalies
- Requires manual verification

**Example:**
```
Distance Δ: 6.37 ft ✗
→ REVIEW REQUIRED
Reason: Spatial validation failed
```

---

## Combined Classification Matrix

| Status | Confidence | Meaning | Action |
|--------|-----------|---------|--------|
| 🔴 Critical | ✅ Confident | High-risk, verified | **Immediate action** |
| 🔴 Critical | ⚠️ Review | High-risk, uncertain | **Verify then act** |
| 🟢 Active | ✅ Confident | Growing, verified | **Monitor closely** |
| 🟢 Active | ⚠️ Review | Growing, uncertain | **Verify match** |
| ⚪ Static | ✅ Confident | Stable, verified | **Continue monitoring** |
| ⚪ Static | ⚠️ Review | Stable, uncertain | **Low priority review** |
| 🆕 New | N/A | New detection | **Investigate** |

---

## Current Classification Logic

### Status (Severity) - Code:
```python
# Default: Active
matched['status'] = 'Active'

# Critical if:
matched.loc[matched['annual_growth_rate'] > 2.0, 'status'] = 'Critical'
matched.loc[matched['depth_22'] > 50.0, 'status'] = 'Critical'

# Static if:
matched.loc[matched['growth'] <= 0, 'status'] = 'Static'

# New anomalies:
new_anoms['status'] = 'New'
```

### Confidence Label (Match Quality) - Code:
```python
# Default: Confident
matched['confidence_label'] = 'Confident'

# Review Required if ANY:
# 1. Spatial validation failed
matched.loc[~matched['is_validated'], 'confidence_label'] = 'Review Required'

# 2. High match cost
matched.loc[matched['match_cost'] > 0.6, 'confidence_label'] = 'Review Required'

# 3. Low confidence
matched.loc[matched['anomaly_confidence'] < 70, 'confidence_label'] = 'Review Required'

# 4. Unusual depth change
unusual = (depth_diff > 30) | (depth_diff < -10)
matched.loc[unusual, 'confidence_label'] = 'Review Required'

# 5. Type mismatch
matched.loc[type_mismatch, 'confidence_label'] = 'Review Required'
```

---

## Real Examples

### Example 1: Critical + Confident ⚠️✅
```
╔══════════════════════════════════════════╗
║ ✓ Validated Match              97%      ║
╚══════════════════════════════════════════╝

╔══════════════════════════════════════════╗
║ 📊 Anomaly Confidence          92%      ║
╚══════════════════════════════════════════╝

╔══════════════════════════════════════════╗
║ 🔴 Anomaly Detected                      ║
╠══════════════════════════════════════════╣
║ Type:          Metal Loss                ║
║ Status:        Critical                  ║ ← Severity
║ Match Confidence: Confident              ║ ← Match Quality
║ Depth (2022):  65%                       ║ ← Exceeds 50%
║ Growth Rate:   3.5%/yr                   ║ ← Exceeds 2%/yr
╚══════════════════════════════════════════╝

Classification:
  Status: CRITICAL (depth 65% > 50%)
  Confidence: CONFIDENT (all criteria pass)
  
Action: IMMEDIATE REPAIR REQUIRED
  - High confidence it's real
  - Severe depth
  - Rapid growth
```

### Example 2: Active + Confident ✅✅
```
╔══════════════════════════════════════════╗
║ 🟢 Anomaly Detected                      ║
╠══════════════════════════════════════════╣
║ Status:        Active                    ║
║ Match Confidence: Confident              ║
║ Depth (2022):  25%                       ║
║ Growth Rate:   1.2%/yr                   ║
╚══════════════════════════════════════════╝

Classification:
  Status: ACTIVE (depth 25% < 50%, growth 1.2% < 2%)
  Confidence: CONFIDENT (all criteria pass)
  
Action: MONITOR REGULARLY
  - Verified match
  - Manageable depth
  - Slow growth
```

### Example 3: Critical + Review Required ⚠️⚠️
```
╔══════════════════════════════════════════╗
║ ⚠ Validation Warning                     ║
║ Distance Δ: 6.37 ft ✗                    ║
╚══════════════════════════════════════════╝

╔══════════════════════════════════════════╗
║ 🔴 Anomaly Detected                      ║
╠══════════════════════════════════════════╣
║ Status:        Critical                  ║
║ Match Confidence: Review Required        ║
║ Review Reasons: Spatial validation failed║
║ Depth (2022):  58%                       ║
║ Growth Rate:   4.2%/yr                   ║
╚══════════════════════════════════════════╝

Classification:
  Status: CRITICAL (depth 58% > 50%)
  Confidence: REVIEW REQUIRED (distance > 5 ft)
  
Action: VERIFY THEN ACT
  - Appears critical BUT
  - Match is uncertain
  - Verify it's the same anomaly first
```

### Example 4: Static + Confident ⚪✅
```
╔══════════════════════════════════════════╗
║ ⚪ Anomaly Detected                      ║
╠══════════════════════════════════════════╣
║ Status:        Static                    ║
║ Match Confidence: Confident              ║
║ Depth (2015):  18%                       ║
║ Depth (2022):  17%                       ║
║ Growth Rate:   -0.14%/yr                 ║
╚══════════════════════════════════════════╝

Classification:
  Status: STATIC (growth -0.14% ≤ 0%)
  Confidence: CONFIDENT (all criteria pass)
  
Action: CONTINUE MONITORING
  - Verified match
  - No real growth (measurement variation)
  - Low priority
```

### Example 5: New Anomaly 🆕
```
╔══════════════════════════════════════════╗
║ 🆕 Anomaly Detected                      ║
╠══════════════════════════════════════════╣
║ Status:        New                       ║
║ Match Confidence: N/A                    ║
║ Depth (2022):  22%                       ║
║ Growth Rate:   N/A                       ║
╚══════════════════════════════════════════╝

Classification:
  Status: NEW (not found in 2015)
  Confidence: N/A (nothing to match)
  
Action: INVESTIGATE
  - Newly detected
  - No growth history
  - Determine if real or measurement artifact
```

---

## Statistics Example

After running analytics:

```
--- Classification Summary ---

Status Distribution:
  Critical: 156 (12.6%)
  Active:   892 (72.3%)
  Static:   186 (15.1%)
  New:       45 (3.6%)

Confidence Distribution:
  Confident:        1050 (85.1%)
  Review Required:   184 (14.9%)

Combined (Critical only):
  Critical + Confident:        132 (84.6% of critical)
  Critical + Review Required:   24 (15.4% of critical)
  
Action Required:
  Immediate (Critical + Confident):  132
  Verify First (Critical + Review):   24
  Monitor (Active + Confident):      758
  Low Priority (Static):             186
```

---

## Thresholds Summary

### Status Thresholds:
| Criterion | Threshold | Classification |
|-----------|-----------|----------------|
| Growth Rate | > 2%/yr | Critical |
| Current Depth | ≥ 50% | Critical |
| Growth Rate | 0-2%/yr | Active |
| Current Depth | < 50% | Active |
| Growth | ≤ 0% | Static |
| Not in 2015 | N/A | New |

### Confidence Thresholds:
| Criterion | Threshold | Classification |
|-----------|-----------|----------------|
| Distance | ≤ 5 ft | Confident |
| Distance | > 5 ft | Review Required |
| Orientation | ≤ 60° | Confident |
| Orientation | > 60° | Review Required |
| Match Cost | ≤ 0.6 | Confident |
| Match Cost | > 0.6 | Review Required |
| Anomaly Confidence | ≥ 70% | Confident |
| Anomaly Confidence | < 70% | Review Required |
| Depth Change | -10% to 30% | Confident |
| Depth Change | Outside range | Review Required |
| Type | Same | Confident |
| Type | Different | Review Required |

---

## How to Adjust Thresholds

If you want different classification behavior, edit `src/analytics.py`:

### More Strict Critical Classification:
```python
# Stricter thresholds
matched.loc[matched['annual_growth_rate'] > 3.0, 'status'] = 'Critical'  # was 2.0
matched.loc[matched['depth_22'] > 60.0, 'status'] = 'Critical'  # was 50.0
```

### More Lenient Critical Classification:
```python
# More lenient thresholds
matched.loc[matched['annual_growth_rate'] > 1.5, 'status'] = 'Critical'  # was 2.0
matched.loc[matched['depth_22'] > 40.0, 'status'] = 'Critical'  # was 50.0
```

---

## Summary

### Two Independent Systems:

**1. Status (Severity):**
- 🔴 Critical - Dangerous, needs action
- 🟢 Active - Growing, monitor
- ⚪ Static - Stable, low priority
- 🆕 New - Newly detected

**2. Confidence (Match Quality):**
- ✅ Confident - Reliable match
- ⚠️ Review Required - Uncertain match

### Key Points:
- Status is about **risk/severity**
- Confidence is about **data quality**
- Both are independent
- Both are shown in UI
- Both guide actions

**Result:** Clear, data-driven classification system with transparent criteria! 🎯
