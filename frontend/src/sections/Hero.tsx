import { CHAIN_NAME } from "../lib/chain";
import { usePick } from "../lib/i18n";
import type { Case, Policy } from "../lib/types";

interface Props {
  cases: Case[];
  policies: Policy[];
}

const CONTENT = {
  en: {
    eyebrow: `An intelligent court on GenLayer ${CHAIN_NAME}`,
    heading: [
      "A court for copying disputes,",
      "where the judge reads both works itself",
      "and cannot be lobbied.",
    ],
    lede:
      "Someone publishes something. Someone else publishes something that looks a lot like it. " +
      "Prior Art Court settles the dispute on-chain: both parties stake, an Intelligent Contract " +
      "fetches both works from the live web, applies published doctrine, and decides under " +
      "decentralized validator consensus.",
    ctaPrimary: "Open the court",
    ctaSecondary: "Read how it works",
    stats: {
      filed: "Cases filed",
      resolved: "Verdicts settled",
      infringing: "Found infringing",
      cleared: "Cleared",
      appealed: "Went to appeal",
      categories: "Categories under jurisdiction",
    },
    statsLabel: "Court statistics",
  },
  vi: {
    eyebrow: `Tòa án thông minh trên GenLayer ${CHAIN_NAME}`,
    heading: [
      "Tòa án cho tranh chấp sao chép,",
      "nơi thẩm phán tự đọc cả hai tác phẩm",
      "và không thể bị mua chuộc.",
    ],
    lede:
      "Một người công bố tác phẩm. Người khác công bố thứ trông rất giống nó. " +
      "Prior Art Court phân xử tranh chấp ngay trên chuỗi: hai bên đặt cược, một Intelligent Contract " +
      "tự tải cả hai tác phẩm từ web trực tiếp, áp dụng án lệ đã công bố, và ra phán quyết " +
      "dưới sự đồng thuận của mạng validator phi tập trung.",
    ctaPrimary: "Vào phiên tòa",
    ctaSecondary: "Xem cách hoạt động",
    stats: {
      filed: "Vụ kiện đã nộp",
      resolved: "Phán quyết đã chốt",
      infringing: "Kết luận vi phạm",
      cleared: "Được minh oan",
      appealed: "Lên phúc thẩm",
      categories: "Loại tác phẩm thụ lý",
    },
    statsLabel: "Thống kê phiên tòa",
  },
};

export function Hero({ cases, policies }: Props) {
  const t = usePick(CONTENT);

  const filed = cases.length;
  const resolved = cases.filter((c) => c.status === "RESOLVED").length;
  const infringing = cases.filter((c) => c.verdict === "INFRINGING").length;
  const cleared = cases.filter(
    (c) => c.verdict === "INDEPENDENT" || c.verdict === "DERIVATIVE_FAIR"
  ).length;
  const appealed = cases.filter((c) => c.instance === 2).length;

  const STATS = [
    { label: t.stats.filed, value: filed.toString() },
    { label: t.stats.resolved, value: resolved.toString() },
    { label: t.stats.infringing, value: infringing.toString() },
    { label: t.stats.cleared, value: cleared.toString() },
    { label: t.stats.appealed, value: appealed.toString() },
    { label: t.stats.categories, value: policies.length.toString() },
  ];

  return (
    <section id="top" className="marketing-section hero-section">
      <div className="section-inner hero-inner">
        <div className="hero-copy">
          <span className="hero-eyebrow">{t.eyebrow}</span>
          <h1>
            {t.heading[0]}
            <br />
            {t.heading[1]}
            <br />
            {t.heading[2]}
          </h1>
          <p className="hero-lede">{t.lede}</p>
          <div className="hero-cta">
            <a href="#court" className="hero-primary">
              {t.ctaPrimary}
            </a>
            <a href="#how-it-works" className="hero-secondary">
              {t.ctaSecondary}
            </a>
          </div>
        </div>

        <dl className="hero-stats" aria-label={t.statsLabel}>
          {STATS.map((stat) => (
            <div key={stat.label} className="hero-stat">
              <dt>{stat.label}</dt>
              <dd>{stat.value}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
