import type { IframeHTMLAttributes, Ref } from "react";
import { DEFAULT_EMBED_SANDBOX } from "@/lib/embed-provider-policy-core";

type EmbedFrameProps = {
  src: string;
  title: string;
  sandbox?: string | null;
  frameRef?: Ref<HTMLIFrameElement>;
} & Omit<
  IframeHTMLAttributes<HTMLIFrameElement>,
  "src" | "title" | "sandbox" | "ref"
>;

export function EmbedFrame({
  src,
  title,
  sandbox = DEFAULT_EMBED_SANDBOX,
  frameRef,
  ...attributes
}: EmbedFrameProps) {
  const sandboxAttribute = sandbox === null ? {} : { sandbox };

  return (
    <iframe
      ref={frameRef}
      {...attributes}
      {...sandboxAttribute}
      src={src}
      title={title}
    />
  );
}
