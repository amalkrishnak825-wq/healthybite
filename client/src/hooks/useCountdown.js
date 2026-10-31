
import { useEffect, useState } from "react";

export default function useCountdown(initialSeconds = 60) {
  const [seconds, setSeconds] = useState(initialSeconds);

  useEffect(() => {
    if (seconds <= 0) return;

    const timer = setInterval(() => {
      setSeconds((previous) => Math.max(0, previous - 1));
    }, 1000);

    return () => clearInterval(timer);
  }, [seconds]);

  function restart(newSeconds = initialSeconds) {
    setSeconds(newSeconds);
  }

  return {
    seconds,
    restart,
    isRunning: seconds > 0,
  };
}
