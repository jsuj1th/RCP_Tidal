import pandas as pd
import numpy as np
from datetime import time

def oclock_to_degrees(t):
    if isinstance(t, time):
        return (t.hour + t.minute / 60.0) * 30.0
    return np.nan

class ILIStandardizer:
    def __init__(self):
        # Target Schema
        self.standard_cols = [
            'distance', 'event_type', 'orientation', 
            'length', 'width', 'depth', 'joint_number', 'comments'
        ]
        
    def normalize(self, df, config):
        """
        Normalizes a dataframe based on a config dictionary mapping.
        config format: {'std_col': 'raw_col'}
        """
        df_std = pd.DataFrame()
        
        # 1. Column Mapping
        for std, raw in config.items():
            if raw in df.columns:
                df_std[std] = df[raw]
            else:
                # Initialize empty if missing
                df_std[std] = np.nan
                
        # 2. Type/Unit Conversion
        
        # Orientation: Handle O'clock (time objects) to Degrees
        if 'orientation' in df_std.columns and not df_std['orientation'].isna().all():
             # Check if it looks like time objects or strings
             sample = df_std['orientation'].dropna().iloc[0] if not df_std['orientation'].dropna().empty else None
             if isinstance(sample, time):
                 df_std['orientation'] = df_std['orientation'].apply(oclock_to_degrees)
             # If it's already float (degrees) or string, handle accordingly
             # For this dataset, we know 2015 is HH:MM, 2022 is HH:MM
        
        # Clean Event Types
        if 'event_type' in df_std.columns:
            df_std['event_type'] = df_std['event_type'].fillna('').astype(str).str.lower().str.strip()
            
        # Ensure Numeric types
        numeric_cols = ['distance', 'length', 'width', 'depth', 'orientation', 'joint_number']
        for col in numeric_cols:
            if col in df_std.columns:
                 df_std[col] = pd.to_numeric(df_std[col], errors='coerce')

        # Fill missing standard columns with NaN
        for col in self.standard_cols:
            if col not in df_std.columns:
                df_std[col] = np.nan
                
        return df_std[self.standard_cols]

def load_ili_data(file_path):
    print(f"Loading and Standardizing data from {file_path}...")
    standardizer = ILIStandardizer()
    
    # 2015 Config
    # Log Dist. [ft], Event Description, O'clock, Depth [%], Length [in], Width [in], J. no.
    config_15 = {
        'distance': 'Log Dist. [ft]',
        'event_type': 'Event Description',
        'orientation': "O'clock",
        'depth': 'Depth [%]',
        'length': 'Length [in]',
        'width': 'Width [in]',
        'joint_number': 'J. no.',
        'comments': 'Comments'
    }
    
    # 2022 Config
    # ILI Wheel Count [ft.], Event Description, O'clock [hh:mm], Metal Loss Depth [%], Length [in], Width [in], Joint Number
    config_22 = {
        'distance': 'ILI Wheel Count \n[ft.]',
        'event_type': 'Event Description',
        'orientation': "O'clock\n[hh:mm]",
        'depth': 'Metal Loss Depth \n[%]',
        'length': 'Length [in]',
        'width': 'Width [in]',
        'joint_number': 'Joint Number',
        'comments': 'Comment'
    }
    
    # Load 2015
    df15_raw = pd.read_excel(file_path, sheet_name='2015')
    std_15 = standardizer.normalize(df15_raw, config_15)
    std_15['year'] = 2015
    
    # Load 2022
    df22_raw = pd.read_excel(file_path, sheet_name='2022')
    std_22 = standardizer.normalize(df22_raw, config_22)
    std_22['year'] = 2022
    
    return std_15, std_22

if __name__ == "__main__":
    df15, df22 = load_ili_data('ILIDataV2.xlsx')
    
    # Filter for anomalies only
    # We want to remove reference features (welds, valves, etc.)
    # Reference keywords (to exclude)
    ref_keywords = ['weld', 'valve', 'tee', 'tap', 'casing', 'agm', 'marker', 'launcher', 'receiver', 'start', 'end']
    
    # Filter function
    def is_anomaly(event):
        e = str(event).lower()
        # If it contains any reference keyword, it's not an anomaly for the 'anomaly dataset'
        if any(k in e for k in ref_keywords):
            return False
        # Otherwise, if it has 'loss', 'cluster', 'pit', 'anom', it's likely an anomaly
        # Or if it's just not a reference point.
        # Given the business case, anomalies are typically 'metal loss' etc.
        return True

    df15_anoms = df15[df15['event_type'].apply(is_anomaly)].copy()
    df22_anoms = df22[df22['event_type'].apply(is_anomaly)].copy()

    print(f"2015 Anomalies: {len(df15_anoms)}")
    print(f"2022 Anomalies: {len(df22_anoms)}")
    
    # Save anomaly-only standard outputs
    df15_anoms.to_csv('data/processed/standardized_2015.csv', index=False)
    df22_anoms.to_csv('data/processed/standardized_2022.csv', index=False)
    print("Saved filtered anomaly datasets to data/processed/")
