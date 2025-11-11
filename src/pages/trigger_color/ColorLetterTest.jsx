import { useNavigate } from 'react-router-dom';
import TriggerColorLayout from '../../components/trigger_color/TriggerColorLayout';
import '../../styles/app.css';

const LETTER_STIMULI = [
  'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J',
  'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T'
];

export default function ColorLetterTest() {
  const navigate = useNavigate();

  const handleComplete = (responses) => {
    console.log('Letter color test responses:', responses);
    // TODO: Send to API
  };

  return (
    <TriggerColorLayout
      title="LETTER COLOR TEST: CONSISTENCY & SPEED"
      description="You'll assign a color to each letter. Click and hold the mouse on the wheel and drag to preview and adjust a color. To record a choice, click to lock it — the small circle turns red when locked — and click again to unlock if you need to change it. Press Next to save each choice."
      stimulusType="letter"
      stimuli={LETTER_STIMULI}
      trialsPerStimulus={3}
      onComplete={handleComplete}
    />
  );
}
