function ModalPortal({ children }) {
  if (!children) return null;
  return ReactDOM.createPortal(children, document.body);
}
