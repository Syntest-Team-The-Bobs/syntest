import { useNavigate } from 'react-router-dom';
import Card from '../ui/Card';
import Button from '../ui/Button';
import Progress from '../ui/Progress';
import '../../styles/app.css';

export default function ScreeningStep({
  step,
  totalSteps,
  chip,
  title,
  children,
  onNext,
  onBack,
  nextLabel = 'Continue',
  backLabel = 'Back',
  nextDisabled = false,
  backDisabled = false,
  loading = false,
  loadingLabel = 'Saving…',
  error,
  showActions = true,
}) {
  const navigate = useNavigate();

  const handleNext = () => {
    if (onNext) {
      onNext();
    } else {
      navigate(`/screening/${step + 1}`);
    }
  };

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      navigate(`/screening/${step - 1}`);
    }
  };

  return (
    <div className="container container-centered container-md">
      {step > 0 && (
        <Progress current={step} total={totalSteps} />
      )}

      <Card chip={chip} title={title}>
        {error && (
          <div
            className="alert alert-error"
            role="alert"
            style={{ marginBottom: '1rem' }}
          >
            {error}
          </div>
        )}
        {children}

        {showActions && (
          <div className="actions actions-between">
            {step > 0 && (
              <Button
                variant="secondary"
                onClick={handleBack}
                disabled={backDisabled || loading}
              >
                {backLabel}
              </Button>
            )}
            <Button onClick={handleNext} disabled={nextDisabled || loading}>
              {loading ? loadingLabel : nextLabel}
            </Button>
          </div>
        )}
      </Card>

      <p className="text-muted text-center mt-3">
        Questions? <a href="#">Contact support</a>
      </p>
    </div>
  );
}
