import React, { useRef, useState, useEffect } from "react";
import Subs from './Subs';

export default function Player() {
  const videoRef = useRef(null);
  const [t, setT] = useState(0);

  useEffect(() => {
    const v = videoRef.current;
    const onTime = () => setT(v.currentTime);
    v.addEventListener("timeupdate", onTime);
    return () => v.removeEventListener("timeupdate", onTime);
  }, []);

  return (
    <div style={{ position: "relative", width: 800 }}>
      <video ref={videoRef} src="/video.mp4" controls width={800} />
      <div style={{
        position: "absolute", bottom: "5%", width: "100%",
        textAlign: "center", color: "#fff", textShadow: "0 0 6px #000"
      }}>
        <Subs currentTime={t} />
      </div>
    </div>
  );
}
