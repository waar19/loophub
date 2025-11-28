import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";

export const runtime = "edge";

// Cache for 1 week, revalidate every day
export const revalidate = 86400;

type OGType = "thread" | "forum" | "profile" | "default";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    
    // Common params
    const type = (searchParams.get("type") || "default") as OGType;
    const title = searchParams.get("title") || "LoopHub";
    const description = searchParams.get("description") || "Comunidad de minimalismo digital y organización personal";
    
    // Thread params
    const forum = searchParams.get("forum") || "";
    const author = searchParams.get("author") || "";
    const votes = parseInt(searchParams.get("votes") || "0", 10);
    const comments = parseInt(searchParams.get("comments") || "0", 10);
    const tags = searchParams.get("tags")?.split(",").filter(Boolean) || [];
    
    // Profile params
    const karma = parseInt(searchParams.get("karma") || "0", 10);
    const level = parseInt(searchParams.get("level") || "0", 10);
    const threads = parseInt(searchParams.get("threads") || "0", 10);
    
    // Forum params
    const threadCount = parseInt(searchParams.get("threadCount") || "0", 10);

    // Generate based on type
    switch (type) {
      case "thread":
        return generateThreadOG({ title, forum, author, votes, comments, tags, description });
      case "forum":
        return generateForumOG({ title, description, threadCount });
      case "profile":
        return generateProfileOG({ title, karma, level, threads, comments });
      default:
        return generateDefaultOG({ title, description });
    }
  } catch (error) {
    console.error("Error generating OG image:", error);
    return generateFallbackOG();
  }
}

// Thread OG Image
function generateThreadOG({ 
  title, 
  forum, 
  author, 
  votes, 
  comments, 
  tags,
  description 
}: { 
  title: string; 
  forum: string; 
  author: string; 
  votes: number; 
  comments: number; 
  tags: string[];
  description: string;
}) {
  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          backgroundColor: "#0F0F0F",
          backgroundImage: "linear-gradient(135deg, #0F0F0F 0%, #1A1A2E 50%, #16213E 100%)",
          padding: "60px",
          position: "relative",
        }}
      >
        {/* Top gradient accent */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: "8px",
            background: "linear-gradient(90deg, #5865F2 0%, #7C3AED 50%, #EC4899 100%)",
          }}
        />

        {/* Header: Logo + Forum */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: "40px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center" }}>
            <div
              style={{
                width: "56px",
                height: "56px",
                borderRadius: "12px",
                background: "linear-gradient(135deg, #5865F2 0%, #7C3AED 100%)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "white",
                fontSize: "32px",
                fontWeight: "bold",
                marginRight: "16px",
              }}
            >
              L
            </div>
            <span style={{ fontSize: "32px", fontWeight: "bold", color: "#FFFFFF" }}>
              LoopHub
            </span>
          </div>
          
          {forum && (
            <div
              style={{
                background: "rgba(88, 101, 242, 0.2)",
                border: "1px solid rgba(88, 101, 242, 0.5)",
                color: "#818CF8",
                padding: "10px 20px",
                borderRadius: "24px",
                fontSize: "22px",
                fontWeight: "600",
              }}
            >
              📁 {forum}
            </div>
          )}
        </div>

        {/* Title */}
        <div
          style={{
            fontSize: title.length > 50 ? "48px" : "56px",
            fontWeight: "800",
            color: "#FFFFFF",
            lineHeight: "1.2",
            marginBottom: "24px",
            maxWidth: "1000px",
            display: "-webkit-box",
            WebkitLineClamp: 2,
            overflow: "hidden",
          }}
        >
          {title.length > 80 ? `${title.substring(0, 80)}...` : title}
        </div>

        {/* Description preview */}
        {description && (
          <div
            style={{
              fontSize: "24px",
              color: "#9CA3AF",
              lineHeight: "1.4",
              marginBottom: "auto",
              maxWidth: "900px",
              display: "-webkit-box",
              WebkitLineClamp: 2,
              overflow: "hidden",
            }}
          >
            {description.length > 150 ? `${description.substring(0, 150)}...` : description}
          </div>
        )}

        {/* Tags */}
        {tags.length > 0 && (
          <div style={{ display: "flex", gap: "12px", marginBottom: "24px", flexWrap: "wrap" }}>
            {tags.slice(0, 4).map((tag, i) => (
              <div
                key={i}
                style={{
                  background: "rgba(124, 58, 237, 0.2)",
                  border: "1px solid rgba(124, 58, 237, 0.4)",
                  color: "#A78BFA",
                  padding: "8px 16px",
                  borderRadius: "16px",
                  fontSize: "18px",
                  fontWeight: "500",
                }}
              >
                #{tag}
              </div>
            ))}
          </div>
        )}

        {/* Footer: Stats + Author */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginTop: "auto",
            paddingTop: "24px",
            borderTop: "1px solid rgba(255, 255, 255, 0.1)",
          }}
        >
          {/* Stats */}
          <div style={{ display: "flex", gap: "32px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ fontSize: "28px" }}>⬆️</span>
              <span style={{ fontSize: "28px", fontWeight: "bold", color: "#10B981" }}>
                {votes >= 1000 ? `${(votes / 1000).toFixed(1)}k` : votes}
              </span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ fontSize: "28px" }}>💬</span>
              <span style={{ fontSize: "28px", fontWeight: "bold", color: "#60A5FA" }}>
                {comments >= 1000 ? `${(comments / 1000).toFixed(1)}k` : comments}
              </span>
            </div>
          </div>

          {/* Author */}
          {author && (
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <div
                style={{
                  width: "44px",
                  height: "44px",
                  borderRadius: "50%",
                  background: "linear-gradient(135deg, #5865F2 0%, #EC4899 100%)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "white",
                  fontSize: "20px",
                  fontWeight: "bold",
                }}
              >
                {author.charAt(0).toUpperCase()}
              </div>
              <span style={{ fontSize: "24px", color: "#9CA3AF" }}>
                @{author}
              </span>
            </div>
          )}
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
      headers: {
        "Cache-Control": "public, max-age=604800, s-maxage=604800, stale-while-revalidate=86400",
      },
    }
  );
}

