import { useNavigate, useParams } from 'react-router-dom';
import Button from '../components/ui/Button';
import Chip from '../components/ui/Chip';
import '../styles/app.css';

const EXIT_COPY = {
  A: {
    chipLabel: 'Exit • A',
    heading: 'Thanks for your time',
    thanksLine: null,
    lead: 'You indicated no synesthetic experience, so you are unable to continue in this study.',
    bullets: [],
    note: null,
  },
  BC: {
    chipLabel: 'Exit • B/C',
    heading: 'Not eligible (B/C)',
    thanksLine: 'Thanks for your time!',
    lead: 'Based on your health and substances responses, you are not eligible for this study.',
    bullets: [],
    note: null,
  },
  D: {
    chipLabel: 'Exit • D',
    heading: 'Not eligible (D)',
    thanksLine: 'Thanks for your time!',
    lead: 'Experiences triggered by pain or emotions are excluded from this screening.',
    bullets: [],
    note: null,
  },
  NONE: {
    chipLabel: 'Exit • None',
    heading: 'No eligible types selected',
    thanksLine: 'Thanks for your time!',
    lead: 'You didn’t select Yes or Maybe for any supported types, so there isn’t a follow-up task to run.',
    bullets: [],
    note: null,
  },
};

export default function ScreeningExit() {
  const { code } = useParams();
  const navigate = useNavigate();
  const exitData = EXIT_COPY[code] || EXIT_COPY.A;

  return (
    <div className="container container-centered container-md">
      <div className="card">
        <Chip label={exitData.chipLabel} variant="info" />
        <h2 className="h3">{exitData.heading}</h2>

        {exitData.thanksLine && (
          <p className="lead font-bold">{exitData.thanksLine}</p>
        )}

        {exitData.lead && <p style={{ marginTop: '6px' }}>{exitData.lead}</p>}

        {exitData.bullets.length > 0 && (
          <ul className="summary-list" style={{ margin: '10px 0 14px' }}>
            {exitData.bullets.map((bullet, idx) => (
              <li key={idx}>{bullet}</li>
            ))}
          </ul>
        )}

        {exitData.note && (
          <div className="note-panel">
            <div className="note-title">Details</div>
            <p style={{ margin: '6px 0 0' }}>{exitData.note}</p>
          </div>
        )}

        <div className="actions" style={{ marginTop: '16px' }}>
          <Button onClick={() => navigate('/screening/0')}>Return to start</Button>
          <Button variant="secondary" onClick={() => navigate('/')}>
            Close
          </Button>
        </div>

        <p className="footnote" style={{ marginTop: '12px' }}>
          Questions? <a className="footer-link" href="#">Contact support</a>
        </p>
      </div>
    </div>
  );
}
