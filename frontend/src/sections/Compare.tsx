import { usePick } from "../lib/i18n";

const CONTENT = {
  en: {
    eyebrow: "How this differs from the alternatives",
    heading: "Every column exists today. Only one is inspectable.",
    lede:
      "Platform moderation and single-vendor AI both answer the same " +
      "question the court answers. The difference is who can check the " +
      "answer, who can see the standard, and who gets paid when the " +
      "answer is wrong.",
    colPlatform: "Platform moderation",
    colAi: "Single AI service",
    colCourt: "Prior Art Court",
    rows: [
      {
        dimension: "The standard",
        platform: "Unpublished. In the moderator's head.",
        ai: "Whatever the vendor put in the system prompt this week.",
        court: "Public English paragraph, revision-locked on-chain, read verbatim at hearing time.",
      },
      {
        dimension: "The judge",
        platform: "The same platform hosting the accused work and collecting its fees.",
        ai: "A single server, opaque, tunable by whoever owns the keys.",
        court: "Decentralized validator set, each running its own model, agreeing on the verdict.",
      },
      {
        dimension: "The evidence",
        platform: "A screenshot uploaded by the complainant.",
        ai: "Whatever the API caller pasted into the prompt.",
        court: "Fetched from the live web inside the contract, at hearing time.",
      },
      {
        dimension: "The appeal",
        platform: "Reviewed by the same team, upheld.",
        ai: "Rerun the prompt, get the same answer.",
        court: "Second instance with a third source and precedence as an extra question.",
      },
      {
        dimension: "The reasoning",
        platform: "Not disclosed.",
        ai: "Disclosed but unverifiable — you cannot rerun the state that produced it.",
        court: "On the docket, with the transaction hash and the exact doctrine revision applied.",
      },
      {
        dimension: "Cost of a wrong call",
        platform: "Borne by the smaller party.",
        ai: "Borne by the smaller party.",
        court: "Bond forfeited by the loser. The judge earns nothing beyond gas.",
      },
    ],
  },
  vi: {
    eyebrow: "Khac biet so voi cac lua chon khac",
    heading: "Moi cot deu ton tai ngay hom nay. Chi mot cot kiem chung duoc.",
    lede:
      "Kiem duyet nen tang va AI don le deu tra loi cung cau hoi ma " +
      "toa tra loi. Khac biet la ai kiem tra duoc cau tra loi, ai thay " +
      "duoc tieu chuan, va ai tra gia khi cau tra loi sai.",
    colPlatform: "Kiem duyet nen tang",
    colAi: "Dich vu AI don le",
    colCourt: "Prior Art Court",
    rows: [
      {
        dimension: "Tieu chuan",
        platform: "Khong cong bo. Trong dau nguoi kiem duyet.",
        ai: "Bat ky gi vendor dat vao system prompt tuan nay.",
        court: "Doan tieng Anh cong khai, khoa phien ban tren chuoi, doc nguyen van khi xet xu.",
      },
      {
        dimension: "Tham phan",
        platform: "Chinh nen tang luu tru tac pham bi to va thu phi tu no.",
        ai: "Mot server duy nhat, mo, co the chinh boi bat ky ai giu khoa.",
        court: "Tap validator phi tap trung, moi nguoi chay model rieng, dong y ve phan quyet.",
      },
      {
        dimension: "Chung cu",
        platform: "Anh chup man hinh do nguyen don tai len.",
        ai: "Bat ky gi nguoi goi API dan vao prompt.",
        court: "Tu tai tu web truc tiep ben trong contract, tai thoi diem xet xu.",
      },
      {
        dimension: "Khang cao",
        platform: "Cung doi xem xet, giu nguyen.",
        ai: "Chay lai prompt, duoc cung ket qua.",
        court: "Phien thu hai voi nguon thu ba va cau hoi bo sung ve quyen uu tien.",
      },
      {
        dimension: "Ly do phan quyet",
        platform: "Khong cong bo.",
        ai: "Cong bo nhung khong kiem chung duoc — ban khong the chay lai trang thai da tao ra no.",
        court: "Tren so ghi an, voi hash giao dich va phien ban an le duoc ap dung.",
      },
      {
        dimension: "Chi phi khi sai",
        platform: "Ben nho hon ganh chiu.",
        ai: "Ben nho hon ganh chiu.",
        court: "Bond bi tich thu tu ben thua. Tham phan khong duoc gi ngoai gas.",
      },
    ],
  },
};

export function Compare() {
  const t = usePick(CONTENT);
  return (
    <section id="compare" className="marketing-section compare-section">
      <div className="section-inner">
        <header className="section-heading">
          <span className="section-eyebrow">{t.eyebrow}</span>
          <h2>{t.heading}</h2>
          <p className="lede">{t.lede}</p>
        </header>

        <div className="compare-scroll">
          <table className="compare-table">
            <thead>
              <tr>
                <th aria-label="Dimension" />
                <th>{t.colPlatform}</th>
                <th>{t.colAi}</th>
                <th className="compare-highlight">{t.colCourt}</th>
              </tr>
            </thead>
            <tbody>
              {t.rows.map((row) => (
                <tr key={row.dimension}>
                  <th scope="row">{row.dimension}</th>
                  <td>{row.platform}</td>
                  <td>{row.ai}</td>
                  <td className="compare-highlight">{row.court}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
