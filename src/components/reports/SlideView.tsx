import type { Slide, KpiItem, DeliverableItem, ChartSeries } from "./types";
import logoWhiteAsset from "@/assets/logo-white.png.asset.json";
import { PlatformIcon } from "./PlatformIcon";
import { getPlatform } from "./platform-icons";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";

const KASA_YELLOW = "#FFBC45";

function getGalleryGrid(count: number) {
  if (count <= 1) {
    return { columns: "minmax(0, 1fr)", rows: "minmax(0, 1fr)" };
  }

  if (count === 2) {
    return { columns: "repeat(2, minmax(0, 1fr))", rows: "minmax(0, 1fr)" };
  }

  if (count === 3) {
    return { columns: "repeat(3, minmax(0, 1fr))", rows: "minmax(0, 1fr)" };
  }

  return { columns: "repeat(2, minmax(0, 1fr))", rows: "repeat(2, minmax(0, 1fr))" };
}

function KasaMark({ size = 28 }: { size?: number }) {
  return (
    <div className="flex items-center gap-3">
      <span
        className="font-mono uppercase tracking-[0.22em] text-neutral-400"
        style={{ fontSize: size * 0.55 }}
      >
        produzido por
      </span>
      <div
        aria-label="Kasa Hub"
        style={{
          height: size,
          width: size * 3.2,
          backgroundColor: KASA_YELLOW,
          WebkitMaskImage: `url(${logoWhiteAsset.url})`,
          maskImage: `url(${logoWhiteAsset.url})`,
          WebkitMaskRepeat: "no-repeat",
          maskRepeat: "no-repeat",
          WebkitMaskPosition: "left center",
          maskPosition: "left center",
          WebkitMaskSize: "contain",
          maskSize: "contain",
        }}
      />
    </div>
  );
}

/**
 * Renders a slide at fixed 1920x1080 resolution. The caller is responsible for
 * scaling it to fit the available space via `transform: scale(...)`.
 */
