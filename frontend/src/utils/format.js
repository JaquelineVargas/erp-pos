export const formatPrice = (value) => {
  const num = Number(value);
  if (isNaN(num)) return 'Bs 0';
  return 'Bs ' + num.toFixed(2).replace(/\.00$/, '');
};
