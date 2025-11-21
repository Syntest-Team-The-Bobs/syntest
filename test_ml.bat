@echo off
REM Windows batch script to test ML implementation
REM Run this from the syntest directory

echo ========================================
echo SYNTEST ML IMPLEMENTATION TEST
echo ========================================
echo.

cd api

echo [1/4] Training Neural Network...
echo.
python ml/train_screening_detector.py
if errorlevel 1 (
    echo ERROR: Training failed!
    pause
    exit /b 1
)
echo.
echo ✓ Training complete!
echo.

echo [2/4] Generating Visual Proof...
echo.
python ml/visualize_results.py
if errorlevel 1 (
    echo ERROR: Visualization failed!
    pause
    exit /b 1
)
echo.
echo ✓ Visualizations generated!
echo.

echo [3/4] Running Unit Tests...
echo.
python -m pytest ml/tests/test_data_generator.py -v --tb=short
if errorlevel 1 (
    echo ERROR: Tests failed!
    pause
    exit /b 1
)
echo.
echo ✓ Tests passed!
echo.

echo [4/4] Opening Results...
echo.
start ml\visualizations\
echo ✓ Opening visualizations folder...
echo.

echo ========================================
echo ✓ ALL TESTS COMPLETE!
echo ========================================
echo.
echo Check the opened folder for:
echo   1_reconstruction_errors.png - KEY PROOF
echo   2_confusion_matrix.png
echo   3_training_curves.png
echo   4_feature_importance.png
echo   5_anomaly_type_performance.png
echo.
pause



