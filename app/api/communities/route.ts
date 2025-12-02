import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";

// GET - List communities with advanced filters
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const searchParams = request.nextUrl.searchParams;

    const category = searchParams.get("category");
    const search = searchParams.get("q");
    const sort = searchParams.get("sort") || "popular"; // popular, newest, alphabetical, active
    const limit = Math.min(parseInt(searchParams.get("limit") || "20"), 50);
    const offset = parseInt(searchParams.get("offset") || "0");
    const my = searchParams.get("my") === "true"; // Get user's communities
    const visibility = searchParams.get("visibility"); // public, private, invite_only
    const minMembers = parseInt(searchParams.get("minMembers") || "0");
    const maxMembers = searchParams.get("maxMembers")
      ? parseInt(searchParams.get("maxMembers")!)
      : null;
    const exclude = searchParams.get("exclude")?.split(",") || []; // Exclude community IDs
    const suggested = searchParams.get("suggested") === "true"; // Get suggested for user

    let query = supabase.from("communities").select(
      `
        *,
        category:community_categories(id, name, slug, icon),
        creator:profiles!created_by(id, username, avatar_url),
        _count:community_members(count)
      `,
      { count: "exact" }
    );

    // Filter by user's communities
    if (my) {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }

      const { data: memberCommunities } = await supabase
        .from("community_members")
        .select("community_id")
        .eq("user_id", user.id);

      const communityIds = memberCommunities?.map((m) => m.community_id) || [];

      if (communityIds.length === 0) {
        return NextResponse.json({
          communities: [],
          total: 0,
          hasMore: false,
        });
      }

      query = query.in("id", communityIds);
    } else if (suggested) {
      // Get suggested communities (ones user isn't a member of)
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        const { data: memberCommunities } = await supabase
          .from("community_members")
          .select("community_id")
          .eq("user_id", user.id);

        const userCommunityIds =
          memberCommunities?.map((m) => m.community_id) || [];

        if (userCommunityIds.length > 0) {
          query = query.not("id", "in", `(${userCommunityIds.join(",")})`);
        }
      }

      // Only public for suggestions
      query = query.eq("visibility", "public");
    } else {
      // Only public communities for non-my queries
      if (visibility) {
        query = query.eq("visibility", visibility);
      } else {
        query = query.eq("visibility", "public");
      }
    }

    // Exclude specific communities
    if (exclude.length > 0) {
      query = query.not("id", "in", `(${exclude.join(",")})`);
    }

    // Filter by category
    if (category) {
      const { data: cat } = await supabase
        .from("community_categories")
        .select("id")
        .eq("slug", category)
        .single();

      if (cat) {
        query = query.eq("category_id", cat.id);
      }
    }

    // Search
    if (search) {
      query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%`);
    }

    // Sort
    switch (sort) {
      case "newest":
        query = query.order("created_at", { ascending: false });
        break;
      case "alphabetical":
        query = query.order("name", { ascending: true });
        break;
      case "popular":
      default:
        query = query.order("created_at", { ascending: false }); // TODO: Sort by member count
        break;
    }

    // Pagination
    query = query.range(offset, offset + limit - 1);

    const { data: communities, error, count } = await query;

    if (error) {
      console.error("Error fetching communities:", error);
      return NextResponse.json(
        { error: "Failed to fetch communities" },
        { status: 500 }
      );
    }

    // Get member counts
    const communitiesWithCounts = await Promise.all(
      (communities || []).map(async (community) => {
        const { count: memberCount } = await supabase
          .from("community_members")
          .select("*", { count: "exact", head: true })
          .eq("community_id", community.id);

        return {
          ...community,
          member_count: memberCount || 0,
        };
      })
    );

    return NextResponse.json({
      communities: communitiesWithCounts,
      total: count || 0,
      hasMore: offset + limit < (count || 0),
    });
  } catch (error) {
    console.error("Communities GET error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST - Create community
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user can create communities (level 3+ or admin)
    const { data: profile } = await supabase
      .from("profiles")
      .select("level, is_admin")
      .eq("id", user.id)
      .single();

    if (!profile?.is_admin && (profile?.level || 0) < 3) {
      return NextResponse.json(
        {
          error: "You need to be level 3 or higher to create communities",
        },
        { status: 403 }
      );
    }

    // Check community limit (max 3 per user)
    const { count: existingCount } = await supabase
      .from("communities")
      .select("*", { count: "exact", head: true })
      .eq("created_by", user.id);

    if ((existingCount || 0) >= 3 && !profile?.is_admin) {
      return NextResponse.json(
        {
          error: "You can only create up to 3 communities",
        },
        { status: 403 }
      );
    }

    const body = await request.json();
    const {
      name,
      description,
      rules,
      category_id,
      visibility,
      member_limit,
      image_url,
      banner_url,
    } = body;

    // Validate name
    if (!name || name.trim().length < 3 || name.trim().length > 100) {
      return NextResponse.json(
        {
          error: "Community name must be between 3 and 100 characters",
        },
        { status: 400 }
      );
    }

    // Generate slug
    const baseSlug = name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .substring(0, 50);

    // Check if slug exists
    const { data: existing } = await supabase
      .from("communities")
      .select("id")
      .eq("slug", baseSlug)
      .single();

    const slug = existing ? `${baseSlug}-${Date.now().toString(36)}` : baseSlug;

    // Create community
    const { data: community, error: createError } = await supabase
      .from("communities")
      .insert({
        name: name.trim(),
        slug,
        description: description?.trim() || null,
        rules: rules?.trim() || null,
        category_id: category_id || null,
        visibility: visibility || "public",
        member_limit: member_limit || null,
        image_url: image_url || null,
        banner_url: banner_url || null,
        created_by: user.id,
      })
      .select()
      .single();

    if (createError) {
      console.error("Error creating community:", createError);
      return NextResponse.json(
        { error: "Failed to create community" },
        { status: 500 }
      );
    }

    // Add creator as owner
    await supabase.from("community_members").insert({
      community_id: community.id,
      user_id: user.id,
      role: "owner",
    });

    return NextResponse.json({ community }, { status: 201 });
  } catch (error) {
    console.error("Communities POST error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
