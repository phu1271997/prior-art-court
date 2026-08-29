import { usePick } from "../lib/i18n";

const CONTENT = {
  en: {
    eyebrow: "How a case moves through the court",
    heading: "Five steps, from filing to withdrawal.",
    lede:
      "Two of the five steps are performed by the parties. Three are performed by the " +
      "court itself, reading and reasoning on-chain.",
    steps: [
      {
        step: "1",
        title: "File",
        kind: "party",
        body: "Complainant stakes a bond and posts two URLs: the original, and the work alleged to copy it.",
      },
      {
        step: "2",
        title: "Contest",
        kind: "party",
        body: "Respondent may stake a matching counter-bond. Silence is a choice, and it has a price.",
      },
      {
        step: "3",
        title: "Hear",
        kind: "court",
        body: "The court fetches both pages on-chain, applies the doctrine, reasons. Every validator repeats the work independently.",
      },
      {
        step: "4",
        title: "Escalate",
        kind: "court",
        body: "Close calls, self-contradictions, or unreadable evidence move the case to a three-source appeal.",
      },
      {
        step: "5",
        title: "Collect",
        kind: "party",
        body: "The winner withdraws the pot. Every step is on the docket, inspectable on the Studio explorer.",
      },
    ],
    legendParty: "Parties act.",
    legendCourt: "The court hears.",
    ariaLabel: "Case lifecycle",
  },
  vi: {
    eyebrow: "Một vụ kiện đi qua tòa như thế nào",
    heading: "Năm bước, từ nộp đơn đến rút tiền.",
    lede:
      "Hai trong năm bước do các bên thực hiện. Ba bước còn lại do chính tòa án thực hiện, " +
      "đọc chứng cứ và suy luận ngay trên chuỗi.",
    steps: [
      {
        step: "1",
        title: "Nộp đơn",
        kind: "party",
        body: "Nguyên đơn đặt cược một khoản bond và nộp hai URL: bản gốc, và tác phẩm bị tố sao chép.",
      },
      {
        step: "2",
        title: "Phản tố",
        kind: "party",
        body: "Bị đơn có thể đặt cược một khoản đối ứng bằng bond. Im lặng cũng là một lựa chọn, và nó có giá.",
      },
      {
        step: "3",
        title: "Xét xử",
        kind: "court",
        body: "Tòa tự tải cả hai trang trên chuỗi, áp dụng án lệ, suy luận. Mỗi validator lặp lại toàn bộ công việc một cách độc lập.",
      },
      {
        step: "4",
        title: "Chuyển phúc thẩm",
        kind: "court",
        body: "Phán quyết sát nút, tự mâu thuẫn, hoặc chứng cứ không đọc được sẽ đưa vụ kiện lên phiên phúc thẩm ba nguồn.",
      },
      {
        step: "5",
        title: "Nhận tiền",
        kind: "party",
        body: "Bên thắng rút toàn bộ pot. Mọi bước đều nằm trên sổ ghi án, kiểm chứng được trên Studio explorer.",
      },
    ],
    legendParty: "Các bên hành động.",
    legendCourt: "Tòa xét xử.",
    ariaLabel: "Vòng đời vụ kiện",
  },
};

export function Lifecycle() {
  const t = usePick(CONTENT);
  return (
    <section id="how-it-works" className="marketing-section lifecycle-section">
      <div className="section-inner">
        <header className="section-heading">
          <span className="section-eyebrow">{t.eyebrow}</span>
          <h2>{t.heading}</h2>
          <p className="lede">{t.lede}</p>
        </header>

        <ol className="lifecycle" aria-label={t.ariaLabel}>
          {t.steps.map((entry) => (
            <li key={entry.step} className={`lifecycle-step lifecycle-${entry.kind}`}>
              <div className="lifecycle-marker" aria-hidden="true">
                <span className="lifecycle-num">{entry.step}</span>
              </div>
              <div className="lifecycle-content">
                <h3>{entry.title}</h3>
                <p>{entry.body}</p>
              </div>
            </li>
          ))}
        </ol>

        <p className="lifecycle-legend">
          <span className="lifecycle-swatch lifecycle-party" aria-hidden="true" />{" "}
          {t.legendParty}{" "}
          <span className="lifecycle-swatch lifecycle-court" aria-hidden="true" />{" "}
          {t.legendCourt}
        </p>
      </div>
    </section>
  );
}
