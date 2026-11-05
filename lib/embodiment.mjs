import { get, put } from "./store.mjs";
export const places = {
  library: { x: -9, z: -5.3 },
  workshop: { x: 9, z: -5.6 },
  cottage: { x: -21.5, z: 20 },
  overlook: { x: 0, z: -25 },
  pond: { x: -18, z: 5 },
  commons: { x: 0, z: 5 },
};
export function setActivity(mode, x, z, label, extra = {}) {
  if (
    !Number.isFinite(x) ||
    !Number.isFinite(z) ||
    Math.abs(x) > 50 ||
    Math.abs(z) > 50
  )
    throw new Error("Choose a destination inside the valley.");
  const previous = get("runtime", "embodiment");
  return put("runtime", {
    id: "embodiment",
    mode,
    x,
    z,
    label: String(label).slice(0, 200),
    previous: previous ? { x: previous.x, z: previous.z } : places.workshop,
    ...extra,
  });
}
export function goToPlace(place) {
  const target = places[place];
  if (!target) throw new Error("Unknown place.");
  setActivity("visiting", target.x, target.z, "Visiting the " + place);
  return {
    destination: place,
    ...target,
    note: "The world character walks to this destination when the world is open. This is a virtual-world action.",
  };
}
