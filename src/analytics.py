import pandas as pd
import numpy as np

def generate_report():
    print("Generating Final Growth Analysis Report...")
    
    # 1. Load Data
    matched = pd.read_csv('data/processed/matched_anomalies.csv')
    df15 = pd.read_csv('data/processed/standardized_2015.csv')
    df22 = pd.read_csv('data/processed/aligned_2022.csv')
    
    # Metal Loss filters (ensure we use same logic as matching)
    anoms15 = df15[df15['event_type'].str.contains('metal loss', na=False)]
    anoms22 = df22[df22['event_type'].str.contains('metal loss', na=False)]
    
    # 2. Add Anomaly Type Information
    # Merge event_type from both runs
    matched = matched.merge(
        anoms15[['distance', 'event_type']].rename(columns={'event_type': 'event_type_15'}),
        left_on='dist_15',
        right_on='distance',
        how='left'
    ).drop('distance', axis=1)
    
    matched = matched.merge(
        anoms22[['distance_aligned', 'event_type']].rename(columns={'event_type': 'event_type_22'}),
        left_on='dist_22_aligned',
        right_on='distance_aligned',
        how='left'
    ).drop('distance_aligned', axis=1)
    
    # Use 2022 event type as primary, fallback to 2015
    matched['anomaly_type'] = matched['event_type_22'].fillna(matched['event_type_15']).fillna('metal loss')
    
    # 3. Add Validation Data
    # Calculate distance and orientation differences for validation display
    matched['dist_diff_ft'] = np.abs(matched['dist_22_aligned'] - matched['dist_15'])
    
    # Calculate orientation difference with wraparound handling
    orient_diff = np.abs(matched['orient_22'] - matched['orient_15'])
    matched['orient_diff_deg'] = np.where(orient_diff > 180, 360 - orient_diff, orient_diff)
    
    # Validation flags
    matched['dist_within_tolerance'] = matched['dist_diff_ft'] <= 5.0
    matched['orient_within_tolerance'] = matched['orient_diff_deg'] <= 60.0
    matched['is_validated'] = matched['dist_within_tolerance'] & matched['orient_within_tolerance']
    
    # Validation confidence (0-100%) - proves it's the same anomaly
    dist_score = np.maximum(0, 100 * (1 - matched['dist_diff_ft'] / 5.0))
    orient_score = np.maximum(0, 100 * (1 - matched['orient_diff_deg'] / 60.0))
    matched['validation_confidence'] = (dist_score + orient_score) / 2
    
    # 4. Enhanced Confidence Score - proves it's really an anomaly
    # Combines multiple factors:
    # - Match quality (low match_cost = high confidence)
    # - Validation (distance + orientation match)
    # - Depth consistency (similar depths = more confident)
    # - Type consistency (same type in both runs = more confident)
    
    # Match quality score (0-100)
    match_quality = 100 * (1.0 / (1.0 + matched['match_cost']))
    
    # Depth consistency score (0-100)
    depth_diff = np.abs(matched['depth_22'] - matched['depth_15'])
    depth_consistency = np.maximum(0, 100 * (1 - depth_diff / 50.0))  # Allow up to 50% difference
    
    # Type consistency score (0-100)
    type_match = (matched['event_type_15'] == matched['event_type_22']).astype(float) * 100
    type_match = type_match.fillna(50)  # Neutral if one is missing
    
    # Overall anomaly confidence (weighted average)
    matched['anomaly_confidence'] = (
        0.40 * matched['validation_confidence'] +  # 40% weight on spatial validation
        0.30 * match_quality +                     # 30% weight on match quality
        0.20 * depth_consistency +                 # 20% weight on depth consistency
        0.10 * type_match                          # 10% weight on type consistency
    )
    
    # Confidence level classification
    matched['confidence_level'] = 'Low'
    matched.loc[matched['anomaly_confidence'] >= 60, 'confidence_level'] = 'Medium'
    matched.loc[matched['anomaly_confidence'] >= 80, 'confidence_level'] = 'High'
    matched.loc[matched['anomaly_confidence'] >= 90, 'confidence_level'] = 'Very High'
    
    # 5. Identify Exceptions
    # New Anomalies: features in 2022 that were NOT matched
    matched_dists_22 = matched['dist_22_aligned'].values
    new_anoms = anoms22[~anoms22['distance_aligned'].isin(matched_dists_22)].copy()
    
    # Missing Anomalies: features in 2015 that were NOT matched (possibly repaired or measurement noise)
    matched_dists_15 = matched['dist_15'].values
    missing_anoms = anoms15[~anoms15['distance'].isin(matched_dists_15)].copy()
    
    # 6. Growth Analytics
    # Annualized growth (assumed 7 years: 2015-2022)
    DT = 7.0
    matched['annual_growth_rate'] = matched['growth'] / DT
    
    # 7. Enhanced Confidence Label with Clear Criteria
    # Determine if anomaly needs review based on multiple factors
    
    # Initialize all as "Confident"
    matched['confidence_label'] = 'Confident'
    matched['review_reasons'] = ''
    
    # Check multiple criteria for "Review Required"
    review_flags = []
    
    # Criterion 1: Poor spatial validation (distance or orientation out of tolerance)
    poor_spatial = ~matched['is_validated']
    matched.loc[poor_spatial, 'confidence_label'] = 'Review Required'
    matched.loc[poor_spatial, 'review_reasons'] = matched.loc[poor_spatial, 'review_reasons'] + 'Spatial validation failed; '
    
    # Criterion 2: High match cost (poor algorithmic match)
    high_match_cost = matched['match_cost'] > 0.6
    matched.loc[high_match_cost, 'confidence_label'] = 'Review Required'
    matched.loc[high_match_cost, 'review_reasons'] = matched.loc[high_match_cost, 'review_reasons'] + 'High match cost (>0.6); '
    
    # Criterion 3: Low overall anomaly confidence
    low_confidence = matched['anomaly_confidence'] < 70
    matched.loc[low_confidence, 'confidence_label'] = 'Review Required'
    matched.loc[low_confidence, 'review_reasons'] = matched.loc[low_confidence, 'review_reasons'] + 'Low confidence (<70%); '
    
    # Criterion 4: Inconsistent depth (too much or negative growth)
    depth_diff = matched['depth_22'] - matched['depth_15']
    unusual_growth = (depth_diff > 30) | (depth_diff < -10)  # >30% growth or >10% shrinkage
    matched.loc[unusual_growth, 'confidence_label'] = 'Review Required'
    matched.loc[unusual_growth, 'review_reasons'] = matched.loc[unusual_growth, 'review_reasons'] + 'Unusual depth change; '
    
    # Criterion 5: Type mismatch between runs
    type_mismatch = (matched['event_type_15'] != matched['event_type_22']) & matched['event_type_15'].notna() & matched['event_type_22'].notna()
    matched.loc[type_mismatch, 'confidence_label'] = 'Review Required'
    matched.loc[type_mismatch, 'review_reasons'] = matched.loc[type_mismatch, 'review_reasons'] + 'Type mismatch; '
    
    # Clean up review reasons (remove trailing semicolon and space)
    matched['review_reasons'] = matched['review_reasons'].str.rstrip('; ')
    
    # Legacy confidence score for backward compatibility
    matched['confidence_score'] = 1.0 / (1.0 + matched['match_cost']) # Scale 0-1
    
    # 8. Enhanced Severity Scoring System
    # Combines multiple risk factors into a 0-100 severity score
    
    # Factor 1: Current Depth (0-40 points)
    # Higher depth = higher severity
    depth_score = np.minimum(40, matched['depth_22'] * 0.8)  # Max 40 points at 50% depth
    
    # Factor 2: Growth Rate (0-30 points)
    # Faster growth = higher severity
    growth_score = np.minimum(30, matched['annual_growth_rate'] * 10)  # Max 30 points at 3%/yr
    
    # Factor 3: Absolute Growth (0-20 points)
    # Large total growth = higher severity
    absolute_growth = np.abs(matched['growth'])
    absolute_growth_score = np.minimum(20, absolute_growth * 0.8)  # Max 20 points at 25% growth
    
    # Factor 4: Projected Time to Failure (0-10 points)
    # Closer to failure = higher severity
    # Assume failure at 80% depth
    remaining_depth = 80 - matched['depth_22']
    years_to_failure = np.where(
        matched['annual_growth_rate'] > 0,
        remaining_depth / matched['annual_growth_rate'],
        999  # If not growing, set to very high
    )
    time_score = np.where(
        years_to_failure < 5, 10,
        np.where(years_to_failure < 10, 7,
        np.where(years_to_failure < 20, 4, 0))
    )
    
    # Calculate total severity score (0-100)
    matched['severity_score'] = depth_score + growth_score + absolute_growth_score + time_score
    matched['severity_score'] = np.clip(matched['severity_score'], 0, 100)
    
    # Classify severity level
    matched['severity_level'] = 'Low'
    matched.loc[matched['severity_score'] >= 30, 'severity_level'] = 'Moderate'
    matched.loc[matched['severity_score'] >= 50, 'severity_level'] = 'High'
    matched.loc[matched['severity_score'] >= 70, 'severity_level'] = 'Critical'
    
    # Calculate years to failure for display
    matched['years_to_failure'] = years_to_failure
    matched['years_to_failure'] = np.clip(matched['years_to_failure'], 0, 100)  # Cap at 100 years
    
    # 9. Flag Status (simplified categories based on severity)
    matched['status'] = 'Active'
    matched.loc[matched['severity_score'] >= 70, 'status'] = 'Critical'
    matched.loc[matched['severity_score'] >= 50, 'status'] = 'High Risk'
    matched.loc[matched['growth'] <= 0, 'status'] = 'Static'
    
    # 8. Export for UI
    # We want a clean JSON with all anomalies (matched and new)
    ui_matched = matched.copy()
    ui_matched['is_match'] = True
    
    ui_new = new_anoms.copy().rename(columns={'distance_aligned': 'dist_22_aligned', 'orientation': 'orient_22', 'depth': 'depth_22'})
    ui_new['is_match'] = False
    ui_new['confidence_label'] = 'Review Required' # New anomalies are unconfirmed
    ui_new['status'] = 'New'
    ui_new['is_validated'] = False
    ui_new['validation_confidence'] = 0
    ui_new['anomaly_confidence'] = 0
    ui_new['confidence_level'] = 'Unknown'
    ui_new['anomaly_type'] = ui_new['event_type']
    
    # Combine for UI
    ui_data = pd.concat([ui_matched, ui_new], ignore_index=True)
    ui_data = ui_data.fillna(0)
    
    # Take a sample or top 500 to keep UI smooth if it's too big
    ui_data.to_json('data/ui_payload.json', orient='records')
    print("Exported data/ui_payload.json for 3D UI")

    # 9. Export Reference Data for UI
    master_ref = pd.read_csv('data/processed/reference_master.csv')
    master_ref.to_json('data/reference_payload.json', orient='records')
    print("Exported data/reference_payload.json for 3D UI")

    # 10. Save Final Report
    matched.to_csv('data/processed/final_growth_report.csv', index=False)
    new_anoms.to_csv('data/processed/new_anomalies.csv', index=False)
    
    # 11. Summary Statistics
    print("\n--- Summary Report ---")
    print(f"Total Matched: {len(matched)}")
    print(f"Validated Matches: {matched['is_validated'].sum()} ({100*matched['is_validated'].sum()/len(matched):.1f}%)")
    print(f"New Anomalies (2022): {len(new_anoms)}")
    print(f"Missing/Repaired (2015): {len(missing_anoms)}")
    print(f"\nStatus Distribution:")
    print(f"  Critical: {len(matched[matched['status'] == 'Critical'])} ({100*len(matched[matched['status'] == 'Critical'])/len(matched):.1f}%)")
    print(f"  High Risk: {len(matched[matched['status'] == 'High Risk'])} ({100*len(matched[matched['status'] == 'High Risk'])/len(matched):.1f}%)")
    print(f"  Active: {len(matched[matched['status'] == 'Active'])} ({100*len(matched[matched['status'] == 'Active'])/len(matched):.1f}%)")
    print(f"  Static: {len(matched[matched['status'] == 'Static'])} ({100*len(matched[matched['status'] == 'Static'])/len(matched):.1f}%)")
    print(f"\nSeverity Distribution:")
    print(f"  Critical (≥70): {len(matched[matched['severity_score'] >= 70])}")
    print(f"  High (50-70): {len(matched[(matched['severity_score'] >= 50) & (matched['severity_score'] < 70)])}")
    print(f"  Moderate (30-50): {len(matched[(matched['severity_score'] >= 30) & (matched['severity_score'] < 50)])}")
    print(f"  Low (<30): {len(matched[matched['severity_score'] < 30])}")
    print(f"\nAverage Metrics:")
    print(f"  Annual Growth Rate: {matched['annual_growth_rate'].mean():.2f} %/yr")
    print(f"  Validation Confidence: {matched['validation_confidence'].mean():.1f}%")
    print(f"  Anomaly Confidence: {matched['anomaly_confidence'].mean():.1f}%")
    print(f"  Severity Score: {matched['severity_score'].mean():.1f}/100")
    
    print("\nTop 5 Most Severe Anomalies:")
    top_severe = matched.sort_values('severity_score', ascending=False)[['dist_22_aligned', 'depth_22', 'annual_growth_rate', 'severity_score', 'years_to_failure']].head()
    print(top_severe.to_string(index=False))

if __name__ == "__main__":
    generate_report()
