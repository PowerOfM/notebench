import { useEffect, useState } from "react";

export function useDebounceCallback<T extends (...args: any[]) => void>(
  callback: T,
  delay: number,
): T {
  const [timeoutId, setTimeoutId] = useState<number>();

  useEffect(() => {
    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [timeoutId]);

  return ((...args: any[]) => {
    if (timeoutId) clearTimeout(timeoutId);
    setTimeoutId(setTimeout(() => callback(...args), delay));
  }) as T;
}
