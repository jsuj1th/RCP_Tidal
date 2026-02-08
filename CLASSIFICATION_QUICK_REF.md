# Classification Quick Reference

## Two Independent Systems

```
┌─────────────────────────────────────────────────────┐
│                    ANOMALY                          │
├─────────────────────────────────────────────────────┤
│                                                     │
│  System 1: STATUS (Severity/Risk)                  │
│  ┌─────────────────────────────────────────────┐   │
│  │ 🔴 Critical  - Dangerous (>2%/yr or >50%)  │   │
│  │ 🟢 Active    - Growing (0-2%/yr, <50%)     │   │
│  │ ⚪ Static    - Stable (≤0% growth)         │   │
│  │ 🆕 New       - Just detected               │   │
│  └─────────────────────────────────────────────┘   │
│                                                     │
│  System 2: CONFIDENCE (Match Quality)               │
│  ┌─────────────────────────────────────────────┐   │
│  │ ✅ Confident        - Reliable match       │   │
│  │ ⚠️ Review Required - Uncertain match       │   │
│  └─────────────────────────────────────────────┘   │
│                                                     │
└─────────────────────────────────────────────────────┘
```

---

## Status Classification (Severity)

### 🔴 Critical
```
IF growth_rate > 2%/yr OR depth ≥ 50%
  → CRITICAL
  → Immediate action required
```

**Examples:**
- Depth: 65% → CRITICAL ⚠️
- Growth: 3.5%/yr → CRITICAL ⚠️
- Depth: 52%, Growth: 1.5%/yr → CRITICAL ⚠️

### 🟢 Active
```
IF 0% < growth_rate ≤ 2%/yr AND depth < 50%
  → ACTIVE
  → Monitor regularly
```

**Examples:**
- Depth: 25%, Growth: 1.2%/yr → ACTIVE ✓
- Depth: 35%, Growth: 0.8%/yr → ACTIVE ✓

### ⚪ Static
```
IF growth_rate ≤ 0%
  → STATIC
  → Low priority
```

**Examples:**
- Growth: -0.14%/yr → STATIC
- Growth: 0%/yr → STATIC

### 🆕 New
```
IF not found in 2015
  → NEW
  → Investigate
```

---

## Confidence Classification (Match Quality)

### ✅ Confident
```
IF ALL pass:
  ✓ Distance ≤ 5 ft
  ✓ Orientation ≤ 60°
  ✓ Match cost ≤ 0.6
  ✓ Confidence ≥ 70%
  ✓ Depth change: -10% to 30%
  ✓ Same type
  → CONFIDENT
```

### ⚠️ Review Required
```
IF ANY fail:
  ✗ Distance > 5 ft OR
  ✗ Orientation > 60° OR
  ✗ Match cost > 0.6 OR
  ✗ Confidence < 70% OR
  ✗ Depth change outside -10% to 30% OR
  ✗ Type mismatch
  → REVIEW REQUIRED
```

---

## Action Matrix

| Status | Confidence | Priority | Action |
|--------|-----------|----------|--------|
| 🔴 Critical | ✅ Confident | **URGENT** | Immediate repair |
| 🔴 Critical | ⚠️ Review | **HIGH** | Verify then repair |
| 🟢 Active | ✅ Confident | **MEDIUM** | Monitor closely |
| 🟢 Active | ⚠️ Review | **MEDIUM** | Verify match |
| ⚪ Static | ✅ Confident | **LOW** | Continue monitoring |
| ⚪ Static | ⚠️ Review | **LOW** | Low priority review |
| 🆕 New | N/A | **MEDIUM** | Investigate |

---

## Visual Examples

### Example 1: Worst Case
```
╔════════════════════════════════╗
║ 🔴 CRITICAL                    ║
║ ⚠️ REVIEW REQUIRED             ║
╠════════════════════════════════╣
║ Depth: 65%                     ║
║ Growth: 4.2%/yr                ║
║ Distance Δ: 6.37 ft ✗          ║
╚════════════════════════════════╝

Priority: HIGH
Action: VERIFY LOCATION FIRST, THEN IMMEDIATE REPAIR
```

### Example 2: Best Case (Critical)
```
╔════════════════════════════════╗
║ 🔴 CRITICAL                    ║
║ ✅ CONFIDENT                   ║
╠════════════════════════════════╣
║ Depth: 58%                     ║
║ Growth: 3.1%/yr                ║
║ Distance Δ: 0.16 ft ✓          ║
╚════════════════════════════════╝

Priority: URGENT
Action: IMMEDIATE REPAIR REQUIRED
```

### Example 3: Normal Monitoring
```
╔════════════════════════════════╗
║ 🟢 ACTIVE                      ║
║ ✅ CONFIDENT                   ║
╠════════════════════════════════╣
║ Depth: 25%                     ║
║ Growth: 1.2%/yr                ║
║ Distance Δ: 0.25 ft ✓          ║
╚════════════════════════════════╝

Priority: MEDIUM
Action: MONITOR REGULARLY
```

### Example 4: Low Priority
```
╔════════════════════════════════╗
║ ⚪ STATIC                      ║
║ ✅ CONFIDENT                   ║
╠════════════════════════════════╣
║ Depth: 18%                     ║
║ Growth: -0.14%/yr              ║
║ Distance Δ: 0.08 ft ✓          ║
╚════════════════════════════════╝

Priority: LOW
Action: CONTINUE MONITORING
```

---

## Thresholds at a Glance

### Status:
- **Critical**: Growth > 2%/yr OR Depth ≥ 50%
- **Active**: 0% < Growth ≤ 2%/yr AND Depth < 50%
- **Static**: Growth ≤ 0%
- **New**: Not in 2015 run

### Confidence:
- **Confident**: All 6 criteria pass
- **Review**: Any criterion fails

---

## Statistics Interpretation

```
Total: 1234 anomalies

Status:
  🔴 Critical: 156 (12.6%) ← Need action
  🟢 Active:   892 (72.3%) ← Monitor
  ⚪ Static:   186 (15.1%) ← Low priority
  🆕 New:       45 (3.6%)  ← Investigate

Confidence:
  ✅ Confident:        1050 (85.1%) ← Reliable
  ⚠️ Review Required:   184 (14.9%) ← Verify

Critical Breakdown:
  🔴✅ Critical + Confident:        132 ← ACT NOW
  🔴⚠️ Critical + Review Required:   24 ← VERIFY FIRST
```

---

## Decision Tree

```
Is it Critical?
├─ YES (>2%/yr or >50% depth)
│  ├─ Confident? → IMMEDIATE REPAIR
│  └─ Review? → VERIFY THEN REPAIR
│
└─ NO
   ├─ Growing? (0-2%/yr)
   │  ├─ Confident? → MONITOR CLOSELY
   │  └─ Review? → VERIFY MATCH
   │
   ├─ Static? (≤0% growth)
   │  └─ CONTINUE MONITORING
   │
   └─ New?
      └─ INVESTIGATE
```

---

## Summary

**Status = Risk Level**
- Based on: Growth rate & Depth
- Answers: "How dangerous?"

**Confidence = Data Quality**
- Based on: 6 validation criteria
- Answers: "How sure are we?"

**Both Together = Action Plan**
- Critical + Confident = Act now
- Critical + Review = Verify first
- Active + Confident = Monitor
- Static = Low priority

🎯 **Clear, actionable classification!**
