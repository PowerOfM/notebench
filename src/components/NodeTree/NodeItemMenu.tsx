import { CircleEllipsis } from "lucide-react";
import { DropdownMenu } from "../DropdownMenu/DropdownMenu";
import { DropdownMenuItem } from "../DropdownMenu/DropdownMenuItem";
import styles from "./NodeItemMenu.module.css";

interface NodeItemMenuProps {
  onDelete: (e: React.MouseEvent) => void;
}

export function NodeItemMenu({ onDelete }: NodeItemMenuProps) {
  return (
    <DropdownMenu
      className={styles.menu}
      triggerClassName={styles.trigger}
      trigger={<CircleEllipsis size={16} color="var(--color-text-faint)" />}
    >
      <DropdownMenuItem onClick={onDelete}>Delete</DropdownMenuItem>
    </DropdownMenu>
  );
}
