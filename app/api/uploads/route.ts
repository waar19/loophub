import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { checkRateLimit } from '@/lib/api-helpers';

// POST - Upload an image
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check rate limit
    const rateLimitError = checkRateLimit(request, 'uploads', user.id);
    if (rateLimitError) return rateLimitError;

    // Get form data
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const usedInThreadId = formData.get('threadId') as string | null;
    const usedInCommentId = formData.get('commentId') as string | null;
    const usedInProfile = formData.get('profile') === 'true';

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      return NextResponse.json(
        { error: 'Only image files are allowed' },
        { status: 400 }
      );
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: 'File size exceeds 5MB limit' },
        { status: 400 }
      );
    }

    // Check user's storage quota (50MB per user)
    const { data: usage } = await supabase.rpc('get_user_storage_usage', {
      p_user_id: user.id
    });

    const maxStorageMB = 50;
    if (usage && usage[0]?.total_size_mb >= maxStorageMB) {
      return NextResponse.json(
        { error: `Storage quota exceeded. Maximum ${maxStorageMB}MB per user.` },
        { status: 413 }
      );
    }

    // Generate unique file name
    const fileExt = file.name.split('.').pop()?.toLowerCase() || 'jpg';
    const allowedExts = ['jpg', 'jpeg', 'png', 'gif', 'webp'];
    
    if (!allowedExts.includes(fileExt)) {
      return NextResponse.json(
        { error: 'Invalid file type. Allowed: jpg, jpeg, png, gif, webp' },
        { status: 400 }
      );
    }

    const fileName = `${user.id.slice(0, 8)}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${fileExt}`;
    const filePath = `images/${fileName}`;

    // Upload to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from('uploads')
      .upload(filePath, file, {
        contentType: file.type,
        upsert: false
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      return NextResponse.json(
        { error: 'Failed to upload file' },
        { status: 500 }
      );
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('uploads')
      .getPublicUrl(filePath);

    // Track upload in database
    const { data: imageRecord, error: dbError } = await supabase
      .from('uploaded_images')
      .insert({
        user_id: user.id,
        bucket_name: 'uploads',
        file_path: filePath,
        file_name: file.name,
        file_size: file.size,
        mime_type: file.type,
        public_url: urlData.publicUrl,
        used_in_thread_id: usedInThreadId || null,
        used_in_comment_id: usedInCommentId || null,
        used_in_profile: usedInProfile,
      })
      .select()
      .single();

    if (dbError) {
      console.error('Database error:', dbError);
      // Still return the URL even if tracking fails
    }

    return NextResponse.json({
      url: urlData.publicUrl,
      id: imageRecord?.id,
      fileName: file.name,
      fileSize: file.size,
    });

  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET - Get user's uploaded images
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 50);
    const offset = parseInt(searchParams.get('offset') || '0');

    // Get user's images
    const { data: images, error } = await supabase.rpc('get_user_images', {
      p_user_id: user.id,
      p_limit: limit,
      p_offset: offset
    });

    if (error) {
      // Fallback to direct query
      const { data: fallbackImages, error: fallbackError } = await supabase
        .from('uploaded_images')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (fallbackError) throw fallbackError;
      
      return NextResponse.json({
        images: fallbackImages || [],
        hasMore: (fallbackImages?.length || 0) === limit
      });
    }

    // Get storage usage
    const { data: usage } = await supabase.rpc('get_user_storage_usage', {
      p_user_id: user.id
    });

    return NextResponse.json({
      images: images || [],
      hasMore: (images?.length || 0) === limit,
      usage: usage?.[0] || { total_files: 0, total_size_bytes: 0, total_size_mb: 0 }
    });

  } catch (error) {
    console.error('Get images error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE - Delete an image
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { imageId } = await request.json();

    if (!imageId) {
      return NextResponse.json(
        { error: 'Image ID required' },
        { status: 400 }
      );
    }

    // Get image record
    const { data: image, error: getError } = await supabase
      .from('uploaded_images')
      .select('*')
      .eq('id', imageId)
      .eq('user_id', user.id)
      .single();

    if (getError || !image) {
      return NextResponse.json(
        { error: 'Image not found' },
        { status: 404 }
      );
    }

    // Delete from storage
    const { error: storageError } = await supabase.storage
      .from(image.bucket_name)
      .remove([image.file_path]);

    if (storageError) {
      console.error('Storage delete error:', storageError);
    }

    // Delete from database
    const { error: dbError } = await supabase
      .from('uploaded_images')
      .delete()
      .eq('id', imageId);

    if (dbError) {
      throw dbError;
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Delete image error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
