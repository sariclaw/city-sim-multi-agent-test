function createWorkingCanvas(width, height) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  return canvas;
}

function loadImageAsset(src, whiteToAlpha = false) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => {
      if (!whiteToAlpha) {
        resolve(image);
        return;
      }

      const canvas = createWorkingCanvas(image.naturalWidth, image.naturalHeight);
      const context = canvas.getContext('2d', { willReadFrequently: true });
      if (!context) {
        resolve(image);
        return;
      }

      context.drawImage(image, 0, 0);
      const data = context.getImageData(0, 0, canvas.width, canvas.height);
      for (let index = 0; index < data.data.length; index += 4) {
        const red = data.data[index];
        const green = data.data[index + 1];
        const blue = data.data[index + 2];
        if (red > 244 && green > 244 && blue > 244) {
          data.data[index + 3] = 0;
        }
      }
      context.putImageData(data, 0, 0);
      resolve(canvas);
    };
    image.onerror = () => reject(new Error(`Failed to load ${src}`));
    image.src = src;
  });
}

function spriteSourceRect(image, region) {
  return {
    sx: Math.floor(image.width * region[0]),
    sy: Math.floor(image.height * region[1]),
    sw: Math.max(1, Math.floor(image.width * region[2])),
    sh: Math.max(1, Math.floor(image.height * region[3])),
  };
}

function absoluteSpriteRect(sourceRectPx) {
  return {
    sx: sourceRectPx[0],
    sy: sourceRectPx[1],
    sw: sourceRectPx[2],
    sh: sourceRectPx[3],
  };
}

export function createSpriteLibrary(assetFiles, { onReady } = {}) {
  let spriteLoadPromise = null;
  const spriteSourceCache = new WeakMap();
  const spriteLibrary = {
    ready: false,
    failed: false,
    images: {},
  };

  function trimSpriteRect(image, source, cacheKey) {
    let cachedRegions = spriteSourceCache.get(image);
    if (!cachedRegions) {
      cachedRegions = new Map();
      spriteSourceCache.set(image, cachedRegions);
    }

    if (cachedRegions.has(cacheKey)) {
      return cachedRegions.get(cacheKey);
    }

    const canvas = createWorkingCanvas(source.sw, source.sh);
    const context = canvas.getContext('2d', { willReadFrequently: true });
    if (!context) {
      cachedRegions.set(cacheKey, source);
      return source;
    }

    context.drawImage(
      image,
      source.sx,
      source.sy,
      source.sw,
      source.sh,
      0,
      0,
      source.sw,
      source.sh,
    );

    const data = context.getImageData(0, 0, source.sw, source.sh).data;
    let minX = source.sw;
    let minY = source.sh;
    let maxX = -1;
    let maxY = -1;

    for (let y = 0; y < source.sh; y += 1) {
      for (let x = 0; x < source.sw; x += 1) {
        const offset = (y * source.sw + x) * 4;
        if (data[offset + 3] <= 8) continue;
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x);
        maxY = Math.max(maxY, y);
      }
    }

    const trimmed =
      maxX >= minX && maxY >= minY
        ? {
            sx: source.sx + minX,
            sy: source.sy + minY,
            sw: Math.max(1, maxX - minX + 1),
            sh: Math.max(1, maxY - minY + 1),
          }
        : source;

    cachedRegions.set(cacheKey, trimmed);
    return trimmed;
  }

  function trimmedSpriteSourceRect(image, region) {
    return trimSpriteRect(image, spriteSourceRect(image, region), `rel:${region.join(':')}`);
  }

  function trimmedSpriteAbsoluteRect(image, sourceRectPx) {
    return trimSpriteRect(image, absoluteSpriteRect(sourceRectPx), `abs:${sourceRectPx.join(':')}`);
  }

  function ensureReady() {
    if (spriteLibrary.ready || spriteLoadPromise) return spriteLoadPromise;

    spriteLoadPromise = Promise.all([
      loadImageAsset(assetFiles.city, true),
      loadImageAsset(assetFiles.municipal, true),
      loadImageAsset(assetFiles.brick, true),
      loadImageAsset(assetFiles.brickLarge, true),
      loadImageAsset(assetFiles.roadsA),
      loadImageAsset(assetFiles.roadsB),
    ])
      .then(([city, municipal, brick, brickLarge, roadsA, roadsB]) => {
        spriteLibrary.images = { city, municipal, brick, brickLarge, roadsA, roadsB };
        spriteLibrary.ready = true;
        onReady?.();
      })
      .catch((error) => {
        spriteLibrary.failed = true;
        console.error('Failed to load city sprites.', error);
      });

    return spriteLoadPromise;
  }

  function getImage(key) {
    return spriteLibrary.images[key];
  }

  function drawSpriteRegion(context, image, region, dx, dy, dw, dh, alpha = 1) {
    if (!image) return;
    const { sx, sy, sw, sh } = trimmedSpriteSourceRect(image, region);
    context.save();
    context.imageSmoothingEnabled = false;
    context.globalAlpha = alpha;
    context.drawImage(image, sx, sy, sw, sh, dx, dy, dw, dh);
    context.restore();
  }

  function drawSpriteCutout(context, image, sourceRectPx, dx, dy, dw, dh, alpha = 1) {
    if (!image) return;
    const { sx, sy, sw, sh } = trimmedSpriteAbsoluteRect(image, sourceRectPx);
    context.save();
    context.imageSmoothingEnabled = false;
    context.globalAlpha = alpha;
    context.drawImage(image, sx, sy, sw, sh, dx, dy, dw, dh);
    context.restore();
  }

  return {
    drawSpriteCutout,
    drawSpriteRegion,
    ensureReady,
    getTrimmedAbsoluteRect(image, sourceRectPx) {
      return trimmedSpriteAbsoluteRect(image, sourceRectPx);
    },
    getImage,
    get failed() {
      return spriteLibrary.failed;
    },
    get ready() {
      return spriteLibrary.ready;
    },
  };
}
