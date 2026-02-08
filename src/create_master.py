import pandas as pd
import numpy as np

def create_master_reference():
    print("Creating Unified Master Reference Data...")
    
    # Load raw with no header assumption to see what's really there, or just load and rename
    r15 = pd.read_csv('../data/processed/ref15.csv')
    r22 = pd.read_csv('../data/processed/ref22.csv')
    
    # Force rename columns by position to guarantee 'joint' exists and is clean
    # Expected: year, dist, event, joint, oclock_deg, type
    cols = ['year', 'dist', 'event', 'joint', 'oclock_deg', 'type']
    
    if len(r15.columns) == 6:
        r15.columns = cols
    else:
        print(f"Warning: r15 has {len(r15.columns)} columns, expected 6")
        
    if len(r22.columns) == 6:
        r22.columns = cols
    else:
        print(f"Warning: r22 has {len(r22.columns)} columns, expected 6")

    print(f"Columns 15: {r15.columns.tolist()}")
    
    # Ensure Joint is numeric
    r15['joint'] = pd.to_numeric(r15['joint'], errors='coerce')
    r22['joint'] = pd.to_numeric(r22['joint'], errors='coerce')
    
    # Strategy 1: Girth Weld Matching via Joint Number
    gw15 = r15[(r15['type'] == 'soft_anchor') & (r15['joint'].notna())].copy()
    gw22 = r22[(r22['type'] == 'soft_anchor') & (r22['joint'].notna())].copy()
    
    gw15['joint'] = gw15['joint'].astype(int)
    gw22['joint'] = gw22['joint'].astype(int)
    
    # Match on Joint (Manual Dictionary Join to bypass merge error)
    print("Performing Manual Join on Joint Number...")
    
    # Create lookup for 2022
    # dict: joint -> {dist, event}
    gw22_map = {}
    for _, row in gw22.iterrows():
        gw22_map[row['joint']] = row.to_dict()
        
    matched_rows = []
    
    for _, row15 in gw15.iterrows():
        j = row15['joint']
        if j in gw22_map:
            row22 = gw22_map[j]
            matched_rows.append({
                'joint': j,
                'dist_15': row15['dist'],
                'event_15': row15['event'],
                'dist_22': row22['dist'],
                'event_22': row22['event']
            })
            
    matched_gw = pd.DataFrame(matched_rows)
    print(f"Matched GW count: {len(matched_gw)}")
    
    if not matched_gw.empty:
        matched_gw['type'] = 'Girth Weld'
        matched_gw['feature_id'] = 'GW_' + matched_gw['joint'].astype(str)
    
    # Strategy 2: Hard Anchor Matching via Proximity
    ha15 = r15[r15['type'] == 'hard_anchor'].copy().sort_values('dist')
    ha22 = r22[r22['type'] == 'hard_anchor'].copy().sort_values('dist')
    
    matched_ha = []
    used_indices_22 = set()
    
    for _, item15 in ha15.iterrows():
        target_event = item15['event']
        target_dist = item15['dist']
        
        candidates = df_candidates(ha22, target_event, used_indices_22)
        
        if candidates.empty:
            continue
            
        candidates = candidates.copy()
        candidates['diff'] = (candidates['dist'] - target_dist).abs()
        best_match = candidates.nsmallest(1, 'diff').iloc[0]
        
        if best_match['diff'] < 500:
            used_indices_22.add(best_match.name)
            matched_ha.append({
                'feature_id': f"{item15['event'].upper().replace(' ', '_')}_{int(item15['dist'])}",
                'type': item15['event'].title(),
                'joint': item15['joint'] if not pd.isna(item15['joint']) else best_match['joint'],
                'dist_15': item15['dist'],
                'dist_22': best_match['dist'],
                'event_15': item15['event'],
                'event_22': best_match['event']
            })
            
    matched_ha_df = pd.DataFrame(matched_ha)
    
    # Combine
    master = pd.concat([
        matched_gw[['type', 'joint', 'dist_15', 'dist_22']],
        matched_ha_df[['type', 'joint', 'dist_15', 'dist_22']]
    ], ignore_index=True)
    
    master['shift'] = (master['dist_22'] - master['dist_15']).round(2)
    master = master.sort_values('dist_15')
    
    output_path = '../data/processed/reference_master.csv'
    master.to_csv(output_path, index=False)
    
    print(f"Created Reference Master with {len(master)} matched points.")
    print(f"  - Girth Welds: {len(matched_gw)}")
    print(f"  - Hard Anchors: {len(matched_ha_df)}")
    print("\nSample Data:")
    print(master.head(10))

def df_candidates(df, target_event, used_indices):
    keywords = ['valve', 'tee', 'tap', 'casing', 'agm', 'marker']
    keyword = 'unknown'
    for k in keywords:
        if k in target_event:
            keyword = k
            break
            
    if keyword == 'unknown':
        return pd.DataFrame()
        
    mask = df['event'].str.contains(keyword, case=False) & (~df.index.isin(used_indices))
    return df[mask]

if __name__ == "__main__":
    create_master_reference()
