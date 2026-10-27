export default function ToolPreview({ tool }) {
  return (
    <div className={`tool-preview tool-preview-${tool.art}`}>
      <svg viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="3" aria-hidden="true">
        {tool.art === "monitor" ? <><rect x="7" y="9" width="50" height="34" rx="5" /><path d="M23 54h18M32 43v11M13 27h9l5-9 8 17 5-8h11" /></> : <><rect x="10" y="10" width="44" height="44" rx="8" /><path d="M19 23h26M23 23l2 23h14l2-23M27 23v-6h10v6M30 29v11M35 29v11" /></>}
      </svg>
      <strong>{tool.name}</strong>
      <span>เครื่องมือสำหรับ Windows</span>
      <ul>{tool.highlights.map((item) => <li key={item}>{item}</li>)}</ul>
    </div>
  );
}
