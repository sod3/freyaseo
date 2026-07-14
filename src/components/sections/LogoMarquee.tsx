export function LogoMarquee({ items }: { items: string[] }) {
  const track = [...items, ...items];
  return (
    <div className="logo-marquee" aria-label="Trust logos">
      <div className="logo-track">
        {track.map((item, index) => (
          <span key={`${item}-${index}`} aria-hidden={index >= items.length}>
            {item}
          </span>
        ))}
      </div>
    </div>
  );
}
