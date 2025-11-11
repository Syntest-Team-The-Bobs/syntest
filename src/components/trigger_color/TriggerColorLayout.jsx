import { useState } from 'react';
import ColorWheel from './ColorWheel';
import StimulusDisplay from './StimulusDisplay';
import ColorPreview from './ColorPreview';
import TestProgress from './TestProgress';
import TestInstructions from './TestInstructions';
import HelpDialog from './HelpDialog';
import Button from '../ui/Button';
import '../../styles/app.css';
import '../../styles/color.css';

export default function TriggerColorLayout({
  title,
  description,
  stimulusType,
  stimuli,
  trialsPerStimulus = 3,
  onComplete,
  children
}) {
  const [currentStimulusIndex, setCurrentStimulusIndex] = useState(0);
  const [currentTrial, setCurrentTrial] = useState(1);
  const [selectedColor, setSelectedColor] = useState(null);
  const [isLocked, setIsLocked] = useState(false);
  const [responses, setResponses] = useState([]);
  const [showHelp, setShowHelp] = useState(false);
  const [isComplete, setIsComplete] = useState(false);

  const currentStimulus = stimuli[currentStimulusIndex];
  const totalItems = stimuli.length * trialsPerStimulus;
  const currentItemNumber = currentStimulusIndex * trialsPerStimulus + currentTrial;

  const handleColorChange = (color) => {
    if (!isLocked) {
      setSelectedColor(color);
    }
  };

  const handleLockChange = (locked) => {
    setIsLocked(locked);
  };

  const handleNext = () => {
    if (!isLocked || !selectedColor) return;

    // Save response
    const response = {
      stimulus: currentStimulus,
      trial: currentTrial,
      color: selectedColor,
      timestamp: new Date().toISOString()
    };
    setResponses([...responses, response]);

    // Move to next trial or stimulus
    if (currentTrial < trialsPerStimulus) {
      setCurrentTrial(currentTrial + 1);
    } else if (currentStimulusIndex < stimuli.length - 1) {
      setCurrentStimulusIndex(currentStimulusIndex + 1);
      setCurrentTrial(1);
    } else {
      // Test complete
      setIsComplete(true);
      onComplete([...responses, response]);
      return;
    }

    // Reset for next trial
    setSelectedColor(null);
    setIsLocked(false);
  };

  if (isComplete) {
    return (
      <div className="content">
        <header className="hdr">
          <h1>Test Complete</h1>
          <p className="lede">
            Thank you for completing the {title}. Your responses have been recorded.
          </p>
        </header>
        {children}
      </div>
    );
  }

  return (
    <>
      <div className="topbar">
        <a href="/" className="brand">SYNTEST</a>
        <div className="top-right">
          <Button onClick={() => setShowHelp(true)} aria-haspopup="dialog">
            Help
          </Button>
        </div>
      </div>

      <main className="shell" role="main">
        <div className="content">
          <header className="hdr">
            <h1>{title}</h1>
            <p className="lede">{description}</p>
          </header>

          <section className="block" aria-labelledby="test-heading">
            <h2 id="test-heading" className="block-title">CONSISTENCY TEST</h2>

            <TestProgress
              stimulus={currentStimulus}
              currentTrial={currentTrial}
              totalTrials={trialsPerStimulus}
              currentItem={currentItemNumber}
              totalItems={totalItems}
            />

            <div className="cct-grid">
              <TestInstructions type={stimulusType} />

              <ColorWheel
                size={360}
                onColorChange={handleColorChange}
                onLockChange={handleLockChange}
                selectedColor={selectedColor}
                isLocked={isLocked}
              />

              <div>
                <StimulusDisplay 
                  stimulus={currentStimulus} 
                  type={stimulusType} 
                />
                
                <ColorPreview 
                  color={selectedColor?.hex}
                  hex={selectedColor?.hex || '———'}
                />

                <div className="nav">
                  <Button
                    variant="primary"
                    disabled={!isLocked}
                    onClick={handleNext}
                  >
                    Next →
                  </Button>
                </div>
              </div>
            </div>
          </section>
        </div>
      </main>

      <HelpDialog 
        isOpen={showHelp}
        onClose={() => setShowHelp(false)}
        type={stimulusType}
      />
    </>
  );
}
