import React, { useRef, useState, useEffect } from "react";
import Subs from "./Subs";

export default function Player() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [t, setT] = useState(0);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;

    const onTime = () => setT(v.currentTime);
    v.addEventListener("timeupdate", onTime);

    return () => v.removeEventListener("timeupdate", onTime);
  }, []);

  return (
    <div className={cn("relative w-[800px]")}>
      <video ref={videoRef} src="/video.mp4" controls className={cn("w-[800px]")} />
      <div className={cn("bottom-[5%] absolute drop-shadow-md w-full text-white text-center")}>
        <Subs currentTime={t} />
      </div>
    </div>
  );
}

import { cn } from "@/lib/utils";

