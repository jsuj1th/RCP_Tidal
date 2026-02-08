"""
Anomaly Match Validation
Validates that matched anomalies are truly the same anomaly by checking
distance and orientation tolerances from vendor data.
"""

import pandas as pd
import numpy as np

# Industry-standard tolerances for ILI (In-Line Inspection)
DISTANCE_TOLERANCE_FT = 5.0      # ±5 feet for distance
ORIENTATION_TOLERANCE_DEG = 60.0  # ±60 degrees (2 clock hours)

def calculate_orientation_difference(orient1, orient2):
    """
    Calculate the minimum angular difference between two orientations.
    Handles wraparound (e.g., 350° and 10° are only 20° apart).
    
    Args:
        orient1: Orientation in degrees (0-360)
        orient2: Orientation in degrees (0-360)
    
    Returns:
        Minimum angular difference in degrees
    """
    diff = abs(orient1 - orient2)
    # Handle wraparound
    if diff > 180:
        diff = 360 - diff
    return diff

def validate_match(dist_15, dist_22_aligned, orient_15, orient_22, 
                   dist_tolerance=DISTANCE_TOLERANCE_FT, 
                   orient_tolerance=ORIENTATION_TOLERANCE_DEG):
    """
    Validate if two anomalies are truly the same based on distance and orientation.
    
    Args:
        dist_15: Distance in 2015 run (feet)
        dist_22_aligned: Aligned distance in 2022 run (feet)
        orient_15: Orientation in 2015 run (degrees, 0-360)
        orient_22: Orientation in 2022 run (degrees, 0-360)
        dist_tolerance: Maximum allowed distance difference (feet)
        orient_tolerance: Maximum allowed orientation difference (degrees)
    
    Returns:
        dict with validation results
    """
    # Calculate differences
    dist_diff = abs(dist_22_aligned - dist_15)
    orient_diff = calculate_orientation_difference(orient_15, orient_22)
    
    # Check tolerances
    dist_valid = dist_diff <= dist_tolerance
    orient_valid = orient_diff <= orient_tolerance
    
    # Overall validation
    is_valid = dist_valid and orient_valid
    
    # Confidence score (0-100)
    dist_score = max(0, 100 * (1 - dist_diff / dist_tolerance))
    orient_score = max(0, 100 * (1 - orient_diff / orient_tolerance))
    confidence = (dist_score + orient_score) / 2
    
    return {
        'is_valid': is_valid,
        'dist_diff_ft': dist_diff,
        'orient_diff_deg': orient_diff,
        'dist_within_tolerance': dist_valid,
        'orient_within_tolerance': orient_valid,
        'confidence_score': confidence,
        'validation_status': 'VALID' if is_valid else 'INVALID'
    }

def validate_all_matches(matched_csv='data/processed/matched_anomalies.csv',
                        output_csv='data/processed/validated_matches.csv'):
    """
    Validate all matched anomalies and add validation columns.
    
    Args:
        matched_csv: Path to matched anomalies CSV
        output_csv: Path to save validated results
    
    Returns:
        DataFrame with validation results
    """
    print("Validating Anomaly Matches...")
    print(f"Distance Tolerance: ±{DISTANCE_TOLERANCE_FT} ft")
    print(f"Orientation Tolerance: ±{ORIENTATION_TOLERANCE_DEG}° ({ORIENTATION_TOLERANCE_DEG/30:.1f} clock hours)")
    print("-" * 60)
    
    # Load matched anomalies
    df = pd.read_csv(matched_csv)
    
    # Validate each match
    validations = []
    for idx, row in df.iterrows():
        val = validate_match(
            row['dist_15'], 
            row['dist_22_aligned'],
            row['orient_15'],
            row['orient_22']
        )
        validations.append(val)
    
    # Add validation columns
    val_df = pd.DataFrame(validations)
    result_df = pd.concat([df, val_df], axis=1)
    
    # Statistics
    total = len(result_df)
    valid = result_df['is_valid'].sum()
    invalid = total - valid
    
    dist_violations = (~result_df['dist_within_tolerance']).sum()
    orient_violations = (~result_df['orient_within_tolerance']).sum()
    
    print(f"\nValidation Results:")
    print(f"  Total Matches: {total}")
    print(f"  ✓ Valid Matches: {valid} ({100*valid/total:.1f}%)")
    print(f"  ✗ Invalid Matches: {invalid} ({100*invalid/total:.1f}%)")
    print(f"\nViolation Breakdown:")
    print(f"  Distance violations: {dist_violations}")
    print(f"  Orientation violations: {orient_violations}")
    print(f"\nConfidence Statistics:")
    print(f"  Mean confidence: {result_df['confidence_score'].mean():.1f}%")
    print(f"  Min confidence: {result_df['confidence_score'].min():.1f}%")
    print(f"  Max confidence: {result_df['confidence_score'].max():.1f}%")
    
    # Show examples of invalid matches
    if invalid > 0:
        print(f"\n⚠️  Invalid Matches (showing first 5):")
        invalid_df = result_df[~result_df['is_valid']].head()
        for idx, row in invalid_df.iterrows():
            print(f"  Joint {row['joint']}: Δdist={row['dist_diff_ft']:.2f}ft, Δorient={row['orient_diff_deg']:.1f}°")
    
    # Save results
    result_df.to_csv(output_csv, index=False)
    print(f"\n✓ Validated results saved to: {output_csv}")
    
    return result_df

def get_validation_summary(validated_csv='data/processed/validated_matches.csv'):
    """
    Generate a summary report of validation results.
    """
    df = pd.read_csv(validated_csv)
    
    summary = {
        'total_matches': len(df),
        'valid_matches': df['is_valid'].sum(),
        'invalid_matches': (~df['is_valid']).sum(),
        'validation_rate': 100 * df['is_valid'].sum() / len(df),
        'avg_distance_diff': df['dist_diff_ft'].mean(),
        'max_distance_diff': df['dist_diff_ft'].max(),
        'avg_orientation_diff': df['orient_diff_deg'].mean(),
        'max_orientation_diff': df['orient_diff_deg'].max(),
        'avg_confidence': df['confidence_score'].mean(),
        'distance_tolerance_used': DISTANCE_TOLERANCE_FT,
        'orientation_tolerance_used': ORIENTATION_TOLERANCE_DEG
    }
    
    return summary

if __name__ == "__main__":
    # Run validation
    validated_df = validate_all_matches()
    
    # Show summary
    print("\n" + "="*60)
    summary = get_validation_summary()
    print("\nFINAL SUMMARY:")
    print(f"  Validation Rate: {summary['validation_rate']:.1f}%")
    print(f"  Average Distance Difference: {summary['avg_distance_diff']:.2f} ft")
    print(f"  Average Orientation Difference: {summary['avg_orientation_diff']:.1f}°")
    print(f"  Average Confidence: {summary['avg_confidence']:.1f}%")