export function SlideView({
  slide,
  brandColor,
  clientLogoUrl,
  clientName,
  pageNumber,
  totalPages,
}: {
  slide: Slide;
  brandColor?: string;
  clientLogoUrl?: string | null;
  clientName?: string;
  pageNumber?: number;
  totalPages?: number;
}) {
  const color = brandColor || "#3DB6F2"; // fallback Kasa primary
  const p = slide.props;

  const shell = (children: React.ReactNode) => (
    <div
      className="relative w-[1920px] h-[1080px] bg-white text-neutral-900 overflow-hidden"
      style={{ fontFamily: "'Onest', system-ui, sans-serif" }}
    >
      {/* Chrome top */}
      {slide.type !== "cover" && slide.type !== "closing" && (
        <div className="absolute top-12 left-16 right-16 flex items-center justify-between">
          <div className="flex items-center gap-5">
            {clientLogoUrl ? (
              <img src={clientLogoUrl} alt="" className="h-16 w-auto object-contain" />
            ) : null}
            <span className="text-[26px] font-medium tracking-tight text-neutral-500">
              {clientName || ""}
            </span>
          </div>
          {pageNumber && totalPages ? (
            <span className="text-[22px] font-medium tabular-nums text-neutral-400">
              {String(pageNumber).padStart(2, "0")} / {String(totalPages).padStart(2, "0")}
            </span>
          ) : null}
        </div>
      )}
      {children}
      {/* Footer accent + Kasa mark */}
      {slide.type !== "cover" && slide.type !== "closing" && (
        <>
          <div
            className="absolute bottom-0 left-0 h-[6px]"
            style={{ width: 280, backgroundColor: KASA_YELLOW }}
          />
          <div className="absolute bottom-10 right-16">
            <KasaMark size={44} />
          </div>
        </>
      )}
    </div>
  );

  const heading = (text?: string, size: "lg" | "md" | "sm" = "md") => (
    <h2
      className="font-bold tracking-tight text-neutral-900"
      style={{
        fontFamily: "'Funnel Display', system-ui, sans-serif",
        fontSize: size === "lg" ? 104 : size === "md" ? 80 : 56,
        lineHeight: 1.05,
        letterSpacing: "-0.03em",
      }}
    >
      {text}
    </h2>
  );

  switch (slide.type) {
    case "cover":
      return shell(
        <div className="absolute inset-0 flex flex-col justify-between p-24" style={{ background: `linear-gradient(135deg, ${color}10 0%, #ffffff 60%)` }}>
          <div
            className="absolute left-0 top-0 bottom-0 w-[6px]"
            style={{ backgroundColor: KASA_YELLOW }}
          />
          <div className="flex items-center justify-between">
            {clientLogoUrl ? (
              <img src={clientLogoUrl} alt="" className="h-28 w-auto object-contain" />
            ) : <span className="text-[34px] font-medium text-neutral-500">{clientName || ""}</span>}
            {p.period ? (
              <span
                className="px-6 py-3 rounded-full text-[22px] font-medium"
                style={{ backgroundColor: color, color: "#fff" }}
              >
                {p.period}
              </span>
            ) : null}
          </div>
          <div>
            {p.kicker ? (
              <p className="text-[24px] font-mono uppercase tracking-[0.18em] mb-6" style={{ color }}>{p.kicker}</p>
            ) : null}
            {heading(p.title, "lg")}
            {p.subtitle ? (
              <p className="mt-6 text-[36px] text-neutral-500 max-w-[1400px] leading-tight">
                {p.subtitle}
              </p>
            ) : null}
          </div>
          <div className="flex items-end justify-between">
            <div className="flex items-center gap-4">
              <div className="h-2 w-40 rounded-full" style={{ backgroundColor: color }} />
              <div className="h-2 w-16 rounded-full" style={{ backgroundColor: KASA_YELLOW }} />
            </div>
            <KasaMark size={52} />
          </div>
        </div>,
      );

    case "section":
      return shell(
        <div className="absolute inset-0 flex flex-col justify-center px-32">
          {p.kicker ? (
            <p className="text-[28px] font-mono uppercase tracking-[0.2em] mb-8" style={{ color }}>{p.kicker}</p>
          ) : null}
          {heading(p.title, "lg")}
        </div>,
      );

    case "text":
      return shell(
        <div className="absolute inset-0 flex flex-col justify-center px-32 pt-40">
          {p.title ? heading(p.title) : null}
          {p.body ? (
            <div
              className="mt-10 text-[32px] leading-[1.45] text-neutral-700 max-w-[1500px] whitespace-pre-wrap"
              dangerouslySetInnerHTML={{ __html: simpleMd(p.body) }}
            />
          ) : null}
        </div>,
      );

    case "image":
      return shell(
        <div className="absolute inset-0 flex flex-col px-32 pt-40 pb-24">
          {p.title ? heading(p.title, "sm") : null}
          <div className="flex-1 mt-8 rounded-3xl overflow-hidden bg-neutral-100 flex items-center justify-center">
            {p.imageUrl ? (
              <img src={p.imageUrl} alt={p.caption || ""} className="w-full h-full object-cover" />
            ) : <span className="text-[28px] text-neutral-400">Sem imagem</span>}
          </div>
          {p.caption ? (
            <p className="mt-6 text-[24px] text-neutral-500">{p.caption}</p>
          ) : null}
        </div>,
      );

    case "gallery": {
      const imgs = Array.isArray(p.images) ? p.images.filter(Boolean).slice(0, 4) : [];
      const grid = getGalleryGrid(imgs.length);
      return shell(
        <div className="absolute inset-0 flex flex-col px-32 pt-40 pb-24">
          {p.title ? heading(p.title, "sm") : null}
          <div
            className="flex-1 min-h-0 mt-8 grid gap-6"
            style={{
              gridTemplateColumns: grid.columns,
              gridTemplateRows: grid.rows,
            }}
          >
            {imgs.length === 0 ? (
              <div className="rounded-3xl bg-neutral-100 flex items-center justify-center text-[28px] text-neutral-400 h-full">
                Sem imagens
              </div>
            ) : imgs.map((url, i) => (
              <div key={`${url}-${i}`} className="min-h-0 rounded-3xl overflow-hidden bg-neutral-50 flex items-center justify-center p-5">
                <img src={url} alt="" className="block max-w-full max-h-full w-auto h-auto object-contain" />
              </div>
            ))}
          </div>
        </div>,
      );
    }

    case "kpis": {
      const items = (p.items || []) as KpiItem[];
      const cols = Math.min(Math.max(items.length, 1), 4);
      return shell(
        <div className="absolute inset-0 flex flex-col justify-center px-32 pt-40 pb-24">
          {p.title ? heading(p.title, "sm") : null}
          <div className="mt-12 grid gap-6" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
            {items.map((it, i) => (
              <div key={i} className="rounded-3xl border border-neutral-200 p-10" style={{ borderColor: `${color}40` }}>
                <div className="flex items-center gap-3">
                  {it.platform ? (
                    <span style={{ color }}>
                      <PlatformIcon id={it.platform} size={28} color="currentColor" />
                    </span>
                  ) : null}
                  <p className="text-[24px] font-medium text-neutral-500 uppercase tracking-wide">{it.label}</p>
                </div>
                <p
                  className="mt-4 font-bold tabular-nums"
                  style={{ fontFamily: "'Funnel Display'", fontSize: 96, lineHeight: 1, color }}
                >
                  {it.value}
                </p>
                {it.delta ? (
                  <p className="mt-3 text-[26px] text-neutral-500">{it.delta}</p>
                ) : null}
              </div>
            ))}
          </div>
        </div>,
      );
    }

    case "chart":
      return shell(
        <div className="absolute inset-0 flex flex-col px-32 pt-40 pb-24">
          {p.title ? heading(p.title, "sm") : null}
          <div className="flex-1 mt-8">
            <ChartRender
              chartType={p.chartType ?? "bar"}
              categories={p.chartCategories ?? []}
              categoryPlatforms={p.chartCategoryPlatforms ?? []}
              series={(p.chartSeries ?? []) as ChartSeries[]}
              brandColor={color}
            />
          </div>
          {p.chartNote ? (
            <div
              className="mt-6 rounded-2xl border-l-4 px-8 py-5 bg-neutral-50 text-[26px] leading-[1.4] text-neutral-700 whitespace-pre-wrap"
              style={{ borderColor: color }}
            >
              <p className="text-[18px] font-mono uppercase tracking-[0.18em] mb-2" style={{ color }}>Observações</p>
              {p.chartNote}
            </div>
          ) : null}
        </div>,
      );


    case "deliverables": {
      const items = (p.items || []) as DeliverableItem[];
      return shell(
        <div className="absolute inset-0 flex flex-col px-32 pt-40 pb-24">
          {p.title ? heading(p.title, "sm") : null}
          <ul className="mt-10 space-y-5 max-w-[1500px]">
            {items.map((it, i) => (
              <li key={i} className="flex items-start gap-6 text-[32px] text-neutral-800">
                <span
                  className="mt-2 inline-flex items-center justify-center size-10 rounded-full text-white text-[22px] shrink-0"
                  style={{ backgroundColor: it.done ? color : "#d4d4d4" }}
                >
                  {it.done ? "✓" : "•"}
                </span>
                <span className={it.done ? "" : "text-neutral-400"}>{it.label}</span>
              </li>
            ))}
          </ul>
        </div>,
      );
    }

    case "comparison":
      return shell(
        <div className="absolute inset-0 flex flex-col px-32 pt-40 pb-24">
          {p.title ? heading(p.title, "sm") : null}
          <div className="mt-10 grid grid-cols-2 gap-10 flex-1">
            {[
              { t: p.leftTitle, b: p.leftBody, c: "#737373" },
              { t: p.rightTitle, b: p.rightBody, c: color },
            ].map((col, i) => (
              <div key={i} className="rounded-3xl p-12 flex flex-col" style={{ backgroundColor: i === 1 ? `${color}10` : "#fafafa" }}>
                <p className="text-[28px] font-mono uppercase tracking-[0.18em]" style={{ color: col.c }}>{col.t}</p>
                <div
                  className="mt-6 text-[30px] leading-[1.45] text-neutral-700 whitespace-pre-wrap"
                  dangerouslySetInnerHTML={{ __html: simpleMd(col.b || "") }}
                />
              </div>
            ))}
          </div>
        </div>,
      );

    case "next-steps": {
      const items = (p.items || []) as string[];
      return shell(
        <div className="absolute inset-0 flex flex-col px-32 pt-40 pb-24">
          {p.title ? heading(p.title, "sm") : null}
          <ol className="mt-10 space-y-6 max-w-[1500px]">
            {items.map((it, i) => (
              <li key={i} className="flex items-start gap-8 text-[32px] text-neutral-800">
                <span
                  className="font-bold tabular-nums shrink-0"
                  style={{ fontFamily: "'Funnel Display'", fontSize: 56, color, lineHeight: 1 }}
                >
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span className="pt-3">{it}</span>
              </li>
            ))}
          </ol>
        </div>,
      );
    }

    case "closing":
      return shell(
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center" style={{ background: `linear-gradient(135deg, ${color}15 0%, #ffffff 70%)` }}>
          <div
            className="absolute top-0 left-0 right-0 h-[6px]"
            style={{ backgroundColor: KASA_YELLOW }}
          />
          {heading(p.title, "lg")}
          {p.subtitle ? (
            <p className="mt-8 text-[36px] text-neutral-500 max-w-[1400px]">{p.subtitle}</p>
          ) : null}
          <div className="mt-16 flex items-center gap-3">
            <div className="h-2 w-40 rounded-full" style={{ backgroundColor: color }} />
            <div className="h-2 w-16 rounded-full" style={{ backgroundColor: KASA_YELLOW }} />
          </div>
          <div className="absolute bottom-16 left-0 right-0 flex justify-center">
            <KasaMark size={60} />
          </div>
        </div>,
      );
  }
}

