import { AirQualityGrade } from '@/lib/types';
import { getGradeLabel, getGradeBgClass } from '@/lib/utils';

interface GradeBadgeProps {
  grade: AirQualityGrade;
  size?: 'sm' | 'md' | 'lg';
}

export default function GradeBadge({ grade, size = 'md' }: GradeBadgeProps) {
  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-3 py-1',
    lg: 'text-base px-4 py-1.5',
  };

  return (
    <span
      className={`inline-flex items-center rounded-full font-medium ${getGradeBgClass(grade)} ${sizeClasses[size]}`}
    >
      {getGradeLabel(grade)}
    </span>
  );
}
