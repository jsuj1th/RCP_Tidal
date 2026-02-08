import pandas as pd

def extract_references(df):
    """
    Extracts Girth Welds, Valves, and Tees/Taps as reference points.
    """
    # Keywords to indentify reference features
    # Note: 'girth weld' is sometimes explicitly named, sometimes it's implied by joint count logic
    # But for this dataset, let's look for explicit events.
    
    refs = []
    
    # Critical: Valves, Tees, Taps are "Hard Anchors"
    # Added Casings and AGMs based on user feedback
    hard_anchors = ['valve', 'tee', 'tap', 'stopple tee', 'casing', 'agm', 'marker']
    
    # Girth Welds are "Soft Anchors" (plentiful but hard to distinguish individual ones without sequence)
    # The dataset has 'girth weld' event in 2022, but 2015 has 'girthweld' (case sensitivity handled in ingestion)
    soft_anchors = ['girth weld', 'girthweld']
    
    all_keywords = hard_anchors + soft_anchors
    
    mask = df['event'].str.contains('|'.join(all_keywords), case=False, na=False)
    filtered = df[mask].copy()
    
    filtered['type'] = 'unknown'
    
    # Tagging
    for k in hard_anchors:
        filtered.loc[filtered['event'].str.contains(k), 'type'] = 'hard_anchor'
        
    for k in soft_anchors:
        filtered.loc[filtered['event'].str.contains(k), 'type'] = 'soft_anchor'
        
    return filtered

if __name__ == "__main__":
    import ingestion
    df15, df22 = ingestion.load_ili_data('../ILIDataV2.xlsx')
    
    ref15 = extract_references(df15)
    ref22 = extract_references(df22)
    
    print(f"2015 References: {len(ref15)} (Hard: {len(ref15[ref15['type']=='hard_anchor'])})")
    print(f"2022 References: {len(ref22)} (Hard: {len(ref22[ref22['type']=='hard_anchor'])})")
    
    # Save for inspection
    ref15.to_csv('../data/processed/ref15.csv', index=False)
    ref22.to_csv('../data/processed/ref22.csv', index=False)
