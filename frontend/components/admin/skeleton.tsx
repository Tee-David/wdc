import "./skeleton.css";

/**
 * LOADING SKELETONS THAT LOOK LIKE THE PAGE (dashboard-mockups/ and the
 * owner's rule: desktop AND phone). Plain server-rendered blocks, no script:
 * each part has the geometry of the real one (a tile's icon square and figure,
 * a table's row of cells, a chart's bars) and the grids reflow at the same
 * widths as the page, so what loads lands where the skeleton stood.
 *
 * NOTHING HERE IS DATA. Titles are real (they are the page's own); every
 * figure, name and row is a grey block. The shimmer is a transform, it stops
 * under reduced motion, and the whole skeleton fades in only after 150ms, so a
 * fast page never flashes it.
 */

const b = (cls: string, style?: React.CSSProperties) => <span className={`sk__b ${cls}`} style={style} />;

export function Skeleton({ title, lede = true, actions = 0, children }: { title: string; lede?: boolean; actions?: number; children: React.ReactNode }) {
  return (
    <div className="sk" aria-busy="true" aria-live="polite">
      <span className="ad__sr">Loading {title}</span>
      <div className="sk__head" aria-hidden="true">
        <div className="sk__headText">
          <h1 className="sk__title">{title}</h1>
          {lede ? b("sk__line sk__line--lede") : null}
        </div>
        {actions ? <div className="sk__acts">{Array.from({ length: actions }, (_, i) => <span key={i} className="sk__b sk__btn" />)}</div> : null}
      </div>
      <div aria-hidden="true" className="sk__body">{children}</div>
    </div>
  );
}

/** A row of KPI tiles: label, icon square, figure, note. */
export function SkTiles({ n = 4 }: { n?: number }) {
  return (
    <div className={`sk__tiles sk__tiles--${n}`}>
      {Array.from({ length: n }, (_, i) => (
        <div key={i} className="sk__tile">
          <div className="sk__tileTop">{b("sk__line sk__line--label")}{b("sk__icon")}</div>
          {b("sk__fig")}
          {b("sk__line sk__line--note")}
        </div>
      ))}
    </div>
  );
}

/** A panel with a heading bar and whatever sits in it. */
export function SkPanel({ children, head = true, className = "" }: { children: React.ReactNode; head?: boolean; className?: string }) {
  return (
    <div className={`sk__panel ${className}`}>
      {head ? <div className="sk__panelHead">{b("sk__line sk__line--h")}</div> : null}
      {children}
    </div>
  );
}

/** A filter bar: search, a select or two, a button. */
export function SkFilters({ selects = 1 }: { selects?: number }) {
  return (
    <div className="sk__filters">
      {b("sk__field sk__field--search")}
      {Array.from({ length: selects }, (_, i) => <span key={i} className="sk__b sk__field" />)}
      {b("sk__btn")}
    </div>
  );
}

/** Table rows: a lead cell (avatar and two lines), then shorter cells. */
export function SkTable({ rows = 6, cols = 4, avatar = true }: { rows?: number; cols?: number; avatar?: boolean }) {
  return (
    <div className="sk__table" style={{ "--sk-cols": cols } as React.CSSProperties}>
      <div className="sk__tr sk__tr--head">
        {Array.from({ length: cols + 1 }, (_, i) => <span key={i} className="sk__b sk__line sk__line--th" />)}
      </div>
      {Array.from({ length: rows }, (_, r) => (
        <div key={r} className="sk__tr">
          <div className="sk__lead">
            {avatar ? b("sk__av") : null}
            <div className="sk__stack">{b("sk__line sk__line--name", { width: `${55 + ((r * 17) % 35)}%` })}{b("sk__line sk__line--sub")}</div>
          </div>
          {Array.from({ length: cols }, (_, c) => (
            <span key={c} className={`sk__b ${c === 0 ? "sk__pill" : "sk__line sk__line--cell"}`} />
          ))}
        </div>
      ))}
    </div>
  );
}

/** A bar chart area: an axis and six months of paired bars. */
export function SkChart() {
  const h = [34, 52, 28, 70, 61, 44];
  return (
    <div className="sk__chart">
      {h.map((v, i) => (
        <div key={i} className="sk__month">
          <div className="sk__bars">{b("sk__bar", { height: `${v}%` })}{b("sk__bar sk__bar--b", { height: `${v * 0.4}%` })}</div>
          {b("sk__line sk__line--tick")}
        </div>
      ))}
    </div>
  );
}

/** A list of attention-style rows: icon, two lines, a button. */
export function SkRows({ n = 3 }: { n?: number }) {
  return (
    <div className="sk__rows">
      {Array.from({ length: n }, (_, i) => (
        <div key={i} className="sk__rowItem">
          {b("sk__icon")}
          <div className="sk__stack">{b("sk__line sk__line--name")}{b("sk__line sk__line--sub")}</div>
          {b("sk__btn sk__btn--sm")}
        </div>
      ))}
    </div>
  );
}

/** Cards in a grid: icon, pill, title, meta, a stage bar. */
export function SkCards({ n = 3 }: { n?: number }) {
  return (
    <div className="sk__cards">
      {Array.from({ length: n }, (_, i) => (
        <div key={i} className="sk__card">
          <div className="sk__tileTop">{b("sk__icon")}{b("sk__pill")}</div>
          {b("sk__line sk__line--name")}
          {b("sk__line sk__line--sub")}
          <div className="sk__stages">{Array.from({ length: 6 }, (_, s) => <span key={s} className="sk__b" />)}</div>
        </div>
      ))}
    </div>
  );
}

/** The projects board: a column per stage with a few cards. */
export function SkBoard() {
  return (
    <div className="sk__board">
      {[3, 2, 2, 1, 1, 2].map((n, c) => (
        <div key={c} className="sk__col">
          {b("sk__line sk__line--h")}
          {Array.from({ length: n }, (_, i) => (
            <div key={i} className="sk__card sk__card--k">{b("sk__line sk__line--name")}{b("sk__line sk__line--sub")}{b("sk__pill")}</div>
          ))}
        </div>
      ))}
    </div>
  );
}

/** A form: label lines over fields. */
export function SkForm({ fields = 5 }: { fields?: number }) {
  return (
    <div className="sk__form">
      {Array.from({ length: fields }, (_, i) => (
        <div key={i} className="sk__stack">{b("sk__line sk__line--label")}{b("sk__field")}</div>
      ))}
    </div>
  );
}

/** Two columns that fold to one on a phone: the work, then the rail. */
export function SkSplit({ main, rail }: { main: React.ReactNode; rail: React.ReactNode }) {
  return <div className="sk__split"><div className="sk__col2">{main}</div><div className="sk__col2">{rail}</div></div>;
}
