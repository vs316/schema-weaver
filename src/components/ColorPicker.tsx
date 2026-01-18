import { useState, useEffect, useCallback } from "react";
import { Palette, Pipette } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface ColorPickerProps {
  color: string;
  onChange: (color: string) => void;
  onBlur?: () => void;
  disabled?: boolean;
  isDarkMode?: boolean;
}

// Parse any color format to RGBA
function parseColor(color: string): { r: number; g: number; b: number; a: number } {
  // Default fallback
  const fallback = { r: 100, g: 116, b: 139, a: 1 };
  
  if (!color) return fallback;
  
  // Handle hex
  if (color.startsWith('#')) {
    let hex = color.slice(1);
    // Handle 8-digit hex with alpha
    if (hex.length === 8) {
      const r = parseInt(hex.slice(0, 2), 16);
      const g = parseInt(hex.slice(2, 4), 16);
      const b = parseInt(hex.slice(4, 6), 16);
      const a = parseInt(hex.slice(6, 8), 16) / 255;
      return { r, g, b, a };
    }
    // Handle 6-digit hex
    if (hex.length === 6) {
      const r = parseInt(hex.slice(0, 2), 16);
      const g = parseInt(hex.slice(2, 4), 16);
      const b = parseInt(hex.slice(4, 6), 16);
      return { r, g, b, a: 1 };
    }
    // Handle 3-digit hex
    if (hex.length === 3) {
      const r = parseInt(hex[0] + hex[0], 16);
      const g = parseInt(hex[1] + hex[1], 16);
      const b = parseInt(hex[2] + hex[2], 16);
      return { r, g, b, a: 1 };
    }
    return fallback;
  }
  
  // Handle rgba/rgb
  const rgbaMatch = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
  if (rgbaMatch) {
    return {
      r: parseInt(rgbaMatch[1]),
      g: parseInt(rgbaMatch[2]),
      b: parseInt(rgbaMatch[3]),
      a: rgbaMatch[4] !== undefined ? parseFloat(rgbaMatch[4]) : 1
    };
  }
  
  return fallback;
}

