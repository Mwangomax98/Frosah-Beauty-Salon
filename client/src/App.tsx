import { lazy, Suspense, useEffect } from "react";
import { Routes, Route, useLocation } from "react-router";
import SiteLayout from "./components/SiteLayout";
import Home from "./pages/Home";
import { PageLoading } from "./components/States";

// Everything except the home route is code-split so the first paint stays light.
const Cars = lazy(() => import("./pages/Cars"));
const VehicleDetail = lazy(() => import("./pages/VehicleDetail"));
const Stays = lazy(() => import("./pages/Stays"));
const PropertyDetail = lazy(() => import("./pages/PropertyDetail"));
const BookCar = lazy(() => import("./pages/book/BookCar"));
const BookStay = lazy(() => import("./pages/book/BookStay"));
const BookingConfirmation = lazy(() => import("./pages/BookingConfirmation"));
const PaymentVerify = lazy(() => import("./pages/PaymentVerify"));
const About = lazy(() => import("./pages/About"));
const Contact = lazy(() => import("./pages/Contact"));
const Terms = lazy(() => import("./pages/Terms"));
const Privacy = lazy(() => import("./pages/Privacy"));
const NotFound = lazy(() => import("./pages/NotFound"));
const Admin = lazy(() => import("./admin/AdminApp"));

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [pathname]);
  return null;
}

export default function App() {
  return (
    <>
      <ScrollToTop />
      <Suspense fallback={<PageLoading />}>
        <Routes>
          <Route path="/admin/*" element={<Admin />} />
          <Route element={<SiteLayout />}>
            <Route index element={<Home />} />
            <Route path="cars" element={<Cars />} />
            <Route path="cars/:slug" element={<VehicleDetail />} />
            <Route path="stays" element={<Stays />} />
            <Route path="stays/:slug" element={<PropertyDetail />} />
            <Route path="book/car" element={<BookCar />} />
            <Route path="book/stay" element={<BookStay />} />
            <Route path="booking/:reference" element={<BookingConfirmation />} />
            <Route path="payments/verify" element={<PaymentVerify />} />
            <Route path="about" element={<About />} />
            <Route path="contact" element={<Contact />} />
            <Route path="terms" element={<Terms />} />
            <Route path="privacy" element={<Privacy />} />
            <Route path="*" element={<NotFound />} />
          </Route>
        </Routes>
      </Suspense>
    </>
  );
}
