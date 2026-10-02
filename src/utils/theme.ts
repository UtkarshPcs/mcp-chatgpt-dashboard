export const getSubjectColor = (colorName?: string) => {
  const colors: Record<string, string> = {
    blue: 'from-blue-500 to-cyan-400',
    red: 'from-red-500 to-rose-400',
    emerald: 'from-emerald-500 to-teal-400',
    amber: 'from-amber-500 to-orange-400',
    purple: 'from-purple-500 to-indigo-400',
    rose: 'from-rose-500 to-pink-400',
  };
  return colors[colorName || 'blue'] || colors.blue;
};

export const getSubjectText = (colorName?: string) => {
  const colors: Record<string, string> = {
    blue: 'text-blue-400', red: 'text-red-400', emerald: 'text-emerald-400',
    amber: 'text-amber-400', purple: 'text-purple-400', rose: 'text-rose-400',
  };
  return colors[colorName || 'blue'] || colors.blue;
};
