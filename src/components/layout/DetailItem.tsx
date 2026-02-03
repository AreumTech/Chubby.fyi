import React from 'react';

interface DetailItemProps { 
    label: string; 
    value: string | number; 
    isHTML?: boolean; 
    subItem?: boolean; 
    valueClassName?: string;
    labelClassName?: string;
}

export const DetailItem: React.FC<DetailItemProps> = ({ label, value, isHTML, subItem, valueClassName, labelClassName }) => (
  <div className={`flex justify-between items-baseline text-xs py-1 border-b border-border-color/30 last:border-b-0 ${subItem ? 'pl-2' : ''}`}>
    {isHTML ? (
      <span className={`text-text-secondary ${labelClassName || ''}`} dangerouslySetInnerHTML={{ __html: label + ':' }} />
    ) : (
      <span className={`text-text-secondary ${labelClassName || ''}`}>{label}:</span>
    )}
    {isHTML ? (
      <span className={`font-mono text-text-primary text-right ${valueClassName || ''}`} dangerouslySetInnerHTML={{ __html: String(value) }} />
    ) : (
      <span className={`font-mono text-text-primary text-right ${valueClassName || ''}`}>{String(value)}</span>
    )}
  </div>
);
