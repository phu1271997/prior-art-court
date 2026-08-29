import { usePick } from "../lib/i18n";

const CONTENT = {
  en: {
    eyebrow: "Three contracts, one court",
    heading: "Doctrine is separate from the court. Standing is derived, not pushed.",
    lede:
      "Everything the court judges against lives in one contract. " +
      "Everything about a case's outcome lives in another. A third " +
      "reads them back and derives standing. Nothing writes across " +
      "contracts — cross-contract writes are messages, and a message " +
      "that arrives after a settlement is a settlement that got half " +
      "applied.",
    boxes: [
      {
        id: "registry",
        name: "PolicyRegistry",
        role: "Doctrine, revision-locked",
        body: "The court's whole integration surface. Every kind of work under the court's jurisdiction carries a paragraph of English here. Bringing a new medium under the court takes a registered paragraph, not code.",
        methods: ["register_policy", "get_policy", "list_categories"],
        color: "seal",
      },
      {
        id: "court",
        name: "PriorArtCourt",
        role: "Cases, bonds, and both intelligent instances",
        body: "The lifecycle in one contract: file, contest, hear, escalate, appeal, settle. The two intelligent methods (adjudicate, appeal) fetch pages on-chain and reason under Optimistic Democracy. Money moves only through arithmetic, never through the model.",
        methods: ["file_case", "contest_case", "adjudicate", "appeal", "withdraw"],
        color: "ink",
      },
      {
        id: "reputation",
        name: "Reputation",
        role: "Standing pulled from settled cases",
        body: "Never written to by the court. Reads the court's history and derives standing on demand. Pull, not push: a cross-contract write is dispatched as a message and would leave standing half-applied if the transaction later unwound.",
        methods: ["get_standing", "sync_recent", "get_leaderboard"],
        color: "upheld",
      },
    ],
    flowRegistryCourt: "read doctrine at hearing",
    flowCourtReputation: "read settled cases on demand",
    footnote:
      "The court reads the registry synchronously — the doctrine and its " +
      "revision arrive in the same transaction as the hearing. The " +
      "reputation contract polls the court through its public views; the " +
      "court never knows it exists.",
  },
  vi: {
    eyebrow: "Ba contract, mot toa an",
    heading: "An le tach biet khoi toa. Uy tin duoc suy ra, khong duoc day vao.",
    lede:
      "Moi thu ma toa phan xet deu nam trong mot contract. " +
      "Moi thu ve ket qua vu kien nam trong contract khac. Contract thu ba " +
      "doc lai va suy ra uy tin. Khong co gi ghi cheo giua cac contract " +
      "— ghi cheo la tin nhan, va tin nhan den sau khi chot " +
      "nghia la phien chot chi hoan thanh mot nua.",
    boxes: [
      {
        id: "registry",
        name: "PolicyRegistry",
        role: "An le, khoa theo phien ban",
        body: "Toan bo be mat tich hop cua toa. Moi loai tac pham thuoc tham quyen cua toa deu co mot doan tieng Anh o day. Dua mot loai hinh moi vao tham quyen chi can mot doan van, khong can code.",
        methods: ["register_policy", "get_policy", "list_categories"],
        color: "seal",
      },
      {
        id: "court",
        name: "PriorArtCourt",
        role: "Vu kien, bond, va hai phien xu thong minh",
        body: "Toan bo vong doi trong mot contract: nop don, phan to, xet xu, chuyen phuc tham, phuc tham, chot. Hai method thong minh (adjudicate, appeal) tai trang tren chuoi va suy luan duoi Optimistic Democracy. Tien chi chuyen bang so hoc, khong bao gio qua model.",
        methods: ["file_case", "contest_case", "adjudicate", "appeal", "withdraw"],
        color: "ink",
      },
      {
        id: "reputation",
        name: "Reputation",
        role: "Uy tin rut tu cac vu da chot",
        body: "Toa khong bao gio ghi vao day. Doc lich su cua toa va suy ra uy tin theo yeu cau. Keo, khong day: ghi cheo duoc gui nhu tin nhan va se de uy tin chi cap nhat mot nua neu giao dich bi huy.",
        methods: ["get_standing", "sync_recent", "get_leaderboard"],
        color: "upheld",
      },
    ],
    flowRegistryCourt: "doc an le khi xet xu",
    flowCourtReputation: "doc cac vu da chot theo yeu cau",
    footnote:
      "Toa doc registry dong bo — an le va phien ban cua no " +
      "den trong cung giao dich voi phien xu. Contract uy tin " +
      "truy van toa qua cac view cong khai; toa khong bao gio " +
      "biet no ton tai.",
  },
};

export function Architecture() {
  const t = usePick(CONTENT);
  return (
    <section id="architecture" className="marketing-section architecture-section">
      <div className="section-inner">
        <header className="section-heading">
          <span className="section-eyebrow">{t.eyebrow}</span>
          <h2>{t.heading}</h2>
          <p className="lede">{t.lede}</p>
        </header>

        <div className="architecture-graph">
          {t.boxes.map((box) => (
            <article key={box.id} className={`arch-box arch-box-${box.color}`}>
              <header className="arch-box-header">
                <h3>{box.name}</h3>
                <span className="arch-box-role">{box.role}</span>
              </header>
              <p>{box.body}</p>
              <ul className="arch-methods">
                {box.methods.map((m) => (
                  <li key={m}>
                    <code>{m}</code>
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>

        <div className="architecture-flow" aria-hidden="true">
          <div className="flow-line flow-registry-court">
            <span className="flow-label">{t.flowRegistryCourt}</span>
          </div>
          <div className="flow-line flow-court-reputation">
            <span className="flow-label">{t.flowCourtReputation}</span>
          </div>
        </div>

        <p className="architecture-footnote">{t.footnote}</p>
      </div>
    </section>
  );
}
