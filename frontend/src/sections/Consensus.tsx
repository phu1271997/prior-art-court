import { usePick } from "../lib/i18n";

const CONTENT = {
  en: {
    eyebrow: "What consensus actually decides",
    heading: "Consensus decides the verdict. Arithmetic decides the money.",
    lede:
      "The adjudicator is never asked how much anyone should be paid. It " +
      "answers one categorical question, and the payout is derived from " +
      "bonds that were escrowed before the question was asked. A fully " +
      "compromised, unanimous validator set can therefore still only " +
      "move the stakes the parties themselves put up.",
    consensusLabel: "Consensus",
    consensusTitle: "Validators must agree on the finding, not the wording.",
    consensusBody:
      "Every validator independently fetches both pages and re-reasons. " +
      "A leader proposes; the rest accept only if they reached the same " +
      "verdict, and the same overlap percentage give-or-take a " +
      "tolerance. Two validators who write different reasons but reach " +
      "the same finding still agree. Two who reach opposite findings " +
      "do not pass, even if their JSON matches.",
    arithmeticLabel: "Arithmetic",
    arithmeticTitle: "The pot is fixed before the hearing.",
    arithmeticBody:
      "Pot equals complainant bond plus counter-bond plus appeal fee. " +
      "The verdict picks which of two addresses receives it. That is " +
      "the entire arithmetic, and it is why a compromised validator " +
      "set cannot mint value here: the worst it can do is hand one " +
      "party's own stake to the other.",
  },
  vi: {
    eyebrow: "Dong thuan thuc su quyet dinh gi",
    heading: "Dong thuan quyet dinh phan quyet. So hoc quyet dinh tien.",
    lede:
      "Hoi dong xet xu khong bao gio bi hoi phai tra bao nhieu. No chi " +
      "tra loi mot cau hoi phan loai, va khoan chi duoc tinh tu cac " +
      "khoan bond da ky quy truoc khi cau hoi duoc dat ra. Mot tap " +
      "validator bi xam nhap hoan toan van chi co the chuyen so tien " +
      "ma chinh cac ben da dat cuoc.",
    consensusLabel: "Dong thuan",
    consensusTitle: "Cac validator phai dong y ve ket luan, khong phai cach viet.",
    consensusBody:
      "Moi validator doc lap tai ca hai trang va suy luan lai. " +
      "Mot leader de xuat; nhung nguoi con lai chi chap nhan neu ho " +
      "dat duoc cung phan quyet, va cung ty le trung lap trong pham vi " +
      "dung sai. Hai validator viet ly do khac nhau nhung cung ket luan " +
      "van dong y. Hai nguoi dat ket luan trai nguoc thi khong, du JSON " +
      "cua ho giong nhau.",
    arithmeticLabel: "So hoc",
    arithmeticTitle: "Pot duoc co dinh truoc phien xu.",
    arithmeticBody:
      "Pot bang bond nguyen don cong counter-bond cong phi phuc tham. " +
      "Phan quyet chon dia chi nao trong hai nhan pot. Do la toan bo " +
      "phep tinh, va la ly do tap validator bi xam nhap khong the tao " +
      "gia tri: dieu toi te nhat no lam duoc la chuyen tien cuoc cua " +
      "mot ben sang ben kia.",
  },
};

export function Consensus() {
  const t = usePick(CONTENT);
  return (
    <section id="consensus" className="marketing-section consensus-section">
      <div className="section-inner">
        <header className="section-heading">
          <span className="section-eyebrow">{t.eyebrow}</span>
          <h2>{t.heading}</h2>
          <p className="lede">{t.lede}</p>
        </header>

        <div className="consensus-split">
          <article className="consensus-cell">
            <span className="consensus-label">{t.consensusLabel}</span>
            <h3>{t.consensusTitle}</h3>
            <p>{t.consensusBody}</p>
            <pre className="consensus-snippet">
              <code>{`def agrees(leader_result) -> bool:
    theirs = json.loads(leader_result.calldata)
    mine   = json.loads(hear())
    if theirs["verdict"] != mine["verdict"]:
        return False
    return abs(theirs["overlap_pct"]
             - mine["overlap_pct"]) <= 25`}</code>
            </pre>
          </article>

          <article className="consensus-cell">
            <span className="consensus-label">{t.arithmeticLabel}</span>
            <h3>{t.arithmeticTitle}</h3>
            <p>{t.arithmeticBody}</p>
            <pre className="consensus-snippet">
              <code>{`pot     = complainant_bond
        + counter_bond
        + appeal_fee
winner  = complainant if verdict is INFRINGING
          else respondent`}</code>
            </pre>
          </article>
        </div>
      </div>
    </section>
  );
}
