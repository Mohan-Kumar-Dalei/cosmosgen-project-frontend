import { X, Navigation, MapPin, Loader2 } from "lucide-react";
import LocationMap from "./LocationMap";
import useAreaLookup from "./useAreaLookup";

const buildPinUrl = (lat, lon) =>
    "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(lat + "," + lon);

/**
 * A location, opened in place.
 *
 * Every "see the location" control used to be a link that threw the admin
 * into a Google tab, losing the panel they were working in. The map now opens
 * here first; the trip out to Google is a button at the bottom, taken only
 * when they actually want the full site.
 *
 * The area and pincode are looked up from the coordinate rather than read off
 * the record, because a WhatsApp booking arrives as a dropped pin with no
 * address text attached to it.
 */
const MapModal = ({ open, onClose, title, subtitle, lat, lon, note, markerColor = "#2563eb" }) => {
    const hasCoords = Number.isFinite(Number(lat)) && Number.isFinite(Number(lon));

    // Only asked for while the modal is open - no point spending a geocode on
    // a panel nobody has looked at.
    const { place, loading } = useAreaLookup(lat, lon, open);

    if (!open) return null;

    return (
        <div
            className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
            onClick={onClose}
        >
            <div
                className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-start justify-between gap-3 px-5 py-4 border-b border-hairline sticky top-0 bg-white rounded-t-2xl">
                    <div className="min-w-0">
                        <p className="font-semibold text-ink truncate">{title}</p>
                        {subtitle && <p className="text-xs text-ink-soft mt-0.5">{subtitle}</p>}
                    </div>
                    <button
                        onClick={onClose}
                        className="shrink-0 p-1.5 rounded-lg text-ink-faint hover:text-ink hover:bg-sunken"
                        aria-label="Close"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-5">
                    {!hasCoords ? (
                        <div className="bg-warn-tint border border-hairline rounded-xl p-4 text-sm text-warn">
                            No coordinates recorded for this location yet.
                        </div>
                    ) : (
                        <>
                            <div className="mb-4 flex items-start gap-2">
                                <MapPin className="w-4 h-4 text-ink-faint shrink-0 mt-0.5" />
                                <div className="min-w-0">
                                    {loading ? (
                                        <span className="flex items-center gap-2 text-sm text-ink-faint">
                                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                            Looking up the area
                                        </span>
                                    ) : place ? (
                                        <>
                                            <p className="text-sm font-semibold text-ink">
                                                {[place.area, place.city].filter(Boolean).join(", ") || "Area not identified"}
                                                {place.pincode && (
                                                    <span className="ml-2 text-xs font-mono font-normal text-ink-soft">
                                                        {place.pincode}
                                                    </span>
                                                )}
                                            </p>
                                            {place.address && (
                                                <p className="text-xs text-ink-soft mt-0.5">{place.address}</p>
                                            )}
                                        </>
                                    ) : (
                                        <p className="text-sm text-ink-soft">Area could not be identified</p>
                                    )}
                                    <p className="text-[11px] font-mono text-ink-faint mt-1">
                                        {Number(lat).toFixed(5)}, {Number(lon).toFixed(5)}
                                    </p>
                                </div>
                            </div>

                            <LocationMap
                                markers={[{ lat: Number(lat), lon: Number(lon), color: markerColor, title }]}
                                className="h-72 sm:h-96"
                                zoom={16}
                            />

                            {note && <p className="text-xs text-ink-soft mt-3">{note}</p>}

                            <a
                                href={buildPinUrl(lat, lon)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center justify-center gap-2 w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg text-sm mt-4"
                            >
                                <Navigation className="w-4 h-4" />
                                Open in Google Maps
                            </a>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default MapModal;
