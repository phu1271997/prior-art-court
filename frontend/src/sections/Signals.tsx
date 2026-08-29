import { usePick } from "../lib/i18n";

const CONTENT = {
  en: {
    eyebrow: "The signals the court refuses to settle on",
    heading: "Consensus is not the same thing as trust.",
    lede:
      "Validators agreeing on an answer establishes that they agreed. " +
      "It does not establish that the answer is safe to move money over. " +
      "Three arithmetic checks run after consensus. Any one of them " +
      "sends the case to the appeal instance instead of to settlement.",
    signals: [
      {
        label: "Signal 01",
        trigger: "Confidence below 70",
        body: "The adjudicator itself flagged the call as close. Rather than move money on a coin flip, the court sends the case up.",
        verdict: "escalate → appeal",
      },
      {
        label: "Signal 02",
        trigger: "INFRINGING at overlap below 40",
        body: "The verdict contradicts the estimate. Half an answer is not an answer, and half an answer that pays out is a payout the loser can rightly dispute.",
        verdict: "escalate → appeal",
      },
      {
        label: "Signal 03",
        trigger: "EVIDENCE_UNAVAILABLE",
        body: "One of the pages could not be fetched, timed out, or rendered to less than 200 characters of real text. Every validator sees the same failure, so the round still holds; it just does not settle.",
        verdict: "escalate → appeal → refund all",
      },
    ],
    outcomeLabel: "Outcome",
    footnote:
      "The appeal always terminates the case. If even three sources still " +
      "cannot be read, every stake goes back to whoever put it up. A court " +
      "that cannot see the evidence has no business redistributing money " +
      "over it.",
  },
  vi: {
    eyebrow: "Tin hieu ma toa tu choi chot phan quyet",
    heading: "Dong thuan khong dong nghia voi tin cay.",
    lede:
      "Cac validator dong y mot cau tra loi chi chung to rang ho da dong y. " +
      "Dieu do khong chung to rang cau tra loi du an toan de chuyen tien. " +
      "Ba kiem tra so hoc chay sau dong thuan. Bat ky kiem tra nao that bai " +
      "deu chuyen vu kien len phien phuc tham thay vi chot.",
    signals: [
      {
        label: "Tin hieu 01",
        trigger: "Confidence below 70",
        body: "Chinh hoi dong xet xu danh dau ket qua la sat nut. Thay vi chuyen tien bang mot dong xu, toa chuyen vu kien len.",
        verdict: "escalate → appeal",
      },
      {
        label: "Tin hieu 02",
        trigger: "INFRINGING at overlap below 40",
        body: "Phan quyet mau thuan voi uoc tinh. Nua cau tra loi khong phai cau tra loi, va nua cau tra loi ma chi tien la khoan chi ma ben thua co quyen phan doi.",
        verdict: "escalate → appeal",
      },
      {
        label: "Tin hieu 03",
        trigger: "EVIDENCE_UNAVAILABLE",
        body: "Mot trong hai trang khong tai duoc, het thoi gian, hoac hien thi duoi 200 ky tu van ban thuc. Moi validator deu thay loi nay, nen phien xu van hop le nhung khong chot.",
        verdict: "escalate → appeal → refund all",
      },
    ],
    outcomeLabel: "Ket qua",
    footnote:
      "Phien phuc tham luon ket thuc vu kien. Neu ca ba nguon van khong doc " +
      "duoc, moi khoan dat cuoc deu tra lai nguoi dat. Mot toa an khong doc " +
      "duoc chung cu thi khong co quyen phan phoi lai tien.",
  },
};

export function Signals() {
  const t = usePick(CONTENT);
  return (
    <section id="signals" className="marketing-section signals-section">
      <div className="section-inner">
        <header className="section-heading">
          <span className="section-eyebrow">{t.eyebrow}</span>
          <h2>{t.heading}</h2>
          <p className="lede">{t.lede}</p>
        </header>

        <div className="signals-list">
          {t.signals.map((s) => (
            <article key={s.trigger} className="signal-row">
              <div className="signal-label">{s.label}</div>
              <div className="signal-body">
                <h3>{s.trigger}</h3>
                <p>{s.body}</p>
              </div>
              <div className="signal-outcome">
                <span>{t.outcomeLabel}</span>
                <code>{s.verdict}</code>
              </div>
            </article>
          ))}
        </div>

        <p className="signals-footnote">{t.footnote}</p>
      </div>
    </section>
  );
}
