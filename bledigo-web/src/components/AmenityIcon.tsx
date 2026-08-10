'use client';

import * as Icons from 'lucide-react';
import { Check } from 'lucide-react';

/**
 * Resout dynamiquement une icone lucide a partir de son nom.
 * Retombe sur Check si le nom n existe pas dans la version installee.
 */
export default function AmenityIcon({
  name,
  className = 'w-5 h-5',
}: {
  name: string;
  className?: string;
}) {
  const Icon = (Icons as unknown as Record<string, any>)[name];
  const Resolved = typeof Icon === 'function' || typeof Icon === 'object' ? Icon : Check;
  return <Resolved className={className} aria-hidden />;
}
