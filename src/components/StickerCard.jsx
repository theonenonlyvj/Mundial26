import './StickerCard.css';

export default function StickerCard({ children, accent, foil = false, className = '', style }) {
  const classes = ['sticker', accent && 'sticker--accent', foil && 'sticker--foil', className]
    .filter(Boolean)
    .join(' ');
  const mergedStyle = accent ? { ...style, '--accent': accent } : style;
  return (
    <div className={classes} style={mergedStyle}>
      {children}
    </div>
  );
}
