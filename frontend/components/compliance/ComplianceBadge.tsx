'use client';

import { ComplianceCheck, UseCaseType } from '@/lib/compliance/checker';

interface ComplianceBadgeProps {
  compliance: ComplianceCheck;
  size?: 'sm' | 'md' | 'lg';
}

export default function ComplianceBadge({ compliance, size = 'md' }: ComplianceBadgeProps) {
  const getBadgeColor = () => {
    if (!compliance.metaCompliant || compliance.complianceScore < 50) {
      return 'bg-red-100 text-red-800 border-red-300';
    }
    if (compliance.complianceScore < 70) {
      return 'bg-yellow-100 text-yellow-800 border-yellow-300';
    }
    return 'bg-green-100 text-green-800 border-green-300';
  };

  const getIcon = () => {
    if (!compliance.metaCompliant || compliance.complianceScore < 50) {
      return '❌';
    }
    if (compliance.complianceScore < 70) {
      return '⚠️';
    }
    return '✅';
  };

  const getLabel = () => {
    if (!compliance.metaCompliant || compliance.complianceScore < 50) {
      return 'Nicht Compliant';
    }
    if (compliance.complianceScore < 70) {
      return 'Verbesserung nötig';
    }
    return 'Compliant';
  };

  const sizeClasses = {
    sm: 'text-xs px-2 py-1',
    md: 'text-sm px-3 py-1.5',
    lg: 'text-base px-4 py-2',
  };

  return (
    <div
      className={`inline-flex items-center gap-2 rounded-lg border font-semibold ${getBadgeColor()} ${sizeClasses[size]}`}
      title={`Compliance Score: ${compliance.complianceScore}/100`}
    >
      <span>{getIcon()}</span>
      <span>{getLabel()}</span>
      <span className="text-xs opacity-75">({compliance.complianceScore}/100)</span>
    </div>
  );
}

