#!/bin/bash
# Mac/Linux script to test ML implementation
# Run this from the syntest directory

echo "========================================"
echo "SYNTEST ML IMPLEMENTATION TEST"
echo "========================================"
echo

cd api

echo "[1/4] Training Neural Network..."
echo
python ml/train_screening_detector.py
if [ $? -ne 0 ]; then
    echo "ERROR: Training failed!"
    exit 1
fi
echo
echo "✓ Training complete!"
echo

echo "[2/4] Generating Visual Proof..."
echo
python ml/visualize_results.py
if [ $? -ne 0 ]; then
    echo "ERROR: Visualization failed!"
    exit 1
fi
echo
echo "✓ Visualizations generated!"
echo

echo "[3/4] Running Unit Tests..."
echo
python -m pytest ml/tests/test_data_generator.py -v --tb=short
if [ $? -ne 0 ]; then
    echo "ERROR: Tests failed!"
    exit 1
fi
echo
echo "✓ Tests passed!"
echo

echo "[4/4] Opening Results..."
echo
if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS
    open ml/visualizations/
else
    # Linux
    xdg-open ml/visualizations/
fi
echo "✓ Opening visualizations folder..."
echo

echo "========================================"
echo "✓ ALL TESTS COMPLETE!"
echo "========================================"
echo
echo "Check the opened folder for:"
echo "  1_reconstruction_errors.png - KEY PROOF"
echo "  2_confusion_matrix.png"
echo "  3_training_curves.png"
echo "  4_feature_importance.png"
echo "  5_anomaly_type_performance.png"
echo



