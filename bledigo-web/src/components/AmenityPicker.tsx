'use client';

import { AMENITY_GROUPS } from '@/lib/catalog';
import AmenityIcon from '@/components/AmenityIcon';

export default function AmenityPicker({
  selected,
  onToggle,
}: {
  selected: string[];
  onToggle: (key: string) => void;
}) {
  return (
    <div className="space-y-6">
      {AMENITY_GROUPS.map((group) => (
        <fieldset key={group.key}>
          <legend className="text-sm font-medium text-charcoal mb-2">
            {group.label}
            <span className="text-slate font-normal ms-2">
              ({group.items.filter((i) => selected.includes(i.key)).length}/{group.items.length})
            </span>
          </legend>
          <div className="flex flex-wrap gap-2">
            {group.items.map((item) => {
              const active = selected.includes(item.key);
              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => onToggle(item.key)}
                  aria-pressed={active}
                  className={`flex items-center gap-2 px-3 py-2 rounded-bledi-sm text-sm border transition-all ${
                    active
                      ? 'bg-bledi-blue text-white border-bledi-blue'
                      : 'bg-white text-slate border-cloud hover:border-bledi-blue hover:text-bledi-blue'
                  }`}
                >
                  <AmenityIcon name={item.icon} className="w-4 h-4" />
                  {item.label}
                </button>
              );
            })}
          </div>
        </fieldset>
      ))}
    </div>
  );
}
