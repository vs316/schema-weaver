import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Plus, 
  Trash2, 
  ChevronDown, 
  ChevronRight,
  Eye,
  EyeOff,
  Lock,
  Package,
  Underline,
  Italic,
} from 'lucide-react';
import type { UMLClass, UMLAttribute, UMLMethod, Visibility } from '../types/uml';
import { ColorPicker } from './ColorPicker';

interface UMLClassEditorProps {
  umlClass: UMLClass;
  isLocked: boolean;
  onUpdate: (updates: Partial<UMLClass>) => void;
  onDelete: () => void;
}

const VISIBILITY_OPTIONS: { value: Visibility; label: string; icon: React.ReactNode }[] = [
  { value: '+', label: 'Public', icon: <Eye size={12} /> },
  { value: '-', label: 'Private', icon: <EyeOff size={12} /> },
  { value: '#', label: 'Protected', icon: <Lock size={12} /> },
  { value: '~', label: 'Package', icon: <Package size={12} /> },
];

const STEREOTYPE_OPTIONS = ['', 'interface', 'abstract', 'enum', 'entity', 'service', 'repository'];

const generateId = () => Math.random().toString(36).substr(2, 9);

export function UMLClassEditor({
  umlClass,
  isLocked,
  onUpdate,
  onDelete,
}: UMLClassEditorProps) {
  const [showAttributes, setShowAttributes] = useState(true);
  const [showMethods, setShowMethods] = useState(true);
  const [newAttrName, setNewAttrName] = useState('');
  const [newMethodName, setNewMethodName] = useState('');

  const handleAddAttribute = () => {
    if (!newAttrName.trim() || isLocked) return;
    
    const newAttr: UMLAttribute = {
      id: generateId(),
      visibility: '+',
      name: newAttrName.trim(),
      type: 'string',
      isStatic: false,
    };
    
    onUpdate({
      attributes: [...umlClass.attributes, newAttr],
    });
    setNewAttrName('');
  };

  const handleUpdateAttribute = (attrId: string, updates: Partial<UMLAttribute>) => {
    if (isLocked) return;
    onUpdate({
      attributes: umlClass.attributes.map(a => 
        a.id === attrId ? { ...a, ...updates } : a
      ),
    });
  };

  const handleDeleteAttribute = (attrId: string) => {
    if (isLocked) return;
    onUpdate({
      attributes: umlClass.attributes.filter(a => a.id !== attrId),
    });
  };

  const handleAddMethod = () => {
    if (!newMethodName.trim() || isLocked) return;
    
    const newMethod: UMLMethod = {
      id: generateId(),
      visibility: '+',
      name: newMethodName.trim(),
      parameters: '',
      returnType: 'void',
      isStatic: false,
      isAbstract: false,
    };
    
    onUpdate({
      methods: [...umlClass.methods, newMethod],
    });
    setNewMethodName('');
  };

  const handleUpdateMethod = (methodId: string, updates: Partial<UMLMethod>) => {
    if (isLocked) return;
    onUpdate({
      methods: umlClass.methods.map(m => 
        m.id === methodId ? { ...m, ...updates } : m
      ),
    });
  };

  const handleDeleteMethod = (methodId: string) => {
    if (isLocked) return;
    onUpdate({
      methods: umlClass.methods.filter(m => m.id !== methodId),
    });
  };

  return (
    <div className="space-y-4">
      {/* Class Name & Stereotype */}
      <div className="space-y-2">
        <label className="text-xs font-medium" style={{ color: 'hsl(var(--muted-foreground))' }}>
          Class Name
        </label>
        <input
          type="text"
          value={umlClass.name}
          onChange={(e) => onUpdate({ name: e.target.value })}
          disabled={isLocked}
          className="w-full px-3 py-2 rounded-lg border text-sm disabled:opacity-50"
          style={{
            background: 'hsl(var(--background))',
            borderColor: 'hsl(var(--border))',
            color: 'hsl(var(--foreground))',
          }}
        />
      </div>

      <div className="space-y-2">
        <label className="text-xs font-medium" style={{ color: 'hsl(var(--muted-foreground))' }}>
          Stereotype
        </label>
        <select
          value={umlClass.stereotype || ''}
          onChange={(e) => onUpdate({ stereotype: e.target.value || undefined })}
          disabled={isLocked}
          className="w-full px-3 py-2 rounded-lg border text-sm disabled:opacity-50"
          style={{
            background: 'hsl(var(--background))',
            borderColor: 'hsl(var(--border))',
            color: 'hsl(var(--foreground))',
          }}
        >
          {STEREOTYPE_OPTIONS.map(s => (
            <option key={s} value={s} style={{ background: 'hsl(var(--background))', color: 'hsl(var(--foreground))' }}>
              {s ? `«${s}»` : 'None'}
            </option>
          ))}
        </select>
      </div>

      {/* Color */}
      <div className="space-y-2">
        <label className="text-xs font-medium" style={{ color: 'hsl(var(--muted-foreground))' }}>
          Color
        </label>
        <ColorPicker
          color={umlClass.color || 'hsl(239 84% 67%)'}
          onChange={(color) => onUpdate({ color })}
          disabled={isLocked}
        />
      </div>

      {/* Attributes Section */}
      <div className="rounded-lg border overflow-hidden" style={{ borderColor: 'hsl(var(--border))' }}>
        <button
          onClick={() => setShowAttributes(!showAttributes)}
          className="w-full flex items-center justify-between px-3 py-2 text-xs font-medium"
          style={{ background: 'hsl(var(--muted))', color: 'hsl(var(--foreground))' }}
        >
          <span>Attributes ({umlClass.attributes.length})</span>
          {showAttributes ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </button>
        
        <AnimatePresence>
          {showAttributes && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="p-2 space-y-2">
                {umlClass.attributes.map((attr) => (
                  <div key={attr.id} className="flex items-center gap-1.5 p-2 rounded" style={{ background: 'hsl(var(--background))' }}>
                    <select
                      value={attr.visibility}
                      onChange={(e) => handleUpdateAttribute(attr.id, { visibility: e.target.value as Visibility })}
                      disabled={isLocked}
                      className="text-[10px] px-1 py-0.5 rounded border w-8"
                      style={{
                        background: 'hsl(var(--background))',
                        borderColor: 'hsl(var(--border))',
                        color: 'hsl(var(--foreground))',
                      }}
                    >
                      {VISIBILITY_OPTIONS.map(v => (
                        <option key={v.value} value={v.value}>{v.value}</option>
                      ))}
                    </select>
                    <input
                      type="text"
                      value={attr.name}
                      onChange={(e) => handleUpdateAttribute(attr.id, { name: e.target.value })}
                      disabled={isLocked}
                      className="flex-1 text-xs px-1.5 py-0.5 rounded border min-w-0"
                      style={{
                        background: 'hsl(var(--background))',
                        borderColor: 'hsl(var(--border))',
                        color: 'hsl(var(--foreground))',
                      }}
                      placeholder="name"
                    />
                    <input
                      type="text"
                      value={attr.type}
                      onChange={(e) => handleUpdateAttribute(attr.id, { type: e.target.value })}
                      disabled={isLocked}
                      className="w-16 text-xs px-1.5 py-0.5 rounded border"
                      style={{
                        background: 'hsl(var(--background))',
                        borderColor: 'hsl(var(--border))',
                        color: 'hsl(var(--foreground))',
                      }}
                      placeholder="type"
                    />
                    <button
                      onClick={() => handleUpdateAttribute(attr.id, { isStatic: !attr.isStatic })}
                      disabled={isLocked}
                      className={`p-1 rounded transition-colors ${attr.isStatic ? 'bg-primary/20' : ''}`}
                      title="Static"
                    >
                      <Underline size={12} style={{ color: attr.isStatic ? 'hsl(var(--primary))' : 'hsl(var(--muted-foreground))' }} />
                    </button>
                    <button
                      onClick={() => handleDeleteAttribute(attr.id)}
                      disabled={isLocked}
                      className="p-1 rounded hover:bg-destructive/10"
                    >
                      <Trash2 size={12} style={{ color: 'hsl(var(--destructive))' }} />
                    </button>
                  </div>
                ))}
                
                {!isLocked && (
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={newAttrName}
                      onChange={(e) => setNewAttrName(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleAddAttribute()}
                      className="flex-1 text-xs px-2 py-1.5 rounded border"
                      style={{
                        background: 'hsl(var(--background))',
                        borderColor: 'hsl(var(--border))',
                        color: 'hsl(var(--foreground))',
                      }}
                      placeholder="New attribute name..."
                    />
                    <button
                      onClick={handleAddAttribute}
                      disabled={!newAttrName.trim()}
                      className="p-1.5 rounded disabled:opacity-50"
                      style={{ background: 'hsl(var(--primary))', color: 'hsl(var(--primary-foreground))' }}
                    >
                      <Plus size={14} />
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Methods Section */}
      <div className="rounded-lg border overflow-hidden" style={{ borderColor: 'hsl(var(--border))' }}>
        <button
          onClick={() => setShowMethods(!showMethods)}
          className="w-full flex items-center justify-between px-3 py-2 text-xs font-medium"
          style={{ background: 'hsl(var(--muted))', color: 'hsl(var(--foreground))' }}
        >
          <span>Methods ({umlClass.methods.length})</span>
          {showMethods ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </button>
        
        <AnimatePresence>
          {showMethods && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="p-2 space-y-2">
                {umlClass.methods.map((method) => (
                  <div key={method.id} className="p-2 rounded space-y-1.5" style={{ background: 'hsl(var(--background))' }}>
                    <div className="flex items-center gap-1.5">
                      <select
                        value={method.visibility}
                        onChange={(e) => handleUpdateMethod(method.id, { visibility: e.target.value as Visibility })}
                        disabled={isLocked}
                        className="text-[10px] px-1 py-0.5 rounded border w-8"
                        style={{
                          background: 'hsl(var(--background))',
                          borderColor: 'hsl(var(--border))',
                          color: 'hsl(var(--foreground))',
                        }}
                      >
                        {VISIBILITY_OPTIONS.map(v => (
                          <option key={v.value} value={v.value}>{v.value}</option>
                        ))}
                      </select>
                      <input
                        type="text"
                        value={method.name}
                        onChange={(e) => handleUpdateMethod(method.id, { name: e.target.value })}
                        disabled={isLocked}
                        className="flex-1 text-xs px-1.5 py-0.5 rounded border min-w-0"
                        style={{
                          background: 'hsl(var(--background))',
                          borderColor: 'hsl(var(--border))',
                          color: 'hsl(var(--foreground))',
                        }}
                        placeholder="methodName"
                      />
                      <button
                        onClick={() => handleUpdateMethod(method.id, { isStatic: !method.isStatic })}
                        disabled={isLocked}
                        className={`p-1 rounded transition-colors ${method.isStatic ? 'bg-primary/20' : ''}`}
                        title="Static"
                      >
                        <Underline size={12} style={{ color: method.isStatic ? 'hsl(var(--primary))' : 'hsl(var(--muted-foreground))' }} />
                      </button>
                      <button
                        onClick={() => handleUpdateMethod(method.id, { isAbstract: !method.isAbstract })}
                        disabled={isLocked}
                        className={`p-1 rounded transition-colors ${method.isAbstract ? 'bg-primary/20' : ''}`}
                        title="Abstract"
                      >
                        <Italic size={12} style={{ color: method.isAbstract ? 'hsl(var(--primary))' : 'hsl(var(--muted-foreground))' }} />
                      </button>
                      <button
                        onClick={() => handleDeleteMethod(method.id)}
                        disabled={isLocked}
                        className="p-1 rounded hover:bg-destructive/10"
                      >
                        <Trash2 size={12} style={{ color: 'hsl(var(--destructive))' }} />
                      </button>
                    </div>
                    <div className="flex items-center gap-1.5 pl-9">
                      <span className="text-[10px]" style={{ color: 'hsl(var(--muted-foreground))' }}>(</span>
                      <input
                        type="text"
                        value={method.parameters}
                        onChange={(e) => handleUpdateMethod(method.id, { parameters: e.target.value })}
                        disabled={isLocked}
                        className="flex-1 text-xs px-1.5 py-0.5 rounded border min-w-0"
                        style={{
                          background: 'hsl(var(--background))',
                          borderColor: 'hsl(var(--border))',
                          color: 'hsl(var(--foreground))',
                        }}
                        placeholder="params"
                      />
                      <span className="text-[10px]" style={{ color: 'hsl(var(--muted-foreground))' }}>):</span>
                      <input
                        type="text"
                        value={method.returnType}
                        onChange={(e) => handleUpdateMethod(method.id, { returnType: e.target.value })}
                        disabled={isLocked}
                        className="w-16 text-xs px-1.5 py-0.5 rounded border"
                        style={{
                          background: 'hsl(var(--background))',
                          borderColor: 'hsl(var(--border))',
                          color: 'hsl(var(--foreground))',
                        }}
                        placeholder="return"
                      />
                    </div>
                  </div>
                ))}
                
                {!isLocked && (
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={newMethodName}
                      onChange={(e) => setNewMethodName(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleAddMethod()}
                      className="flex-1 text-xs px-2 py-1.5 rounded border"
                      style={{
                        background: 'hsl(var(--background))',
                        borderColor: 'hsl(var(--border))',
                        color: 'hsl(var(--foreground))',
                      }}
                      placeholder="New method name..."
                    />
                    <button
                      onClick={handleAddMethod}
                      disabled={!newMethodName.trim()}
                      className="p-1.5 rounded disabled:opacity-50"
                      style={{ background: 'hsl(var(--primary))', color: 'hsl(var(--primary-foreground))' }}
                    >
                      <Plus size={14} />
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Description */}
      <div className="space-y-2">
        <label className="text-xs font-medium" style={{ color: 'hsl(var(--muted-foreground))' }}>
          Description
        </label>
        <textarea
          value={umlClass.description || ''}
          onChange={(e) => onUpdate({ description: e.target.value })}
          disabled={isLocked}
          className="w-full px-3 py-2 rounded-lg border text-xs resize-none disabled:opacity-50"
          style={{
            background: 'hsl(var(--background))',
            borderColor: 'hsl(var(--border))',
            color: 'hsl(var(--foreground))',
          }}
          rows={3}
          placeholder="Add a description..."
        />
      </div>

      {/* Delete Button */}
      {!isLocked && (
        <button
          onClick={onDelete}
          className="w-full py-2 rounded-lg text-xs font-medium transition-colors bg-destructive/10 text-destructive hover:bg-destructive/20"
        >
          Delete Class
        </button>
      )}
    </div>
  );
}
