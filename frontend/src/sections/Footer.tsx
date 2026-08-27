import { ADDRESSES, CHAIN_NAME, explorerContract } from "../lib/chain";
import { shortAddress } from "../lib/types";

const REPO = "https://github.com/phu1271997/prior-art-court";

const COLUMNS: Array<{
  title: string;
  links: Array<{ label: string; href: string; muted?: boolean }>;
}> = [
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
      {
        label: `court · ${shortAddress(ADDRESSES.court)}`,
        href: explorerContract(ADDRESSES.court),
      },
      {
        label: `registry · ${shortAddress(ADDRESSES.policyRegistry)}`,
        href: explorerContract(ADDRESSES.policyRegistry),
      },
      {
        label: `reputation · ${shortAddress(ADDRESSES.reputation)}`,
        href: explorerContract(ADDRESSES.reputation),
      },
      {
        label: "Studio explorer",
        href: "https://explorer-studio.genlayer.com",
      },
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
];

export function Footer() {
  return (
    <footer id="footer" className="site-footer">
      <div className="section-inner footer-inner">
        <div className="footer-brand">
          <div className="footer-brand-mark" aria-hidden="true">
            <span>§</span>
          </div>
          <div>
            <h3>Prior Art Court</h3>
            <p>
              An intelligent court for copying disputes. Built on GenLayer{" "}
              {CHAIN_NAME}. Doctrine is public. Verdicts are on-chain. Money
              moves only through arithmetic.
            </p>
          </div>
        </div>

        <div className="footer-columns">
          {COLUMNS.map((col) => (
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
          <span>Deployed on GenLayer {CHAIN_NAME}.</span>
          <span>
            Intelligent Contract in Python, adjudicated under Optimistic
            Democracy.
          </span>
          <span>Nothing on this page is legal advice.</span>
        </div>
      </div>
    </footer>
  );
}
