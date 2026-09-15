# Auth Dialog Carousel Configuration

## Overview

The authentication dialog carousel dynamically loads images from the file system, making it easy to manage without touching code.

## How It Works

### 1. **Image Folder**

All carousel images are stored in:

```
public/assets/pictures/loginCoursels/
```

### 2. **Dynamic Loading**

- The API route `/api/carousel-images` scans the `loginCoursels` folder
- Returns all image files (.jpg, .jpeg, .png, .webp, .gif)
- The AuthDialog component fetches these images on mount

### 3. **Configuration (`.env.local`)**

```bash
# Carousel Configuration
CAROUSEL_IMAGES_PATH=assets/pictures/loginCoursels
NEXT_PUBLIC_CAROUSEL_AUTOPLAY_DELAY=3000
```

## Adding New Images

### Simply drop images into the folder:

1. Add any image file to `public/assets/pictures/loginCoursels/`
2. Supported formats: `.jpg`, `.jpeg`, `.png`, `.webp`, `.gif`
3. The carousel will automatically pick them up on next page load
4. **No code changes needed!**

## Customization

### Change Autoplay Speed

Edit `.env.local`:

```bash
NEXT_PUBLIC_CAROUSEL_AUTOPLAY_DELAY=5000  # 5 seconds
```

### Change Image Folder Location

1. Update `.env.local`:

```bash
CAROUSEL_IMAGES_PATH=assets/pictures/yourNewFolder
```

2. Update the API route in `app/api/carousel-images/route.ts`:

```typescript
const carouselDir = path.join(
  process.cwd(),
  "public",
  "assets",
  "pictures",
  "yourNewFolder" // Change here
);
```

## Features

✅ **Truly Dynamic** - Reads from file system, not hardcoded  
✅ **No Code Changes** - Just add/remove images from folder  
✅ **Environment Configured** - Easy to customize via `.env.local`  
✅ **Auto-play** - Configurable delay  
✅ **Infinite Loop** - Seamless cycling  
✅ **Loading State** - Shows spinner while fetching  
✅ **Fallback Images** - Graceful degradation if API fails  
✅ **Responsive** - Optimized for all screen sizes

## API Endpoint

**GET** `/api/carousel-images`

**Response:**

```json
{
  "images": [
    "/assets/pictures/loginCoursels/image1.jpg",
    "/assets/pictures/loginCoursels/image2.jpg",
    "/assets/pictures/loginCoursels/image3.jpg"
  ]
}
```

## File Structure

```
app/
  api/
    carousel-images/
      route.ts          # API to scan and return image paths
components/
  auth/
    AuthDialog.tsx      # Uses dynamic image loading
public/
  assets/
    pictures/
      loginCoursels/    # 👈 Add images here!
        *.jpg
        *.jpeg
        *.png
.env.local             # Configuration
```

## Notes

- Images are loaded once when the dialog opens
- Restart dev server after changing `.env.local`
- Images should be optimized for web (recommended: < 500KB each)
- First image loads with priority for better performance
