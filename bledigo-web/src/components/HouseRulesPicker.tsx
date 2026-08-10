'use client';

import { Check, X, Minus } from 'lucide-react';
import { HOUSE_RULES } from '@/lib/catalog';
import AmenityIcon from '@/components/AmenityIcon';

export type RuleValue = 'allowed' | 'denied' | 'unset';

const CHOICES: { value: RuleValue; label: string; icon: any; className: string }[] = [
  { value: 'allowed', label: 'Autorise', icon: Check, className: 'bg-emerald-500 text-white' },
  { value: 'denied', label: 'Interdit', icon: X, className: 'bg-red-500 text-white' },
  { value: 'unset', label: 'Non precise', icon: Minus, className: 'bg-cloud text-slate' },
];

export default function HouseRulesPicker({
  rules,
  onChange,
}: {
  rules: Record<string, RuleValue>;
  onChange: (key: string, value: RuleValue) => void;
}) {
  return (
    <div className="space-y-2">
      {HOUSE_RULES.map((rule) => {
        const current = rules[rule.key] ?? 'unset';
        return (
          <div
            key={rule.key}
            className="flex flex-wrap items-center gap-3 py-2 border-b border-cloud last:border-0"
          >
            <AmenityIcon name={rule.icon} className="w-4 h-4 text-slate" />
            <span className="text-sm text-charcoal flex-1 min-w-[12rem]">
              {current === 'denied' ? rule.deniedLabel : rule.label}
            </span>
            <div className="flex gap-1" role="radiogroup" aria-label={rule.label}>
              {CHOICES.map((choice) => {
                const Icon = choice.icon;
                const active = current === choice.value;
                return (
                  <button
                    key={choice.value}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    title={choice.label}
                    onClick={() => onChange(rule.key, choice.value)}
                    className={`p-1.5 rounded-lg transition-all ${
                      active ? choice.className : 'bg-white text-slate border border-cloud hover:border-bledi-blue'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
