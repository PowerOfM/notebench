export function pick<T extends object>(obj: T, keys: (keyof T)[]): Partial<T> {
  return keys.reduce((acc, key) => {
    acc[key] = obj[key];
    return acc;
  }, {} as Partial<T>);
}
