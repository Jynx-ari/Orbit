import Modal from "./Modal.jsx";

const SHORTCUTS = [
  ["N", "New event"],
  ["T", "Jump to today"],
  ["← / →", "Previous / next period"],
  ["M · W · D · A", "Month, week, day or agenda view"],
  ["/", "Search events"],
  ["?", "Show this help"],
  ["Esc", "Close a dialog"],
];

export default function HelpModal({ onClose }) {
  return (
    <Modal title="Keyboard shortcuts" onClose={onClose}>
      <div className="modal-body">
        <dl className="shortcut-list">
          {SHORTCUTS.map(([keys, what]) => (
            <div key={keys}>
              <dt><kbd>{keys}</kbd></dt>
              <dd>{what}</dd>
            </div>
          ))}
        </dl>
        <p className="hint">
          In month view, double-click a day to add an event there, and drag an event to another day to move it.
          In week and day view, click an empty time slot.
        </p>
      </div>
      <div className="modal-footer">
        <span />
        <button type="button" className="primary-button" data-autofocus onClick={onClose}>Got it</button>
      </div>
    </Modal>
  );
}
