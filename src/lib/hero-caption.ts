/**
 * The words a hero slide shows over its artwork: the banner's headline and
 * supporting text, trimmed, with "" meaning "show nothing".
 *
 * A banner created by the old image-folder sync was titled after its file
 * ("1003769702 1789667324400 1edf339c"). Nobody wrote that, so it is treated
 * as no headline rather than shown to a customer.
 */

function titleFromFilename(imagePath: string) {
  const filename = imagePath.split("/").pop() ?? "";
  return filename
    .replace(/\.[^.]+$/, "")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

export function heroCaptionText(slide: {
  title: string;
  subtitle: string | null;
  imagePath: string;
}) {
  const title = slide.title.trim();
  const headline = title && title !== titleFromFilename(slide.imagePath) ? title : "";
  return { headline, subtitle: slide.subtitle?.trim() ?? "" };
}
