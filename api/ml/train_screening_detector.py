"""
Training script for screening anomaly detector.

This script:
1. Generates synthetic training data
2. Trains the autoencoder model
3. Evaluates performance on validation set
4. Saves the trained model

Usage:
    python api/ml/train_screening_detector.py
"""

import os
import sys
import numpy as np
from datetime import datetime

# Add parent directory to path for imports
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from ml.data_generator import ScreeningDataGenerator
from ml.screening_anomaly_detector import ScreeningAnomalyDetector


def train_model(
    n_train_normal: int = 800,
    n_train_anomalous: int = 200,
    n_val_normal: int = 150,
    n_val_anomalous: int = 50,
    epochs: int = 100,
    learning_rate: float = 0.001,
    batch_size: int = 32,
    save_path: str = None
):
    """
    Train screening anomaly detector with synthetic data.
    
    Args:
        n_train_normal: Number of normal training examples
        n_train_anomalous: Number of anomalous training examples
        n_val_normal: Number of normal validation examples
        n_val_anomalous: Number of anomalous validation examples
        epochs: Training epochs
        learning_rate: Learning rate
        batch_size: Batch size
        save_path: Path to save trained model
    """
    print("=" * 70)
    print("TRAINING SCREENING ANOMALY DETECTOR")
    print("=" * 70)
    print()
    
    # Create models directory if it doesn't exist
    models_dir = os.path.join(os.path.dirname(__file__), 'models')
    os.makedirs(models_dir, exist_ok=True)
    
    if save_path is None:
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        save_path = os.path.join(models_dir, f'screening_detector_{timestamp}.pkl')
    
    # ===================================================================
    # STEP 1: Generate Training Data
    # ===================================================================
    print("STEP 1: Generating Training Data")
    print("-" * 70)
    
    generator = ScreeningDataGenerator(random_seed=42)
    
    print("\nTraining set:")
    X_train, y_train, train_sessions = generator.generate_dataset(
        n_normal=n_train_normal,
        n_anomalous=n_train_anomalous
    )
    
    print("\nValidation set:")
    X_val, y_val, val_sessions = generator.generate_dataset(
        n_normal=n_val_normal,
        n_anomalous=n_val_anomalous
    )
    
    # Separate normal and anomalous data for training
    # IMPORTANT: Autoencoder should only train on NORMAL data
    X_train_normal = X_train[y_train == 0]
    X_val_normal = X_val[y_val == 0]
    
    print(f"\nTraining on {len(X_train_normal)} normal examples")
    print(f"Validating on {len(X_val_normal)} normal examples")
    
    # Display feature statistics
    print("\n" + "=" * 70)
    print("FEATURE STATISTICS (Training Normal Data)")
    print("=" * 70)
    feature_names = [
        'avg_response_time_sec', 'std_response_time_sec', 'min_response_time_sec',
        'max_response_time_sec', 'cv_response_time', 'pct_too_fast', 'pct_too_slow',
        'health_check_sum', 'definition_score', 'type_selection_count',
        'type_selection_diversity', 'consent_timing_sec', 'event_count',
        'back_navigation_count', 'step_completion_rate'
    ]
    
    for i, name in enumerate(feature_names):
        mean_val = np.mean(X_train_normal[:, i])
        std_val = np.std(X_train_normal[:, i])
        min_val = np.min(X_train_normal[:, i])
        max_val = np.max(X_train_normal[:, i])
        print(f"{name:30s}: μ={mean_val:8.2f}, σ={std_val:8.2f}, "
              f"range=[{min_val:7.2f}, {max_val:7.2f}]")
    
    # ===================================================================
    # STEP 2: Train Autoencoder
    # ===================================================================
    print("\n" + "=" * 70)
    print("STEP 2: Training Autoencoder Model")
    print("=" * 70)
    print()
    
    detector = ScreeningAnomalyDetector()
    
    print(f"Model Architecture:")
    print(f"  Input layer:     15 features")
    print(f"  Hidden layer 1:  8 neurons")
    print(f"  Bottleneck:      4 neurons")
    print(f"  Hidden layer 2:  8 neurons")
    print(f"  Output layer:    15 features (reconstruction)")
    print(f"\nTraining Parameters:")
    print(f"  Epochs:          {epochs}")
    print(f"  Learning rate:   {learning_rate}")
    print(f"  Batch size:      {batch_size}")
    print()
    
    detector.fit(
        X_train_normal,
        X_val_normal,
        epochs=epochs,
        learning_rate=learning_rate,
        batch_size=batch_size,
        verbose=True
    )
    
    # ===================================================================
    # STEP 3: Evaluate Performance
    # ===================================================================
    print("\n" + "=" * 70)
    print("STEP 3: Evaluating Performance")
    print("=" * 70)
    print()
    
    # Compute reconstruction errors for all validation data
    X_val_norm = detector._normalize_features(X_val)
    val_reconstructed = detector.autoencoder.forward(X_val_norm)
    val_errors = detector.autoencoder.compute_reconstruction_error(X_val_norm, val_reconstructed)
    
    # Classify based on threshold
    predictions = (val_errors > detector.threshold).astype(int)
    
    # Compute metrics
    true_positives = np.sum((predictions == 1) & (y_val == 1))
    false_positives = np.sum((predictions == 1) & (y_val == 0))
    true_negatives = np.sum((predictions == 0) & (y_val == 0))
    false_negatives = np.sum((predictions == 0) & (y_val == 1))
    
    accuracy = (true_positives + true_negatives) / len(y_val)
    precision = true_positives / (true_positives + false_positives) if (true_positives + false_positives) > 0 else 0
    recall = true_positives / (true_positives + false_negatives) if (true_positives + false_negatives) > 0 else 0
    f1_score = 2 * (precision * recall) / (precision + recall) if (precision + recall) > 0 else 0
    
    print("Confusion Matrix:")
    print(f"                    Predicted Normal  Predicted Anomalous")
    print(f"  Actual Normal     {true_negatives:15d}  {false_positives:19d}")
    print(f"  Actual Anomalous  {false_negatives:15d}  {true_positives:19d}")
    print()
    
    print("Performance Metrics:")
    print(f"  Accuracy:   {accuracy:.4f}")
    print(f"  Precision:  {precision:.4f}")
    print(f"  Recall:     {recall:.4f}")
    print(f"  F1-Score:   {f1_score:.4f}")
    print()
    
    # Error distribution analysis
    normal_errors = val_errors[y_val == 0]
    anomalous_errors = val_errors[y_val == 1]
    
    print("Reconstruction Error Distribution:")
    print(f"  Normal examples:")
    print(f"    Mean:   {np.mean(normal_errors):.6f}")
    print(f"    Median: {np.median(normal_errors):.6f}")
    print(f"    Std:    {np.std(normal_errors):.6f}")
    print(f"    Range:  [{np.min(normal_errors):.6f}, {np.max(normal_errors):.6f}]")
    print()
    print(f"  Anomalous examples:")
    print(f"    Mean:   {np.mean(anomalous_errors):.6f}")
    print(f"    Median: {np.median(anomalous_errors):.6f}")
    print(f"    Std:    {np.std(anomalous_errors):.6f}")
    print(f"    Range:  [{np.min(anomalous_errors):.6f}, {np.max(anomalous_errors):.6f}]")
    print()
    
    print(f"Threshold: {detector.threshold:.6f}")
    print(f"Separation ratio: {np.mean(anomalous_errors) / np.mean(normal_errors):.2f}x")
    
    # ===================================================================
    # STEP 4: Analyze Anomaly Types
    # ===================================================================
    print("\n" + "=" * 70)
    print("STEP 4: Analyzing Detection by Anomaly Type")
    print("=" * 70)
    print()
    
    anomaly_types = ['rushed', 'bot', 'distracted', 'inconsistent']
    for anomaly_type in anomaly_types:
        # Find examples of this type in validation set
        type_indices = [i for i, s in enumerate(val_sessions) 
                       if s.anomaly_type == anomaly_type]
        
        if type_indices:
            type_errors = val_errors[type_indices]
            type_predictions = predictions[type_indices]
            type_recall = np.mean(type_predictions)
            
            print(f"{anomaly_type.capitalize():15s}: "
                  f"Recall={type_recall:.2%}, "
                  f"Avg Error={np.mean(type_errors):.6f}, "
                  f"N={len(type_indices)}")
    
    # ===================================================================
    # STEP 5: Save Model
    # ===================================================================
    print("\n" + "=" * 70)
    print("STEP 5: Saving Trained Model")
    print("=" * 70)
    print()
    
    detector.save_model(save_path)
    
    # Save training/validation data for reference
    data_path = save_path.replace('.pkl', '_data.npz')
    np.savez_compressed(
        data_path,
        X_train=X_train,
        y_train=y_train,
        X_val=X_val,
        y_val=y_val,
        feature_names=feature_names
    )
    print(f"Training data saved to {data_path}")
    
    print("\n" + "=" * 70)
    print("TRAINING COMPLETE")
    print("=" * 70)
    print(f"\nModel saved to: {save_path}")
    print(f"Final validation accuracy: {accuracy:.2%}")
    print(f"Final F1-score: {f1_score:.4f}")
    
    return detector, save_path


if __name__ == '__main__':
    # Train with default parameters
    detector, model_path = train_model(
        n_train_normal=800,
        n_train_anomalous=200,
        n_val_normal=150,
        n_val_anomalous=50,
        epochs=100,
        learning_rate=0.001,
        batch_size=32
    )
    
    print("\n✓ Training completed successfully!")
    print(f"✓ Model ready for deployment at: {model_path}")



