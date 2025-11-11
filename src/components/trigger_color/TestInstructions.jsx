import '../../styles/app.css';

export default function TestInstructions({ type = 'word' }) {
  return (
    <aside className="howto" aria-label="How to complete the test">
      <h4>How to complete the test</h4>
      <ol>
        <li>Read the {type} on the right.</li>
        <li><b>Click and hold</b> on the wheel, then <b>drag</b> to preview and adjust.</li>
        <li>Release or single-click to <b>lock</b> the color — the small circle turns <b>red</b> when locked. Click again to unlock.</li>
        <li>Press <b>Next</b> to save.</li>
      </ol>
    </aside>
  );
}
