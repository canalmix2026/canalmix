import { isSafeHttpsUrl, normalizeSafeHttpUrl } from "@/lib/channel-schema";

const MAX_EMBED_CODE_LENGTH = 10_000;

function skipWhitespace(value: string, start: number) {
  let index = start;
  while (index < value.length && /\s/.test(value[index])) {
    index += 1;
  }
  return index;
}

function decodeAttributeEntities(value: string): string | null {
  let invalidEntity = false;
  const decoded = value.replace(
    /&(#x[\da-f]+|#\d+|amp|quot|apos|lt|gt);/gi,
    (entity, name: string) => {
      if (name[0] !== "#") {
        const namedEntities: Record<string, string> = {
          amp: "&",
          quot: '"',
          apos: "'",
          lt: "<",
          gt: ">",
        };
        return namedEntities[name.toLowerCase()] ?? entity;
      }

      const codePoint = name[1]?.toLowerCase() === "x"
        ? Number.parseInt(name.slice(2), 16)
        : Number.parseInt(name.slice(1), 10);
      if (
        !Number.isInteger(codePoint) ||
        codePoint < 1 ||
        codePoint > 0x10ffff ||
        (codePoint >= 0xd800 && codePoint <= 0xdfff)
      ) {
        invalidEntity = true;
        return "";
      }
      return String.fromCodePoint(codePoint);
    },
  );

  if (invalidEntity || /&(?:#(?:x[\da-f]+|\d+)|[a-z][\da-z]+);/i.test(decoded)) {
    return null;
  }
  return decoded;
}

/** Extracts only the src from one iframe snippet. The supplied markup is never rendered. */
export function extractEmbedIframeSrc(input: string): string | null {
  if (!input || input.length > MAX_EMBED_CODE_LENGTH) {
    return null;
  }

  const code = input.trim();
  let index = skipWhitespace(code, 0);
  if (code[index] !== "<") {
    return null;
  }

  index += 1;
  const tagStart = index;
  while (index < code.length && /[a-z\d:-]/i.test(code[index])) {
    index += 1;
  }
  if (
    code.slice(tagStart, index).toLowerCase() !== "iframe" ||
    !/[\s/>]/.test(code[index] ?? "")
  ) {
    return null;
  }

  let src: string | null = null;
  let selfClosing = false;
  let openingTagClosed = false;

  while (index < code.length) {
    index = skipWhitespace(code, index);
    const character = code[index];

    if (character === ">") {
      index += 1;
      openingTagClosed = true;
      break;
    }

    if (character === "/") {
      index = skipWhitespace(code, index + 1);
      if (code[index] !== ">") {
        return null;
      }
      index += 1;
      selfClosing = true;
      openingTagClosed = true;
      break;
    }

    const attributeStart = index;
    while (
      index < code.length &&
      !/[\s=/>]/.test(code[index])
    ) {
      index += 1;
    }
    if (index === attributeStart) {
      return null;
    }

    const attributeName = code.slice(attributeStart, index).toLowerCase();
    index = skipWhitespace(code, index);
    let attributeValue: string | null = null;

    if (code[index] === "=") {
      index = skipWhitespace(code, index + 1);
      const quote = code[index] === '"' || code[index] === "'"
        ? code[index]
        : null;

      if (quote) {
        index += 1;
        const valueStart = index;
        while (index < code.length && code[index] !== quote) {
          index += 1;
        }
        if (index >= code.length) {
          return null;
        }
        attributeValue = code.slice(valueStart, index);
        index += 1;
      } else {
        const valueStart = index;
        while (index < code.length && !/[\s>]/.test(code[index])) {
          if (/["'<=`]/.test(code[index])) {
            return null;
          }
          index += 1;
        }
        if (index === valueStart) {
          return null;
        }
        attributeValue = code.slice(valueStart, index);
      }
    }

    if (attributeName === "src") {
      if (src !== null || attributeValue === null) {
        return null;
      }
      src = attributeValue;
    }
  }

  if (!openingTagClosed || src === null) {
    return null;
  }

  if (!selfClosing) {
    const closingTagStart = code.toLowerCase().indexOf("</iframe", index);
    if (
      closingTagStart < 0 ||
      code.slice(index, closingTagStart).includes("<") ||
      !/[\s>]/.test(code[closingTagStart + 8] ?? "")
    ) {
      return null;
    }

    index = skipWhitespace(code, closingTagStart + 8);
    if (code[index] !== ">") {
      return null;
    }
    index += 1;
  }

  if (skipWhitespace(code, index) !== code.length) {
    return null;
  }

  const decodedSrc = decodeAttributeEntities(src)?.trim();
  return decodedSrc && isSafeHttpsUrl(decodedSrc) ? decodedSrc : null;
}

export type ParsedEmbedIframe = {
  src: string;
  title?: string;
  allow?: string;
  allowFullscreen: boolean;
};

/** Parses one inert iframe snippet and keeps only safe iframe presentation attributes. */
export function parseEmbedIframeCode(input: string): ParsedEmbedIframe | null {
  if (!input || input.length > MAX_EMBED_CODE_LENGTH) return null;

  const code = input.trim();
  let index = skipWhitespace(code, 0);
  if (code[index] !== "<") return null;

  index += 1;
  const tagStart = index;
  while (index < code.length && /[a-z\d:-]/i.test(code[index])) index += 1;
  if (
    code.slice(tagStart, index).toLowerCase() !== "iframe" ||
    !/[\s/>]/.test(code[index] ?? "")
  ) {
    return null;
  }

  const attributes = new Map<string, string | null>();
  let selfClosing = false;
  let openingTagClosed = false;

  while (index < code.length) {
    index = skipWhitespace(code, index);
    const character = code[index];

    if (character === ">") {
      index += 1;
      openingTagClosed = true;
      break;
    }

    if (character === "/") {
      index = skipWhitespace(code, index + 1);
      if (code[index] !== ">") return null;
      index += 1;
      selfClosing = true;
      openingTagClosed = true;
      break;
    }

    const attributeStart = index;
    while (index < code.length && !/[\s=/>]/.test(code[index])) index += 1;
    if (index === attributeStart) return null;

    const name = code.slice(attributeStart, index).toLowerCase();
    if (!new Set(["src", "title", "allow", "allowfullscreen"]).has(name)) {
      return null;
    }
    if (attributes.has(name)) return null;

    index = skipWhitespace(code, index);
    let value: string | null = null;
    if (code[index] === "=") {
      index = skipWhitespace(code, index + 1);
      const quote = code[index] === '"' || code[index] === "'" ? code[index] : null;
      if (quote) {
        index += 1;
        const valueStart = index;
        while (index < code.length && code[index] !== quote) index += 1;
        if (index >= code.length) return null;
        value = code.slice(valueStart, index);
        index += 1;
      } else {
        const valueStart = index;
        while (index < code.length && !/[\s>]/.test(code[index])) {
          if (/["'<=`]/.test(code[index])) return null;
          index += 1;
        }
        if (index === valueStart) return null;
        value = code.slice(valueStart, index);
      }
    }

    if (name !== "allowfullscreen" && value === null) return null;
    attributes.set(name, value);
  }

  if (!openingTagClosed) return null;
  if (!selfClosing) {
    const closingTagStart = code.toLowerCase().indexOf("</iframe", index);
    if (
      closingTagStart < 0 ||
      code.slice(index, closingTagStart).trim() !== "" ||
      !/[\s>]/.test(code[closingTagStart + 8] ?? "")
    ) {
      return null;
    }
    index = skipWhitespace(code, closingTagStart + 8);
    if (code[index] !== ">") return null;
    index += 1;
  }
  if (skipWhitespace(code, index) !== code.length) return null;

  const rawSrc = decodeAttributeEntities(attributes.get("src") ?? "")?.trim();
  const src = rawSrc ? normalizeSafeHttpUrl(rawSrc) : null;
  if (!src) return null;

  const rawTitle = attributes.get("title");
  const title = rawTitle === undefined
    ? undefined
    : decodeAttributeEntities(rawTitle ?? "")?.trim();
  if (title === null || (title && (title.length > 200 || /[\u0000-\u001f\u007f]/.test(title)))) {
    return null;
  }

  const rawAllow = attributes.get("allow");
  const allow = rawAllow === undefined
    ? undefined
    : decodeAttributeEntities(rawAllow ?? "")?.trim();
  if (
    allow === null ||
    (allow && (allow.length > 512 || /[<>\u0000-\u001f\u007f]/.test(allow)))
  ) {
    return null;
  }

  const rawAllowFullscreen = attributes.get("allowfullscreen");
  if (
    rawAllowFullscreen !== undefined &&
    rawAllowFullscreen !== null &&
    !["", "true", "allowfullscreen"].includes(rawAllowFullscreen.toLowerCase())
  ) {
    return null;
  }

  return {
    src,
    ...(title ? { title } : {}),
    ...(allow ? { allow } : {}),
    allowFullscreen: rawAllowFullscreen !== undefined,
  };
}
