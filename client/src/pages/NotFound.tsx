import { Link } from "react-router";
import { useSeo } from "@/lib/useSeo";

export default function NotFound() {
  useSeo({ title: "Page not found", noindex: true });
  return (
    <section className="container-x py-20 text-center">
      <p className="eyebrow">404</p>
      <h1 className="mt-2 text-7xl sm:text-9xl">Wrong turn.</h1>
      <p className="mx-auto mt-4 max-w-md text-ink-soft">Happens to everyone at the Mwenge roundabout. This page isn't here, but the cars and the stays are.</p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link to="/" className="btn-primary">
          Back home
        </Link>
        <Link to="/cars" className="btn-ghost">
          Cars
        </Link>
        <Link to="/stays" className="btn-ghost">
          Stays
        </Link>
      </div>
    </section>
  );
}