// Forum OG Image
function generateForumOG({ 
  title, 
  description, 
  threadCount 
}: { 
  title: string; 
  description: string; 
  threadCount: number;
}) {
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
          backgroundColor: "#0F0F0F",
          backgroundImage: "linear-gradient(135deg, #1E1E3F 0%, #0F0F0F 50%, #1A1A2E 100%)",
          padding: "60px",
          position: "relative",
        }}
      >
        {/* Decorative circles */}
        <div
          style={{
            position: "absolute",
            top: "-100px",
            right: "-100px",
            width: "400px",
            height: "400px",
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(88, 101, 242, 0.2) 0%, transparent 70%)",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: "-150px",
            left: "-150px",
            width: "500px",
            height: "500px",
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(124, 58, 237, 0.15) 0%, transparent 70%)",
          }}
        />

        {/* Logo */}
        <div style={{ display: "flex", alignItems: "center", marginBottom: "40px" }}>
          <div
            style={{
              width: "80px",
              height: "80px",
              borderRadius: "20px",
              background: "linear-gradient(135deg, #5865F2 0%, #7C3AED 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "white",
              fontSize: "48px",
              fontWeight: "bold",
              marginRight: "20px",
              boxShadow: "0 20px 40px rgba(88, 101, 242, 0.3)",
            }}
          >
            L
          </div>
          <span style={{ fontSize: "40px", fontWeight: "bold", color: "#FFFFFF" }}>
            LoopHub
          </span>
        </div>

        {/* Forum icon */}
        <div
          style={{
            fontSize: "72px",
            marginBottom: "24px",
          }}
        >
          📁
        </div>

        {/* Forum name */}
        <div
          style={{
            fontSize: "64px",
            fontWeight: "800",
            color: "#FFFFFF",
            textAlign: "center",
            marginBottom: "16px",
            background: "linear-gradient(135deg, #FFFFFF 0%, #818CF8 100%)",
            backgroundClip: "text",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}
        >
          {title}
        </div>

        {/* Description */}
        <div
          style={{
            fontSize: "28px",
            color: "#9CA3AF",
            textAlign: "center",
            maxWidth: "800px",
            marginBottom: "40px",
            lineHeight: "1.4",
          }}
        >
          {description.length > 100 ? `${description.substring(0, 100)}...` : description}
        </div>

        {/* Thread count */}
        <div
          style={{
            background: "rgba(88, 101, 242, 0.2)",
            border: "1px solid rgba(88, 101, 242, 0.4)",
            padding: "16px 32px",
            borderRadius: "32px",
            display: "flex",
            alignItems: "center",
            gap: "12px",
          }}
        >
          <span style={{ fontSize: "32px" }}>📝</span>
          <span style={{ fontSize: "28px", fontWeight: "bold", color: "#818CF8" }}>
            {threadCount >= 1000 ? `${(threadCount / 1000).toFixed(1)}k` : threadCount} hilos
          </span>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
      headers: {
        "Cache-Control": "public, max-age=604800, s-maxage=604800, stale-while-revalidate=86400",
      },
    }
  );
}

