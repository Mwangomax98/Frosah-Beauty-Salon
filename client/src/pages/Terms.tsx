import { COMPANY } from "@bluesparks/shared";
import { useSeo } from "@/lib/useSeo";
import { useSettings } from "@/lib/queries";
import { useT } from "@/i18n";

export default function Terms() {
  useSeo({ title: "Terms & conditions", description: "Terms for car hire with Johnson Rentals and short stays with Blue Spark Holdings in Dar es Salaam." });
  const { data: s } = useSettings();
  const { lang } = useT();
  const bnb = s?.bnbBrandName ?? COMPANY.staysBrand;
  return (
    <article className="container-x max-w-3xl py-14 lg:py-20">
      <p className="eyebrow">Legal</p>
      <h1 className="mt-2 text-5xl sm:text-6xl">Terms &amp; conditions</h1>
      <p className="mt-3 text-sm text-ink-soft">Last updated 1 October 2026. {lang === "sw" && "Ukurasa huu unapatikana kwa Kiingereza tu kwa sasa; tuulize kwa WhatsApp ukihitaji maelezo kwa Kiswahili."}</p>
      <div className="prose-site mt-8">
        <p>
          These terms apply to every booking made with {COMPANY.name} ("we", "us"), trading as {COMPANY.carsBrand} for vehicle hire and {bnb} for short-stay accommodation. By ticking the box on the booking form you agree to them. If anything here is unclear, ask before you book; we would rather explain than argue later.
        </p>

        <h2>Part A — Vehicle hire ({COMPANY.carsBrand})</h2>
        <h3>1. Who may drive</h3>
        <ul>
          <li>Self-drive hirers must be 23 or older and hold a full driving licence for at least two years. Licences in English, or accompanied by an English translation or an International Driving Permit, are accepted for 90 days from your entry into Tanzania. Tanzanian and East African Community licences are accepted without limit.</li>
          <li>Only drivers named on the booking may drive. Adding a second driver is free; tell us and show their licence at handover.</li>
          <li>We may refuse handover if the licence or ID does not match the booking, appears altered, or if the hirer appears unfit to drive. In that case the booking is treated as a late cancellation.</li>
        </ul>
        <h3>2. Rental period and late return</h3>
        <ul>
          <li>A rental day is 24 hours from the agreed pick-up time, with one hour of grace on return. Returns later than that are charged at the daily rate per started day.</li>
          <li>Extensions are welcome if the car is free; message us before the return time. Unannounced late returns of more than six hours may be reported as unauthorised use.</li>
        </ul>
        <h3>3. Fuel</h3>
        <p>Cars go out with a full tank and come back with a full tank. Missing fuel is charged at pump price plus TZS 20,000 for the trip to the station. Fuel for chauffeur-driven hires is paid by the hirer as the trip goes; the driver keeps receipts.</p>
        <h3>4. Mileage and where you may go</h3>
        <ul>
          <li>Each vehicle page states its mileage policy. Unless it says otherwise, hire within Dar es Salaam is unlimited and upcountry hire includes 250 km per day, with excess at TZS 500 per km.</li>
          <li>Vehicles may not leave Tanzania without written permission and the correct cross-border papers, which we can arrange with notice.</li>
          <li>No driving on beaches, through rivers, or on roads closed by the authorities. 2WD vehicles may not be taken on unsurfaced roads in the rainy seasons (March–May, November–December).</li>
        </ul>
        <h3>5. Deposit, damage and insurance</h3>
        <ul>
          <li>A refundable security deposit, shown on the vehicle page, is held at handover (mobile money, card pre-authorisation or cash) and returned within three working days of the car coming back in the condition it left, less any agreed charges.</li>
          <li>All vehicles carry comprehensive insurance. The hirer is liable for the excess (equal to the deposit) per incident for damage, theft, or loss while the car is in their care, and for the full cost of damage caused by driving under the influence, off-road use in breach of clause 4, reckless driving, or an unauthorised driver.</li>
          <li>Tyres, windscreen chips, lost keys and interior damage (burns, stains, odours) are not covered by insurance and are charged at cost.</li>
          <li>Report any accident to us and to the police immediately and obtain a police report; without it, insurance will not pay and the hirer bears the loss.</li>
          <li>Traffic fines and parking charges incurred during the hire are the hirer's responsibility, plus a TZS 15,000 handling fee if they reach us after the hire.</li>
        </ul>
        <h3>6. Breakdowns</h3>
        <p>Call us first. We arrange recovery or repair, and a replacement vehicle where the fault is not the hirer's. Repairs authorised by us are refunded against receipts. Repairs made without speaking to us are at the hirer's cost.</p>
        <h3>7. Chauffeur-driven hire</h3>
        <p>Our drivers work up to 12 hours a day with reasonable breaks. For upcountry hire the daily driver fee includes the driver's meals and lodging. The driver may decline a route they consider unsafe, and their decision on the state of a road is final.</p>
        <h3>8. Cancellation (vehicles)</h3>
        <ul>
          <li>More than 72 hours before pick-up: full refund, or free date change.</li>
          <li>24–72 hours before: one day's hire charge is kept.</li>
          <li>Less than 24 hours, or no-show: the first two days' hire are kept; the rest is refunded.</li>
          <li>If we cancel (vehicle unavailable, breakdown before handover), we offer a comparable or better car at the same price, or a full refund, plus TZS 50,000 towards your inconvenience.</li>
        </ul>

        <h2>Part B — Short stays ({bnb})</h2>
        <h3>9. Check-in and check-out</h3>
        <p>Check-in from 14:00, check-out by 11:00. Early check-in and late check-out can be booked as extras subject to availability. Unarranged late check-out is charged at half a night per started three hours, and a full night after 15:00.</p>
        <h3>10. Guests and use of the property</h3>
        <ul>
          <li>Only the number of guests on the booking may stay overnight. Visitors are welcome until 22:00. Parties and events are not allowed without written agreement.</li>
          <li>We must register foreign guests with the immigration office, which is why we ask for a passport or ID at booking or check-in.</li>
          <li>The house rules shown on each property page form part of these terms. Smoking indoors, pets (unless the listing allows them), and commercial photography without permission are not allowed.</li>
        </ul>
        <h3>11. Payment and deposits (stays)</h3>
        <ul>
          <li>Each property shows its payment mode: full payment at booking, a percentage deposit with the balance at check-in, or pay on arrival. Prices are in Tanzanian shillings; dollar figures are for guidance at the rate shown and payment in dollars is accepted at that rate.</li>
          <li>A breakages deposit may be requested at check-in for houses; it is refunded on departure after a walk-through.</li>
          <li>Cleaning fees cover normal cleaning. Excessive mess, damage, missing items or a smoking smell are charged at cost and deducted from any deposit before the remainder is refunded.</li>
        </ul>
        <h3>12. Cancellation (stays)</h3>
        <ul>
          <li>More than 7 days before check-in: full refund of anything paid.</li>
          <li>3–7 days before: the first night is kept.</li>
          <li>Less than 3 days, or no-show: 50% of the booking is kept, up to three nights.</li>
          <li>Leaving early: no refund for unused nights, though we will always try to re-let and refund what we can.</li>
          <li>If we cancel, we rehouse you in a comparable property or refund in full, plus one night free on your next stay.</li>
        </ul>
        <h3>13. Utilities and interruptions</h3>
        <p>Power and water cuts happen in Dar es Salaam. Every property has backup power for lights, fans or AC in bedrooms, Wi-Fi and the fridge, and water storage. We do not refund for utility interruptions outside our control, but we will do what we can to make them short.</p>

        <h2>Part C — Both services</h2>
        <h3>14. Bundle discount</h3>
        <p>The stay + car discount applies when a second booking is made with the reference of the first for overlapping dates. If the first booking is cancelled, the discount on the second is withdrawn and the difference is payable.</p>
        <h3>15. Promo codes</h3>
        <p>One code per booking, not combinable with the bundle discount unless stated, valid only for the dates and services shown, and not exchangeable for cash.</p>
        <h3>16. Our liability</h3>
        <p>We are liable for loss caused by our negligence, up to the value of the booking. We are not liable for indirect loss, missed flights, lost belongings left in a vehicle or property, or for events outside our reasonable control (weather, road closures, civil unrest, utility failure, actions of authorities). Nothing here limits liability that cannot be limited under Tanzanian law.</p>
        <h3>17. Complaints and law</h3>
        <p>Tell us during the hire or stay so we can fix it; a refund request after the fact is harder to assess. These terms are governed by the laws of the United Republic of Tanzania and the courts of Dar es Salaam.</p>
        <h3>18. Contact</h3>
        <p>
          {COMPANY.name}, {s?.businessAddress}. {s?.businessEmail}, {s?.businessPhone}.
        </p>
      </div>
    </article>
  );
}
