
export interface ColorStyles {
  container: string;
  text: string;
  cursor: string;
  border: string;
  bg: string;
  bgSolid: string;
}

const styles: Record<string, ColorStyles> = {
  blue: { 
    container: 'border-blue-500 bg-blue-50', 
    text: 'text-blue-600', 
    cursor: 'bg-blue-600',
    border: 'border-blue-500',
    bg: 'bg-blue-50',
    bgSolid: 'bg-blue-500'
  },
  red: { 
    container: 'border-red-500 bg-red-50', 
    text: 'text-red-600', 
    cursor: 'bg-red-600',
    border: 'border-red-500',
    bg: 'bg-red-50',
    bgSolid: 'bg-red-500'
  },
  green: { 
    container: 'border-green-500 bg-green-50', 
    text: 'text-green-600', 
    cursor: 'bg-green-600',
    border: 'border-green-500',
    bg: 'bg-green-50',
    bgSolid: 'bg-green-500'
  },
  purple: { 
    container: 'border-purple-500 bg-purple-50', 
    text: 'text-purple-600', 
    cursor: 'bg-purple-600',
    border: 'border-purple-500',
    bg: 'bg-purple-50',
    bgSolid: 'bg-purple-500'
  },
  orange: { 
    container: 'border-orange-500 bg-orange-50', 
    text: 'text-orange-600', 
    cursor: 'bg-orange-600',
    border: 'border-orange-500',
    bg: 'bg-orange-50',
    bgSolid: 'bg-orange-500'
  },
  pink: { 
    container: 'border-pink-500 bg-pink-50', 
    text: 'text-pink-600', 
    cursor: 'bg-pink-600',
    border: 'border-pink-500',
    bg: 'bg-pink-50',
    bgSolid: 'bg-pink-500'
  },
  cyan: { 
    container: 'border-cyan-500 bg-cyan-50', 
    text: 'text-cyan-600', 
    cursor: 'bg-cyan-600',
    border: 'border-cyan-500',
    bg: 'bg-cyan-50',
    bgSolid: 'bg-cyan-500'
  },
  teal: { 
    container: 'border-teal-500 bg-teal-50', 
    text: 'text-teal-600', 
    cursor: 'bg-teal-600',
    border: 'border-teal-500',
    bg: 'bg-teal-50',
    bgSolid: 'bg-teal-500'
  },
  indigo: { 
    container: 'border-indigo-500 bg-indigo-50', 
    text: 'text-indigo-600', 
    cursor: 'bg-indigo-600',
    border: 'border-indigo-500',
    bg: 'bg-indigo-50',
    bgSolid: 'bg-indigo-500'
  },
  amber: { 
    container: 'border-amber-500 bg-amber-50', 
    text: 'text-amber-600', 
    cursor: 'bg-amber-600',
    border: 'border-amber-500',
    bg: 'bg-amber-50',
    bgSolid: 'bg-amber-500'
  },
};

export const getColorStyles = (color: string = 'blue'): ColorStyles => {
  return styles[color] || styles.blue!;
};
