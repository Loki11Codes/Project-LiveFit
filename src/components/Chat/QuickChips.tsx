import React from "react";
import { motion } from "framer-motion";
import { Coffee, Dumbbell, Moon, Info, ImageIcon, Trash2, type LucideIcon } from "lucide-react";

interface QuickChipProps {
  readonly icon: LucideIcon;
  readonly label: string;
  readonly color?: string;
  readonly onClick: () => void;
}

export function QuickChip({ icon: Icon, label, color, onClick }: QuickChipProps) {
  return (
    <motion.button
      type="button"
      whileHover={{ scale: 1.02, translateY: -1 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className="chat-quick-chip"
      style={{ 
        backgroundColor: color ? `${color}15` : undefined, // 15 = ~8% opacity hex
        borderColor: color ? `${color}30` : undefined,
      }}
      suppressHydrationWarning
    >
      <Icon className="w-3.5 h-3.5" style={{ color }} strokeWidth={2.5} />
      <span style={{ color: color ? color : 'inherit', filter: 'brightness(0.8)' }}>
        {label}
      </span>
    </motion.button>
  );
}

interface QuickChipsProps {
  readonly onSelect: (text: string) => void;
}

export function QuickChips({ onSelect }: QuickChipsProps) {
  return (
    <div className="chat-quick-chips-row no-scrollbar">
      <QuickChip
        icon={Coffee}
        label="Breakfast"
        color="#e6ac50"
        onClick={() => onSelect("Log my breakfast")}
      />
      <QuickChip
        icon={Dumbbell}
        label="Workout"
        color="#c0392b"
        onClick={() => onSelect("Record my training session")}
      />
      <QuickChip
        icon={Moon}
        label="Sleep"
        color="#6b7ea8"
        onClick={() => onSelect("Show my sleep data")}
      />
      <QuickChip
        icon={Info}
        label="Protein left?"
        color="#4db382"
        onClick={() => onSelect("How is my protein intake?")}
      />
      <QuickChip
        icon={ImageIcon}
        label="Summary"
        color="#7b5ea7"
        onClick={() => onSelect("Give me a summary")}
      />
      <QuickChip
        icon={Trash2}
        label="Delete Log"
        color="#e74c3c"
        onClick={() => onSelect("Delete my last food log from today")}
      />
    </div>
  );
}
