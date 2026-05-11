import { useEffect, type MouseEvent, ReactNode } from "react";

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
  useEffect(() => {
    const originalStyle = window.getComputedStyle(document.body).overflow;
    document.body.style.overflow = "hidden";
    
    return () => {
      document.body.style.overflow = originalStyle;
    };
  }, []);
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
      <div style={{ height: "24px", flexShrink: 0 }} />
    </div>
  );
}
