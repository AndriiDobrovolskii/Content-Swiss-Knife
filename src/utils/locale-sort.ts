export const sortUkrainianFirst = (a: string, b: string): number => {
  const aUk = a === 'UA' || a === 'Ukrainian';
  const bUk = b === 'UA' || b === 'Ukrainian';
  return aUk === bUk ? 0 : aUk ? -1 : 1;
};

export const sortUkrainianFirstIso = (a: string, b: string): number =>
  a === 'uk-UA' ? -1 : b === 'uk-UA' ? 1 : 0;
