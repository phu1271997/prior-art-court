import { usePick } from "../lib/i18n";

const CONTENT = {
  en: {
    eyebrow: "How to file or contest",
    heading: "Three actions, everything moves through the court.",
    lede:
      "Read the doctrine first: the standard is public before the case " +
      "exists. Then stake, wait for the network to reason, and pull the " +
      "pot when it settles.",
    steps: [
      {
        marker: "A",
        title: "Connect a funded studionet wallet.",
        body: "The app switches (or adds) the GenLayer Studio network for you on connect. Fund your address from the Studio Accounts panel by transferring GEN from a pre-funded account. Studionet and testnet are separate networks, so the public testnet faucet does not fund this one.",
      },
      {
        marker: "B",
        title: "File a complaint, or contest one.",
        body: "Open the doctrine panel first. Pick a category, paste the two URLs, describe what was taken, stake a bond. If you are the accused, matching the bond contests. Uncontested complaints still go to the court, and a rejected uncontested complaint forfeits the filer's bond.",
      },
      {
        marker: "C",
        title: "Send it to the court, then withdraw.",
        body: "Either party can call adjudicate. Every validator fetches both pages and reasons independently, so the wait is measured in minutes, not seconds. Once the verdict is on-chain, the winner pulls the pot with withdraw.",
      },
    ],
    footnote:
      "A close call escalates automatically. You can appeal an escalated " +
      "case with a third source; you cannot appeal a case the court " +
      "already decided.",
  },
  vi: {
    eyebrow: "Cach nop don hoac phan to",
    heading: "Ba hanh dong, moi thu di qua toa.",
    lede:
      "Doc an le truoc: tieu chuan duoc cong khai truoc khi vu kien " +
      "ton tai. Sau do dat cuoc, cho mang suy luan, va rut pot " +
      "khi chot.",
    steps: [
      {
        marker: "A",
        title: "Ket noi vi co GEN tren studionet.",
        body: "Ung dung tu chuyen (hoac them) mang GenLayer Studio khi ket noi. Nap GEN tu bang Accounts trong Studio bang cach chuyen tu tai khoan co san. Studionet va testnet la hai mang rieng biet, faucet testnet cong khai khong nap cho mang nay.",
      },
      {
        marker: "B",
        title: "Nop don kien hoac phan to.",
        body: "Mo bang an le truoc. Chon loai tac pham, dan hai URL, mo ta noi dung bi sao chep, dat bond. Neu ban la ben bi to, dat bond doi ung de phan to. Don khong bi phan to van duoc xet xu, va don bi bac se mat bond.",
      },
      {
        marker: "C",
        title: "Gui len toa, roi rut tien.",
        body: "Bat ky ben nao deu co the goi adjudicate. Moi validator tu tai ca hai trang va suy luan doc lap, nen phai cho vai phut. Khi phan quyet len chuoi, ben thang rut pot bang withdraw.",
      },
    ],
    footnote:
      "Ket qua sat nut tu dong chuyen phuc tham. Ban co the khang cao " +
      "vu da chuyen phuc tham voi nguon thu ba; ban khong the khang cao " +
      "vu toa da quyet dinh.",
  },
};

export function Walkthrough() {
  const t = usePick(CONTENT);
  return (
    <section id="how-to-use" className="marketing-section walkthrough-section">
      <div className="section-inner">
        <header className="section-heading">
          <span className="section-eyebrow">{t.eyebrow}</span>
          <h2>{t.heading}</h2>
          <p className="lede">{t.lede}</p>
        </header>

        <ol className="steps">
          {t.steps.map((step) => (
            <li key={step.marker}>
              <div className="step-marker">
                <span>{step.marker}</span>
              </div>
              <div className="step-body">
                <h3>{step.title}</h3>
                <p>{step.body}</p>
              </div>
            </li>
          ))}
        </ol>

        <p className="walkthrough-footnote">{t.footnote}</p>
      </div>
    </section>
  );
}