// very small markdown: **bold**, *italic*, lines starting with - become bullets
function simpleMd(src: string): string {
  const escaped = src
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  const lines = escaped.split("\n");
  const html: string[] = [];
  let inList = false;
  for (const line of lines) {
    if (/^\s*-\s+/.test(line)) {
      if (!inList) { html.push('<ul style="list-style:disc;padding-left:1.5em;margin:0">'); inList = true; }
      html.push(`<li>${inline(line.replace(/^\s*-\s+/, ""))}</li>`);
    } else {
      if (inList) { html.push("</ul>"); inList = false; }
      html.push(`<p style="margin:0 0 0.4em 0">${inline(line)}</p>`);
    }
  }
  if (inList) html.push("</ul>");
  return html.join("");
}
function inline(s: string) {
  return s
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>");
}

// ---------- Chart renderer ----------

function ChartRender({
  chartType,
  categories,
  categoryPlatforms,
  series,
  brandColor,
}: {
  chartType: "bar" | "line" | "area" | "pie";
  categories: string[];
  categoryPlatforms: string[];
  series: ChartSeries[];
  brandColor: string;
}) {
  // Build a palette: brand, Kasa yellow, then desaturated companions
  const palette = [brandColor, KASA_YELLOW, "#1F2937", "#9CA3AF", "#60A5FA", "#F472B6"];
  const colorAt = (i: number) => palette[i % palette.length];
  const hasAnyPlatformOnCategory = categoryPlatforms.some((p) => !!p);

  if (!categories.length || !series.length) {
    return (
      <div className="w-full h-full flex items-center justify-center text-[28px] text-neutral-400 rounded-3xl bg-neutral-50">
        Sem dados
      </div>
    );
  }

  // Common data shape: [{ name: cat, "Série A": 10, "Série B": 20 }]
  const data = categories.map((cat, i) => {
    const row: Record<string, string | number> = { name: cat || `#${i + 1}` };
    series.forEach((s) => {
      row[s.name || "Série"] = Number(s.values[i] ?? 0);
    });
    return row;
  });

  const axisProps = {
    tick: { fontSize: 22, fill: "#525252", fontFamily: "Onest" },
    stroke: "#d4d4d4",
  };
  const legendStyle = { fontSize: 22, paddingTop: 16, fontFamily: "Onest" };

  // Custom XAxis tick: renders platform icon above the label (when configured)
  const CategoryTick = (tickProps: any) => {
    const { x, y, payload } = tickProps;
    const idx = categories.findIndex((c, i) => (c || `#${i + 1}`) === payload.value);
    const platformId = idx >= 0 ? categoryPlatforms[idx] : undefined;
    const plat = getPlatform(platformId);
    const iconSize = 32;
    return (
      <g transform={`translate(${x},${y})`}>
        {plat ? (
          <svg
            x={-iconSize / 2}
            y={4}
            width={iconSize}
            height={iconSize}
            viewBox="0 0 24 24"
          >
            <path d={plat.path} fill={brandColor} />
          </svg>
        ) : null}
        <text
          x={0}
          y={plat ? iconSize + 14 : 6}
          dy={16}
          textAnchor="middle"
          fill="#525252"
          fontFamily="Onest"
          fontSize={22}
        >
          {payload.value}
        </text>
      </g>
    );
  };

  const xAxisExtra = hasAnyPlatformOnCategory
    ? { tick: CategoryTick as any, height: 80 }
    : {};

  return (
    <ResponsiveContainer width="100%" height="100%">
      {chartType === "bar" ? (
        <BarChart data={data} margin={{ top: 24, right: 24, left: 12, bottom: 12 }}>
          <CartesianGrid strokeDasharray="4 4" stroke="#e5e5e5" vertical={false} />
          <XAxis dataKey="name" {...axisProps} {...xAxisExtra} />
          <YAxis {...axisProps} />
          <Tooltip contentStyle={{ fontSize: 18, borderRadius: 12 }} />
          {series.length > 1 ? <Legend wrapperStyle={legendStyle} /> : null}
          {series.map((s, i) => (
            <Bar key={s.name + i} dataKey={s.name || `Série ${i + 1}`} fill={colorAt(i)} radius={[12, 12, 0, 0]} />
          ))}
        </BarChart>
      ) : chartType === "line" ? (
        <LineChart data={data} margin={{ top: 24, right: 24, left: 12, bottom: 12 }}>
          <CartesianGrid strokeDasharray="4 4" stroke="#e5e5e5" vertical={false} />
          <XAxis dataKey="name" {...axisProps} {...xAxisExtra} />
          <YAxis {...axisProps} />
          <Tooltip contentStyle={{ fontSize: 18, borderRadius: 12 }} />
          {series.length > 1 ? <Legend wrapperStyle={legendStyle} /> : null}
          {series.map((s, i) => (
            <Line
              key={s.name + i}
              dataKey={s.name || `Série ${i + 1}`}
              stroke={colorAt(i)}
              strokeWidth={4}
              dot={{ r: 6, fill: colorAt(i) }}
              activeDot={{ r: 8 }}
            />
          ))}
        </LineChart>
      ) : chartType === "area" ? (
        <AreaChart data={data} margin={{ top: 24, right: 24, left: 12, bottom: 12 }}>
          <defs>
            {series.map((s, i) => (
              <linearGradient key={s.name + i} id={`grad-${i}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={colorAt(i)} stopOpacity={0.55} />
                <stop offset="100%" stopColor={colorAt(i)} stopOpacity={0.05} />
              </linearGradient>
            ))}
          </defs>
          <CartesianGrid strokeDasharray="4 4" stroke="#e5e5e5" vertical={false} />
          <XAxis dataKey="name" {...axisProps} {...xAxisExtra} />
          <YAxis {...axisProps} />
          <Tooltip contentStyle={{ fontSize: 18, borderRadius: 12 }} />
          {series.length > 1 ? <Legend wrapperStyle={legendStyle} /> : null}
          {series.map((s, i) => (
            <Area
              key={s.name + i}
              dataKey={s.name || `Série ${i + 1}`}
              stroke={colorAt(i)}
              strokeWidth={3}
              fill={`url(#grad-${i})`}
            />
          ))}
        </AreaChart>
      ) : (
        <PieChart>
          <Tooltip contentStyle={{ fontSize: 18, borderRadius: 12 }} />
          <Legend
            wrapperStyle={legendStyle}
            formatter={(value: string) => {
              const idx = categories.findIndex((c, i) => (c || `#${i + 1}`) === value);
              const platformId = idx >= 0 ? categoryPlatforms[idx] : undefined;
              const plat = getPlatform(platformId);
              if (!plat) return value;
              return (
                <span style={{ display: "inline-flex", alignItems: "center", gap: 8, verticalAlign: "middle" }}>
                  <PlatformIcon id={platformId} size={20} color={brandColor} />
                  {value}
                </span>
              );
            }}
          />
          <Pie
            data={categories.map((cat, i) => ({
              name: cat || `#${i + 1}`,
              value: Number(series[0]?.values[i] ?? 0),
            }))}
            dataKey="value"
            nameKey="name"
            outerRadius="75%"
            innerRadius="40%"
            paddingAngle={2}
            label={{ fontSize: 22, fill: "#404040" }}
          >
            {categories.map((_, i) => (
              <Cell key={i} fill={colorAt(i)} />
            ))}
          </Pie>
        </PieChart>
      )}
    </ResponsiveContainer>
  );
}
