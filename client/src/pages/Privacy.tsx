import { COMPANY } from "@bluesparks/shared";
import { useSeo } from "@/lib/useSeo";
import { useSettings } from "@/lib/queries";
import { useT } from "@/i18n";

export default function Privacy() {
  useSeo({ title: "Privacy policy", description: "How Blue Spark Holdings handles your personal data when you hire a car or book a stay." });
  const { data: s } = useSettings();
  const { lang } = useT();
  return (
    <article className="container-x max-w-3xl py-14 lg:py-20">
      <p className="eyebrow">Legal</p>
      <h1 className="mt-2 text-5xl sm:text-6xl">Privacy policy</h1>
      <p className="mt-3 text-sm text-ink-soft">Last updated 1 October 2026. {lang === "sw" && "Ukurasa huu unapatikana kwa Kiingereza tu kwa sasa."}</p>
      <div className="prose-site mt-8">
        <p>{COMPANY.name} ("we") is the data controller for the information you give us when you book a car or a stay, send us a message, or use this website. We follow the Personal Data Protection Act, 2022 of Tanzania and, for guests from the EU and UK, the spirit of the GDPR.</p>
        <h2>What we collect</h2>
        <ul>
          <li><b>Booking details:</b> name, email, phone/WhatsApp number, country, dates, flight number, address for delivery, number of passengers or guests, special requests.</li>
          <li><b>Identity documents:</b> a copy of your driving licence and passport or national ID for vehicle hire, and passport or ID for stays. The law requires us to verify drivers and to register foreign guests with the immigration office.</li>
          <li><b>Payment:</b> we never see or store card numbers or mobile-money PINs. Our payment gateway processes them and tells us only whether the payment succeeded, the amount, and a reference.</li>
          <li><b>Messages:</b> what you write to us by WhatsApp, email or the contact form.</li>
          <li><b>Technical:</b> standard server logs (IP address, browser, pages requested) kept for security for 30 days. We do not use advertising trackers. We store two small preferences (language, currency) in your browser only.</li>
        </ul>
        <h2>Why we use it</h2>
        <ul>
          <li>To run your booking: confirmation, reminders, the check-in note with the gate code, handing over the car.</li>
          <li>To meet legal duties: driver verification, guest registration, insurance claims, tax records.</li>
          <li>To answer your questions and resolve problems.</li>
          <li>We do not sell data and we do not send marketing unless you ask for it.</li>
        </ul>
        <h2>Who sees it</h2>
        <ul>
          <li>Our small team and, for chauffeur-driven hires, the assigned driver (name, phone, pick-up details only).</li>
          <li>Our payment gateway, email provider and WhatsApp (Meta) for sending messages, each only what they need to deliver.</li>
          <li>Our insurer and the police if there is an accident or incident involving a vehicle.</li>
          <li>The Immigration Department for the guest register, as required by law.</li>
        </ul>
        <h2>How long we keep it</h2>
        <ul>
          <li>Booking records: 5 years, for tax and insurance.</li>
          <li>Licence and ID copies: deleted 90 days after the hire or stay ends, unless an incident or claim is open. They are stored encrypted on our server, outside the public web folder, and are only viewable by logged-in staff.</li>
          <li>Contact-form messages: 12 months.</li>
        </ul>
        <h2>Your rights</h2>
        <p>You can ask us what we hold about you, ask us to correct it, or ask us to delete it where we have no legal duty to keep it. Write to {s?.businessEmail} with the booking reference. We answer within 14 days. You may also complain to the Personal Data Protection Commission of Tanzania.</p>
        <h2>Security</h2>
        <p>Our website uses HTTPS. Staff access to the admin dashboard is password-protected with sessions that expire. Uploaded documents are scanned for type and stored under random filenames. No system is perfect; if we ever discover a breach that affects you, we will tell you.</p>
        <h2>Children</h2>
        <p>Bookings must be made by an adult. We collect children's names only when needed for a stay's guest list.</p>
        <h2>Contact</h2>
        <p>
          {COMPANY.name}, {s?.businessAddress}. {s?.businessEmail}, {s?.businessPhone}.
        </p>
      </div>
    </article>
  );
}
