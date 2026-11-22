import type { IframeHTMLAttributes, Ref } from "react";

type EmbedFrameProps = {
  src: string;
  title: string;
  allow?: string;
  allowFullScreen?: boolean;
  frameRef?: Ref<HTMLIFrameElement>;
} & Omit<
  IframeHTMLAttributes<HTMLIFrameElement>,
  "src" | "title" | "sandbox" | "allow" | "allowFullScreen" | "ref"
>;

export function EmbedFrame({
  src,
  title,
  allow = "autoplay; encrypted-media; picture-in-picture; fullscreen",
  allowFullScreen = true,
  frameRef,
  ...attributes
}: EmbedFrameProps) {
  const safeAttributes = { ...attributes } as IframeHTMLAttributes<HTMLIFrameElement>;
  delete safeAttributes.sandbox;

  return (
    <iframe
      ref={frameRef}
      {...safeAttributes}
      allow={allow}
      allowFullScreen={allowFullScreen}
      src={src}
      title={title}
    />
  );
}
