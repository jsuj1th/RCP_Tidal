# Anomaly Match Validation Guide

## Purpose
Validate that matched anomalies between 2015 and 2022 runs are **truly the same anomaly** by checking if distance and orientation measurements from vendor data are within acceptable tolerances.

---

## Validation Criteria

### 1. Distance Tolerance
**Standard: ±5.0 feet**

```
Valid Match:
  2015: 9452.13 ft
  2022: 9452.29 ft (aligned)
  Difference: 0.16 ft ✓ (within 5 ft)

Invalid Match:
  2015: 9452.13 ft
  2022: 9458.50 ft (aligned)
  Difference: 6.37 ft ✗ (exceeds 5 ft)
```

**Why 5 feet?**
- Industry standard for ILI (In-Line Inspection) accuracy
- Accounts for measurement uncertainty
- Accounts for slight alignment errors
- Conservative enough to avoid false matches

### 2. Orientation Tolerance
**Standard: ±60 degrees (2 clock hours)**

```
Valid Match:
  2015: 90° (3 o'clock)
  2022: 70° (2:20 o'clock)
  Difference: 20° ✓ (within 60°)

Invalid Match:
  2015: 90° (3 o'clock)
  2022: 270° (9 o'clock)
  Difference: 180° ✗ (exceeds 60°)
```

**Why 60 degrees?**
- Represents 2 hours on clock face (reasonable variation)
- Accounts for sensor rotation/positioning differences
- Prevents matching anomalies on opposite sides of pipe
- Balances strictness with real-world measurement variability

**Special Case - Wraparound:**
```
Orientation at 350° and 10° are only 20° apart, not 340°!
  350° → 360° → 0° → 10° = 20° difference
```

---

## Validation Formula

### Distance Validation:
```python
dist_diff = |dist_2022_aligned - dist_2015|
is_valid_distance = dist_diff ≤ 5.0 ft
```

### Orientation Validation:
```python
orient_diff = |orient_2022 - orient_2015|
# Handle wraparound
if orient_diff > 180:
    orient_diff = 360 - orient_diff
is_valid_orientation = orient_diff ≤ 60°
```

### Overall Validation:
```python
is_valid_match = is_valid_distance AND is_valid_orientation
```

### Confidence Score (0-100%):
```python
dist_score = 100 × (1 - dist_diff / 5.0)
orient_score = 100 × (1 - orient_diff / 60.0)
confidence = (dist_score + orient_score) / 2
```

---

## Example Validations

### Example 1: High Confidence Match ✓
```
2015 Data:
  Distance: 9452.13 ft
  Orientation: 283° (9:25 o'clock)
  Depth: 16%

2022 Data:
  Distance: 9452.29 ft (aligned)
  Orientation: 271.5° (9:00 o'clock)
  Depth: 19%

Validation:
  Distance Diff: 0.16 ft ✓
  Orientation Diff: 11.5° ✓
  Confidence: 97.8%
  Status: VALID ✓
  
Growth: 3% (16% → 19%)
```

### Example 2: Moderate Confidence Match ✓
```
2015 Data:
  Distance: 9453.04 ft
  Orientation: 89° (3:00 o'clock)
  Depth: 13%

2022 Data:
  Distance: 9452.98 ft (aligned)
  Orientation: 70° (2:20 o'clock)
  Depth: 20%

Validation:
  Distance Diff: 0.06 ft ✓
  Orientation Diff: 19° ✓
  Confidence: 84.2%
  Status: VALID ✓
  
Growth: 7% (13% → 20%)
```

### Example 3: Invalid Match - Distance Violation ✗
```
2015 Data:
  Distance: 9452.13 ft
  Orientation: 90° (3:00 o'clock)
  Depth: 15%

2022 Data:
  Distance: 9458.50 ft (aligned)
  Orientation: 95° (3:10 o'clock)
  Depth: 18%

Validation:
  Distance Diff: 6.37 ft ✗ (exceeds 5 ft)
  Orientation Diff: 5° ✓
  Confidence: 0%
  Status: INVALID ✗
  
Reason: Likely different anomalies
```

