import type { MouseEvent, ReactNode } from "react";

type DialogBackdropProps = {
  children: ReactNode;
  disabled?: boolean;
  onClose: () => void;
};

export function DialogBackdrop({
  children,
  disabled = false,
  onClose,
}: DialogBackdropProps) {
  const handleMouseDown = (event: MouseEvent<HTMLDivElement>) => {
    if (disabled) {
      return;
    }

    if (event.target === event.currentTarget) {
      onClose();
    }
  };

  return (
    <div className="dialog-backdrop" onMouseDown={handleMouseDown} role="presentation">
      {children}
    </div>
  );
}
