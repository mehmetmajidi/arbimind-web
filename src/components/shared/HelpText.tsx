"use client";

import { colors } from "./designSystem";
import Tooltip from "./Tooltip";

interface HelpTextProps {
    text: string;
    tooltip?: string;
    compact?: boolean;
}

export default function HelpText({ text, tooltip, compact = false }: HelpTextProps) {
    return (
        <div
            style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                fontSize: compact ? "12px" : "13px",
                color: colors.secondaryText,
                fontStyle: "italic",
            }}
        >
            <span>{text}</span>
            {tooltip && <Tooltip content={tooltip} icon={true} />}
        </div>
    );
}

