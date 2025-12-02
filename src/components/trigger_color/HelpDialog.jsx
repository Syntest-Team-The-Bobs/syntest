import { useEffect, useRef } from 'react';
import Button from '../ui/Button';
import '../../styles/app.css';

/**
 * HelpDialog - Modal dialog displaying test instructions
 * 
 * Responsibilities:
 * - Renders a native HTML dialog element with help content
 * - Manages dialog open/close state via showModal/close APIs
 * - Provides context-specific instructions based on test type
 */
export default function HelpDialog({ isOpen, onClose, type = 'word' }) {
  const dialogRef = useRef(null);

  /**
   * Syncs dialog state with isOpen prop
   * Uses native dialog.showModal() and dialog.close() APIs
   */
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (isOpen) {
      dialog.showModal();
    } else {
      dialog.close();
    }
  }, [isOpen]);

  return (
    <dialog ref={dialogRef} className="help" aria-labelledby="helpTitle">
      <h3 id="helpTitle">Quick Help</h3>
      <ul>
        <li>Read the {type} on the right.</li>
        <li><b>Click and hold</b> on the wheel, then <b>drag</b> to adjust.</li>
        <li>Click to <b>lock</b> your choice — the small circle turns <b>red</b>. Click again to unlock.</li>
        <li>Press <b>Next</b> to save each choice.</li>
      </ul>
      <div className="dlg-actions">
        <Button variant="primary" onClick={onClose}>
          OK
        </Button>
      </div>
    </dialog>
  );
}