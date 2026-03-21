import clsx from "clsx";
import { useCallback, useEffect, useState } from "react";
import styles from "./DropdownMenu.module.css";

interface DropdownMenuProps {
  className?: string;
  triggerClassName?: string;
  trigger: React.ReactNode;
  children: React.ReactNode;
}

export function DropdownMenu({
  className,
  trigger,
  triggerClassName,
  children,
}: DropdownMenuProps) {
  const [isOpen, setIsOpen] = useState(false);

  const handleClick = useCallback(() => {
    setIsOpen(!isOpen);
  }, [isOpen]);

  // Close on click outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (!(e.target as Element).closest("[data-dropdown-menu]")) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div
      className={clsx(styles.container, className, isOpen && styles.open)}
      onClick={handleClick}
      data-dropdown-menu
    >
      <div className={clsx(styles.trigger, triggerClassName)}>{trigger}</div>

      {isOpen && <div className={styles.menu}>{children}</div>}
    </div>
  );
}
