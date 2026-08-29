import { usePick } from "../lib/i18n";

const CONTENT = {
  en: {
    eyebrow: "The problem this court replaces",
    heading: "Today, a platform decides whether you copied someone.",
    lede:
      "A moderation team, a DMCA queue, an editorial board. One private party applying an " +
      "unpublished standard, with money and reputation on the line and no appeal you can " +
      "inspect. Handing the same decision to a single AI service just swaps a biased judge " +
      "for an unauditable one.",
    cells: [
      {
        label: "01 · Standard",
        title: "Unpublished.",
        body: "You cannot know what you are being judged against, and neither can the person judging you. The rules only exist inside the moderator's head.",
      },
      {
        label: "02 · Judge",
        title: "Has an interest.",
        body: "The platform that hosts the accused work also decides whether it infringes. It sees every complaint against every account paying it fees.",
      },
      {
        label: "03 · Appeal",
        title: "Not inspectable.",
        body: '"Reviewed and upheld" is the entire reasoning you are entitled to. Nobody else can check the finding, because nobody else can see the finding.',
      },
    ],
  },
  vi: {
    eyebrow: "Vấn đề mà tòa án này thay thế",
    heading: "Hôm nay, một nền tảng quyết định bạn có sao chép hay không.",
    lede:
      "Một đội kiểm duyệt, một hàng đợi DMCA, một ban biên tập. Một bên tư nhân duy nhất, áp một " +
      "tiêu chuẩn không công bố, trong khi tiền và uy tín của bạn bị đặt cược mà không có kháng nghị " +
      "nào kiểm chứng được. Giao quyết định đó cho một dịch vụ AI đơn lẻ chỉ là đổi một thẩm phán " +
      "thiên vị lấy một thẩm phán không thể kiểm toán.",
    cells: [
      {
        label: "01 · Tiêu chuẩn",
        title: "Không công bố.",
        body: "Bạn không thể biết mình đang bị xét theo tiêu chuẩn nào, và ngay cả người xét bạn cũng không. Luật chỉ tồn tại trong đầu người kiểm duyệt.",
      },
      {
        label: "02 · Thẩm phán",
        title: "Có lợi ích riêng.",
        body: "Nền tảng lưu trữ tác phẩm bị tố cũng chính là bên quyết định nó có vi phạm hay không. Họ nhìn mọi khiếu nại qua lăng kính tài khoản nào đang trả phí cho họ.",
      },
      {
        label: "03 · Kháng nghị",
        title: "Không kiểm chứng được.",
        body: '"Đã xem xét và giữ nguyên" là toàn bộ lập luận bạn được nhận. Không ai khác kiểm tra được phán quyết, vì không ai khác nhìn thấy phán quyết.',
      },
    ],
  },
};

export function Problem() {
  const t = usePick(CONTENT);
  return (
    <section id="problem" className="marketing-section problem-section">
      <div className="section-inner">
        <header className="section-heading">
          <span className="section-eyebrow">{t.eyebrow}</span>
          <h2>{t.heading}</h2>
          <p className="lede">{t.lede}</p>
        </header>

        <div className="problem-grid">
          {t.cells.map((cell) => (
            <article key={cell.label} className="problem-cell">
              <span className="problem-label">{cell.label}</span>
              <h3>{cell.title}</h3>
              <p>{cell.body}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
