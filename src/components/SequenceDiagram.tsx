import React, { useState } from 'react';
import { motion } from 'framer-motion';
import type { SequenceParticipant, SequenceMessage } from '../types/uml';
import { User, Box, Database, Shield, Server } from 'lucide-react';

// Participant component
interface ParticipantProps {
  participant: SequenceParticipant;
  isSelected: boolean;
  isDarkMode: boolean;
  diagramHeight: number;
  onSelect: () => void;
  onDragStart: (e: React.MouseEvent) => void;
}

const PARTICIPANT_ICONS: Record<SequenceParticipant['type'], React.ReactNode> = {
  actor: <User size={20} />,
  object: <Box size={20} />,
  boundary: <Shield size={20} />,
  control: <Server size={20} />,
  entity: <Database size={20} />,
};

export function SequenceParticipantNode({
  participant,
  isSelected,
  isDarkMode,
  diagramHeight,
  onSelect,
  onDragStart,
}: ParticipantProps) {
  return (
    <motion.div
      initial={{ scale: 0.95, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      className="absolute select-none"
      style={{
        left: participant.x,
        top: 20,
        zIndex: isSelected ? 100 : 10,
      }}
      onClick={(e) => {
        e.stopPropagation();
        onSelect();
      }}
      onMouseDown={onDragStart}
    >
      {/* Participant head */}
      <div
        className={`flex flex-col items-center px-4 py-3 rounded-lg border-2 transition-all duration-200 ${
          isSelected ? 'ring-2 ring-offset-2 ring-indigo-500' : ''
        }`}
        style={{
          background: isDarkMode ? 'hsl(222 47% 11%)' : 'hsl(0 0% 100%)',
          borderColor: isSelected ? 'hsl(239 84% 67%)' : isDarkMode ? 'hsl(217 33% 25%)' : 'hsl(220 13% 80%)',
          minWidth: 80,
        }}
      >
        <div
          className="mb-2"
          style={{ color: isDarkMode ? 'hsl(215 20% 65%)' : 'hsl(215 16% 47%)' }}
        >
          {PARTICIPANT_ICONS[participant.type]}
        </div>
        <span
          className="text-xs font-semibold text-center whitespace-nowrap"
          style={{ color: isDarkMode ? 'hsl(210 40% 98%)' : 'hsl(222 47% 11%)' }}
        >
          {participant.name}
        </span>
      </div>

      {/* Lifeline */}
      <div
        className="absolute left-1/2 -translate-x-1/2"
        style={{
          top: 70,
          height: Math.max(200, diagramHeight - 100),
          width: 2,
          background: isDarkMode ? 'hsl(217 33% 25%)' : 'hsl(220 13% 80%)',
          borderStyle: 'dashed',
        }}
      />
    </motion.div>
  );
}

// Message arrow component
interface MessageArrowProps {
  message: SequenceMessage;
  fromParticipant: SequenceParticipant | undefined;
  toParticipant: SequenceParticipant | undefined;
  isDarkMode: boolean;
  isSelected: boolean;
  baseY: number;
  onSelect: () => void;
}

export function SequenceMessageArrow({
  message,
  fromParticipant,
  toParticipant,
  isDarkMode,
  isSelected,
  baseY,
  onSelect,
}: MessageArrowProps) {
  if (!fromParticipant || !toParticipant) return null;

  const fromX = fromParticipant.x + 40;
  const toX = toParticipant.x + 40;
  const y = baseY + message.order * 50;
  const isReversed = fromX > toX;
  const arrowWidth = Math.abs(toX - fromX);
  const startX = Math.min(fromX, toX);

  const getLineStyle = () => {
    switch (message.type) {
      case 'async':
        return { strokeDasharray: '5,5' };
      case 'return':
        return { strokeDasharray: '3,3' };
      default:
        return {};
    }
  };

  const lineColor = isSelected ? 'hsl(239 84% 67%)' : isDarkMode ? 'hsl(215 20% 65%)' : 'hsl(215 16% 47%)';

  return (
    <g onClick={onSelect} className="cursor-pointer">
      {/* Arrow line */}
      <line
        x1={fromX}
        y1={y}
        x2={toX}
        y2={y}
        stroke={lineColor}
        strokeWidth={isSelected ? 2 : 1.5}
        {...getLineStyle()}
      />

      {/* Arrowhead */}
      <polygon
        points={
          isReversed
            ? `${toX},${y} ${toX + 8},${y - 4} ${toX + 8},${y + 4}`
            : `${toX},${y} ${toX - 8},${y - 4} ${toX - 8},${y + 4}`
        }
        fill={message.type === 'async' ? 'none' : lineColor}
        stroke={lineColor}
        strokeWidth={1}
      />

      {/* Message label */}
      <text
        x={startX + arrowWidth / 2}
        y={y - 8}
        textAnchor="middle"
        className="text-[11px] font-medium"
        fill={isDarkMode ? 'hsl(210 40% 98%)' : 'hsl(222 47% 11%)'}
      >
        {message.label}
      </text>
    </g>
  );
}

// Sequence Diagram Editor Panel
interface SequenceEditorProps {
  participants: SequenceParticipant[];
  messages: SequenceMessage[];
  selectedParticipantId: string | null;
  selectedMessageId: string | null;
  isLocked: boolean;
  isDarkMode: boolean;
  onAddParticipant: (type: SequenceParticipant['type']) => void;
  onUpdateParticipant: (id: string, updates: Partial<SequenceParticipant>) => void;
  onDeleteParticipant: (id: string) => void;
  onAddMessage: (fromId: string, toId: string, label: string, type: SequenceMessage['type']) => void;
  onUpdateMessage: (id: string, updates: Partial<SequenceMessage>) => void;
  onDeleteMessage: (id: string) => void;
}

export function SequenceEditor({
  participants,
  messages,
  selectedParticipantId,
  selectedMessageId,
  isLocked,
  isDarkMode: _isDarkMode,
  onAddParticipant,
  onUpdateParticipant,
  onDeleteParticipant,
  onAddMessage,
  onUpdateMessage,
  onDeleteMessage,
}: SequenceEditorProps) {
  const [newMessageFrom, setNewMessageFrom] = useState<string>('');
  const [newMessageTo, setNewMessageTo] = useState<string>('');
  const [newMessageLabel, setNewMessageLabel] = useState('');
  const [newMessageType, setNewMessageType] = useState<SequenceMessage['type']>('sync');

  const selectedParticipant = selectedParticipantId ? participants.find(p => p.id === selectedParticipantId) : null;
  const selectedMessage = selectedMessageId ? messages.find(m => m.id === selectedMessageId) : null;

  const participantTypes: SequenceParticipant['type'][] = ['actor', 'object', 'boundary', 'control', 'entity'];

  return (
    <div className="space-y-4">
      {/* Add Participant Section */}
      <div className="space-y-2">
        <label className="text-xs font-medium" style={{ color: 'hsl(var(--muted-foreground))' }}>
          Add Participant
        </label>
        <div className="flex flex-wrap gap-2">
          {participantTypes.map((type) => (
            <button
              key={type}
              onClick={() => onAddParticipant(type)}
              disabled={isLocked}
              className="flex items-center gap-1 px-2 py-1.5 rounded-lg border text-xs font-medium transition-all hover:scale-105 disabled:opacity-50"
              style={{
                background: 'hsl(var(--background))',
                borderColor: 'hsl(var(--border))',
                color: 'hsl(var(--foreground))',
              }}
            >
              {PARTICIPANT_ICONS[type]}
              <span className="capitalize">{type}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Selected Participant Editor */}
      {selectedParticipant && (
        <div className="space-y-3 p-3 rounded-lg border" style={{ borderColor: 'hsl(var(--border))' }}>
          <h4 className="text-sm font-semibold" style={{ color: 'hsl(var(--foreground))' }}>
            Edit Participant
          </h4>
          <div className="space-y-2">
            <label className="text-xs font-medium" style={{ color: 'hsl(var(--muted-foreground))' }}>
              Name
            </label>
            <input
              type="text"
              value={selectedParticipant.name}
              onChange={(e) => onUpdateParticipant(selectedParticipant.id, { name: e.target.value })}
              disabled={isLocked}
              className="w-full px-3 py-2 rounded-lg border text-sm disabled:opacity-50"
              style={{
                background: 'hsl(var(--background))',
                borderColor: 'hsl(var(--border))',
                color: 'hsl(var(--foreground))',
              }}
            />
          </div>
          {!isLocked && (
            <button
              onClick={() => onDeleteParticipant(selectedParticipant.id)}
              className="w-full py-2 rounded-lg text-xs font-medium transition-colors bg-destructive/10 text-destructive hover:bg-destructive/20"
            >
              Delete Participant
            </button>
          )}
        </div>
      )}

      {/* Add Message Section */}
      {participants.length >= 2 && (
        <div className="space-y-2 p-3 rounded-lg border" style={{ borderColor: 'hsl(var(--border))' }}>
          <h4 className="text-sm font-semibold" style={{ color: 'hsl(var(--foreground))' }}>
            Add Message
          </h4>
          <div className="grid grid-cols-2 gap-2">
            <select
              value={newMessageFrom}
              onChange={(e) => setNewMessageFrom(e.target.value)}
              disabled={isLocked}
              className="px-2 py-1.5 rounded border text-xs"
              style={{
                background: 'hsl(var(--background))',
                borderColor: 'hsl(var(--border))',
                color: 'hsl(var(--foreground))',
              }}
            >
              <option value="">From...</option>
              {participants.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
            <select
              value={newMessageTo}
              onChange={(e) => setNewMessageTo(e.target.value)}
              disabled={isLocked}
              className="px-2 py-1.5 rounded border text-xs"
              style={{
                background: 'hsl(var(--background))',
                borderColor: 'hsl(var(--border))',
                color: 'hsl(var(--foreground))',
              }}
            >
              <option value="">To...</option>
              {participants.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
          <input
            type="text"
            value={newMessageLabel}
            onChange={(e) => setNewMessageLabel(e.target.value)}
            placeholder="Message label..."
            disabled={isLocked}
            className="w-full px-3 py-2 rounded-lg border text-sm disabled:opacity-50"
            style={{
              background: 'hsl(var(--background))',
              borderColor: 'hsl(var(--border))',
              color: 'hsl(var(--foreground))',
            }}
          />
          <div className="flex gap-2">
            {(['sync', 'async', 'return'] as const).map(type => (
              <button
                key={type}
                onClick={() => setNewMessageType(type)}
                className={`flex-1 px-2 py-1 rounded text-xs font-medium transition-all ${
                  newMessageType === type ? 'ring-2 ring-primary' : ''
                }`}
                style={{
                  background: newMessageType === type ? 'hsl(var(--primary) / 0.1)' : 'hsl(var(--muted))',
                  color: 'hsl(var(--foreground))',
                }}
              >
                {type}
              </button>
            ))}
          </div>
          <button
            onClick={() => {
              if (newMessageFrom && newMessageTo && newMessageFrom !== newMessageTo) {
                onAddMessage(newMessageFrom, newMessageTo, newMessageLabel || 'message()', newMessageType);
                setNewMessageLabel('');
                setNewMessageFrom('');
                setNewMessageTo('');
              }
            }}
            disabled={isLocked || !newMessageFrom || !newMessageTo || newMessageFrom === newMessageTo}
            className="w-full py-2 rounded-lg text-xs font-medium transition-colors bg-primary/10 text-primary hover:bg-primary/20 disabled:opacity-50"
          >
            Add Message
          </button>
        </div>
      )}

      {/* Selected Message Editor */}
      {selectedMessage && (
        <div className="space-y-3 p-3 rounded-lg border" style={{ borderColor: 'hsl(var(--border))' }}>
          <h4 className="text-sm font-semibold" style={{ color: 'hsl(var(--foreground))' }}>
            Edit Message
          </h4>
          <input
            type="text"
            value={selectedMessage.label}
            onChange={(e) => onUpdateMessage(selectedMessage.id, { label: e.target.value })}
            disabled={isLocked}
            className="w-full px-3 py-2 rounded-lg border text-sm disabled:opacity-50"
            style={{
              background: 'hsl(var(--background))',
              borderColor: 'hsl(var(--border))',
              color: 'hsl(var(--foreground))',
            }}
          />
          {!isLocked && (
            <button
              onClick={() => onDeleteMessage(selectedMessage.id)}
              className="w-full py-2 rounded-lg text-xs font-medium transition-colors bg-destructive/10 text-destructive hover:bg-destructive/20"
            >
              Delete Message
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// Toolbox for sequence diagram
interface SequenceToolboxProps {
  onAddParticipant: (type: SequenceParticipant['type']) => void;
  isDarkMode: boolean;
  isLocked: boolean;
}

export function SequenceToolbox({
  onAddParticipant,
  isDarkMode: _isDarkMode,
  isLocked,
}: SequenceToolboxProps) {
  if (isLocked) return null;

  const participantTypes: { type: SequenceParticipant['type']; label: string }[] = [
    { type: 'actor', label: 'Actor' },
    { type: 'object', label: 'Object' },
    { type: 'boundary', label: 'Boundary' },
    { type: 'control', label: 'Control' },
    { type: 'entity', label: 'Entity' },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="absolute bottom-6 left-1/2 -translate-x-1/2 z-30"
    >
      <div
        className="flex items-center gap-2 px-3 py-2 rounded-xl border shadow-lg backdrop-blur-sm"
        style={{
          background: _isDarkMode ? 'hsl(222 47% 11% / 0.9)' : 'hsl(0 0% 100% / 0.9)',
          borderColor: 'hsl(var(--border))',
        }}
      >
        <span className="text-[10px] font-medium px-2" style={{ color: 'hsl(var(--muted-foreground))' }}>
          Add:
        </span>
        
        {participantTypes.map(({ type, label }) => (
          <motion.button
            key={type}
            onClick={() => onAddParticipant(type)}
            className="flex items-center justify-center gap-1 px-3 py-2 rounded-lg transition-all hover:scale-105"
            style={{
              background: 'hsl(var(--primary) / 0.1)',
              color: 'hsl(var(--primary))',
            }}
            whileHover={{ y: -2 }}
            whileTap={{ scale: 0.95 }}
            title={label}
          >
            {PARTICIPANT_ICONS[type]}
            <span className="text-[10px] font-medium">{label}</span>
          </motion.button>
        ))}
      </div>
    </motion.div>
  );
}
