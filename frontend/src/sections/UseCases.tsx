import { usePick } from "../lib/i18n";

const CONTENT = {
  en: {
    eyebrow: "Beyond copying disputes",
    heading: "The primitive is stake, fetch, judge, settle.",
    lede:
      "Prior art is the sharpest demo because the evidence is public, " +
      "the judgement is famously subjective, and being wrong is " +
      "obvious. The same shape fits any dispute where the facts are on " +
      "the web and the standard is written in words rather than " +
      "numbers.",
    cases: [
      {
        tag: "Freelance escrow",
        title: "Did the deliverable match the brief?",
        body: "Client stakes payment. Freelancer stakes their fee. The court reads the brief, reads the delivery, applies the doctrine registered for the medium, and decides whether the work meets the standard.",
        doctrine: "deliverable-review",
      },
      {
        tag: "Grant milestones",
        title: "Did the grantee ship what they promised?",
        body: "Foundation escrows a milestone payment. Grantee links the promised artefact (a report, a repo, a benchmark). The court reads it against the milestone description and releases or refunds.",
        doctrine: "grant-milestone",
      },
      {
        tag: "Bug bounty severity",
        title: "Is this a critical, or a low?",
        body: "Reporter files an advisory URL. The vendor stakes the disputed tier. The court reads the advisory against the published severity doctrine and settles on the payout the reporter is owed.",
        doctrine: "severity-rubric",
      },
      {
        tag: "Academic misconduct",
        title: "Is this paragraph plagiarised?",
        body: "Accused and accuser both stake. The court fetches both papers, applies the doctrine for academic work — quotation is legitimate, uncited paraphrase is not — and decides.",
        doctrine: "academic-paper",
      },
      {
        tag: "Moderation appeals",
        title: "Was this post removed correctly?",
        body: "User whose content was taken down files a case against the moderation decision. The court reads the post and the platform's own published rule, decides, and pays out the reinstated user if the rule was misapplied.",
        doctrine: "moderation-review",
      },
      {
        tag: "Contract clause interpretation",
        title: "Was the SLA breached?",
        body: "Two parties disagree on whether an outage counted under the service agreement. The court reads the incident report and the agreement, decides whether the clause was tripped, and releases the credit.",
        doctrine: "sla-clause",
      },
    ],
    doctrineKeyLabel: "Doctrine key:",
  },
  vi: {
    eyebrow: "Khong chi tranh chap sao chep",
    heading: "Nguyen ly: dat cuoc, tai chung cu, xet xu, chot.",
    lede:
      "Prior art la demo sac nhat vi chung cu la cong khai, " +
      "phan xet noi tieng la chu quan, va sai thi ai cung thay. " +
      "Cung hinh dang nay phu hop voi bat ky tranh chap nao ma " +
      "su kien nam tren web va tieu chuan viet bang loi thay vi " +
      "bang so.",
    cases: [
      {
        tag: "Ky quy freelance",
        title: "San pham co dung yeu cau khong?",
        body: "Khach hang dat cuoc tien thanh toan. Freelancer dat cuoc phi. Toa doc brief, doc san pham, ap dung an le cua loai hinh, va quyet dinh san pham co dat chuan khong.",
        doctrine: "deliverable-review",
      },
      {
        tag: "Milestone tai tro",
        title: "Ben nhan tai tro co giao dung cam ket khong?",
        body: "Quy ky quy tien milestone. Ben nhan lien ket san pham da hua (bao cao, repo, benchmark). Toa doc doi chieu voi mo ta milestone va giai ngan hoac hoan tien.",
        doctrine: "grant-milestone",
      },
      {
        tag: "Muc do bug bounty",
        title: "Day la critical hay low?",
        body: "Nguoi bao loi nop URL advisory. Vendor dat cuoc muc do tranh chap. Toa doc advisory doi chieu voi an le muc do va chot khoan chi tra.",
        doctrine: "severity-rubric",
      },
      {
        tag: "Gian lan hoc thuat",
        title: "Doan van nay co dao van khong?",
        body: "Ben bi to va ben to cao deu dat cuoc. Toa tai ca hai bai, ap dung an le cho cong trinh hoc thuat — trich dan la hop phap, dien giai khong ghi nguon la khong — va phan quyet.",
        doctrine: "academic-paper",
      },
      {
        tag: "Khang nghi kiem duyet",
        title: "Bai dang bi go dung khong?",
        body: "Nguoi dung bi go noi dung nop don kien quyet dinh kiem duyet. Toa doc bai dang va quy tac da cong bo cua nen tang, phan quyet, va chi tra neu quy tac bi ap dung sai.",
        doctrine: "moderation-review",
      },
      {
        tag: "Giai thich dieu khoan hop dong",
        title: "SLA co bi vi pham khong?",
        body: "Hai ben bat dong ve viec su co co thuoc thoa thuan dich vu hay khong. Toa doc bao cao su co va thoa thuan, quyet dinh dieu khoan co bi vi pham khong, va giai phong khoan boi thuong.",
        doctrine: "sla-clause",
      },
    ],
    doctrineKeyLabel: "Doctrine key:",
  },
};

export function UseCases() {
  const t = usePick(CONTENT);
  return (
    <section id="use-cases" className="marketing-section usecases-section">
      <div className="section-inner">
        <header className="section-heading">
          <span className="section-eyebrow">{t.eyebrow}</span>
          <h2>{t.heading}</h2>
          <p className="lede">{t.lede}</p>
        </header>

        <div className="usecases-grid">
          {t.cases.map((c) => (
            <article key={c.tag} className="usecase-card">
              <span className="usecase-tag">{c.tag}</span>
              <h3>{c.title}</h3>
              <p>{c.body}</p>
              <footer className="usecase-doctrine">
                {t.doctrineKeyLabel} <code>{c.doctrine}</code>
              </footer>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
