# Anomaly Matching Algorithm

## Algorithm Used: **Hungarian Algorithm (Linear Sum Assignment)**

Your codebase uses the **Hungarian Algorithm** (also known as the Kuhn-Munkres algorithm) for optimal bipartite matching between anomalies from 2015 and 2022 inspections.

---

## Implementation Details

### Location: `src/matching.py`

### Key Components:

#### 1. **Cost Matrix Construction**
```python
# Build 2D feature space
coords15 = [distance, orientation/30.0]
coords22 = [distance_aligned, orientation/30.0]

# Calculate pairwise Euclidean distances
d_mat = distance_matrix(coords15, coords22)
```

**Features used:**
- **Distance** (in feet) - Primary spatial coordinate
- **Orientation** (scaled by 30) - Converts clock position to distance-equivalent units
  - Scaling factor: 1 ft ≈ 30 degrees (1 hour on clock face)

#### 2. **Hard Constraints**
```python
# Distance tolerance: 5.0 ft
dist_diffs = abs(distance_2015 - distance_2022_aligned)
impossible_mask = dist_diffs > 5.0
d_mat[impossible_mask] = 1e6  # Infinite cost
```

**Constraint logic:**
- If distance difference > 5 feet after alignment → Not a match
- Prevents false matches between distant anomalies
- Assigns infinite cost to impossible pairs

#### 3. **Optimal Assignment**
```python
from scipy.optimize import linear_sum_assignment
row_ind, col_ind = linear_sum_assignment(d_mat)
```

**What it does:**
- Finds the optimal one-to-one matching
- Minimizes total cost across all matches
- Guarantees each 2015 anomaly matches at most one 2022 anomaly

#### 4. **Growth Calculation**
```python
depth_growth = depth_2022 - depth_2015
```

---

## Why Hungarian Algorithm?

### ✅ Advantages:
1. **Optimal Solution** - Guarantees minimum total matching cost
2. **One-to-One Mapping** - Each anomaly matches exactly once
3. **Efficient** - O(n³) complexity, fast for thousands of anomalies
4. **Well-Established** - Proven algorithm with robust implementations
5. **Handles Constraints** - Easy to incorporate distance/orientation limits

### ⚠️ Limitations:
1. **Requires Equal Sets** - Assumes similar number of anomalies in both years
2. **No Partial Matches** - Can't handle anomaly splitting/merging
3. **Linear Features** - Doesn't capture complex spatial relationships
4. **No Temporal Info** - Doesn't use growth patterns for matching

---

## Comparison with Other Algorithms

### 1. **Dynamic Time Warping (DTW)**
- **Use case**: Sequence alignment with non-linear time warping
- **Why not used**: Anomalies are spatial points, not time series
- **Could be useful for**: Aligning entire inspection runs

### 2. **Iterative Closest Point (ICP)**
- **Use case**: Point cloud registration, 3D alignment
- **Why not used**: Overkill for 2D pipeline data
- **Could be useful for**: Complex 3D pipeline geometries

### 3. **Hungarian Algorithm** ✅ **(CURRENT)**
- **Use case**: Optimal bipartite matching
- **Why used**: Perfect for one-to-one anomaly correspondence
- **Strengths**: Fast, optimal, handles constraints

### 4. **Graph-based Matching**
- **Use case**: Complex relationships, multi-hop connections
- **Why not used**: Adds complexity without clear benefit
- **Could be useful for**: Modeling anomaly clusters

### 5. **Ensemble Methods**
- **Use case**: Combining multiple matching criteria
- **Why not used**: Single distance metric sufficient
- **Could be useful for**: Incorporating depth, shape, confidence

### 6. **Deep Learning (Siamese Networks)**
- **Use case**: Learning similarity from data
- **Why not used**: Requires large training dataset
- **Could be useful for**: Learning from historical inspection patterns

---

## Alignment Process (Preprocessing)

### Location: `src/alignment.py`

Before matching, the algorithm performs **distance correction**:

```python
# Linear interpolation between reference points
f_warp = interp1d(dist_22, dist_15, kind='linear', fill_value="extrapolate")
df22['distance_aligned'] = f_warp(df22['distance_raw'])
```

**Purpose:**
- Corrects for odometer drift between inspections
- Uses reference points (welds, taps, tees) as anchors
- Applies linear interpolation between anchors

**This is similar to:**
- **Dynamic Time Warping** (but simpler, linear)
- **Piecewise linear alignment**

---

## Complete Pipeline

```
┌─────────────────────────────────────────────────────────┐
│ 1. STANDARDIZATION (ingestion.py)                      │
│    - Parse raw inspection data                          │
│    - Normalize formats                                  │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│ 2. ALIGNMENT (alignment.py)                            │
│    - Build reference point mapping                      │
│    - Apply linear interpolation                         │
│    - Correct odometer drift                             │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│ 3. MATCHING (matching.py) ← HUNGARIAN ALGORITHM        │
│    - Build cost matrix (distance + orientation)        │
│    - Apply hard constraints (5 ft tolerance)           │
│    - Solve optimal assignment                           │
│    - Calculate growth metrics                           │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│ 4. ANALYTICS (analytics.py)                            │
│    - Classify anomalies (Critical/Review/Confident)    │
│    - Calculate growth rates                             │
│    - Generate reports                                   │
└─────────────────────────────────────────────────────────┘
```

---

## Key Parameters

| Parameter | Value | Purpose |
|-----------|-------|---------|
| Distance Tolerance | 5.0 ft | Maximum allowed distance difference |
| Orientation Scaling | 30 deg/ft | Converts clock position to distance units |
| Cost Threshold | 1e6 | Infinite cost for impossible matches |
| Interpolation Method | Linear | Distance correction between anchors |

---

## Potential Improvements

### Short-term:
1. **Add orientation tolerance** - Currently only distance is constrained
2. **Weighted cost function** - Give more weight to distance vs orientation
3. **Confidence scoring** - Assign match confidence based on cost

### Medium-term:
4. **Ensemble approach** - Combine distance, orientation, depth similarity
5. **Handle unmatched anomalies** - Explicitly identify new/disappeared anomalies
6. **Depth-based filtering** - Only match anomalies with similar initial depths

### Long-term:
7. **Machine learning** - Learn optimal weights from historical data
8. **Graph-based clustering** - Group related anomalies before matching
9. **Temporal modeling** - Use growth patterns to validate matches

---

## Summary

**Current Algorithm: Hungarian Algorithm (Linear Sum Assignment)**

**Why it works:**
- Optimal one-to-one matching
- Fast and reliable
- Handles spatial constraints
- Simple to understand and maintain

**Preprocessing:**
- Linear interpolation for distance alignment
- Reference point anchoring

**Result:**
- Matched anomalies with growth metrics
- Critical zone identification
- Confidence classification
