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
    const handleGlobalWheel = (event: WheelEvent) => {
      const target = event.target as HTMLElement;
      // Если мышь над панелью заголовка, не перехватываем скролл
      if (target.closest(".custom-titlebar")) {
        return;
      }

      const scrollableDialog = document.querySelector(".dialog-card--scrollable");
      if (scrollableDialog) {
        event.preventDefault();
        scrollableDialog.scrollTop += event.deltaY * 0.7;
      }
    };

    window.addEventListener("wheel", handleGlobalWheel, { passive: false, capture: true });

    // Блокируем скролл body
    const originalStyle = window.getComputedStyle(document.body).overflow;
    document.body.style.overflow = "hidden";

    return () => {
      window.removeEventListener("wheel", handleGlobalWheel as any, { capture: true });
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
    </div>
  );
}
