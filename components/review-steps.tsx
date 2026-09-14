export function ReviewSteps({ active }: { active: 1 | 2 | 3 | 4 }) {
  const labels = ["Accept", "Review", "Submit", "Done"];
  return <ol className="steps" aria-label="Review progress">{labels.map((label, index) => {
    const step = index + 1;
    return <li className={step < active ? "complete" : step === active ? "active" : ""} key={label}><span>{step < active ? "✓" : step}</span><small>{label}</small></li>;
  })}</ol>;
}