// Profile OG Image
function generateProfileOG({ 
  title, 
  karma, 
  level, 
  threads, 
  comments 
}: { 
  title: string; 
  karma: number; 
  level: number; 
  threads: number; 
  comments: number;
}) {
  const levelNames = ["Nuevo", "Miembro", "Activo", "Veterano", "Experto", "Leyenda"];
  const levelColors = ["#9CA3AF", "#60A5FA", "#10B981", "#F59E0B", "#EF4444", "#A855F7"];
  
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
          backgroundColor: "#0F0F0F",
          backgroundImage: "linear-gradient(135deg, #0F0F0F 0%, #1E1E3F 50%, #0F0F0F 100%)",
          padding: "60px",
          position: "relative",
        }}
      >
        {/* Top accent */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: "6px",
            background: `linear-gradient(90deg, ${levelColors[level]} 0%, #5865F2 100%)`,
          }}
        />

        {/* Logo */}
        <div style={{ display: "flex", alignItems: "center", marginBottom: "48px" }}>
          <div
            style={{
              width: "56px",
              height: "56px",
              borderRadius: "12px",
              background: "linear-gradient(135deg, #5865F2 0%, #7C3AED 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "white",
              fontSize: "32px",
              fontWeight: "bold",
              marginRight: "16px",
            }}
          >
            L
          </div>
          <span style={{ fontSize: "32px", fontWeight: "bold", color: "#FFFFFF" }}>
            LoopHub
          </span>
        </div>

        {/* Avatar */}
        <div
          style={{
            width: "140px",
            height: "140px",
            borderRadius: "50%",
            background: `linear-gradient(135deg, ${levelColors[level]} 0%, #5865F2 100%)`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "white",
            fontSize: "64px",
            fontWeight: "bold",
            marginBottom: "24px",
            boxShadow: `0 20px 40px ${levelColors[level]}40`,
            border: `4px solid ${levelColors[level]}`,
          }}
        >
          {title.charAt(0).toUpperCase()}
        </div>

        {/* Username */}
        <div
          style={{
            fontSize: "52px",
            fontWeight: "800",
            color: "#FFFFFF",
            marginBottom: "12px",
          }}
        >
          @{title}
        </div>

        {/* Level badge */}
        <div
          style={{
            background: `${levelColors[level]}20`,
            border: `2px solid ${levelColors[level]}`,
            color: levelColors[level],
            padding: "10px 24px",
            borderRadius: "24px",
            fontSize: "22px",
            fontWeight: "700",
            marginBottom: "40px",
            display: "flex",
            alignItems: "center",
            gap: "8px",
          }}
        >
          ⭐ Nivel {level} • {levelNames[level]}
        </div>

        {/* Stats */}
        <div
          style={{
            display: "flex",
            gap: "48px",
            background: "rgba(255, 255, 255, 0.05)",
            padding: "24px 48px",
            borderRadius: "24px",
            border: "1px solid rgba(255, 255, 255, 0.1)",
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
            <span style={{ fontSize: "36px", fontWeight: "bold", color: "#F59E0B" }}>
              {karma >= 1000 ? `${(karma / 1000).toFixed(1)}k` : karma}
            </span>
            <span style={{ fontSize: "18px", color: "#9CA3AF" }}>Karma</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
            <span style={{ fontSize: "36px", fontWeight: "bold", color: "#60A5FA" }}>
              {threads}
            </span>
            <span style={{ fontSize: "18px", color: "#9CA3AF" }}>Hilos</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
            <span style={{ fontSize: "36px", fontWeight: "bold", color: "#10B981" }}>
              {comments}
            </span>
            <span style={{ fontSize: "18px", color: "#9CA3AF" }}>Comentarios</span>
          </div>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
      headers: {
        "Cache-Control": "public, max-age=604800, s-maxage=604800, stale-while-revalidate=86400",
      },
    }
  );
}

