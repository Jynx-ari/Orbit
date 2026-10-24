import { useEffect, useState } from "react";
import { toKey } from "./dates.js";

// Today's date key, refreshed every minute so "today" stays right if the app is left open overnight.
export default function useTodayKey() {
  const [key, setKey] = useState(() => toKey(new Date()));
  useEffect(() => {
    const timer = setInterval(() => setKey(toKey(new Date())), 60000);
    return () => clearInterval(timer);
  }, []);
  return key;
}
