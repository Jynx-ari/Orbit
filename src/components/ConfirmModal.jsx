import Modal from "./Modal.jsx";

// actions: [{ label, onClick, danger? }]. A Cancel button is always added.
export default function ConfirmModal({ title, message, actions, onClose }) {
  return (
    <Modal title={title} onClose={onClose}>
      <div className="modal-body">
        <p className="modal-text">{message}</p>
      </div>
      <div className="modal-footer">
        <span />
        <div className="footer-actions">
          <button type="button" className="secondary-button" data-autofocus onClick={onClose}>
            Cancel
          </button>
          {actions.map((a) => (
            <button
              type="button"
              key={a.label}
              className={a.danger ? "danger-button" : "primary-button"}
              onClick={a.onClick}
            >
              {a.label}
            </button>
          ))}
        </div>
      </div>
    </Modal>
  );
}
