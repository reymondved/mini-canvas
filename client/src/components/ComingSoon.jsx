// A card for a feature we haven't built yet. It shows NO numbers on purpose:
// a placeholder must never look like real data.
export default function ComingSoon({ icon: Icon, title, children }) {
  return (
    <section className="card">
      <div className="card-header">
        <h2>
          <Icon size={22} aria-hidden="true" />
          {title}
        </h2>
        <span className="tag tag-soon">Coming soon</span>
      </div>
      <div className="coming-soon">
        <Icon size={28} aria-hidden="true" />
        <p>{children}</p>
      </div>
    </section>
  );
}
