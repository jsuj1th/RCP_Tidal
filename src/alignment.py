import pandas as pd
import numpy as np
from scipy.interpolate import interp1d

def apply_distance_correction():
    print("Applying Distance Correction (Alignment)...")
    
    # 1. Load Data
    master_ref = pd.read_csv('data/processed/reference_master.csv')
    df15 = pd.read_csv('data/processed/standardized_2015.csv')
    df22 = pd.read_csv('data/processed/standardized_2022.csv')
    
    print(f"Loaded {len(master_ref)} reference points.")
    
    # 2. Build Warp Function (Interpolation)
    # We want to map dist_22 -> dist_15
    # x = dist_22, y = dist_15
    
    x = master_ref['dist_22'].values
    y = master_ref['dist_15'].values
    
    # Sort just in case
    sort_idx = np.argsort(x)
    x = x[sort_idx]
    y = y[sort_idx]
    
    # Extrapolate outside anchors using the same linear slope as the nearest segments
    f_warp = interp1d(x, y, kind='linear', fill_value="extrapolate")
    
    # 3. Apply Correction to 2022 Anomaly Data
    df22['distance_raw'] = df22['distance']
    df22['distance_aligned'] = f_warp(df22['distance_raw'])
    
    # 4. Save Aligned Data
    df22.to_csv('data/processed/aligned_2022.csv', index=False)
    
    # Check shift stats
    drift = df22['distance_aligned'] - df22['distance_raw']
    print(f"Alignment Complete.")
    print(f"  - Mean Odometer Correction: {drift.mean():.2f} ft")
    print(f"  - Max Odometer Correction: {drift.abs().max():.2f} ft")
    
    return df15, df22

if __name__ == "__main__":
    apply_distance_correction()
