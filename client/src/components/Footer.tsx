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
          {s?.instagramUrl && (
            <a href={s.instagramUrl} target="_blank" rel="noopener" className="mt-4 inline-flex items-center gap-2 text-sm font-bold hover:text-sky">
              <InstagramIcon /> Instagram
            </a>
          )}
          <p className="mt-4 text-sm text-paper/70">
            <a href={`mailto:${s?.businessEmail}`} className="hover:text-spark">
              {s?.businessEmail}
            </a>
            <br />
            {s?.businessAddress}
          </p>
        </div>
        <div className="md:col-span-2">
          <h3 className="font-display text-lg text-spark">Car hire</h3>
          <ul className="mt-3 space-y-2 text-sm">
            {[
              ["/cars", t.nav.cars],
              ["/self-drive", t.nav.selfDrive],
              ["/with-driver", t.nav.withDriver],
              ["/toyota-alphard", t.nav.alphard],
              ["/prices", t.nav.prices],
              ["/book/car", t.nav.bookNow],
            ].map(([to, label]) => (
              <li key={to}>
                <Link to={to} className="hover:text-spark">
                  {label}
                </Link>
              </li>
            ))}
          </ul>
          <h3 className="mt-6 font-display text-lg text-spark">{t.footer.company}</h3>
          <ul className="mt-3 space-y-2 text-sm">
            {[
              ["/stays", s?.bnbBrandName ?? COMPANY.staysBrand],
              ["/reviews", t.nav.reviews],
              ["/about", t.nav.about],
              ["/contact", t.nav.contact],
            ].map(([to, label]) => (
              <li key={to}>
                <Link to={to} className="hover:text-spark">
                  {label}
                </Link>
              </li>
            ))}
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

export function InstagramIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="1" fill="currentColor" />
    </svg>
  );
}
