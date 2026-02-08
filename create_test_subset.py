
import pandas as pd
import random

# Load the source file
df = pd.read_csv('data/processed/aligned_2022.csv')

# Select columns that would be in a raw upload
columns_to_keep = [
    'distance', 'event_type', 'orientation', 
    'length', 'width', 'depth', 
    'joint_number', 'comments'
]

# Check if columns exist
available_cols = [c for c in columns_to_keep if c in df.columns]

if not available_cols:
    print("Error: No valid columns found")
    exit(1)

# Sample 50 random rows
if len(df) > 50:
    df_sample = df.sample(n=50, random_state=42)
else:
    df_sample = df

# Normalize orientation to 0-360
if 'orientation' in df_sample.columns:
    df_sample['orientation'] = df_sample['orientation'] % 360

# Save to test_upload.csv
df_sample[available_cols].to_csv('test_upload.csv', index=False)

print(f"Successfully created test_upload.csv with {len(df_sample)} rows and columns: {available_cols}")
