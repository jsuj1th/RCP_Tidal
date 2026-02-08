"""
Flask API for file upload and processing
Handles file uploads, processes them through the universal parser,
and returns standardized data for visualization
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
from werkzeug.utils import secure_filename
import os
import json
from pathlib import Path
from pathlib import Path
import traceback
import logging
from prediction import AnomalyPredictor

from universal_parser import UniversalParser

app = Flask(__name__)
CORS(app)  # Enable CORS for frontend requests

# Configuration
# Determine project root based on this file's location (src/upload_api.py -> project_root)
BASE_DIR = Path(__file__).resolve().parent.parent

UPLOAD_FOLDER = BASE_DIR / 'src' / 'uploads'
UPLOAD_FOLDER.mkdir(exist_ok=True)
ALLOWED_EXTENSIONS = {'xlsx', 'xls', 'csv', 'json', 'tsv', 'txt'}
MAX_FILE_SIZE = 50 * 1024 * 1024  # 50MB

# Data Paths
MATCHED_DATA_PATH = BASE_DIR / 'data' / 'processed' / 'matched_anomalies.csv'
ALIGNED_2022_PATH = BASE_DIR / 'data' / 'processed' / 'aligned_2022.csv'

app.config['UPLOAD_FOLDER'] = str(UPLOAD_FOLDER)
app.config['MAX_CONTENT_LENGTH'] = MAX_FILE_SIZE


def allowed_file(filename):
    """Check if file extension is allowed"""
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS


@app.route('/api/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({'status': 'ok', 'message': 'Upload API is running'})


@app.route('/api/upload', methods=['POST'])
def upload_file():
    """
    Upload and process a pipeline data file.
    
    Request:
        - file: The uploaded file (multipart/form-data)
        - year: Optional year parameter
        - filter_references: Optional boolean to filter reference features
        
    Response:
        - success: boolean
        - data: Processed data as JSON array
        - column_mapping: Dictionary of detected column mappings
        - warnings: List of warning messages
        - stats: Statistics about the processed data
    """
    try:
        # Check if file is present
        if 'file' not in request.files:
            return jsonify({
                'success': False,
                'error': 'No file provided'
            }), 400
        
        file = request.files['file']
        
        # Check if filename is empty
        if file.filename == '':
            return jsonify({
                'success': False,
                'error': 'No file selected'
            }), 400
        
        # Check file extension
        if not allowed_file(file.filename):
            return jsonify({
                'success': False,
                'error': f'File type not supported. Allowed types: {", ".join(ALLOWED_EXTENSIONS)}'
            }), 400
        
        # Get optional parameters
        year = request.form.get('year', type=int)
        filter_references = request.form.get('filter_references', 'true').lower() == 'true'
        
        # Save file
        filename = secure_filename(file.filename)
        filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        file.save(filepath)
        
        try:
            # Parse file
            parser = UniversalParser()
            df = parser.parse_file(
                filepath, 
                year=year,
                filter_references=filter_references
            )
            
            # SAVE DATA FOR PREDICTION
            os.makedirs(os.path.dirname(ALIGNED_2022_PATH), exist_ok=True)
            if 'distance' in df.columns and 'distance_aligned' not in df.columns:
                df['distance_aligned'] = df['distance']
            df.to_csv(ALIGNED_2022_PATH, index=False)

            
            # Convert to JSON-serializable format
            data = df.replace({float('nan'): None}).to_dict(orient='records')
            
            # Generate statistics
            stats = {
                'total_rows': len(df),
                'columns': list(df.columns),
                'anomaly_count': len(df[df['event_type'].str.contains('loss|corrosion|pit', case=False, na=False)]) if 'event_type' in df.columns else 0,
                'depth_range': {
                    'min': float(df['depth'].min()) if 'depth' in df.columns and not df['depth'].isna().all() else None,
                    'max': float(df['depth'].max()) if 'depth' in df.columns and not df['depth'].isna().all() else None,
                    'mean': float(df['depth'].mean()) if 'depth' in df.columns and not df['depth'].isna().all() else None
                },
                'distance_range': {
                    'min': float(df['distance'].min()) if 'distance' in df.columns and not df['distance'].isna().all() else None,
                    'max': float(df['distance'].max()) if 'distance' in df.columns and not df['distance'].isna().all() else None
                }
            }
            
            # Clean up uploaded file
            os.remove(filepath)
            
            return jsonify({
                'success': True,
                'data': data,
                'column_mapping': parser.column_mapping,
                'warnings': parser.warnings,
                'stats': stats,
                'message': f'Successfully processed {len(df)} rows'
            })
            
        except ValueError as e:
            # Clean up file on error
            if os.path.exists(filepath):
                os.remove(filepath)
            return jsonify({
                'success': False,
                'error': str(e)
            }), 400
            
        except Exception as e:
            # Clean up file on error
            if os.path.exists(filepath):
                os.remove(filepath)
            return jsonify({
                'success': False,
                'error': f'Processing error: {str(e)}',
                'traceback': traceback.format_exc()
            }), 500
            
    except Exception as e:
        return jsonify({
            'success': False,
            'error': f'Upload error: {str(e)}'
        }), 500


@app.route('/api/preview', methods=['POST'])
def preview_file():
    """
    Preview file columns without full processing.
    Returns detected columns and suggested mappings.
    """
    try:
        if 'file' not in request.files:
            return jsonify({'success': False, 'error': 'No file provided'}), 400
        
        file = request.files['file']
        
        if file.filename == '':
            return jsonify({'success': False, 'error': 'No file selected'}), 400
        
        if not allowed_file(file.filename):
            return jsonify({'success': False, 'error': 'File type not supported'}), 400
        
        # Save file temporarily
        filename = secure_filename(file.filename)
        filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        file.save(filepath)
        
        try:
            # Read just the headers
            import pandas as pd
            
            ext = Path(filename).suffix.lower()
            if ext in ['.xlsx', '.xls']:
                df_preview = pd.read_excel(filepath, nrows=5)
            elif ext == '.csv':
                df_preview = pd.read_csv(filepath, nrows=5)
            elif ext in ['.tsv', '.txt']:
                df_preview = pd.read_csv(filepath, sep='\t', nrows=5)
            elif ext == '.json':
                with open(filepath, 'r') as f:
                    data = json.load(f)
                    if isinstance(data, list):
                        df_preview = pd.DataFrame(data[:5])
                    else:
                        df_preview = pd.DataFrame([data])
            else:
                raise ValueError('Unsupported format')
            
            # Get column mappings
            parser = UniversalParser()
            suggested_mappings = {}
            for col in df_preview.columns:
                mapped = parser.fuzzy_match_column(col)
                suggested_mappings[col] = mapped if mapped else 'unknown'
            
            # Clean up
            os.remove(filepath)
            
            return jsonify({
                'success': True,
                'columns': list(df_preview.columns),
                'suggested_mappings': suggested_mappings,
                'preview_data': df_preview.to_dict(orient='records'),
                'row_count': len(df_preview)
            })
            
        except Exception as e:
            if os.path.exists(filepath):
                os.remove(filepath)
            return jsonify({
                'success': False,
                'error': f'Preview error: {str(e)}'
            }), 500
            
    except Exception as e:
        return jsonify({
            'success': False,
            'error': f'Upload error: {str(e)}'
        }), 500


@app.route('/api/predict', methods=['POST'])
def predict_anomalies():
    try:
        # Check if we have data to predict on
        if not os.path.exists(ALIGNED_2022_PATH):
            return jsonify({'error': 'No 2022 data found. Please upload data first.'}), 404
            
        # Initialize predictor
        predictor = AnomalyPredictor()
        
        # Train if needed (if model doesn't exist or force retrain)
        # For now, we'll try to load, if not, train
        if not predictor.load_model():
            # Check if we have matched data to train on
            if os.path.exists(MATCHED_DATA_PATH):
                success = predictor.train(MATCHED_DATA_PATH)
                if not success:
                     return jsonify({'error': 'Failed to train model. Match data issue.'}), 500
            else:
                 return jsonify({'error': 'No historical matched data found to train model.'}), 404
        
        # Predict
        # Default to 7 years (2029)
        years = request.json.get('years', 7)
        if not isinstance(years, int):
            years = 7
            
        prediction_df = predictor.predict_next_run(ALIGNED_2022_PATH, years_ahead=years)
        
        if prediction_df is None:
            return jsonify({'error': 'Prediction failed.'}), 500
            
        # Return JSON
        return prediction_df.to_json(orient='records')
        
    except Exception as e:
        logging.exception("Error in /api/predict")
        return jsonify({'error': str(e)}), 500

@app.route('/api/load_demo', methods=['POST'])
def load_demo_data():
    """Load the demo dataset directly"""
    try:
        demo_path = BASE_DIR / 'test_upload.csv'
            
        if not demo_path.exists():
            return jsonify({'success': False, 'error': f'Demo file not found at {demo_path}'}), 404
            
        # Parse file
        parser = UniversalParser()
        df = parser.parse_file(
            str(demo_path), 
            year=2022,
            filter_references=True
        )
        
        # SAVE DATA FOR PREDICTION (Missing step)
        # Ensure directory exists
        os.makedirs(os.path.dirname(ALIGNED_2022_PATH), exist_ok=True)
        # Save standardized column mapping
        df.rename(columns={
            'distance': 'distance_aligned', # API expects 'distance_aligned'
        }, inplace=True)
        # If 'distance_aligned' already existed (from parser mapping), this might duplicate or rename.
        # UniversalParser uses standard schema: 'distance', 'depth', etc.
        # But prediction.py expects 'distance_aligned'.
        
        # Let's align with what analytics.py produced.
        if 'distance' in df.columns and 'distance_aligned' not in df.columns:
            df['distance_aligned'] = df['distance']
            
        df.to_csv(ALIGNED_2022_PATH, index=False)
        print(f"Saved demo data to {ALIGNED_2022_PATH}")
        
        # Convert to JSON-serializable format
        data = df.replace({float('nan'): None}).to_dict(orient='records')
        
        # Generate statistics
        stats = {
            'total_rows': len(df),
            'columns': list(df.columns),
            'anomaly_count': len(df),
            'depth_range': {
                'min': float(df['depth'].min()) if 'depth' in df.columns else 0,
                'max': float(df['depth'].max()) if 'depth' in df.columns else 0,
                'mean': float(df['depth'].mean()) if 'depth' in df.columns else 0
            }
        }
        
        return jsonify({
            'success': True,
            'data': data,
            'column_mapping': parser.column_mapping,
            'stats': stats,
            'message': f'Successfully loaded demo data ({len(df)} rows)'
        })
        
    except Exception as e:
         return jsonify({'success': False, 'error': str(e)}), 500

if __name__ == '__main__':
    print("=" * 60)
    print("Pipeline Data Upload API")
    print("=" * 60)
    print(f"Upload folder: {UPLOAD_FOLDER.absolute()}")
    print(f"Allowed extensions: {', '.join(ALLOWED_EXTENSIONS)}")
    print(f"Max file size: {MAX_FILE_SIZE / (1024*1024):.0f}MB")
    print("=" * 60)
    print("\nStarting server on http://localhost:5000")
    print("Endpoints:")
    print("  - GET  /api/health   - Health check")
    print("  - POST /api/upload   - Upload and process file")
    print("  - POST /api/preview  - Preview file columns")
    print("  - POST /api/predict  - Predict anomaly growth")
    print("=" * 60)
    
    app.run(debug=True, port=5000, host='0.0.0.0')
