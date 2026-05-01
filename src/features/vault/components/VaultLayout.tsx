import type { ReactNode } from "react";

type VaultLayoutProps = {
  header: ReactNode;
  sidebar: ReactNode;
  main: ReactNode;
  details: ReactNode;
};

export function VaultLayout({
  header,
  sidebar,
  main,
  details,
}: VaultLayoutProps) {
  return (
    <main className="vault-screen">
      <div className="vault-layout">
        {header}
        <div className="vault-grid">
          <aside className="vault-column vault-column--sidebar">{sidebar}</aside>
          <section className="vault-column vault-column--main">{main}</section>
          <aside className="vault-column vault-column--details">{details}</aside>
        </div>
      </div>
    </main>
  );
}