// Convert RGBA to hex with alpha
function rgbaToHex(r: number, g: number, b: number, a: number): string {
  const toHex = (n: number) => Math.round(n).toString(16).padStart(2, '0');
  if (a < 1) {
    return `#${toHex(r)}${toHex(g)}${toHex(b)}${toHex(a * 255)}`;
  }
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

// Convert RGBA to CSS string
function rgbaToString(r: number, g: number, b: number, a: number): string {
  if (a < 1) {
    return `rgba(${r}, ${g}, ${b}, ${a.toFixed(2)})`;
  }
  return rgbaToHex(r, g, b, a);
}

const PRESET_COLORS = [
  "#64748b", // slate
  "#60a5fa", // blue
  "#34d399", // emerald
  "#f59e0b", // amber
  "#a78bfa", // violet
  "#ef4444", // red
  "#ec4899", // pink
  "#06b6d4", // cyan
  "#84cc16", // lime
  "#f97316", // orange
];

export function ColorPicker({ color, onChange, onBlur, disabled, isDarkMode = true }: ColorPickerProps) {
  const parsed = parseColor(color);
  const [opacity, setOpacity] = useState(parsed.a * 100);
  const [hexInput, setHexInput] = useState(color || "#64748b");
  const [showAdvanced, setShowAdvanced] = useState(false);
  
  useEffect(() => {
    const newParsed = parseColor(color);
    setOpacity(newParsed.a * 100);
    setHexInput(color || "#64748b");
  }, [color]);
  
  const handleOpacityChange = useCallback((newOpacity: number) => {
    setOpacity(newOpacity);
    const { r, g, b } = parseColor(color);
    const newColor = rgbaToString(r, g, b, newOpacity / 100);
    onChange(newColor);
  }, [color, onChange]);
  
  const handleColorChange = useCallback((newHex: string) => {
    const { r, g, b } = parseColor(newHex);
    const newColor = rgbaToString(r, g, b, opacity / 100);
    onChange(newColor);
    setHexInput(newColor);
  }, [opacity, onChange]);
  
  const handleHexInputChange = useCallback((value: string) => {
    setHexInput(value);
    // Only apply if valid format
    if (/^#[0-9A-Fa-f]{3,8}$/.test(value) || /^rgba?\([\d,.\s]+\)$/.test(value)) {
      onChange(value);
    }
  }, [onChange]);
  
  return (
    <div className="space-y-3">
      {/* Current Color Preview + Quick Picker */}
      <div className="flex items-center gap-3">
        {/* Current color swatch */}
        <div
          className="w-10 h-10 rounded-xl border-2 shadow-inner flex-shrink-0 transition-all duration-200 relative overflow-hidden"
          style={{ 
            borderColor: isDarkMode ? 'hsl(217 33% 25%)' : 'hsl(214 32% 85%)',
          }}
          title="Current color"
        >
          {/* Checkerboard pattern for transparency */}
          <div 
            className="absolute inset-0" 
            style={{ 
              backgroundImage: 'linear-gradient(45deg, #808080 25%, transparent 25%), linear-gradient(-45deg, #808080 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #808080 75%), linear-gradient(-45deg, transparent 75%, #808080 75%)',
              backgroundSize: '8px 8px',
              backgroundPosition: '0 0, 0 4px, 4px -4px, -4px 0px'
            }}
          />
          <div 
            className="absolute inset-0"
            style={{ background: color || "#64748b" }}
          />
        </div>
        
        {/* Preset colors */}
        <div className="flex items-center gap-1.5 flex-wrap flex-1">
          {PRESET_COLORS.slice(0, 8).map((c) => (
            <motion.button
              key={c}
              whileHover={{ scale: 1.15 }}
              whileTap={{ scale: 0.95 }}
              className={`w-6 h-6 rounded-lg border transition-all shadow-sm ${
                disabled ? "opacity-50 cursor-not-allowed" : "hover:shadow-md"
              } ${parseColor(color).r === parseColor(c).r && parseColor(color).g === parseColor(c).g && parseColor(color).b === parseColor(c).b 
                  ? "ring-2 ring-offset-1 ring-indigo-500" : ""}`}
              style={{ 
                background: c,
                borderColor: isDarkMode ? 'hsl(217 33% 20%)' : 'hsl(214 32% 90%)'
              }}
              onClick={() => !disabled && handleColorChange(c)}
              disabled={disabled}
              title={c}
            />
          ))}
        </div>
      </div>
      
      {/* Opacity Slider */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className={`text-[10px] font-bold uppercase tracking-wide ${isDarkMode ? "text-slate-400" : "text-slate-600"}`}>
            Opacity
          </label>
          <span className={`text-[11px] font-mono font-semibold ${isDarkMode ? "text-indigo-400" : "text-indigo-600"}`}>
            {Math.round(opacity)}%
          </span>
        </div>
        <div className="relative h-3 rounded-full overflow-hidden" style={{
          background: isDarkMode 
            ? 'linear-gradient(45deg, #334155 25%, transparent 25%), linear-gradient(-45deg, #334155 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #334155 75%), linear-gradient(-45deg, transparent 75%, #334155 75%)'
            : 'linear-gradient(45deg, #cbd5e1 25%, transparent 25%), linear-gradient(-45deg, #cbd5e1 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #cbd5e1 75%), linear-gradient(-45deg, transparent 75%, #cbd5e1 75%)',
          backgroundSize: '8px 8px',
          backgroundPosition: '0 0, 0 4px, 4px -4px, -4px 0px'
        }}>
          <div 
            className="absolute inset-0 rounded-full"
            style={{
              background: `linear-gradient(to right, transparent, ${parseColor(color).r + ',' + parseColor(color).g + ',' + parseColor(color).b} 100%)`,
            }}
          />
          <input
            type="range"
            min="0"
            max="100"
            step="1"
            value={opacity}
            onChange={(e) => handleOpacityChange(Number(e.target.value))}
            onMouseUp={() => onBlur?.()}
            disabled={disabled}
            className={`absolute inset-0 w-full h-full opacity-0 cursor-pointer ${disabled ? "cursor-not-allowed" : ""}`}
            style={{ margin: 0 }}
          />
          {/* Slider thumb visual */}
          <motion.div 
            className="absolute top-0 bottom-0 w-4 h-4 -mt-0.5 rounded-full bg-white shadow-lg border-2 border-indigo-500"
            style={{ 
              left: `calc(${opacity}% - 8px)`,
            }}
            animate={{ left: `calc(${opacity}% - 8px)` }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
          />
        </div>
      </div>
      
      {/* Advanced toggle */}
      <button
        onClick={() => setShowAdvanced(!showAdvanced)}
        className={`flex items-center gap-2 text-[10px] font-bold uppercase tracking-wide transition-colors ${
          isDarkMode ? "text-slate-500 hover:text-slate-300" : "text-slate-500 hover:text-slate-700"
        }`}
      >
        <Pipette size={12} />
        {showAdvanced ? "Hide" : "Show"} advanced
      </button>
      
      {/* Advanced options */}
      <AnimatePresence>
        {showAdvanced && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="space-y-3 overflow-hidden"
          >
            {/* Native color picker + hex input */}
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={rgbaToHex(parseColor(color).r, parseColor(color).g, parseColor(color).b, 1)}
                onChange={(e) => handleColorChange(e.target.value)}
                onBlur={onBlur}
                disabled={disabled}
                className={`w-10 h-10 rounded-lg cursor-pointer border-2 transition-all ${
                  disabled ? "opacity-50 cursor-not-allowed" : "hover:scale-105"
                }`}
                style={{ 
                  padding: 0,
                  borderColor: isDarkMode ? 'hsl(217 33% 25%)' : 'hsl(214 32% 85%)'
                }}
                title="Open color picker"
              />
              <div className="flex-1">
                <input
                  type="text"
                  value={hexInput}
                  onChange={(e) => handleHexInputChange(e.target.value)}
                  onBlur={onBlur}
                  disabled={disabled}
                  placeholder="#hex or rgba(r,g,b,a)"
                  className={`w-full px-3 py-2 rounded-lg text-xs font-mono border outline-none transition-all ${
                    isDarkMode 
                      ? "bg-slate-950 border-slate-700 text-slate-300 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20" 
                      : "bg-white border-slate-300 text-slate-700 focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400/20"
                  } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
                />
              </div>
              <Palette size={14} className="opacity-40 flex-shrink-0" />
            </div>
            
            {/* More preset colors */}
            <div className="flex flex-wrap gap-1.5">
              {PRESET_COLORS.slice(8).map((c) => (
                <motion.button
                  key={c}
                  whileHover={{ scale: 1.15 }}
                  whileTap={{ scale: 0.95 }}
                  className={`w-6 h-6 rounded-lg border transition-all shadow-sm ${
                    disabled ? "opacity-50 cursor-not-allowed" : "hover:shadow-md"
                  }`}
                  style={{ 
                    background: c,
                    borderColor: isDarkMode ? 'hsl(217 33% 20%)' : 'hsl(214 32% 90%)'
                  }}
                  onClick={() => !disabled && handleColorChange(c)}
                  disabled={disabled}
                  title={c}
                />
              ))}
            </div>
            
            <p className={`text-[9px] ${isDarkMode ? "text-slate-600" : "text-slate-400"}`}>
              Tip: Use rgba(r,g,b,a) format for precise opacity control
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
