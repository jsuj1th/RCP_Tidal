# Severity Scoring System - Complete Guide

## Overview
Severity is calculated using a **multi-factor scoring system** (0-100 points) that combines:
1. Current Depth (40 points max)
2. Growth Rate (30 points max)
3. Absolute Growth (20 points max)
4. Time to Failure (10 points max)

**Total: 100 points maximum**

---

## Severity Score Formula

```python
Severity Score = 
    Depth Score (0-40) +
    Growth Rate Score (0-30) +
    Absolute Growth Score (0-20) +
    Time to Failure Score (0-10)
```

---

## Factor 1: Current Depth (0-40 points)

**Weight: 40%** - Most important factor

```python
depth_score = min(40, depth_2022 × 0.8)
```

**Rationale:** Higher current depth = closer to failure

| Depth | Score | Risk Level |
|-------|-------|------------|
| 10% | 8 pts | Low |
| 25% | 20 pts | Moderate |
| 50% | 40 pts | High |
| 75% | 40 pts | Critical |

**Example:**
- Depth: 65% → Score: 40 points (maxed out)
- Depth: 30% → Score: 24 points
- Depth: 15% → Score: 12 points

---

## Factor 2: Growth Rate (0-30 points)

**Weight: 30%** - Second most important

```python
growth_rate_score = min(30, annual_growth_rate × 10)
```

**Rationale:** Faster growth = higher urgency

| Growth Rate | Score | Risk Level |
|-------------|-------|------------|
| 0.5%/yr | 5 pts | Low |
| 1.0%/yr | 10 pts | Moderate |
| 2.0%/yr | 20 pts | High |
| 3.0%/yr | 30 pts | Critical |
| 5.0%/yr | 30 pts | Critical (maxed) |

**Example:**
- Growth: 3.5%/yr → Score: 30 points (maxed out)
- Growth: 1.8%/yr → Score: 18 points
- Growth: 0.6%/yr → Score: 6 points

---

## Factor 3: Absolute Growth (0-20 points)

**Weight: 20%** - Total change matters

```python
absolute_growth_score = min(20, |growth| × 0.8)
```

**Rationale:** Large total growth indicates significant deterioration

| Total Growth | Score | Risk Level |
|--------------|-------|------------|
| 5% | 4 pts | Low |
| 10% | 8 pts | Moderate |
| 15% | 12 pts | High |
| 25% | 20 pts | Critical |
| 30% | 20 pts | Critical (maxed) |

**Example:**
- Growth: 21% (16% → 37%) → Score: 16.8 points
- Growth: 12% (10% → 22%) → Score: 9.6 points
- Growth: 3% (15% → 18%) → Score: 2.4 points

---

## Factor 4: Time to Failure (0-10 points)

**Weight: 10%** - Urgency factor

```python
# Assume failure at 80% depth
remaining_depth = 80 - depth_2022
years_to_failure = remaining_depth / annual_growth_rate

if years_to_failure < 5:  score = 10
elif years_to_failure < 10: score = 7
elif years_to_failure < 20: score = 4
else: score = 0
```

**Rationale:** Closer to failure = higher urgency

| Years to Failure | Score | Urgency |
|------------------|-------|---------|
| < 5 years | 10 pts | Immediate |
| 5-10 years | 7 pts | High |
| 10-20 years | 4 pts | Medium |
| > 20 years | 0 pts | Low |

**Example:**
- Depth: 70%, Growth: 3%/yr → 3.3 years → Score: 10 points
- Depth: 50%, Growth: 2%/yr → 15 years → Score: 4 points
- Depth: 20%, Growth: 1%/yr → 60 years → Score: 0 points

---

## Severity Levels

Based on total score (0-100):

### 🔴 Critical (70-100 points)
**Immediate action required**
- Very high risk of failure
- Requires urgent repair/replacement
- Monitor continuously

### 🟠 High (50-69 points)
**Action required soon**
- High risk of failure
- Plan repair within 1-2 years
- Increase monitoring frequency

### 🟡 Moderate (30-49 points)
**Monitor closely**
- Moderate risk
- Plan maintenance within 3-5 years
- Regular monitoring

### 🟢 Low (0-29 points)
**Continue monitoring**
- Low immediate risk
- Standard monitoring schedule
- No urgent action needed

---

## Real Examples

### Example 1: Critical Severity (Score: 88/100)

```
Current Depth: 65%
  → Depth Score: 40 points (65 × 0.8 = 52, capped at 40)

Growth Rate: 3.5%/yr
  → Growth Rate Score: 30 points (3.5 × 10 = 35, capped at 30)

Absolute Growth: 21% (44% → 65%)
  → Absolute Growth Score: 16.8 points (21 × 0.8)

Time to Failure: 4.3 years
  → Time Score: 10 points (< 5 years)

Total Severity: 40 + 30 + 16.8 + 10 = 96.8 → 97/100
Severity Level: CRITICAL
```

**UI Display:**
```
╔══════════════════════════════════════════╗
║ ⚠️ Severity Assessment         97/100   ║
╠══════════════════════════════════════════╣
║ Severity Level: Critical                ║
║ Est. Time to Failure: 4.3 years         ║
║                                          ║
║ Based on: current depth (40%), growth   ║
║ rate (30%), total growth (20%), time    ║
║ to failure (10%)                         ║
╚══════════════════════════════════════════╝
```

