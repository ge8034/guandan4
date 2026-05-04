type AvatarSize = 'sm' | 'md' | 'lg';

interface AvatarProps {
  src?: string | null;
  name: string;
  size?: AvatarSize;
  online?: boolean;
}

const sizeStyles: Record<AvatarSize, string> = {
  sm: 'h-8 w-8 text-xs',
  md: 'h-10 w-10 text-sm',
  lg: 'h-14 w-14 text-base',
};

const onlineDotSize: Record<AvatarSize, string> = {
  sm: 'h-2 w-2',
  md: 'h-2.5 w-2.5',
  lg: 'h-3 w-3',
};

function getInitials(name: string): string {
  if (name.length === 1) return name;
  if (name.length >= 2) return name.slice(0, 2);
  return '?';
}

const bgColors = [
  'bg-amber-100 text-amber-700',
  'bg-blue-100 text-blue-700',
  'bg-green-100 text-green-700',
  'bg-purple-100 text-purple-700',
  'bg-rose-100 text-rose-700',
];

function getBgColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return bgColors[Math.abs(hash) % bgColors.length];
}

export function Avatar({ src, name, size = 'md', online }: AvatarProps) {
  if (src) {
    return (
      <div className="relative inline-flex shrink-0">
        <img className={['rounded-full object-cover', sizeStyles[size]].join(' ')} src={src} alt={name} />
        {online !== undefined && (
          <span className={[
            'absolute bottom-0 right-0 rounded-full border-2 border-white',
            online ? 'bg-green-500' : 'bg-neutral-300',
            onlineDotSize[size],
          ].join(' ')} />
        )}
      </div>
    );
  }

  return (
    <div className="relative inline-flex shrink-0">
      <span className={[
        'inline-flex items-center justify-center rounded-full font-medium',
        sizeStyles[size],
        getBgColor(name),
      ].join(' ')}>
        {getInitials(name)}
      </span>
      {online !== undefined && (
        <span className={[
          'absolute bottom-0 right-0 rounded-full border-2 border-white',
          online ? 'bg-green-500' : 'bg-neutral-300',
          onlineDotSize[size],
        ].join(' ')} />
      )}
    </div>
  );
}
