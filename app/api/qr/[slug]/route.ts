import QRCode from "qrcode";
import { findMemberBySlug } from "@/app/lib/store";

/** Per-member QR code as SVG - resolves to the public giving page. */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const member = findMemberBySlug(slug);
  if (!member) return new Response("Not found", { status: 404 });

  const origin = new URL(req.url).origin;
  const svg = await QRCode.toString(`${origin}/p/${slug}`, {
    type: "svg",
    margin: 1,
    width: 512,
    color: { dark: "#0B2545", light: "#FFFFFF" },
  });
  return new Response(svg, {
    headers: {
      "Content-Type": "image/svg+xml",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