// Default OG Image
function generateDefaultOG({ title, description }: { title: string; description: string }) {
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
          backgroundColor: "#0F0F0F",
          backgroundImage: "linear-gradient(135deg, #0F0F0F 0%, #1A1A2E 50%, #16213E 100%)",
          padding: "80px",
          position: "relative",
        }}
      >
        {/* Gradient orbs */}
        <div
          style={{
            position: "absolute",
            top: "50px",
            left: "100px",
            width: "300px",
            height: "300px",
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(88, 101, 242, 0.3) 0%, transparent 70%)",
            filter: "blur(40px)",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: "50px",
            right: "100px",
            width: "400px",
            height: "400px",
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(124, 58, 237, 0.25) 0%, transparent 70%)",
            filter: "blur(40px)",
          }}
        />

        {/* Logo */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            marginBottom: "48px",
          }}
        >
          <div
            style={{
              width: "100px",
              height: "100px",
              borderRadius: "24px",
              background: "linear-gradient(135deg, #5865F2 0%, #7C3AED 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "white",
              fontSize: "56px",
              fontWeight: "bold",
              marginRight: "24px",
              boxShadow: "0 20px 60px rgba(88, 101, 242, 0.4)",
            }}
          >
            L
          </div>
          <div
            style={{
              fontSize: "64px",
              fontWeight: "800",
              background: "linear-gradient(135deg, #FFFFFF 0%, #818CF8 100%)",
              backgroundClip: "text",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            LoopHub
          </div>
        </div>

        {/* Title */}
        <div
          style={{
            fontSize: "56px",
            fontWeight: "700",
            color: "#FFFFFF",
            textAlign: "center",
            marginBottom: "24px",
            maxWidth: "900px",
            lineHeight: "1.2",
          }}
        >
          {title.length > 60 ? `${title.substring(0, 60)}...` : title}
        </div>

        {/* Description */}
        <div
          style={{
            fontSize: "28px",
            color: "#9CA3AF",
            textAlign: "center",
            maxWidth: "800px",
            lineHeight: "1.5",
          }}
        >
          {description.length > 120 ? `${description.substring(0, 120)}...` : description}
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
      headers: {
        "Cache-Control": "public, max-age=604800, s-maxage=604800, stale-while-revalidate=86400",
      },
    }
  );
}

// Fallback OG Image
function generateFallbackOG() {
  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#0F0F0F",
          backgroundImage: "linear-gradient(135deg, #0F0F0F 0%, #1A1A2E 100%)",
        }}
      >
        <div
          style={{
            width: "120px",
            height: "120px",
            borderRadius: "28px",
            background: "linear-gradient(135deg, #5865F2 0%, #7C3AED 100%)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "white",
            fontSize: "72px",
            fontWeight: "bold",
            marginRight: "28px",
          }}
        >
          L
        </div>
        <span style={{ fontSize: "72px", fontWeight: "bold", color: "#FFFFFF" }}>
          LoopHub
        </span>
      </div>
    ),
    {
      width: 1200,
      height: 630,
      headers: {
        "Cache-Control": "public, max-age=604800, s-maxage=604800, stale-while-revalidate=86400",
      },
    }
  );
}

