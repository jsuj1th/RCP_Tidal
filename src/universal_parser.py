"""
Universal File Parser for Pipeline Data
Supports Excel, CSV, JSON, TSV and other tabular formats
with intelligent column mapping and validation
"""

import pandas as pd
import numpy as np
from datetime import time
import json
import re
from pathlib import Path
from typing import Dict, List, Optional, Tuple, Any
from difflib import SequenceMatcher

class UniversalParser:
    """
    Universal parser for pipeline inspection data files.
    Handles multiple formats and intelligently maps columns to standard schema.
    """
    
    # Standard schema columns
    STANDARD_SCHEMA = [
        'distance', 'event_type', 'orientation', 
        'length', 'width', 'depth', 'joint_number', 'comments', 'year'
    ]
    
    # Fuzzy matching patterns for common column name variations
    COLUMN_PATTERNS = {
        'distance': [
            'dist', 'distance', 'log dist', 'wheel count', 'footage', 
            'log distance', 'ili wheel count', 'chainage', 'station'
        ],
        'event_type': [
            'event', 'type', 'event type', 'event description', 
            'description', 'feature', 'anomaly type', 'defect type'
        ],
        'orientation': [
            'orient', 'orientation', 'oclock', "o'clock", 'clock', 
            'angle', 'position', 'clock position'
        ],
        'depth': [
            'depth', 'metal loss', 'wall loss', 'thickness loss',
            'metal loss depth', 'wall thickness', 'corrosion depth', '%'
        ],
        'length': [
            'length', 'len', 'axial length', 'longitudinal', 'l'
        ],
        'width': [
            'width', 'w', 'circumferential', 'circ', 'circ width'
        ],
        'joint_number': [
            'joint', 'j.no', 'j no', 'jnt', 'joint number', 
            'joint no', 'j#', 'joint #', 'pipe number'
        ],
        'comments': [
            'comment', 'comments', 'notes', 'remarks', 'note', 'remark'
        ],
        'year': [
            'year', 'run year', 'inspection year', 'date', 'run date'
        ]
    }
    
    # Reference feature keywords (to exclude from anomaly data)
    REFERENCE_KEYWORDS = [
        'weld', 'valve', 'tee', 'tap', 'casing', 'agm', 'marker', 
        'launcher', 'receiver', 'start', 'end', 'girth'
    ]
    
    def __init__(self, fuzzy_threshold: float = 0.6):
        """
        Initialize parser.
        
        Args:
            fuzzy_threshold: Minimum similarity score (0-1) for fuzzy column matching
        """
        self.fuzzy_threshold = fuzzy_threshold
        self.detected_format = None
        self.column_mapping = {}
        self.warnings = []
        
    def detect_format(self, file_path: str) -> str:
        """
        Detect file format from extension and content.
        
        Args:
            file_path: Path to the file
            
        Returns:
            Format string: 'excel', 'csv', 'json', 'tsv', 'txt'
        """
        path = Path(file_path)
        ext = path.suffix.lower()
        
        format_map = {
            '.xlsx': 'excel',
            '.xls': 'excel',
            '.csv': 'csv',
            '.json': 'json',
            '.tsv': 'tsv',
            '.txt': 'txt'
        }
        
        detected = format_map.get(ext, 'unknown')
        self.detected_format = detected
        return detected
    
    def fuzzy_match_column(self, column_name: str) -> Optional[str]:
        """
        Use fuzzy matching to map a column name to standard schema.
        
        Args:
            column_name: Original column name from file
            
        Returns:
            Standard column name or None if no match found
        """
        # Clean the column name
        clean_name = str(column_name).lower().strip()
        clean_name = re.sub(r'[^\w\s]', ' ', clean_name)  # Remove special chars
        clean_name = re.sub(r'\s+', ' ', clean_name)  # Normalize whitespace
        
        best_match = None
        best_score = 0
        
        for std_col, patterns in self.COLUMN_PATTERNS.items():
            for pattern in patterns:
                # Calculate similarity
                score = SequenceMatcher(None, clean_name, pattern.lower()).ratio()
                
                # Also check if pattern is contained in column name
                if pattern.lower() in clean_name:
                    score = max(score, 0.8)
                
                if score > best_score and score >= self.fuzzy_threshold:
                    best_score = score
                    best_match = std_col
        
        if best_match:
            self.column_mapping[column_name] = best_match
            
        return best_match
    
    def map_columns(self, df: pd.DataFrame, manual_mapping: Optional[Dict] = None) -> pd.DataFrame:
        """
        Map dataframe columns to standard schema using fuzzy matching.
        
        Args:
            df: Input dataframe
            manual_mapping: Optional manual column mapping override
            
        Returns:
            DataFrame with standardized column names
        """
        if manual_mapping:
            # Use manual mapping if provided
            df_mapped = df.rename(columns=manual_mapping)
        else:
            # Auto-detect column mapping
            mapping = {}
            for col in df.columns:
                std_col = self.fuzzy_match_column(col)
                if std_col:
                    mapping[col] = std_col
                else:
                    self.warnings.append(f"Could not map column: '{col}'")
            
            df_mapped = df.rename(columns=mapping)
        
        # Ensure all standard columns exist (fill with NaN if missing)
        for col in self.STANDARD_SCHEMA:
            if col not in df_mapped.columns:
                df_mapped[col] = np.nan
        
        return df_mapped[self.STANDARD_SCHEMA]
    
    def oclock_to_degrees(self, value) -> float:
        """
        Convert o'clock time format to degrees.
        
        Args:
            value: Time object or string in HH:MM format
            
        Returns:
            Degrees (0-360)
        """
        if pd.isna(value):
            return np.nan
            
        if isinstance(value, time):
            return (value.hour + value.minute / 60.0) * 30.0
        
        # Try to parse string format "HH:MM"
        if isinstance(value, str):
            try:
                parts = value.split(':')
                if len(parts) == 2:
                    hours = float(parts[0])
                    minutes = float(parts[1])
                    return (hours + minutes / 60.0) * 30.0
            except:
                pass
        
        # If already numeric, assume it's degrees
        try:
            return float(value)
        except:
            return np.nan
    
    def normalize_data(self, df: pd.DataFrame) -> pd.DataFrame:
        """
        Normalize data types and units.
        
        Args:
            df: DataFrame with standard column names
            
        Returns:
            Normalized DataFrame
        """
        df_norm = df.copy()
        
        # Convert orientation to degrees
        if 'orientation' in df_norm.columns and not df_norm['orientation'].isna().all():
            df_norm['orientation'] = df_norm['orientation'].apply(self.oclock_to_degrees)
        
        # Clean event types
        if 'event_type' in df_norm.columns:
            df_norm['event_type'] = df_norm['event_type'].fillna('').astype(str).str.lower().str.strip()
        
        # Ensure numeric types
        numeric_cols = ['distance', 'length', 'width', 'depth', 'orientation', 'joint_number', 'year']
        for col in numeric_cols:
            if col in df_norm.columns:
                df_norm[col] = pd.to_numeric(df_norm[col], errors='coerce')
        
        return df_norm
    
    def validate_data(self, df: pd.DataFrame) -> Tuple[bool, List[str]]:
        """
        Validate data quality and completeness.
        
        Args:
            df: DataFrame to validate
            
        Returns:
            Tuple of (is_valid, list of error messages)
        """
        errors = []
        
        # Check for required columns
        required_cols = ['distance', 'event_type']
        for col in required_cols:
            if col not in df.columns or df[col].isna().all():
                errors.append(f"Required column '{col}' is missing or empty")
        
        # Check data ranges
        if 'depth' in df.columns:
            invalid_depth = df[(df['depth'] < 0) | (df['depth'] > 100)].shape[0]
            if invalid_depth > 0:
                errors.append(f"{invalid_depth} rows have invalid depth values (should be 0-100%)")
        
        if 'orientation' in df.columns:
            invalid_orient = df[(df['orientation'] < 0) | (df['orientation'] > 360)].shape[0]
            if invalid_orient > 0:
                errors.append(f"{invalid_orient} rows have invalid orientation values (should be 0-360°)")
        
        # Check for empty dataframe
        if len(df) == 0:
            errors.append("File contains no data rows")
        
        is_valid = len(errors) == 0
        return is_valid, errors
    
    def filter_anomalies(self, df: pd.DataFrame, filter_references: bool = True) -> pd.DataFrame:
        """
        Filter out reference features, keeping only anomalies.
        
        Args:
            df: DataFrame with event_type column
            filter_references: Whether to filter out reference features
            
        Returns:
            Filtered DataFrame
        """
        if not filter_references or 'event_type' not in df.columns:
            return df
        
        def is_anomaly(event):
            e = str(event).lower()
            # If it contains any reference keyword, it's not an anomaly
            return not any(k in e for k in self.REFERENCE_KEYWORDS)
        
        df_filtered = df[df['event_type'].apply(is_anomaly)].copy()
        return df_filtered
    
    def parse_file(self, file_path: str, 
                   format: Optional[str] = None,
                   manual_mapping: Optional[Dict] = None,
                   filter_references: bool = True,
                   year: Optional[int] = None) -> pd.DataFrame:
        """
        Universal file parser - main entry point.
        
        Args:
            file_path: Path to file
            format: Optional format override (auto-detected if None)
            manual_mapping: Optional manual column mapping
            filter_references: Whether to filter out reference features
            year: Optional year to add to data
            
        Returns:
            Standardized DataFrame ready for pipeline processing
        """
        # Reset state
        self.warnings = []
        self.column_mapping = {}
        
        # Detect format
        if format is None:
            format = self.detect_format(file_path)
        
        # Parse based on format
        if format == 'excel':
            # Try to read all sheets, or just the first one
            try:
                df_raw = pd.read_excel(file_path)
            except Exception as e:
                raise ValueError(f"Failed to read Excel file: {str(e)}")
                
        elif format == 'csv':
            try:
                # Try different delimiters
                df_raw = pd.read_csv(file_path)
            except Exception as e:
                raise ValueError(f"Failed to read CSV file: {str(e)}")
                
        elif format == 'tsv' or format == 'txt':
            try:
                df_raw = pd.read_csv(file_path, sep='\t')
            except Exception as e:
                raise ValueError(f"Failed to read TSV file: {str(e)}")
                
        elif format == 'json':
            try:
                with open(file_path, 'r') as f:
                    data = json.load(f)
                    if isinstance(data, list):
                        df_raw = pd.DataFrame(data)
                    elif isinstance(data, dict):
                        df_raw = pd.DataFrame([data])
                    else:
                        raise ValueError("JSON must be an array or object")
            except Exception as e:
                raise ValueError(f"Failed to read JSON file: {str(e)}")
        else:
            raise ValueError(f"Unsupported file format: {format}")
        
        # Map columns
        df_mapped = self.map_columns(df_raw, manual_mapping)
        
        # Normalize data
        df_normalized = self.normalize_data(df_mapped)
        
        # Add year if provided
        if year is not None:
            df_normalized['year'] = year
        
        # Filter anomalies
        df_filtered = self.filter_anomalies(df_normalized, filter_references)
        
        # Validate
        is_valid, errors = self.validate_data(df_filtered)
        if not is_valid:
            raise ValueError(f"Data validation failed: {'; '.join(errors)}")
        
        return df_filtered
    
    def get_column_mapping_report(self) -> str:
        """
        Generate a human-readable report of column mappings.
        
        Returns:
            Formatted string report
        """
        if not self.column_mapping:
            return "No column mappings detected yet."
        
        report = "Column Mapping Report:\n"
        report += "=" * 50 + "\n"
        for orig, std in self.column_mapping.items():
            report += f"  '{orig}' → '{std}'\n"
        
        if self.warnings:
            report += "\nWarnings:\n"
            for warning in self.warnings:
                report += f"  ⚠ {warning}\n"
        
        return report


# Convenience function for quick parsing
def parse_pipeline_file(file_path: str, **kwargs) -> pd.DataFrame:
    """
    Quick parse function for pipeline data files.
    
    Args:
        file_path: Path to file
        **kwargs: Additional arguments passed to UniversalParser.parse_file()
        
    Returns:
        Standardized DataFrame
    """
    parser = UniversalParser()
    df = parser.parse_file(file_path, **kwargs)
    print(parser.get_column_mapping_report())
    return df


if __name__ == "__main__":
    # Test the parser
    import sys
    
    if len(sys.argv) > 1:
        file_path = sys.argv[1]
        year = int(sys.argv[2]) if len(sys.argv) > 2 else None
        
        try:
            df = parse_pipeline_file(file_path, year=year)
            print(f"\n✓ Successfully parsed {len(df)} rows")
            print(f"\nFirst few rows:")
            print(df.head())
            print(f"\nData types:")
            print(df.dtypes)
        except Exception as e:
            print(f"✗ Error: {str(e)}")
            sys.exit(1)
    else:
        print("Usage: python universal_parser.py <file_path> [year]")
