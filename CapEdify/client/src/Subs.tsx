import { captions } from "./captions";

export default function Subs({ currentTime }) {
  const line = captions.find(c => currentTime >= c.startSeconds && currentTime <= c.endSeconds);
  return <div className={cn("subs")}>{line?.text || ""}</div>;
}

import { cn } from "@/lib/utils";

