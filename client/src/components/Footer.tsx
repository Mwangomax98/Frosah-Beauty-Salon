import { Link } from "react-router";
import { Logo } from "./brand/Logo";
import { useT } from "@/i18n";
import { useSettings } from "@/lib/queries";
import { waLink } from "@/lib/format";
import { STAY_AREAS, COMPANY } from "@bluesparks/shared";

export function Footer() {
  const { t } = useT();
  const { data: s } = useSettings();
  const year = new Date().getFullYear();
  return (
    <footer className="bg-brand text-paper">
      <div className="container-x grid gap-10 py-14 md:grid-cols-12">
        <div className="md:col-span-5">
          <Logo sub="Holdings" />
          <p className="mt-4 max-w-sm text-paper/80">
            {t.footer.tagline} {COMPANY.carsBrand} for the road, {s?.bnbBrandName ?? COMPANY.staysBrand} for the night. Both run by the same small team in {COMPANY.city}.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <a href={waLink(s?.businessWhatsapp ?? "", "Habari Blue Spark, I'd like to ask about a booking.")} target="_blank" rel="noopener" className="btn-primary btn-sm">
              {t.common.whatsapp}
            </a>
            <a href={`tel:${(s?.businessPhone ?? "").replace(/\s/g, "")}`} className="btn-paper btn-sm">
              {t.common.call} {s?.businessPhone}
            </a>
          </div>
          <p className="mt-4 text-sm text-paper/70">
            <a href={`mailto:${s?.businessEmail}`} className="hover:text-spark">
              {s?.businessEmail}
            </a>
            <br />
            {s?.businessAddress}
          </p>
        </div>
        <div className="md:col-span-2">
          <h3 className="font-display text-lg text-spark">{t.footer.company}</h3>
          <ul className="mt-3 space-y-2 text-sm">
            <li>
              <Link to="/cars" className="hover:text-spark">
                {COMPANY.carsBrand}
              </Link>
            </li>
            <li>
              <Link to="/stays" className="hover:text-spark">
                {s?.bnbBrandName ?? COMPANY.staysBrand}
              </Link>
            </li>
            <li>
              <Link to="/about" className="hover:text-spark">
                {t.nav.about}
              </Link>
            </li>
            <li>
              <Link to="/contact" className="hover:text-spark">
                {t.nav.contact}
              </Link>
            </li>
          </ul>
        </div>
        <div className="md:col-span-3">
          <h3 className="font-display text-lg text-spark">{t.footer.areas}</h3>
          <ul className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
            {STAY_AREAS.map((a) => (
              <li key={a}>
                <Link to={`/stays?area=${encodeURIComponent(a)}`} className="hover:text-spark">
                  {a}
                </Link>
              </li>
            ))}
            <li>
              <Link to="/cars" className="hover:text-spark">
                JNIA airport
              </Link>
            </li>
          </ul>
        </div>
        <div className="md:col-span-2">
          <h3 className="font-display text-lg text-spark">{t.footer.legal}</h3>
          <ul className="mt-3 space-y-2 text-sm">
            <li>
              <Link to="/terms" className="hover:text-spark">
                {t.footer.terms}
              </Link>
            </li>
            <li>
              <Link to="/privacy" className="hover:text-spark">
                {t.footer.privacy}
              </Link>
            </li>
            <li>
              <Link to="/admin/login" className="text-paper/50 hover:text-spark">
                Staff login
              </Link>
            </li>
          </ul>
        </div>
      </div>
      <div className="border-t border-paper/15">
        <div className="container-x flex flex-col gap-1 py-4 text-xs text-paper/60 sm:flex-row sm:justify-between">
          <span>
            © {year} {COMPANY.legalName} {t.footer.rights}
          </span>
          <span>{t.footer.madeIn} Asante kwa kutembelea.</span>
        </div>
      </div>
    </footer>
  );
}