---

### Example 2: High Severity (Score: 58/100)

```
Current Depth: 45%
  → Depth Score: 36 points (45 × 0.8)

Growth Rate: 2.2%/yr
  → Growth Rate Score: 22 points (2.2 × 10)

Absolute Growth: 12% (33% → 45%)
  → Absolute Growth Score: 9.6 points (12 × 0.8)

Time to Failure: 15.9 years
  → Time Score: 4 points (10-20 years)

Total Severity: 36 + 22 + 9.6 + 4 = 71.6 → 72/100
Severity Level: CRITICAL
```

---

### Example 3: Moderate Severity (Score: 38/100)

```
Current Depth: 25%
  → Depth Score: 20 points (25 × 0.8)

Growth Rate: 1.2%/yr
  → Growth Rate Score: 12 points (1.2 × 10)

Absolute Growth: 7% (18% → 25%)
  → Absolute Growth Score: 5.6 points (7 × 0.8)

Time to Failure: 45.8 years
  → Time Score: 0 points (> 20 years)

Total Severity: 20 + 12 + 5.6 + 0 = 37.6 → 38/100
Severity Level: MODERATE
```

---

### Example 4: Low Severity (Score: 18/100)

```
Current Depth: 15%
  → Depth Score: 12 points (15 × 0.8)

Growth Rate: 0.6%/yr
  → Growth Rate Score: 6 points (0.6 × 10)

Absolute Growth: 3% (12% → 15%)
  → Absolute Growth Score: 2.4 points (3 × 0.8)

Time to Failure: 108 years
  → Time Score: 0 points (> 20 years)

Total Severity: 12 + 6 + 2.4 + 0 = 20.4 → 20/100
Severity Level: LOW
```

---

## Comparison: Old vs New System

### Old System (Binary Thresholds):
```python
if growth_rate > 2.0 OR depth > 50:
    status = "Critical"
else:
    status = "Active"
```

**Problems:**
- ❌ No nuance (either critical or not)
- ❌ Doesn't consider multiple factors together
- ❌ 49% depth = Active, 51% depth = Critical (arbitrary)
- ❌ No severity score for prioritization

### New System (Multi-Factor Scoring):
```python
severity_score = (
    depth_score +
    growth_rate_score +
    absolute_growth_score +
    time_to_failure_score
)
```

**Benefits:**
- ✅ Continuous scale (0-100)
- ✅ Combines 4 independent factors
- ✅ Weighted by importance
- ✅ Enables prioritization
- ✅ More accurate risk assessment

---

## Prioritization Example

With severity scores, you can prioritize repairs:

```
Anomaly A: Depth 52%, Growth 1.5%/yr → Severity: 48 (Moderate)
Anomaly B: Depth 45%, Growth 3.0%/yr → Severity: 66 (High)
Anomaly C: Depth 65%, Growth 2.8%/yr → Severity: 88 (Critical)

Priority Order:
1. Anomaly C (88) - IMMEDIATE
2. Anomaly B (66) - SOON
3. Anomaly A (48) - MONITOR
```

Even though Anomaly A has higher depth, Anomaly B is higher priority due to rapid growth!

---

## UI Display

When you click an anomaly, you'll see:

```
╔══════════════════════════════════════════╗
║ ✓ Validated Match              97%      ║
╚══════════════════════════════════════════╝

╔══════════════════════════════════════════╗
║ 📊 Anomaly Confidence          92%      ║
╚══════════════════════════════════════════╝

╔══════════════════════════════════════════╗
║ ⚠️ Severity Assessment         88/100   ║ ← NEW!
╠══════════════════════════════════════════╣
║ Severity Level: Critical                ║
║ Est. Time to Failure: 4.3 years         ║
║                                          ║
║ Based on: current depth (40%), growth   ║
║ rate (30%), total growth (20%), time    ║
║ to failure (10%)                         ║
╚══════════════════════════════════════════╝

╔══════════════════════════════════════════╗
║ 🔴 Anomaly Detected                      ║
║ ... (rest of details)                    ║
╚══════════════════════════════════════════╝
```

---

## Adjusting Weights

If you want different factor importance, edit `src/analytics.py`:

```python
# Current weights: 40/30/20/10
depth_score = np.minimum(40, matched['depth_22'] * 0.8)
growth_score = np.minimum(30, matched['annual_growth_rate'] * 10)
absolute_growth_score = np.minimum(20, absolute_growth * 0.8)
time_score = ... # 0-10 points

# Example: Emphasize growth rate more
depth_score = np.minimum(35, matched['depth_22'] * 0.7)  # 35 max
growth_score = np.minimum(40, matched['annual_growth_rate'] * 13.3)  # 40 max
absolute_growth_score = np.minimum(15, absolute_growth * 0.6)  # 15 max
time_score = ... # 0-10 points
```

---

## Summary

✅ **Multi-Factor Scoring** - Combines 4 independent risk factors
✅ **Weighted System** - More important factors get more points
✅ **Continuous Scale** - 0-100 points for fine-grained prioritization
✅ **Time to Failure** - Estimates when anomaly will reach critical depth
✅ **Severity Levels** - Critical, High, Moderate, Low
✅ **Transparent** - Shows exact calculation in UI
✅ **Actionable** - Clear prioritization for maintenance planning

**Result:** Scientific, data-driven severity assessment that enables smart prioritization! 🎯
