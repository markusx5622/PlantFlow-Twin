// ─── PlantFlow Twin — Parameter Editor Component ───
// Controlled editing of station and buffer parameters in the Lab.

'use client';

import type { Station, Buffer } from '../engine/types';
import type { ParameterEdit } from '../lib/variant';
import { stationDisplayName, bufferDisplayName } from '../lib/format';

interface ParameterEditorProps {
  stations: Station[];
  buffers: Buffer[];
  edits: ParameterEdit[];
  onEditChange: (edits: ParameterEdit[]) => void;
}

interface EditableField {
  targetType: 'station' | 'buffer';
  targetId: string;
  targetName: string;
  field: string;
  label: string;
  currentValue: number;
  min: number;
  max: number;
  step: number;
  unit: string;
}

function getEditableFields(stations: Station[], buffers: Buffer[]): EditableField[] {
  const fields: EditableField[] = [];

  for (const station of stations) {
    const name = stationDisplayName(station);
    fields.push({
      targetType: 'station',
      targetId: station.id,
      targetName: name,
      field: 'cycleTime',
      label: 'Cycle Time',
      currentValue: station.cycleTime,
      min: 0.1,
      max: station.cycleTime * 5,
      step: 0.1,
      unit: 's',
    });
    fields.push({
      targetType: 'station',
      targetId: station.id,
      targetName: name,
      field: 'capacity',
      label: 'Capacity',
      currentValue: station.capacity,
      min: 1,
      max: 10,
      step: 1,
      unit: 'slots',
    });
    fields.push({
      targetType: 'station',
      targetId: station.id,
      targetName: name,
      field: 'availability',
      label: 'Availability',
      currentValue: station.availability,
      min: 0.5,
      max: 1.0,
      step: 0.01,
      unit: '',
    });
    fields.push({
      targetType: 'station',
      targetId: station.id,
      targetName: name,
      field: 'defectRate',
      label: 'Defect Rate',
      currentValue: station.defectRate,
      min: 0,
      max: 0.2,
      step: 0.001,
      unit: '',
    });
  }

  for (const buffer of buffers) {
    if (!isFinite(buffer.capacity)) continue;
    const name = bufferDisplayName(buffer);
    fields.push({
      targetType: 'buffer',
      targetId: buffer.id,
      targetName: name,
      field: 'capacity',
      label: 'Capacity',
      currentValue: buffer.capacity,
      min: 1,
      max: Math.max(buffer.capacity * 5, 50),
      step: 1,
      unit: 'units',
    });
  }

  return fields;
}

function getEditValue(edits: ParameterEdit[], targetId: string, field: string): number | undefined {
  const edit = edits.find((e) => e.targetId === targetId && e.field === field);
  return edit?.newValue;
}

function formatFieldValue(value: number, field: string): string {
  if (field === 'availability' || field === 'defectRate') {
    return `${(value * 100).toFixed(1)}%`;
  }
  if (field === 'capacity' && Number.isInteger(value)) {
    return value.toString();
  }
  return value.toFixed(1);
}

export function ParameterEditor({ stations, buffers, edits, onEditChange }: ParameterEditorProps) {
  const fields = getEditableFields(stations, buffers);

  // Group by target
  const grouped = new Map<string, EditableField[]>();
  for (const f of fields) {
    const key = `${f.targetType}:${f.targetId}`;
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push(f);
  }

  const handleFieldChange = (field: EditableField, value: number) => {
    const filtered = edits.filter(
      (e) => !(e.targetId === field.targetId && e.field === field.field),
    );

    // Only add edit if value differs from original
    const isChanged = Math.abs(value - field.currentValue) > 1e-9;
    if (isChanged) {
      filtered.push({
        targetType: field.targetType,
        targetId: field.targetId,
        field: field.field,
        newValue: value,
      });
    }

    onEditChange(filtered);
  };

  const handleReset = (field: EditableField) => {
    const filtered = edits.filter(
      (e) => !(e.targetId === field.targetId && e.field === field.field),
    );
    onEditChange(filtered);
  };

  const handleResetAll = () => {
    onEditChange([]);
  };

  const hasEdits = edits.length > 0;

  return (
    <div className="param-editor">
      <div className="param-editor__header">
        <h3 className="param-editor__title">Parameter Editor</h3>
        {hasEdits && (
          <button className="btn btn--sm" onClick={handleResetAll}>
            Reset All ({edits.length})
          </button>
        )}
      </div>

      <div className="param-editor__groups">
        {Array.from(grouped.entries()).map(([key, groupFields]) => {
          const first = groupFields[0];
          const typeLabel = first.targetType === 'station' ? '⚙' : '⇄';
          const hasGroupEdits = groupFields.some((f) =>
            edits.some((e) => e.targetId === f.targetId && e.field === f.field),
          );

          return (
            <div
              key={key}
              className={`param-group${hasGroupEdits ? ' param-group--edited' : ''}`}
            >
              <div className="param-group__header">
                <span className="param-group__icon">{typeLabel}</span>
                <span className="param-group__name">{first.targetName}</span>
              </div>
              <div className="param-group__fields">
                {groupFields.map((f) => {
                  const editVal = getEditValue(edits, f.targetId, f.field);
                  const displayValue = editVal ?? f.currentValue;
                  const isEdited = editVal !== undefined;

                  return (
                    <div
                      key={`${f.targetId}-${f.field}`}
                      className={`param-field${isEdited ? ' param-field--edited' : ''}`}
                    >
                      <div className="param-field__top">
                        <label className="param-field__label">{f.label}</label>
                        <span className="param-field__value">
                          {formatFieldValue(displayValue, f.field)}
                          {f.unit && !['availability', 'defectRate'].includes(f.field) && (
                            <span className="param-field__unit">{f.unit}</span>
                          )}
                        </span>
                      </div>
                      <div className="param-field__controls">
                        <input
                          type="range"
                          min={f.min}
                          max={f.max}
                          step={f.step}
                          value={displayValue}
                          onChange={(e) => handleFieldChange(f, parseFloat(e.target.value))}
                          className="param-field__slider"
                        />
                        {isEdited && (
                          <button
                            className="param-field__reset"
                            onClick={() => handleReset(f)}
                            title={`Reset to ${formatFieldValue(f.currentValue, f.field)}`}
                          >
                            ↺
                          </button>
                        )}
                      </div>
                      {isEdited && (
                        <div className="param-field__delta">
                          {f.currentValue.toFixed(2)} → {displayValue.toFixed(2)}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
