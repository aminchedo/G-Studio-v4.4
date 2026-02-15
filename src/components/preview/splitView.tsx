/**
 * SplitView and related preview layout components
 */
import React from "react";

type Orientation = "horizontal" | "vertical";

interface SplitViewProps {
  orientation: Orientation;
  ratio: number;
  onRatioChange: (ratio: number) => void;
  children: React.ReactNode;
}

export const SplitView: React.FC<SplitViewProps> = ({
  orientation,
  ratio,
  onRatioChange: _onRatioChange,
  children,
}) => {
  const style: React.CSSProperties =
    orientation === "horizontal"
      ? { display: "flex", flexDirection: "row", flex: 1, minHeight: 0 }
      : { display: "flex", flexDirection: "column", flex: 1, minHeight: 0 };
  return (
    <div style={style} className="split-view">
      {children}
    </div>
  );
};

interface OrientationToggleProps {
  orientation: Orientation;
  onChange: (orientation: Orientation) => void;
}

export const OrientationToggle: React.FC<OrientationToggleProps> = ({
  orientation,
  onChange,
}) => (
  <button
    type="button"
    onClick={() =>
      onChange(orientation === "horizontal" ? "vertical" : "horizontal")
    }
    className="preview-control-btn"
  >
    {orientation === "horizontal" ? "Vertical" : "Horizontal"}
  </button>
);

export const SplitRatioIndicator: React.FC<{ ratio: number }> = ({ ratio }) => (
  <span className="text-xs text-textMuted">{Math.round(ratio * 100)}%</span>
);

interface RatioPresetsProps {
  onSelect: (ratio: number) => void;
}

export const RatioPresets: React.FC<RatioPresetsProps> = ({ onSelect }) => (
  <div className="flex gap-1">
    {[0.25, 0.5, 0.75].map((r) => (
      <button
        key={r}
        type="button"
        onClick={() => onSelect(r)}
        className="preview-control-btn"
      >
        {Math.round(r * 100)}%
      </button>
    ))}
  </div>
);
