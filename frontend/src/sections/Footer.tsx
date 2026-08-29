import { ADDRESSES, CHAIN_NAME, explorerContract } from "../lib/chain";
import { usePick } from "../lib/i18n";
import { shortAddress } from "../lib/types";

const REPO = "https://github.com/phu1271997/prior-art-court";

const CONTENT = {
  en: {
    brandDesc:
      `An intelligent court for copying disputes. Built on GenLayer ` +
      `${CHAIN_NAME}. Doctrine is public. Verdicts are on-chain. Money ` +
      `moves only through arithmetic.`,
    columns: [
      {
        title: "The court",
        links: [
          { label: "How it works", href: "#how-it-works" },
          { label: "Verdicts", href: "#verdicts" },
          { label: "Architecture", href: "#architecture" },
          { label: "Use cases", href: "#use-cases" },
          { label: "Doctrine library", href: "#doctrine" },
          { label: "FAQ", href: "#faq" },
        ],
      },
      {
        title: "On-chain",
        links: [
          { label: `court · ${shortAddress(ADDRESSES.court)}`, href: explorerContract(ADDRESSES.court) },
          { label: `registry · ${shortAddress(ADDRESSES.policyRegistry)}`, href: explorerContract(ADDRESSES.policyRegistry) },
          { label: `reputation · ${shortAddress(ADDRESSES.reputation)}`, href: explorerContract(ADDRESSES.reputation) },
          { label: "Studio explorer", href: "https://explorer-studio.genlayer.com" },
        ],
      },
      {
        title: "Source",
        links: [
          { label: "GitHub repository", href: REPO },
          { label: "Court contract", href: `${REPO}/blob/main/contracts/contract.py` },
          { label: "PolicyRegistry", href: `${REPO}/blob/main/contracts/policy_registry.py` },
          { label: "Reputation", href: `${REPO}/blob/main/contracts/reputation.py` },
          { label: "Seeded doctrine", href: `${REPO}/blob/main/contracts/policies.py` },
          { label: "Test suite", href: `${REPO}/tree/main/tests` },
        ],
      },
      {
        title: "Learn",
        links: [
          { label: "GenLayer docs", href: "https://docs.genlayer.com/" },
          { label: "SDK reference", href: "https://sdk.genlayer.com/main/api/genlayer.html" },
          { label: "GenLayer Studio", href: "https://studio.genlayer.com/" },
          { label: "Builder Portal", href: "https://portal.genlayer.foundation/" },
          { label: "Whitepaper", href: "https://www.genlayer.com/whitepaper" },
        ],
      },
    ],
    bottom: [
      `Deployed on GenLayer ${CHAIN_NAME}.`,
      "Intelligent Contract in Python, adjudicated under Optimistic Democracy.",
      "Nothing on this page is legal advice.",
    ],
  },
  vi: {
    brandDesc:
      `Toa an thong minh cho tranh chap sao chep. Xay tren GenLayer ` +
      `${CHAIN_NAME}. An le cong khai. Phan quyet tren chuoi. Tien ` +
      `chi chuyen bang so hoc.`,
    columns: [
      {
        title: "Toa an",
        links: [
          { label: "Cach hoat dong", href: "#how-it-works" },
          { label: "Phan quyet", href: "#verdicts" },
          { label: "Kien truc", href: "#architecture" },
          { label: "Ung dung", href: "#use-cases" },
          { label: "Thu vien an le", href: "#doctrine" },
          { label: "Hoi dap", href: "#faq" },
        ],
      },
      {
        title: "Tren chuoi",
        links: [
          { label: `court · ${shortAddress(ADDRESSES.court)}`, href: explorerContract(ADDRESSES.court) },
          { label: `registry · ${shortAddress(ADDRESSES.policyRegistry)}`, href: explorerContract(ADDRESSES.policyRegistry) },
          { label: `reputation · ${shortAddress(ADDRESSES.reputation)}`, href: explorerContract(ADDRESSES.reputation) },
          { label: "Studio explorer", href: "https://explorer-studio.genlayer.com" },
        ],
      },
      {
        title: "Ma nguon",
        links: [
          { label: "GitHub repository", href: REPO },
          { label: "Court contract", href: `${REPO}/blob/main/contracts/contract.py` },
          { label: "PolicyRegistry", href: `${REPO}/blob/main/contracts/policy_registry.py` },
          { label: "Reputation", href: `${REPO}/blob/main/contracts/reputation.py` },
          { label: "Seeded doctrine", href: `${REPO}/blob/main/contracts/policies.py` },
          { label: "Test suite", href: `${REPO}/tree/main/tests` },
        ],
      },
      {
        title: "Tim hieu",
        links: [
          { label: "GenLayer docs", href: "https://docs.genlayer.com/" },
          { label: "SDK reference", href: "https://sdk.genlayer.com/main/api/genlayer.html" },
          { label: "GenLayer Studio", href: "https://studio.genlayer.com/" },
          { label: "Builder Portal", href: "https://portal.genlayer.foundation/" },
          { label: "Whitepaper", href: "https://www.genlayer.com/whitepaper" },
        ],
      },
    ],
    bottom: [
      `Deploy tren GenLayer ${CHAIN_NAME}.`,
      "Intelligent Contract bang Python, xet xu duoi Optimistic Democracy.",
      "Khong co noi dung nao tren trang nay la tu van phap ly.",
    ],
  },
};

export function Footer() {
  const t = usePick(CONTENT);
  return (
    <footer id="footer" className="site-footer">
      <div className="section-inner footer-inner">
        <div className="footer-brand">
          <div className="footer-brand-mark" aria-hidden="true">
            <span>&sect;</span>
          </div>
          <div>
            <h3>Prior Art Court</h3>
            <p>{t.brandDesc}</p>
          </div>
        </div>

        <div className="footer-columns">
          {t.columns.map((col) => (
            <div key={col.title} className="footer-column">
              <h4>{col.title}</h4>
              <ul>
                {col.links.map((link) => {
                  const external = link.href.startsWith("http");
                  return (
                    <li key={link.href + link.label}>
                      <a
                        href={link.href}
                        target={external ? "_blank" : undefined}
                        rel={external ? "noreferrer" : undefined}
                      >
                        {link.label}
                      </a>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>

        <div className="footer-bottom">
          {t.bottom.map((line) => (
            <span key={line}>{line}</span>
          ))}
        </div>
      </div>
    </footer>
  );
}
