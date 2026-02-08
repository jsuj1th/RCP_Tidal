import pandas as pd
import numpy as np
from scipy.spatial import distance_matrix
from scipy.optimize import linear_sum_assignment

def match_anomalies():
    print("Matching Anomalies using Hungarian Algorithm...")
    
    # 1. Load Data
    df15 = pd.read_csv('data/processed/standardized_2015.csv')
    df22 = pd.read_csv('data/processed/aligned_2022.csv')
    
    # Filter for 'metal loss' only for matching (or include all anomalies)
    # Let's focus on metal loss as per business case
    anoms15 = df15[df15['event_type'].str.contains('metal loss', na=False)].copy()
    anoms22 = df22[df22['event_type'].str.contains('metal loss', na=False)].copy()
    
    print(f"Candidates 2015: {len(anoms15)}")
    print(f"Candidates 2022: {len(anoms22)}")
    
    # 2. Build Cost Matrix
    # We use distance and orientation as the primary spatial keys
    # Orientation 0-360 is scaled to match ft influence
    # 1 ft roughly equivalent to 10 degrees? Let's use 1ft ~ 30deg (1 hour)
    
    coords15 = np.column_stack([
        anoms15['distance'],
        anoms15['orientation'] / 30.0 # Scale hours to ft-equivalent
    ])
    
    coords22 = np.column_stack([
        anoms22['distance_aligned'],
        anoms22['orientation'] / 30.0
    ])
    
    # Pairwise distance matrix
    d_mat = distance_matrix(coords15, coords22)
    
    # 3. Hard Constraints
    # Distance tolerance (e.g. 5.0 ft)
    # If distance shift is more than 5ft after alignment, it's likely a new anomaly
    dist_diffs = np.abs(np.subtract.outer(anoms15['distance'].values, anoms22['distance_aligned'].values))
    impossible_mask = dist_diffs > 5.0
    d_mat[impossible_mask] = 1e6
    
    # 4. Solve Assignment
    row_ind, col_ind = linear_sum_assignment(d_mat)
    
    # 5. Extract Matches
    matched_results = []
    
    for r, c in zip(row_ind, col_ind):
        cost = d_mat[r, c]
        if cost >= 1e5:
            continue
            
        row15 = anoms15.iloc[r]
        row22 = anoms22.iloc[c]
        
        # Calculate Growth
        depth_growth = row22['depth'] - row15['depth']
        
        matched_results.append({
            'joint': row15['joint_number'],
            'dist_15': row15['distance'],
            'dist_22_aligned': row22['distance_aligned'],
            'orient_15': row15['orientation'],
            'orient_22': row22['orientation'],
            'depth_15': row15['depth'],
            'depth_22': row22['depth'],
            'growth': depth_growth,
            'match_cost': cost
        })
        
    results_df = pd.DataFrame(matched_results)
    
    # 6. Save Matches
    results_df.to_csv('data/processed/matched_anomalies.csv', index=False)
    
    print(f"Matched {len(results_df)} anomalies.")
    print(f"Average Growth: {results_df['growth'].mean():.2f} %")
    
    return results_df

if __name__ == "__main__":
    match_anomalies()
