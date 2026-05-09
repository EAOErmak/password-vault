import type { ReactNode } from "react";

type VaultLayoutProps = {
  header: ReactNode;
  sidebar?: ReactNode;
  main: ReactNode;
  details?: ReactNode;
};

export function VaultLayout({
  header,
  sidebar,
  main,
  details,
}: VaultLayoutProps) {
  const gridClassName =
    sidebar && details
      ? "vault-grid"
      : sidebar
        ? "vault-grid vault-grid--sidebar-main"
        : details
          ? "vault-grid vault-grid--main-details"
          : "vault-grid vault-grid--main-only";

  return (
    <main className="vault-screen" data-tauri-drag-region>
      <div className="vault-layout">
        {header}
        <div className={gridClassName}>
          {sidebar ? (
            <aside className="vault-column vault-column--sidebar">{sidebar}</aside>
          ) : null}
          <section className="vault-column vault-column--main">{main}</section>
          {details ? (
            <aside className="vault-column vault-column--details">{details}</aside>
          ) : null}
        </div>
      </div>
    </main>
  );
}
