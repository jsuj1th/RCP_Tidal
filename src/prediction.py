import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestRegressor
from sklearn.preprocessing import StandardScaler
import joblib
import os
from pathlib import Path

class AnomalyPredictor:
    def __init__(self):
        self.model = RandomForestRegressor(n_estimators=100, random_state=42)
        self.scaler = StandardScaler()
        self.is_trained = False
        
        # Determine project root
        self.base_dir = Path(__file__).resolve().parent.parent
        self.model_path = self.base_dir / 'data' / 'models' / 'growth_model.pkl'
        
        # Ensure model directory exists
        os.makedirs(os.path.dirname(self.model_path), exist_ok=True)

    def train(self, matched_data_path=None):
        """
        Train the model on matched anomalies from 2015 -> 2022.
        Features: depth_15, orientation, joint_number (relative location?)
        Target: growth (depth_22 - depth_15) or annual_growth_rate
        """
        if matched_data_path is None:
             matched_data_path = self.base_dir / 'data' / 'processed' / 'matched_anomalies.csv'

        if not os.path.exists(matched_data_path):
            print(f"Training data not found at {matched_data_path}")
            return False

        print("Training Growth Prediction Model...")
        df = pd.read_csv(matched_data_path)
        
        # Feature Engineering
        # We want to predict growth based on initial conditions
        # Features: Initial Depth, Orientation (affects bottom-side corrosion), 
        #           Joint Number (location factor), Distance (location factor)
        
        # Convert orientation to sine/cosine components to handle cyclicity? 
        # For simplicity, we'll use raw orientation first, but cyclic is better.
        # Let's add simple cyclic features
        df['orient_sin'] = np.sin(np.radians(df['orient_15']))
        df['orient_cos'] = np.cos(np.radians(df['orient_15']))
        
        features = ['depth_15', 'orient_sin', 'orient_cos', 'dist_15']
        target = 'annual_growth_rate'
        
        # Handle missing values if any
        df = df.dropna(subset=features + [target])
        
        X = df[features]
        y = df[target]
        
        # Train
        self.model.fit(X, y)
        self.is_trained = True
        
        # Save
        joblib.dump(self.model, self.model_path)
        print(f"Model trained. Score (R2): {self.model.score(X, y):.4f}")
        return True

    def load_model(self):
        if os.path.exists(self.model_path):
            self.model = joblib.load(self.model_path)
            self.is_trained = True
            return True
        return False

    def predict_next_run(self, current_data_path='data/processed/aligned_2022.csv', years_ahead=7):
        """
        Predict the state of anomalies in N years (default 7, e.g., 2029).
        """
        if not self.is_trained and not self.load_model():
            print("Model not trained or found. Please train first.")
            # If no model, try to train on the fly if matched data exists
            if not self.train():
                return None

        print(f"Predicting anomalies {years_ahead} years into the future...")
        df_current = pd.read_csv(current_data_path)
        
        # Prepare Features
        # Assuming current data is the "start" point (2022)
        # We need to map 2022 columns to the feature format used in training
        # Features: depth_15 -> depth_22, orient -> orient_22, etc.
        
        # Filter for metal loss only
        if 'event_type' in df_current.columns:
            df_current = df_current[df_current['event_type'].str.contains('metal loss', case=False, na=False)].copy()
        
        df_current['orient_sin'] = np.sin(np.radians(df_current['orientation']))
        df_current['orient_cos'] = np.cos(np.radians(df_current['orientation']))
        
        # Map current columns to training feature names (just the values matter)
        # Training expected: ['depth_15', 'orient_sin', 'orient_cos', 'dist_15']
        # We pass: ['depth', 'orient_sin', 'orient_cos', 'distance_aligned']
        
        X_pred = pd.DataFrame()
        X_pred['depth_15'] = df_current['depth']
        X_pred['orient_sin'] = df_current['orient_sin']
        X_pred['orient_cos'] = df_current['orient_cos']
        X_pred['dist_15'] = df_current['distance_aligned']
        
        # Handle NaNs
        X_pred = X_pred.fillna(0) # Simple fill for robust prediction
        
        # Predict Annual Growth Rate
        predicted_growth_rate = self.model.predict(X_pred)
        
        # Calculate Future Depth
        # Future Depth = Current Depth + (Rate * Years)
        df_current['predicted_growth_rate'] = predicted_growth_rate
        df_current['predicted_growth_total'] = predicted_growth_rate * years_ahead
        df_current['predicted_depth'] = df_current['depth'] + df_current['predicted_growth_total']
        
        # Cap depth at 100%
        df_current['predicted_depth'] = df_current['predicted_depth'].clip(upper=100)
        
        # Determine Status
        df_current['future_status'] = 'Active'
        df_current.loc[df_current['predicted_depth'] >= 50, 'future_status'] = 'High Risk'
        df_current.loc[df_current['predicted_depth'] >= 80, 'future_status'] = 'Critical'
        
        # Prepare UI Payload
        # We want to return a JSON that the viewer can consume
        # It should look like the standard anomaly format but with future values
        
        output = df_current.copy()
        output['depth'] = output['predicted_depth'] # Show future depth
        output['is_predicted'] = True
        output['prediction_years'] = years_ahead
        output['original_depth'] = df_current['depth']
        output['year'] = 2022 + years_ahead
        
        # Select relevant columns
        cols = ['distance_aligned', 'orientation', 'depth', 'length', 'width', 
                'joint_number', 'event_type', 'future_status', 'is_predicted', 
                'prediction_years', 'original_depth', 'year']
        
        # Rename for UI consistency if needed (viewer expects 'dist_22_aligned', etc.)
        # The viewer standardized on keys from `analytics.py` export
        # aligned_2022 has 'distance_aligned', 'orientation', 'depth'
        
        # Let's map to the UI schema
        ui_data = output.rename(columns={
            'distance_aligned': 'dist_22_aligned',
            'orientation': 'orient_22',
            'depth': 'depth_22',
            'future_status': 'status'
        })
        
        # Add ID for UI
        ui_data['id'] = 'PRED_' + ui_data.index.astype(str)
        
        return ui_data

if __name__ == "__main__":
    predictor = AnomalyPredictor()
    predictor.train()
    res = predictor.predict_next_run()
    if res is not None:
        print(res.head())
