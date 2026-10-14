import { Outlet } from "react-router";
import { Nav } from "./Nav";
import { Footer } from "./Footer";
import { PaperGrain } from "./PaperGrain";

export default function SiteLayout() {
  return (
    <>
      <PaperGrain />
      <Nav />
      <main id="main" className="min-h-[60vh]">
        <Outlet />
      </main>
      <Footer />
    </>
  );
}
