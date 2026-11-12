import { useEffect, useState } from "react";

export default function useFocusRefresh() {
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    let scheduledFrame = 0;

    function refreshWhenVisible() {
      if (document.visibilityState !== "visible" || scheduledFrame) return;
      scheduledFrame = window.requestAnimationFrame(() => {
        scheduledFrame = 0;
        setRevision((current) => current + 1);
      });
    }

    window.addEventListener("focus", refreshWhenVisible);
    document.addEventListener("visibilitychange", refreshWhenVisible);
    return () => {
      if (scheduledFrame) window.cancelAnimationFrame(scheduledFrame);
      window.removeEventListener("focus", refreshWhenVisible);
      document.removeEventListener("visibilitychange", refreshWhenVisible);
    };
  }, []);

  return revision;
}
