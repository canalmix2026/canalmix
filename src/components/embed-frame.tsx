import type { IframeHTMLAttributes, Ref } from "react";

type EmbedFrameProps = {
  src: string;
  title: string;
  frameRef?: Ref<HTMLIFrameElement>;
} & Omit<
  IframeHTMLAttributes<HTMLIFrameElement>,
  "src" | "title" | "sandbox" | "allow" | "allowFullScreen" | "ref"
>;

export function EmbedFrame({
  src,
  title,
  frameRef,
  ...attributes
}: EmbedFrameProps) {
  const safeAttributes = { ...attributes } as IframeHTMLAttributes<HTMLIFrameElement>;
  delete safeAttributes.sandbox;

  return (
    <iframe
      ref={frameRef}
      {...safeAttributes}
      allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
      allowFullScreen
      src={src}
      title={title}
    />
  );
}
