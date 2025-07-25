import { Home } from './pages/Home';
<div className="bg-red-500 p-4 text-white">Tailwind is working!</div>

function App() {
  return (
    <>
      <div className="bg-red-500 p-4 text-white">Tailwind is working!</div>
      <Home />
    </>
  );
}

export default App;

import { cn } from "@/lib/utils";

