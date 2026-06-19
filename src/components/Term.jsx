import './Term.css';

export default function Term({ define, children }) {
  return (
    <span className="term" title={define} aria-label={`${children}: ${define}`}>
      {children}
    </span>
  );
}
