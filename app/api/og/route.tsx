import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";

export const runtime = "edge";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const title = searchParams.get("title") || "LoopHub";
    const forum = searchParams.get("forum") || "";
    const description = searchParams.get("description") || "Comunidad de minimalismo digital y organización personal";

    return new ImageResponse(
      (
        <div
          style={{
            height: "100%",
            width: "100%",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "#FAFAFA",
            backgroundImage: "linear-gradient(135deg, #FAFAFA 0%, #F5F5F5 100%)",
            padding: "80px",
          }}
        >
          {/* Logo/Brand */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              marginBottom: "40px",
            }}
          >
            <div
              style={{
                width: "80px",
                height: "80px",
                borderRadius: "16px",
                backgroundColor: "#5865F2",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "white",
                fontSize: "48px",
                fontWeight: "bold",
                marginRight: "24px",
              }}
            >
              L
            </div>
            <div
              style={{
                fontSize: "48px",
                fontWeight: "bold",
                color: "#1A1A1A",
              }}
            >
              LoopHub
            </div>
          </div>

          {/* Title */}
          <div
            style={{
              fontSize: "64px",
              fontWeight: "800",
              color: "#1A1A1A",
              textAlign: "center",
              marginBottom: "24px",
              maxWidth: "1000px",
              lineHeight: "1.2",
              display: "flex",
              flexWrap: "wrap",
              justifyContent: "center",
            }}
          >
            {title.length > 60 ? `${title.substring(0, 60)}...` : title}
          </div>

          {/* Forum Badge */}
          {forum && (
            <div
              style={{
                backgroundColor: "#E0E7FF",
                color: "#5865F2",
                padding: "12px 24px",
                borderRadius: "8px",
                fontSize: "24px",
                fontWeight: "600",
                marginBottom: "32px",
              }}
            >
              {forum}
            </div>
          )}

          {/* Description */}
          <div
            style={{
              fontSize: "32px",
              color: "#666666",
              textAlign: "center",
              maxWidth: "900px",
              lineHeight: "1.4",
            }}
          >
            {description.length > 120 ? `${description.substring(0, 120)}...` : description}
          </div>
        </div>
      ),
      {
        width: 1200,
        height: 630,
      }
    );
  } catch (error) {
    console.error("Error generating OG image:", error);
    // Return a simple fallback image
    return new ImageResponse(
      (
        <div
          style={{
            height: "100%",
            width: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "#FAFAFA",
            fontSize: "48px",
            fontWeight: "bold",
            color: "#1A1A1A",
          }}
        >
          LoopHub
        </div>
      ),
      {
        width: 1200,
        height: 630,
      }
    );
  }
}

