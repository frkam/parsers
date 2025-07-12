export const getRandomNumberInRange = (min: number, max: number): number => {
  return Math.floor(Math.random() * (max - min) + min);
};

export const delay = (seconds: number) =>
  new Promise((resolve) => setTimeout(resolve, seconds * 1000));