### Example 4: Invalid Match - Orientation Violation ✗
```
2015 Data:
  Distance: 10000.00 ft
  Orientation: 0° (12:00 o'clock)
  Depth: 20%

2022 Data:
  Distance: 10000.10 ft (aligned)
  Orientation: 180° (6:00 o'clock)
  Depth: 22%

Validation:
  Distance Diff: 0.10 ft ✓
  Orientation Diff: 180° ✗ (exceeds 60°)
  Confidence: 0%
  Status: INVALID ✗
  
Reason: Opposite sides of pipe - different anomalies
```

---

## Running Validation

### Command:
```bash
python src/validation.py
```

### Output:
```
Validating Anomaly Matches...
Distance Tolerance: ±5.0 ft
Orientation Tolerance: ±60° (2.0 clock hours)
------------------------------------------------------------

Validation Results:
  Total Matches: 1234
  ✓ Valid Matches: 1180 (95.6%)
  ✗ Invalid Matches: 54 (4.4%)

Violation Breakdown:
  Distance violations: 23
  Orientation violations: 31

Confidence Statistics:
  Mean confidence: 87.3%
  Min confidence: 0.0%
  Max confidence: 99.8%

⚠️  Invalid Matches (showing first 5):
  Joint 2640: Δdist=6.37ft, Δorient=5.2°
  Joint 2940: Δdist=2.15ft, Δorient=85.5°
  ...

✓ Validated results saved to: data/processed/validated_matches.csv
```

---

## Output File Structure

### validated_matches.csv columns:
```
Original columns:
- joint
- dist_15
- dist_22_aligned
- orient_15
- orient_22
- depth_15
- depth_22
- growth
- match_cost

New validation columns:
- is_valid (True/False)
- dist_diff_ft (actual distance difference)
- orient_diff_deg (actual orientation difference)
- dist_within_tolerance (True/False)
- orient_within_tolerance (True/False)
- confidence_score (0-100%)
- validation_status ('VALID' or 'INVALID')
```

---

## Adjusting Tolerances

### More Strict (High Precision):
```python
DISTANCE_TOLERANCE_FT = 3.0      # ±3 feet
ORIENTATION_TOLERANCE_DEG = 30.0  # ±30° (1 clock hour)
```
**Use when:** High confidence in alignment, minimal measurement error

### More Lenient (Allow Flexibility):
```python
DISTANCE_TOLERANCE_FT = 10.0     # ±10 feet
ORIENTATION_TOLERANCE_DEG = 90.0  # ±90° (3 clock hours)
```
**Use when:** Uncertain alignment, higher measurement variability

### Current (Recommended):
```python
DISTANCE_TOLERANCE_FT = 5.0      # ±5 feet
ORIENTATION_TOLERANCE_DEG = 60.0  # ±60° (2 clock hours)
```
**Use when:** Standard ILI inspection accuracy

---

## Integration with Analytics

### Update analytics.py to use validated matches:
```python
# Load validated matches instead of raw matches
df = pd.read_csv('data/processed/validated_matches.csv')

# Filter to only valid matches
valid_matches = df[df['is_valid'] == True]

# Use confidence score for classification
df['confidence_label'] = df.apply(lambda row:
    'Confident' if row['confidence_score'] >= 80 else
    'Review Required' if row['confidence_score'] >= 50 else
    'Low Confidence',
    axis=1
)
```

---

## Visualization in UI

### Add validation indicators to anomaly details:
```javascript
showAnomalyInfo(item) {
    // ... existing code ...
    
    // Add validation badge
    if (item.is_valid) {
        html += `
            <div class="validation-badge valid">
                ✓ Validated Match
                <span class="confidence">${item.confidence_score.toFixed(0)}%</span>
            </div>
        `;
    } else {
        html += `
            <div class="validation-badge invalid">
                ⚠️ Validation Failed
                <span class="reason">
                    ${!item.dist_within_tolerance ? 'Distance' : 'Orientation'} 
                    out of tolerance
                </span>
            </div>
        `;
    }
}
```

---

## Summary

✅ **Distance Tolerance**: ±5.0 feet  
✅ **Orientation Tolerance**: ±60 degrees (2 clock hours)  
✅ **Validation Method**: Both criteria must pass  
✅ **Confidence Score**: 0-100% based on how close to tolerances  
✅ **Output**: validated_matches.csv with validation columns  

**Key Point**: This validation proves that matched anomalies are truly the same physical defect by verifying the vendor-provided distance and orientation measurements are within acceptable industry-standard tolerances.
