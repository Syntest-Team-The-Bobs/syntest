import { useNavigate } from 'react-router-dom';
import TriggerColorLayout from '../../components/trigger_color/TriggerColorLayout';
import '../../styles/app.css';

const WORD_STIMULI = [
  'apple', 'ocean', 'sunset', 'forest', 'cloud',
  'fire', 'ice', 'grass', 'sky', 'night'
];

export default function ColorWordTest() {
  const navigate = useNavigate();

  const handleComplete = (responses) => {
    console.log('Word color test responses:', responses);
    // TODO: Send to API
    // navigate('/participant/dashboard');
  };

  return (
    <TriggerColorLayout
      title="WORD COLOR TEST: CONSISTENCY & SPEED"
      description="You'll assign a color to each word. Click and hold the mouse on the wheel and drag to preview and adjust a color. To record a choice, click to lock it — the small circle turns red when locked — and click again to unlock if you need to change it. Press Next to save each choice. For best results, use a laptop/desktop and turn off blue-light filters."
      stimulusType="word"
      stimuli={WORD_STIMULI}
      trialsPerStimulus={3}
      onComplete={handleComplete}
    />
  );
}
