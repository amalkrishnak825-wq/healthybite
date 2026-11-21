import { useState } from "react";
import { getImageUrl } from "../utils/imageUrl";

const DEFAULT_FALLBACK = "/login-bg.jpg";

export default function ProductImage({
  src,
  alt = "",
  fallbackSrc = DEFAULT_FALLBACK,
  onError,
  ...imageProps
}) {
  const [failedSource, setFailedSource] = useState("");
  const source = getImageUrl(src);
  const fallback = getImageUrl(fallbackSrc);
  const imageSource = !source || failedSource === source ? fallback : source;

  return (
    <img
      {...imageProps}
      src={imageSource}
      alt={alt}
      onError={(event) => {
        if (source && source !== fallback) setFailedSource(source);
        onError?.(event);
      }}
    />
  );
}
