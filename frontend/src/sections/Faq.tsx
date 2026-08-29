import { usePick } from "../lib/i18n";

const CONTENT = {
  en: {
    eyebrow: "Questions the reviewer asked most",
    heading: "Frequently asked.",
    items: [
      {
        q: "What does it cost to file a complaint?",
        a: "The bond itself, staked with the complaint. Win and the bond comes back with the respondent's counter-bond if the case was contested. Lose an uncontested complaint and the bond is forfeited; that is what makes filing rubbish expensive. The bond has no fixed minimum beyond being greater than zero, but a serious dispute should carry a serious stake.",
      },
      {
        q: "Can the AI decide how much money changes hands?",
        a: "No. The adjudicator answers one categorical question: INFRINGING, DERIVATIVE_FAIR, INDEPENDENT, or EVIDENCE_UNAVAILABLE. The payout is derived from the bonds that were escrowed before the question was asked. A compromised validator set can hand one party's own stake to the other; it cannot mint value.",
      },
      {
        q: "What happens if the evidence page is unreadable?",
        a: "The court treats it as no evidence rather than as no similarity. A dead link, a cookie wall, a JS shell, or a 404 becomes a verdict of EVIDENCE_UNAVAILABLE and the case escalates to the three-source appeal. If the appeal still cannot read enough evidence, every stake goes back to whoever put it up.",
      },
      {
        q: "Can a decided case be appealed?",
        a: "No. An appeal exists because the first instance said it could not decide safely, not because a party disliked a decision it could. A settled verdict is final. The appeal instance reads three sources and answers one extra question the first instance never asked: which work was published first.",
      },
      {
        q: "What kinds of work can the court judge?",
        a: "Whatever has a published doctrine. Five categories are seeded today: news articles, source code, academic papers, documentation, and marketing copy. Bringing a new medium under the court's jurisdiction takes no code; it takes a paragraph of English registered in the PolicyRegistry contract stating what counts as protected expression, what reuse is legitimate, and what must not be treated as copying.",
      },
      {
        q: "How is this different from a diff or a plagiarism checker?",
        a: "Substantial similarity of protected expression is not a diff. Two texts can share 90% of their words and be a legitimate quotation. Two texts can share no complete sentence and one still be a rip-off of the other's structure and sequence. And even if the check were mechanical, the evidence lives at URLs on the open web and has to be read at judgement time, which a deterministic chain cannot do without an oracle.",
      },
      {
        q: "Why is this on studionet and not testnet or mainnet?",
        a: "GenLayer is in its testnet phase. Studionet is the Studio-hosted network where the SDK, RPC, and Explorer are stable enough for a public demo. Testnets like Asimov and Bradbury are validator-focused; when GenLayer promotes a mainnet, we redeploy and update the frontend chain.",
      },
      {
        q: "Do I have to trust the validators?",
        a: "No more than you have to trust that a majority of Ethereum validators are honest. Validators are staked, slashed for the wrong answer, and every validator runs its own model with its own random seed. Optimistic Democracy is designed so that agreeing with a wrong leader costs a validator more than checking for themselves.",
      },
    ],
  },
  vi: {
    eyebrow: "Cau hoi giam khao hoi nhieu nhat",
    heading: "Cau hoi thuong gap.",
    items: [
      {
        q: "Nop don kien ton bao nhieu?",
        a: "Chinh la khoan bond, dat cuoc cung don kien. Thang thi bond tra lai cung counter-bond cua bi don (neu bi phan to). Thua don khong bi phan to thi mat bond — do la ly do nop don rieu rat dat. Bond khong co muc toi thieu co dinh ngoai viec phai lon hon 0, nhung tranh chap nghiem tuc nen co muc dat cuoc tuong xung.",
      },
      {
        q: "AI co quyet dinh bao nhieu tien chuyen tay khong?",
        a: "Khong. Hoi dong xet xu chi tra loi mot cau hoi phan loai: INFRINGING, DERIVATIVE_FAIR, INDEPENDENT, hoac EVIDENCE_UNAVAILABLE. Khoan chi duoc tinh tu cac bond da ky quy truoc khi dat cau hoi. Tap validator bi xam nhap chi co the chuyen tien cuoc cua mot ben sang ben kia; khong the tao gia tri.",
      },
      {
        q: "Dieu gi xay ra neu trang chung cu khong doc duoc?",
        a: "Toa coi do la khong co chung cu, khong phai khong co su tuong dong. Lien ket chet, tuong cookie, shell JS, hoac 404 se thanh phan quyet EVIDENCE_UNAVAILABLE va vu kien chuyen phuc tham ba nguon. Neu phuc tham van khong doc du chung cu, moi khoan dat cuoc tra lai nguoi dat.",
      },
      {
        q: "Vu da phan quyet co the khang cao khong?",
        a: "Khong. Phuc tham ton tai vi phien so tham noi rang no khong the quyet dinh an toan, khong phai vi mot ben khong thich quyet dinh. Phan quyet da chot la chung tham. Phien phuc tham doc ba nguon va tra loi them mot cau hoi phien so tham khong hoi: tac pham nao cong bo truoc.",
      },
      {
        q: "Toa co the xet xu nhung loai tac pham nao?",
        a: "Bat ky loai nao co an le da cong bo. Nam loai duoc cai san: bai bao, ma nguon, bai nghien cuu, tai lieu, va noi dung marketing. Dua mot loai hinh moi vao tham quyen khong can code; chi can mot doan tieng Anh dang ky trong contract PolicyRegistry neu dieu gi la bieu dat duoc bao ho, tai su dung nao la hop phap, va dieu gi khong duoc coi la sao chep.",
      },
      {
        q: "Day khac gi so voi diff hoac kiem tra dao van?",
        a: "Su tuong dong thuc chat cua bieu dat duoc bao ho khong phai la diff. Hai van ban co the dung chung 90% tu ma la trich dan hop phap. Hai van ban co the khong co cau nao giong nhau ma mot cai van dang cap cau truc va trinh tu cua cai kia. Va du kiem tra co la may moc, chung cu nam tai URL tren web va phai duoc doc tai thoi diem xet xu, dieu ma blockchain xac dinh khong the lam duoc neu khong co oracle.",
      },
      {
        q: "Tai sao dang tren studionet ma khong phai testnet hay mainnet?",
        a: "GenLayer dang trong giai doan testnet. Studionet la mang do Studio luu tru, noi SDK, RPC, va Explorer du on dinh cho demo cong khai. Cac testnet nhu Asimov va Bradbury tap trung vao validator; khi GenLayer ra mainnet, chung toi se deploy lai va cap nhat chuoi frontend.",
      },
      {
        q: "Toi co phai tin tuong cac validator khong?",
        a: "Khong hon muc ban phai tin rang da so validator Ethereum la trung thuc. Validator bi dat cuoc, bi phat khi tra loi sai, va moi validator chay model rieng voi random seed rieng. Optimistic Democracy duoc thiet ke sao cho dong y voi leader sai ton kem hon tu kiem tra.",
      },
    ],
  },
};

export function Faq() {
  const t = usePick(CONTENT);
  return (
    <section id="faq" className="marketing-section faq-section">
      <div className="section-inner">
        <header className="section-heading">
          <span className="section-eyebrow">{t.eyebrow}</span>
          <h2>{t.heading}</h2>
        </header>

        <div className="faq-list">
          {t.items.map((entry) => (
            <details key={entry.q} className="faq-item">
              <summary>{entry.q}</summary>
              <p>{entry.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
