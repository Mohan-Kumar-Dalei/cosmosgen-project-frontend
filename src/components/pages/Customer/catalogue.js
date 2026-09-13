import { useEffect, useState } from "react";
import { AirVent, Zap, Droplets, Hammer, Bug, Sparkles, PaintRoller } from "lucide-react";
import { api } from "../../services/api";
import { SERVICE_IMAGE } from "./brand";

/**
 * What the company sells, read from the company's own list.
 *
 * The catalogue lives in one file on the server, and the WhatsApp menu, the
 * assistant's prompt and the app all read it. Typing the services into the
 * website as well would make it the one copy nobody updates - so it is
 * fetched, and a service the office adds appears here without anybody touching
 * this code.
 *
 * The hook and its two lookup tables sit in their own file so that the
 * components which use them export nothing but components, which is what keeps
 * hot reload working while somebody is editing them.
 */
export const ICONS = {
    AC_APPLIANCE: AirVent,
    ELECTRICAL: Zap,
    PLUMBING: Droplets,
    CARPENTRY: Hammer,
    PEST_CONTROL: Bug,
    HOME_CLEANING: Sparkles,
    PAINTING: PaintRoller,
};

/** One line each, in the words somebody would use about their own house. */
export const BLURBS = {
    AC_APPLIANCE: "Air conditioners, fridges, washing machines, microwaves and geysers, serviced, repaired or gas-filled.",
    ELECTRICAL: "Wiring, switchboards, fans, lights, inverters and anything that has stopped giving power.",
    PLUMBING: "Leaks, blocked drains, taps, flush tanks, motors and overhead tank work.",
    HOME_CLEANING: "Whole-house, kitchen, bathroom and sofa cleaning, with everything brought along.",
    CARPENTRY: "Doors, windows, cupboards, beds and fittings, repaired, fitted or made to measure.",
    PEST_CONTROL: "Cockroaches, termites, bed bugs, mosquitoes and rodents, treated room by room.",
    PAINTING: "Interior and exterior painting, putty, texture and touch-up work.",
};

export const useCatalogue = () => {
    const [services, setServices] = useState([]);
    const [loading, setLoading] = useState(true);
    const [failed, setFailed] = useState(false);

    useEffect(() => {
        let alive = true;

        api.get("/customer/services")
            .then((res) => { if (alive) setServices(res.data.data || []); })
            .catch(() => { if (alive) setFailed(true); })
            .finally(() => { if (alive) setLoading(false); });

        return () => { alive = false; };
    }, []);

    return { services, loading, failed };
};

/**
 * The picture and the line of copy for a service, wherever they live.
 *
 * Both now travel with the service from the office's own catalogue. The maps
 * above stay as a fallback for the four that predate that - and as the thing
 * that keeps a brand-new service from showing an empty tile in the seconds
 * between the office adding it and the office uploading its picture.
 */
export const imageFor = (service) => service?.image || SERVICE_IMAGE[service?.key] || "";

export const blurbFor = (service) =>
    service?.blurb || BLURBS[service?.key] || "Ask us and we will tell you what it covers.";

/**
 * One service's picture, as the office currently has it.
 *
 * For the two pages that show a single trade rather than the whole list. They
 * used to name the constant directly, which meant a picture the office changed
 * in the panel appeared everywhere except on them.
 */
export const useServiceImage = (key) => {
    const { services } = useCatalogue();
    return imageFor(services.find((service) => service.key === key) || { key });
};
