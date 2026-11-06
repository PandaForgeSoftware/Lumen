import { z } from "zod";
import { build } from "./actions.mjs";
export const buildingSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]{1,60}$/),
  name: z.string().min(1).max(80),
  purpose: z.string().min(1).max(1000),
  x: z.number().min(-28).max(28), z: z.number().min(-28).max(28),
  width: z.number().min(6).max(10), depth: z.number().min(6).max(10),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  furnishing: z.enum(["reading-room", "studio", "meeting-room"]),
});
export function buildingDesign(input) {
  const b = buildingSchema.parse(input), w = b.width, d = b.depth;
  const parts = [];
  const box = (x,y,z,sx,sy,sz,color=b.color) => parts.push({shape:"box",x,y,z,sx,sy,sz,color});
  box(0,0.1,0,w,0.2,d,"#bcaa85");
  box(-w/2,1.8,0,0.25,3.6,d);
  box(w/2,1.8,0,0.25,3.6,d);
  box(0,1.8,-d/2,w,3.6,0.25);
  const side=(w-2.8)/2;
  box(-(1.4+side/2),1.8,d/2,side,3.6,0.25);
  box(1.4+side/2,1.8,d/2,side,3.6,0.25);
  box(0,3.3,d/2,2.8,0.6,0.25);
  box(0,3.8,0,w+0.5,0.35,d+0.5,"#4b786c");
  box(-w/2+1.2,0.8,-1,1.5,0.16,2.2,"#876544");
  for (const x of [-w/2+0.7,-w/2+1.7]) for(const z of [-1.8,-0.2]) box(x,0.4,z,0.12,0.8,0.12,"#876544");
  box(w/2-0.8,0.5,-1,0.8,0.2,2,"#759082");
  if(b.furnishing==="reading-room") {
    box(0,1.2,-d/2+0.45,w-1,2.4,0.5,"#876544");
    for(let i=0;i<6;i++) box(-2+i*0.7,1.4,-d/2+0.76,0.45,0.7,0.18,i%2?"#9a785a":"#668b81");
  }
  return {id:b.id,name:b.name,purpose:b.purpose,x:b.x,z:b.z,category:"building",color:b.color,parts};
}
export function buildBuilding(input) { return build(buildingDesign(input)); }
