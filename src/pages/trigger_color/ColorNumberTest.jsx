import { useNavigate } from 'react-router-dom';
import TriggerColorLayout from '../../components/trigger_color/TriggerColorLayout';
import '../../styles/app.css';

const NUMBER_STIMULI = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];

export default function ColorNumberTest() {
  const navigate = useNavigate();

  const handleComplete = (responses) => {
    console.log('Number color test responses:', responses);
    // TODO: Send to API
  };

  return (
    <TriggerColorLayout
      title="NUMBER COLOR TEST: CONSISTENCY & SPEED"
      description="You'll assign a color to each number. Click and hold the mouse on the wheel and drag to preview and adjust a color. To record a choice, click to lock it — the small circle turns red when locked — and click again to unlock if you need to change it. Press Next to save each choice."
      stimulusType="number"
      stimuli={NUMBER_STIMULI}
      trialsPerStimulus={3}
      onComplete={handleComplete}
    />
  );
}
