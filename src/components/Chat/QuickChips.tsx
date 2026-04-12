import React from "react";
import { motion } from "framer-motion";
import { Coffee, Dumbbell, Moon, Info, ImageIcon, Trash2, Droplets, Ruler, type LucideIcon } from "lucide-react";

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
        backgroundColor: color ? `${color}15` : 'var(--surface2)', 
        borderColor: color ? `${color}30` : 'var(--border)',
      }}
      suppressHydrationWarning
    >
      <Icon className="w-3.5 h-3.5" style={{ color }} strokeWidth={2.5} />
      <span style={{ color: color || 'inherit', filter: 'brightness(0.8)' }}>
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
        color="var(--nutri-green)"
        onClick={() => onSelect("Log my breakfast")}
      />
      <QuickChip
        icon={Droplets}
        label="Water"
        color="var(--iq-blue-light)"
        onClick={() => onSelect("Log 500ml of water")}
      />
      <QuickChip
        icon={Dumbbell}
        label="Workout"
        color="var(--energy-coral)"
        onClick={() => onSelect("Record my training session")}
      />
      <QuickChip
        icon={Moon}
        label="Sleep"
        color="var(--iq-blue-light)"
        onClick={() => onSelect("Show my sleep data")}
      />
      <QuickChip
        icon={Ruler}
        label="Weight"
        color="var(--burn-amber)"
        onClick={() => onSelect("Update my weight measurement")}
      />
      <QuickChip
        icon={Info}
        label="Stats"
        color="var(--nutri-green)"
        onClick={() => onSelect("How are my stats for today?")}
      />
      <QuickChip
        icon={ImageIcon}
        label="Summary"
        color="var(--iq-blue)"
        onClick={() => onSelect("Give me a weekly summary")}
      />
      <QuickChip
        icon={Trash2}
        label="Delete"
        color="var(--red)"
        onClick={() => onSelect("Delete my last food log")}
      />
    </div>
  );
}
