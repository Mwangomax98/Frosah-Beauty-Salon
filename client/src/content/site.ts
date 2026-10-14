// Site copy that is reused across pages. Written in the owner's voice.

export const AREAS = [
  { name: "Masaki", note: "Peninsula. Embassies, Slipway, the sea on three sides." },
  { name: "Oyster Bay", note: "Coco Beach on your doorstep. Quiet streets, big trees." },
  { name: "Mikocheni", note: "Family houses with compounds, ten minutes from Mlimani City." },
  { name: "Mbezi Beach", note: "North coast. Long beach, long drives, fewer traffic lights." },
  { name: "City Centre", note: "Posta, Samora Avenue, the harbour and the ferry to Kigamboni." },
  { name: "Upanga", note: "Old Dar. Close to Kariakoo and the hospital district." },
  { name: "Kigamboni", note: "Over the Nyerere bridge. Beach houses, slower mornings." },
] as const;

export const FAQ = [
  {
    q: "Can you meet me at the airport?",
    a: "Yes. Tell us your flight number and we wait at JNIA arrivals with the car and a board with your name. If the flight is late, we are late with it. No extra charge for waiting.",
  },
  {
    q: "Do I need an international driving permit?",
    a: "A valid licence from your home country in English (or with an English translation) works for up to 90 days. Bring the original card, not a photo. Minimum age for self-drive is 23, with two years of driving history.",
  },
  {
    q: "What happens if the car breaks down upcountry?",
    a: "You call us. We have mechanics we trust in Morogoro, Dodoma, Arusha and Mbeya and we arrange a swap car if the repair takes more than a day. Keep the receipts and we settle them.",
  },
  {
    q: "Is the deposit refundable?",
    a: "Fully, within three working days of the car coming back in the same condition it left. For stays, the deposit is simply the first part of your payment, not a separate hold.",
  },
  {
    q: "Can I book a car and a stay together?",
    a: "Please do. Book either one first; the confirmation page gives you a link that pre-fills your dates for the other and takes the bundle discount off automatically.",
  },
  {
    q: "What time is check-in?",
    a: "From 14:00, check-out by 11:00. Landing at 03:00 on the Doha flight? Add early check-in as an extra and the flat is ready when you arrive, or let the driver take you for breakfast at Slipway first.",
  },
  {
    q: "How do I pay?",
    a: "M-Pesa, Tigo Pesa, Airtel Money, Halopesa or a Visa/Mastercard through our payment gateway. Or reserve now and pay cash or mobile money when you collect the keys. Prices are in Tanzanian shillings; we show US dollars at the day's rate for convenience.",
  },
] as const;

export const PAYMENT_METHODS = ["M-Pesa", "Tigo Pesa", "Airtel Money", "Halopesa", "Visa", "Mastercard"] as const;
