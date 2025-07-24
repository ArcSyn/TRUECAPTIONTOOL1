import { captions } from "./captions";

export default function Subs({ currentTime }) {
  const line = captions.find(c => currentTime >= c.startSeconds && currentTime <= c.endSeconds);
  return <div className="subs">{line?.text || ""}</div>;
}
