import { useCallback } from "react";
import styles from "./DropdownMenuItem.module.css";

interface DropdownMenuItemProps {
  children: React.ReactNode;
  onClick: (e: React.MouseEvent<HTMLDivElement>) => void;
}

export function DropdownMenuItem({ children, onClick }: DropdownMenuItemProps) {
  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      onClick(e);
    },
    [onClick],
  );

  return (
    <div className={styles.menuItem} onClick={handleClick}>
      {children}
    </div>
  );
}
