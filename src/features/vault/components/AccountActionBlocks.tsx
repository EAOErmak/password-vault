type AccountActionBlocksProps = {
  onOpenCreateAccount: () => void;
  onOpenCreatePlatform: () => void;
};

export function AccountActionBlocks({
  onOpenCreateAccount,
  onOpenCreatePlatform,
}: AccountActionBlocksProps) {
  return (
    <div className="vault-platform-filter">
      <div className="vault-platform-filter__header">
        <div>
          <h2>Blocks</h2>
          <p>Quick actions to add items to your vault.</p>
        </div>
      </div>
      <div className="actions" style={{ marginBottom: "20px" }}>
        <button
          className="button-primary"
          onClick={onOpenCreateAccount}
          type="button"
        >
          New Account
        </button>
        <button
          className="button-primary"
          onClick={onOpenCreatePlatform}
          type="button"
        >
          New Platform
        </button>
      </div>
    </div>
  );
}
